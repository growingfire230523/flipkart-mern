const Product = require('../models/productModel');
const { getProductsIndex, isMeiliEnabled } = require('./meiliClient');

const STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'at',
    'by',
    'for',
    'from',
    'in',
    'is',
    'it',
    'of',
    'on',
    'or',
    'the',
    'to',
    'with',
]);

const tokenize = (value) => {
    const normalized = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    if (!normalized) return [];

    const tokens = normalized
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

    return Array.from(new Set(tokens)).slice(0, 10);
};

const escapeFilterString = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const NUMERIC_FIELDS = new Set([
    'price',
    'cuttedPrice',
    'stock',
    'ratings',
    'numOfReviews',
    'orderCount',
]);

const BOOLEAN_FIELDS = new Set(['dealOfDay', 'isGiftable']);

const parseScalar = (field, value) => {
    if (NUMERIC_FIELDS.has(field)) {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    if (BOOLEAN_FIELDS.has(field)) {
        if (typeof value === 'boolean') return value;
        const v = String(value || '').trim().toLowerCase();
        if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
        if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
        return null;
    }
    return String(value ?? '').trim();
};

const scalarToFilterValue = (field, value) => {
    const parsed = parseScalar(field, value);
    if (parsed === null || parsed === '') return null;
    if (typeof parsed === 'number' || typeof parsed === 'boolean') return String(parsed);
    return `"${escapeFilterString(parsed)}"`;
};

const mapQueryKeyToIndexField = (key) => {
    if (key === 'brand') return 'brandName';
    if (key === 'brandName') return 'brandName';
    return key;
};

const buildMeiliFilter = (queryString) => {
    const queryCopy = { ...queryString };
    ['keyword', 'page', 'limit', 'q'].forEach((k) => delete queryCopy[k]);

    const clauses = [];

    for (const [rawKey, rawVal] of Object.entries(queryCopy)) {
        const field = mapQueryKeyToIndexField(rawKey);
        if (rawVal === undefined || rawVal === null || rawVal === '') continue;

        if (Array.isArray(rawVal)) {
            const parts = rawVal
                .map((v) => scalarToFilterValue(field, v))
                .filter(Boolean)
                .map((v) => `${field} = ${v}`);
            if (parts.length === 1) clauses.push(parts[0]);
            else if (parts.length > 1) clauses.push(`(${parts.join(' OR ')})`);
            continue;
        }

        if (typeof rawVal === 'object') {
            const ops = [];
            const mapping = { gt: '>', gte: '>=', lt: '<', lte: '<=' };
            for (const [opKey, opSymbol] of Object.entries(mapping)) {
                if (rawVal[opKey] === undefined) continue;
                const value = scalarToFilterValue(field, rawVal[opKey]);
                if (!value) continue;
                ops.push(`${field} ${opSymbol} ${value}`);
            }
            if (ops.length === 1) clauses.push(ops[0]);
            else if (ops.length > 1) clauses.push(`(${ops.join(' AND ')})`);
            continue;
        }

        const value = scalarToFilterValue(field, rawVal);
        if (!value) continue;
        clauses.push(`${field} = ${value}`);
    }

    return clauses.length ? clauses.join(' AND ') : undefined;
};

const fetchProductsInOrder = async (orderedIds) => {
    if (!orderedIds.length) return [];

    const products = await Product.find({ _id: { $in: orderedIds } });
    const byId = new Map(products.map((p) => [String(p._id), p]));
    return orderedIds.map((id) => byId.get(String(id))).filter(Boolean);
};

const searchProducts = async ({ keyword, queryString, page, limit }) => {
    if (!isMeiliEnabled()) return { enabled: false };
    const index = getProductsIndex();
    if (!index) return { enabled: false };

    const offset = Math.max(0, (page - 1) * limit);
    const filter = buildMeiliFilter(queryString);

    const baseSearchOptions = {
        limit,
        offset,
        filter,
        attributesToRetrieve: ['id'],
        matchingStrategy: 'all',
        showRankingScore: true,
        facets: ['finish', 'coverage', 'color', 'size', 'fragranceNote', 'exclusivesServices', 'formulation'],
    };

    let result = await index.search(String(keyword || '').trim(), baseSearchOptions);
    let fallbackUsed = false;
    let suggestions = [];

    if (String(keyword || '').trim() && (result?.estimatedTotalHits || 0) === 0) {
        const tokens = tokenize(keyword);
        if (tokens.length >= 2) {
            fallbackUsed = true;
            result = await index.search(tokens.join(' '), baseSearchOptions);
        }

        const suggestRes = await index.search(String(keyword || '').trim(), {
            limit: 6,
            offset: 0,
            filter,
            attributesToRetrieve: ['name'],
        });

        suggestions = Array.from(
            new Set((suggestRes?.hits || []).map((h) => String(h.name || '').trim()).filter(Boolean))
        ).slice(0, 5);
    }

    const orderedIds = (result?.hits || []).map((h) => String(h.id)).filter(Boolean);
    const products = await fetchProductsInOrder(orderedIds);

    return {
        enabled: true,
        products,
        filteredProductsCount: result?.estimatedTotalHits || 0,
        fallbackUsed,
        suggestions,
        facets: result?.facetDistribution || {},
    };
};

const suggestProducts = async ({ keyword, queryString, limit = 8 }) => {
    if (!isMeiliEnabled()) return { enabled: false, suggestions: [] };
    const index = getProductsIndex();
    if (!index) return { enabled: false, suggestions: [] };

    const filter = buildMeiliFilter(queryString);
    const result = await index.search(String(keyword || '').trim(), {
        limit,
        offset: 0,
        filter,
        attributesToRetrieve: ['id', 'name', 'brandName', 'category', 'subCategory'],
    });

    return {
        enabled: true,
        suggestions: (result?.hits || []).map((h) => ({
            id: String(h.id),
            name: h.name,
            brandName: h.brandName,
            category: h.category,
            subCategory: h.subCategory,
        })),
    };
};

module.exports = {
    searchProducts,
    suggestProducts,
};
