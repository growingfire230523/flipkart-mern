const Product = require('../models/productModel');
const DealConfig = require('../models/dealConfigModel');
const Order = require('../models/orderModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const SearchFeatures = require('../utils/searchFeatures');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('cloudinary');
const https = require('https');
const { isMeiliEnabled } = require('../services/meiliClient');
const { searchProducts, suggestProducts } = require('../services/meiliProductSearch');
const { upsertProductToMeili, deleteProductFromMeili } = require('../services/meiliProductSync');
const { getSmartSuggestions, recordSearch, getTrendingSearches, invalidateKeywordIndex } = require('../services/smartSearchService');

const HOME_PRODUCT_CARD_SELECT = [
    'name',
    'price',
    'cuttedPrice',
    'ratings',
    'numOfReviews',
    'orderCount',
    'stock',
    'images',
    'brand.name',
    'category',
    'subCategory',
    'isVolumeProduct',
    'volumeVariants',
    'isSizeProduct',
    'sizeVariants',
    'isColorProduct',
    'colorVariants',
    'catalogHighlights',
    'isGiftable',
    'createdAt',
].join(' ');

const parseBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const v = String(value || '').trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off' || v === '') return false;
    return Boolean(value);
};

const safeJsonParse = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const parseStringArray = (input) => {
    if (input === undefined || input === null) return [];

    // Accept: ['a','b'], 'a', 'a,b', '["a","b"]'
    if (Array.isArray(input)) {
        return input
            .flatMap((v) => {
                if (typeof v === 'string') {
                    const json = safeJsonParse(v);
                    if (Array.isArray(json)) return json;
                    return [v];
                }
                if (typeof v === 'number' || typeof v === 'boolean') return [String(v)];
                return [];
            })
            .map((v) => String(v || '').trim())
            .filter(Boolean);
    }

    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return [];
        const json = safeJsonParse(trimmed);
        if (Array.isArray(json)) {
            return json.map((v) => String(v || '').trim()).filter(Boolean);
        }
        // allow comma-separated as a convenience
        if (trimmed.includes(',')) {
            return trimmed
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
        }
        return [trimmed];
    }

    return [String(input).trim()].filter(Boolean);
};

const normalizeText = (value) => String(value || '').toLowerCase();

const getAzureOpenAIConfig = () => {
    const endpointRaw = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    if (!endpointRaw || !apiKey || !deployment || !apiVersion) return null;

    let endpointUrl;
    try {
        endpointUrl = new URL(String(endpointRaw).trim());
    } catch (_) {
        try {
            endpointUrl = new URL(`https://${String(endpointRaw).trim().replace(/^https?:\/\//i, '')}`);
        } catch (__){
            return null;
        }
    }

    const hostname = endpointUrl.hostname;
    const path = `/openai/deployments/${encodeURIComponent(String(deployment).trim())}/chat/completions?api-version=${encodeURIComponent(
        String(apiVersion).trim()
    )}`;

    return {
        hostname,
        path,
        apiKey: String(apiKey).trim(),
    };
};

const callChatCompletionsJson = async ({ system, user, model, temperature = 0.2 }) => {
    const azureConfig = getAzureOpenAIConfig();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!azureConfig && !apiKey) return null;

    const payload = {
        model: azureConfig ? undefined : String(model || 'gpt-4o-mini').trim(),
        temperature,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: String(system || '') },
            { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) },
        ],
    };

    const body = Buffer.from(JSON.stringify(payload));
    const hostname = azureConfig ? azureConfig.hostname : 'api.openai.com';
    const path = azureConfig ? azureConfig.path : '/v1/chat/completions';
    const headers = azureConfig
        ? { 'api-key': azureConfig.apiKey, 'Content-Type': 'application/json', 'Content-Length': body.length }
        : { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': body.length };

    const allowInsecureTls = String(process.env.OPENAI_INSECURE_TLS || process.env.VOICE_TRANSCRIBE_INSECURE_TLS || '')
        .trim()
        .toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                method: 'POST',
                hostname,
                path,
                headers,
                ...(allowInsecureTls ? { rejectUnauthorized: false } : null),
                timeout: 30_000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    let parsed;
                    try {
                        parsed = JSON.parse(data);
                    } catch {
                        return reject(new Error('GPT response was not valid JSON.'));
                    }

                    if ((res.statusCode || 0) >= 400) {
                        const msg = parsed?.error?.message || `GPT error: HTTP ${res.statusCode}`;
                        return reject(new Error(msg));
                    }

                    const content = parsed?.choices?.[0]?.message?.content;
                    if (!content) return reject(new Error('GPT returned empty content.'));

                    try {
                        resolve(JSON.parse(content));
                    } catch {
                        reject(new Error('GPT returned non-JSON content.'));
                    }
                });
            }
        );

        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('GPT request timed out')));
        req.write(body);
        req.end();
    });
};

let makeKitCatalogCache = {
    expiresAt: 0,
    categories: [],
    subCategories: [],
};

const getMakeKitCatalogHints = async () => {
    const now = Date.now();
    if (makeKitCatalogCache.expiresAt > now && makeKitCatalogCache.categories.length) {
        return makeKitCatalogCache;
    }

    const [categoriesRaw, subCategoriesRaw] = await Promise.all([
        Product.distinct('category', { stock: { $gt: 0 } }),
        Product.distinct('subCategory', { stock: { $gt: 0 } }),
    ]);

    const categories = (categoriesRaw || []).map((c) => String(c || '').trim()).filter(Boolean).slice(0, 120);
    const subCategories = (subCategoriesRaw || []).map((c) => String(c || '').trim()).filter(Boolean).slice(0, 240);

    makeKitCatalogCache = {
        expiresAt: now + 10 * 60 * 1000,
        categories,
        subCategories,
    };

    return makeKitCatalogCache;
};

const safeStringArray = (arr, max = 12) =>
    Array.isArray(arr)
        ? arr.map((v) => String(v || '').trim()).filter(Boolean).slice(0, max)
        : [];

const summarizeKitCandidate = (p) => ({
    id: String(p?._id || ''),
    name: String(p?.name || '').trim(),
    category: String(p?.category || '').trim(),
    subCategory: String(p?.subCategory || '').trim(),
    price: Number(p?.price || 0),
    ratings: Number(p?.ratings || 0),
    numOfReviews: Number(p?.numOfReviews || 0),
    orderCount: Number(p?.orderCount || 0),
    description: String(p?.description || '').slice(0, 260),
    highlights: Array.isArray(p?.highlights) ? p.highlights.slice(0, 6) : [],
});

const parseVolumeVariants = (input) => {
    if (!input) return [];

    const raw = Array.isArray(input) ? input : [input];
    const parsed = raw
        .map((v) => (typeof v === 'string' ? safeJsonParse(v) : v))
        .filter(Boolean)
        .map((v) => {
            const volume = String(v.volume ?? v.label ?? '').trim();
            const price = Number(v.price);
            const cuttedPrice = v.cuttedPrice === undefined || v.cuttedPrice === null || v.cuttedPrice === ''
                ? 0
                : Number(v.cuttedPrice);
            const stock = v.stock === undefined || v.stock === null || v.stock === '' ? 0 : Number(v.stock);

            return {
                volume,
                price: Number.isFinite(price) ? price : NaN,
                cuttedPrice: Number.isFinite(cuttedPrice) ? cuttedPrice : 0,
                stock: Number.isFinite(stock) ? stock : 0,
            };
        })
        .filter((v) => v.volume && Number.isFinite(v.price));

    return parsed;
};

const parseSizeVariants = (input) => {
    if (!input) return [];

    const raw = Array.isArray(input) ? input : [input];
    const parsed = raw
        .map((v) => (typeof v === 'string' ? safeJsonParse(v) : v))
        .filter(Boolean)
        .map((v) => {
            const size = String(v.size ?? v.label ?? '').trim();
            const price = Number(v.price);
            const cuttedPrice = v.cuttedPrice === undefined || v.cuttedPrice === null || v.cuttedPrice === ''
                ? 0
                : Number(v.cuttedPrice);
            const stock = v.stock === undefined || v.stock === null || v.stock === '' ? 0 : Number(v.stock);

            return {
                size,
                price: Number.isFinite(price) ? price : NaN,
                cuttedPrice: Number.isFinite(cuttedPrice) ? cuttedPrice : 0,
                stock: Number.isFinite(stock) ? stock : 0,
            };
        })
        .filter((v) => v.size && Number.isFinite(v.price));

    return parsed;
};

const normalizeHex = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    const hex = v.toUpperCase();
    // #RGB or #RRGGBB
    if (/^#[0-9A-F]{3}$/.test(hex) || /^#[0-9A-F]{6}$/.test(hex)) return hex;
    return '';
};

const parseColorVariants = (input) => {
    if (!input) return [];

    const raw = Array.isArray(input) ? input : [input];
    const parsed = raw
        .map((v) => (typeof v === 'string' ? safeJsonParse(v) : v))
        .filter(Boolean)
        .map((v) => {
            const name = String(v.name ?? v.color ?? v.label ?? '').trim();
            const hex = normalizeHex(v.hex ?? v.colorHex ?? v.hexCode);
            const price = Number(v.price);
            const cuttedPrice = v.cuttedPrice === undefined || v.cuttedPrice === null || v.cuttedPrice === ''
                ? 0
                : Number(v.cuttedPrice);
            const stock = v.stock === undefined || v.stock === null || v.stock === '' ? 0 : Number(v.stock);

            return {
                name,
                hex,
                price: Number.isFinite(price) ? price : NaN,
                cuttedPrice: Number.isFinite(cuttedPrice) ? cuttedPrice : 0,
                stock: Number.isFinite(stock) ? stock : 0,
            };
        })
        .filter((v) => v.name && v.hex && Number.isFinite(v.price));

    return parsed;
};

const canUseCloudinary = () => Boolean(
    process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

const shouldAllowInsecureCloudinaryTls = () =>
    String(process.env.CLOUDINARY_INSECURE_TLS || '').toLowerCase() === 'true' &&
    process.env.NODE_ENV !== 'production';

const isLikelyTlsCertError = (err) => {
    const code = String(err?.code || '').toUpperCase();
    const msg = String(err?.message || '').toLowerCase();
    return (
        code.includes('UNABLE_TO_GET_ISSUER_CERT_LOCALLY') ||
        code.includes('SELF_SIGNED_CERT_IN_CHAIN') ||
        code.includes('CERT_HAS_EXPIRED') ||
        msg.includes('unable to get local issuer certificate') ||
        msg.includes('self signed certificate')
    );
};

const withOptionalInsecureTls = async (fn) => {
    if (!shouldAllowInsecureCloudinaryTls()) return fn();
    const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        return await fn();
    } finally {
        if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    }
};

const uploadToCloudinaryOrFallback = async ({ data, folder, fallbackPrefix }) => {
    // Fallback stores a data URL directly in MongoDB (OK for localhost testing, not recommended for production).
    const fallback = {
        public_id: `${fallbackPrefix}-${Date.now()}`,
        url: typeof data === 'string' ? data : '',
    };

    if (!canUseCloudinary()) return fallback;

    try {
        const result = await withOptionalInsecureTls(() => cloudinary.v2.uploader.upload(data, { folder }));
        return {
            public_id: result.public_id,
            url: result.secure_url,
        };
    } catch (e) {
        if (isLikelyTlsCertError(e) && !shouldAllowInsecureCloudinaryTls()) {
            throw new ErrorHandler(
                'Cloudinary upload failed due to a TLS certificate error (often caused by corporate proxies). Recommended: configure Node to trust your proxy/root CA (e.g., NODE_EXTRA_CA_CERTS). Dev-only workaround: set CLOUDINARY_INSECURE_TLS=true in backend/config/config.env and restart the backend.',
                502
            );
        }

        throw new ErrorHandler(`Cloudinary upload failed: ${String(e?.message || e)}`, 502);
    }
};

// Get All Products
exports.getAllProducts = asyncErrorHandler(async (req, res, next) => {

    const resultPerPage = 99;
    const productsCount = await Product.countDocuments();

    const meiliKeyword = String(req.query.keyword || '').trim();
    if (isMeiliEnabled()) {
        const page = Math.max(1, Number(req.query.page) || 1);
        try {
            const meili = await searchProducts({
                keyword: meiliKeyword,
                queryString: req.query,
                page,
                limit: resultPerPage,
            });

            if (meili?.enabled) {
                return res.status(200).json({
                    success: true,
                    products: meili.products,
                    productsCount,
                    resultPerPage,
                    filteredProductsCount: meili.filteredProductsCount,
                    searchMeta: {
                        engine: 'meilisearch',
                        fallbackUsed: meili.fallbackUsed,
                        suggestions: meili.suggestions,
                        facets: meili.facets,
                    },
                });
            }
        } catch (e) {
            // Fall back to MongoDB search/browse when Meilisearch is unavailable.
        }
    }

    const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const tokenize = (value) => {
        const normalized = String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();

        if (!normalized) return [];

        const stop = new Set([
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

        const tokens = normalized
            .split(' ')
            .map((t) => t.trim())
            .filter((t) => t.length >= 2 && !stop.has(t));

        // de-dup + cap (keeps queries performant)
        return Array.from(new Set(tokens)).slice(0, 8);
    };

    const buildFiltersFromQuery = (queryString) => {
        const queryCopy = { ...queryString };

        // fields to remove for category
        const removeFields = [
            'keyword',
            'page',
            'limit',
            // facet-style filters (handled by Meilisearch path; ignore for Mongo fallback)
            'finish',
            'coverage',
            'color',
            'size',
            'fragranceNote',
            'exclusivesServices',
            'formulation',
        ];
        removeFields.forEach((key) => delete queryCopy[key]);

        let json = JSON.stringify(queryCopy);
        json = json.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);

        try {
            return JSON.parse(json);
        } catch {
            return {};
        }
    };

    const rawKeyword = String(req.query.keyword || '').trim();
    const tokens = tokenize(rawKeyword);

    const expandTokens = (inputTokens) => {
        const synonyms = {
            cream: ['creme'],
            creme: ['cream'],
            moisturiser: ['moisturizer'],
            moisturizers: ['moisturizer'],
            luxury: ['premium'],
            premium: ['luxury'],
            sunscreen: ['sun screen', 'spf'],
            mascara: ['lash'],
        };

        const expanded = new Set(inputTokens);
        for (const t of inputTokens) {
            const list = synonyms[t];
            if (Array.isArray(list)) {
                for (const alt of list) expanded.add(String(alt).toLowerCase());
            }
        }
        return Array.from(expanded).slice(0, 12);
    };

    const buildTextSearchString = ({ phrase, expanded }) => {
        const safePhrase = String(phrase || '').trim();
        const parts = [];
        if (safePhrase) parts.push(`"${safePhrase}"`);
        for (const t of expanded || []) parts.push(String(t));
        return parts.join(' ').trim();
    };

    // If no meaningful tokens, fall back to existing simple logic.
    if (!rawKeyword || tokens.length === 0) {
        const searchFeature = new SearchFeatures(
            Product.find().select(`${HOME_PRODUCT_CARD_SELECT} highlights`).lean(),
            req.query
        ).search().filter();

        let products = await searchFeature.query;
        const filteredProductsCount = products.length;

        searchFeature.pagination(resultPerPage);
        products = await searchFeature.query.clone();

        return res.status(200).json({
            success: true,
            products,
            productsCount,
            resultPerPage,
            filteredProductsCount,
        });
    }

    const page = Number(req.query.page) || 1;
    const skip = resultPerPage * (page - 1);

    const filters = buildFiltersFromQuery(req.query);
    const phrase = escapeRegex(rawKeyword);
    const tokenRegexes = tokens.map((t) => escapeRegex(t));

    // Try fast MongoDB text search first (uses text index + ranked score).
    // Falls back to regex-scored aggregation if $text isn't available.
    try {
        const expanded = expandTokens(tokens);
        const textSearch = buildTextSearchString({ phrase: rawKeyword, expanded });

        const tokenIn = (field, token, weight) => ({
            $cond: [{ $regexMatch: { input: field, regex: token, options: 'i' } }, weight, 0],
        });

        const sumTokenMatches = (field, weight) => ({
            $sum: tokenRegexes.map((token) => tokenIn(field, token, weight)),
        });

        const allTokensIn = (field) => ({
            $and: tokenRegexes.map((token) => ({ $regexMatch: { input: field, regex: token, options: 'i' } })),
        });

        const pipelineText = [
            { $match: { ...filters, $text: { $search: textSearch } } },
            {
                $addFields: {
                    _textScore: { $meta: 'textScore' },
                    _boost: {
                        $add: [
                            { $cond: [{ $regexMatch: { input: '$name', regex: phrase, options: 'i' } }, 80, 0] },
                            { $cond: [allTokensIn('$name'), 40, 0] },
                            sumTokenMatches('$name', 10),
                            sumTokenMatches('$brand.name', 6),
                            sumTokenMatches('$subCategory', 5),
                            sumTokenMatches('$category', 4),
                        ],
                    },
                },
            },
            {
                $addFields: {
                    _score: {
                        $add: [
                            { $multiply: ['$_textScore', 20] },
                            '$_boost',
                        ],
                    },
                },
            },
            { $sort: { _score: -1, ratings: -1, orderCount: -1, createdAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: 'filteredProductsCount' }],
                    products: [{ $skip: skip }, { $limit: resultPerPage }],
                },
            },
        ];

        const aggregatedText = await Product.aggregate(pipelineText);
        const firstText = aggregatedText?.[0] || {};
        const productsText = firstText.products || [];
        const filteredCountText = firstText.metadata?.[0]?.filteredProductsCount || 0;

        if (filteredCountText > 0) {
            return res.status(200).json({
                success: true,
                products: productsText,
                productsCount,
                resultPerPage,
                filteredProductsCount: filteredCountText,
            });
        }
    } catch {
        // Fall through to regex-based relevance search.
    }

    const fieldsToSearch = ['name', 'category', 'subCategory', 'brand.name', 'description', 'highlights', 'specifications.title', 'specifications.description'];

    const orClauses = [];
    for (const token of tokenRegexes) {
        for (const field of fieldsToSearch) {
            orClauses.push({ [field]: { $regex: token, $options: 'i' } });
        }
    }

    // Relevance-ranked search using aggregation.
    const tokenIn = (field, token, weight) => ({
        $cond: [{ $regexMatch: { input: field, regex: token, options: 'i' } }, weight, 0],
    });

    const sumTokenMatches = (field, weight) => ({
        $sum: tokenRegexes.map((token) => tokenIn(field, token, weight)),
    });

    const allTokensIn = (field) => ({
        $and: tokenRegexes.map((token) => ({ $regexMatch: { input: field, regex: token, options: 'i' } })),
    });

    const pipeline = [
        { $match: { ...filters, $or: orClauses } },
        {
            $addFields: {
                _score: {
                    $add: [
                        // Phrase and all-token boosts
                        { $cond: [{ $regexMatch: { input: '$name', regex: phrase, options: 'i' } }, 80, 0] },
                        { $cond: [allTokensIn('$name'), 40, 0] },

                        // Token matches (weighted by field importance)
                        sumTokenMatches('$name', 12),
                        sumTokenMatches('$category', 8),
                        sumTokenMatches('$subCategory', 8),
                        sumTokenMatches('$brand.name', 8),
                        sumTokenMatches('$highlights', 6),
                        sumTokenMatches('$specifications.title', 4),
                        sumTokenMatches('$specifications.description', 3),
                        sumTokenMatches('$description', 3),
                    ],
                },
            },
        },
        { $match: { _score: { $gt: 0 } } },
        { $sort: { _score: -1, ratings: -1, createdAt: -1 } },
        {
            $facet: {
                metadata: [{ $count: 'filteredProductsCount' }],
                products: [{ $skip: skip }, { $limit: resultPerPage }],
            },
        },
    ];

    const aggregated = await Product.aggregate(pipeline);
    const first = aggregated?.[0] || {};
    const products = first.products || [];
    const filteredProductsCount = first.metadata?.[0]?.filteredProductsCount || 0;

    // If the more advanced relevance pipeline fails to find anything, fall back
    // to the simpler, previous behaviour (regex on name via SearchFeatures).
    if (!filteredProductsCount) {
        const searchFeature = new SearchFeatures(
            Product.find().select(`${HOME_PRODUCT_CARD_SELECT} highlights`).lean(),
            req.query
        ).search().filter();

        let fallbackProducts = await searchFeature.query;
        const fallbackCount = fallbackProducts.length;

        searchFeature.pagination(resultPerPage);
        fallbackProducts = await searchFeature.query.clone();

        return res.status(200).json({
            success: true,
            products: fallbackProducts,
            productsCount,
            resultPerPage,
            filteredProductsCount: fallbackCount,
        });
    }

    res.status(200).json({
        success: true,
        products,
        productsCount,
        resultPerPage,
        filteredProductsCount,
    });
});

// Product suggestions (autocomplete-style) — keyword-based, grouped by category
exports.getProductSuggestions = asyncErrorHandler(async (req, res, next) => {
    const rawKeyword = String(req.query.keyword || req.query.q || '').trim();

    // ── Empty input → return trending searches ─────────────────────
    if (!rawKeyword) {
        const trending = await getTrendingSearches(8);
        return res.status(200).json({
            success: true,
            suggestions: [],
            trending,
            didYouMean: null,
        });
    }

    if (rawKeyword.length < 1) {
        return res.status(200).json({ success: true, suggestions: [], trending: [], didYouMean: null });
    }

    // ── Smart keyword suggestions ──────────────────────────────────
    const { suggestions, didYouMean } = await getSmartSuggestions(rawKeyword, 10);

    // Record the search query asynchronously (fire & forget)
    if (rawKeyword.length >= 3) {
        recordSearch(rawKeyword);
    }

    return res.status(200).json({
        success: true,
        suggestions,
        trending: [],
        didYouMean,
    });
});

// Get All Products ---Product Sliders
exports.getProducts = asyncErrorHandler(async (req, res, next) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 48) : 48;

    const products = await Product.find()
        .sort({ createdAt: -1 })
        .select(HOME_PRODUCT_CARD_SELECT)
        .limit(limit)
        .lean();

    res.status(200).json({
        success: true,
        products,
    });
});

// Get Top Rated Products (public)
exports.getTopRatedProducts = asyncErrorHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 12) : 12;

    const products = await Product.find()
        .sort({ ratings: -1, numOfReviews: -1, createdAt: -1 })
        .select(HOME_PRODUCT_CARD_SELECT)
        .limit(limit)
        .lean();

    res.status(200).json({
        success: true,
        products,
    });
});

// Get New In Products (public)
// Returns the latest products by createdAt.
exports.getNewInProducts = asyncErrorHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 12) : 3;

    const products = await Product.find()
        .sort({ createdAt: -1 })
        .select(HOME_PRODUCT_CARD_SELECT)
        .limit(limit)
        .lean();

    res.status(200).json({
        success: true,
        products,
    });
});

// Get Make-My-Kit Products (public)
// Uses the user's free-text "needs" (query) to pick relevant, top-rated products
// from unique categories (default 4 items). When Meilisearch is enabled, we
// delegate relevance ranking to it; otherwise we fall back to a MongoDB search.
exports.getMakeMyKitProducts = asyncErrorHandler(async (req, res) => {
    const KIT_SIZE = 7;
    const rawQuery = String(req.query.query || req.query.q || '').trim();

    const model = String(process.env.LEXY_MAKE_MY_KIT_MODEL || 'gpt-4o-mini').trim();
    const perCategoryCandidateLimit = Math.max(6, Math.min(20, Number(process.env.LEXY_MAKE_MY_KIT_PER_CATEGORY_LIMIT || 12)));
    const gptPickCandidateLimit = Math.max(8, Math.min(30, Number(process.env.LEXY_MAKE_MY_KIT_GPT_PICK_LIMIT || 18)));

    const selectForKit =
        'name price cuttedPrice ratings numOfReviews orderCount stock images brand.name category subCategory description highlights createdAt';

    const getGenericKit = async () => {
        const products = await Product.aggregate([
            { $match: { stock: { $gt: 0 }, category: { $type: 'string' } } },
            { $sort: { ratings: -1, numOfReviews: -1, orderCount: -1, createdAt: -1 } },
            { $group: { _id: '$category', product: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$product' } },
            { $limit: KIT_SIZE },
        ]);
        return products.map((p) => ({ ...p, tier: 'suggestion' }));
    };

    const getTopCandidatesForCategory = async ({ category, queryText, keywords }) => {
        const cat = String(category || '').trim();
        if (!cat) return [];

        const tokens = [queryText, ...(keywords || [])].map((t) => String(t || '').trim()).filter(Boolean);
        const searchText = Array.from(new Set(tokens)).join(' ').trim();

        if (searchText && isMeiliEnabled()) {
            try {
                const meili = await searchProducts({
                    keyword: searchText,
                    queryString: req.query,
                    page: 1,
                    limit: perCategoryCandidateLimit * 2,
                });

                if (meili?.enabled && Array.isArray(meili.products) && meili.products.length) {
                    return meili.products
                        .filter((p) => String(p?.category || '') === cat)
                        .filter((p) => Number(p?.stock || 0) > 0)
                        .slice(0, perCategoryCandidateLimit);
                }
            } catch {
                // fall back
            }
        }

        const baseFilter = { stock: { $gt: 0 }, category: cat };

        if (searchText) {
            try {
                const docs = await Product.find(
                    { ...baseFilter, $text: { $search: searchText } },
                    { score: { $meta: 'textScore' } }
                )
                    .select(selectForKit)
                    .sort({ score: { $meta: 'textScore' }, ratings: -1, numOfReviews: -1, orderCount: -1, createdAt: -1 })
                    .limit(perCategoryCandidateLimit)
                    .lean();
                if (docs.length) return docs;
            } catch {
                // Some Mongo setups may not support $text
            }

            const keyTokens = (keywords || [])
                .map((k) => String(k || '').trim())
                .filter(Boolean)
                .slice(0, 10);

            const ors = [];
            for (const t of keyTokens) {
                const rx = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                ors.push({ name: { $regex: rx } });
                ors.push({ description: { $regex: rx } });
                ors.push({ subCategory: { $regex: rx } });
                ors.push({ 'brand.name': { $regex: rx } });
            }

            const filter = ors.length ? { ...baseFilter, $or: ors } : baseFilter;
            const docs = await Product.find(filter)
                .select(selectForKit)
                .sort({ ratings: -1, numOfReviews: -1, orderCount: -1, createdAt: -1 })
                .limit(perCategoryCandidateLimit)
                .lean();

            return docs;
        }

        return Product.find(baseFilter)
            .select(selectForKit)
            .sort({ ratings: -1, numOfReviews: -1, orderCount: -1, createdAt: -1 })
            .limit(perCategoryCandidateLimit)
            .lean();
    };

    // No query → generic kit (all suggestions).
    if (!rawQuery) {
        const products = await getGenericKit();
        return res.status(200).json({ success: true, products });
    }

    // ── Step 1: GPT extracts PRIMARY categories + SUGGESTED complementary categories ──
    let plan = null;
    try {
        const catalog = await getMakeKitCatalogHints();

        const system =
            'You are a beauty e-commerce shopping assistant. ' +
            'Given a customer sentence, analyse their needs and split them into two tiers:\n' +
            '1. "primary" — categories/products the customer EXPLICITLY asked for or clearly implied (e.g. dry skin → moisturizer, mascara → mascara).\n' +
            '2. "suggested" — complementary categories that would go well with the primary products but were NOT requested (e.g. if they need skincare, suggest a sunscreen or primer).\n' +
            'Each category must come from the allowedCategories list. ' +
            'Suggested categories MUST be DIFFERENT from primary categories. ' +
            'Extract keywords per category for product search. ' +
            'Return JSON only:\n' +
            '{"primary": [{"category": string, "keywords": [string], "why": string}], ' +
            '"suggested": [{"category": string, "keywords": [string], "why": string}], ' +
            '"avoidKeywords": [string], "notes": string}.\n' +
            'Keep primary count reasonable (typically 1-4). Fill suggested so total primary+suggested ≤ 7. ' +
            'Each suggested item should be from a unique category not already in primary.';

        plan = await callChatCompletionsJson({
            system,
            model,
            user: {
                query: rawQuery,
                allowedCategories: catalog.categories,
                allowedSubCategories: catalog.subCategories,
                maxTotal: KIT_SIZE,
            },
            temperature: 0.25,
        });
    } catch {
        plan = null;
    }

    const primaryNeeded = Array.isArray(plan?.primary) ? plan.primary : (Array.isArray(plan?.needed) ? plan.needed : []);
    const suggestedNeeded = Array.isArray(plan?.suggested) ? plan.suggested : [];
    const avoidKeywords = safeStringArray(plan?.avoidKeywords, 12);

    // Heuristic fallback when GPT isn't available.
    const heuristicPlan = async () => {
        const catalog = await getMakeKitCatalogHints();
        const q = normalizeText(rawQuery);

        const primary = [];
        const suggested = [];
        const usedCats = new Set();
        const pushPrimary = (category, keywords) => {
            if (!catalog.categories.includes(category) || usedCats.has(category)) return;
            usedCats.add(category);
            primary.push({ category, keywords, why: 'Heuristic match' });
        };
        const pushSuggested = (category, keywords) => {
            if (!catalog.categories.includes(category) || usedCats.has(category)) return;
            usedCats.add(category);
            suggested.push({ category, keywords, why: 'Complementary suggestion' });
        };

        if (q.includes('acne') || q.includes('pimple') || q.includes('oily') || q.includes('sensitive') || q.includes('dry') || q.includes('moistur') || q.includes('vitamin')) {
            pushPrimary('SKINCARE', ['cleanser', 'serum', 'moisturizer', 'acne', 'sensitive', 'dry skin', 'vitamin']);
        }
        if (q.includes('makeup') || q.includes('office') || q.includes('daily') || q.includes('foundation') || q.includes('lip') || q.includes('mascara') || q.includes('concealer')) {
            pushPrimary('MAKEUP', ['makeup', 'foundation', 'concealer', 'lipstick', 'mascara', 'daily']);
        }
        if (q.includes('hair') || q.includes('dandruff') || q.includes('hairfall') || q.includes('frizz')) {
            pushPrimary('HAIRCARE', ['shampoo', 'conditioner', 'hair mask', 'anti dandruff']);
        }
        if (q.includes('fragrance') || q.includes('perfume') || q.includes('deodorant')) {
            pushPrimary('FRAGRANCES', ['perfume', 'fragrance']);
        }

        if (!primary.length) {
            const first = catalog.categories.find(Boolean);
            if (first) pushPrimary(first, safeStringArray(rawQuery.split(/\s+/), 8));
        }

        // Fill suggestions from remaining categories
        for (const cat of catalog.categories) {
            if (usedCats.has(cat)) continue;
            pushSuggested(cat, [cat.toLowerCase()]);
            if (primary.length + suggested.length >= KIT_SIZE) break;
        }

        return { primary: primary.slice(0, 5), suggested: suggested.slice(0, KIT_SIZE - primary.length) };
    };

    const parseTier = (arr) => arr
        .map((n) => ({
            category: String(n?.category || '').trim(),
            keywords: safeStringArray(n?.keywords, 12),
            why: String(n?.why || '').trim(),
        }))
        .filter((n) => n.category);

    let primaryFinal, suggestedFinal;
    if (primaryNeeded.length) {
        primaryFinal = parseTier(primaryNeeded).slice(0, 5);
        const primaryCats = new Set(primaryFinal.map((p) => p.category));
        suggestedFinal = parseTier(suggestedNeeded).filter((s) => !primaryCats.has(s.category));
        // Ensure total ≤ KIT_SIZE
        suggestedFinal = suggestedFinal.slice(0, KIT_SIZE - primaryFinal.length);
    } else {
        const heuristic = await heuristicPlan();
        primaryFinal = heuristic.primary;
        suggestedFinal = heuristic.suggested;
    }

    // ── Step 2: Collect candidates for BOTH primary and suggested categories ──
    const candidatesByCategory = {};
    const allNeeded = [...primaryFinal, ...suggestedFinal];
    for (const item of allNeeded) {
        const cat = item.category;
        // eslint-disable-next-line no-await-in-loop
        const list = await getTopCandidatesForCategory({
            category: cat,
            queryText: rawQuery,
            keywords: item.keywords,
        });
        candidatesByCategory[cat] = Array.isArray(list) ? list : [];
    }

    // ── Step 3: GPT picks best product per category, classifying primary vs suggestion ──
    let pickedPrimary = [];
    let pickedSuggestion = [];
    try {
        const flatPrimary = [];
        for (const item of primaryFinal) {
            const list = (candidatesByCategory[item.category] || []).slice(0, 10);
            flatPrimary.push({
                category: item.category,
                why: item.why,
                candidates: list.map((p) => summarizeKitCandidate(p)),
            });
        }
        const flatSuggested = [];
        for (const item of suggestedFinal) {
            const list = (candidatesByCategory[item.category] || []).slice(0, 8);
            flatSuggested.push({
                category: item.category,
                why: item.why,
                candidates: list.map((p) => summarizeKitCandidate(p)),
            });
        }

        const system =
            'You are building a curated product kit for the customer.\n' +
            'There are two tiers:\n' +
            '- "primary": products the customer explicitly needs. Pick the BEST product per primary category ' +
            '(highest ratings, most ordered, best match to their query). At least one per primary category.\n' +
            '- "suggestion": complementary products from different categories that go well with the primary picks. ' +
            'Pick the BEST one per suggested category. These are bonus recommendations.\n' +
            'Select product IDs ONLY from the provided candidates. ' +
            'Avoid items that conflict with avoidKeywords. ' +
            'Return JSON only:\n' +
            '{"primaryIds": [string], "suggestionIds": [string], "reason": string}.';

        const picked = await callChatCompletionsJson({
            system,
            model,
            user: {
                query: rawQuery,
                avoidKeywords,
                primary: flatPrimary,
                suggested: flatSuggested,
            },
            temperature: 0.2,
        });

        pickedPrimary = safeStringArray(picked?.primaryIds, gptPickCandidateLimit);
        pickedSuggestion = safeStringArray(picked?.suggestionIds, gptPickCandidateLimit);
    } catch {
        pickedPrimary = [];
        pickedSuggestion = [];
    }

    // ── Step 4: Materialize with tier tags ──
    const byId = new Map();
    for (const cat of Object.keys(candidatesByCategory)) {
        for (const p of candidatesByCategory[cat] || []) {
            if (!p?._id) continue;
            byId.set(String(p._id), p);
        }
    }

    const avoid = avoidKeywords.map((k) => normalizeText(k));
    const seen = new Set();

    const materialize = (ids, tier) => {
        const out = [];
        for (const id of ids) {
            const p = byId.get(String(id));
            if (!p) continue;
            const pid = String(p._id);
            if (seen.has(pid)) continue;
            const hay = normalizeText(`${p?.name || ''} ${p?.description || ''} ${p?.subCategory || ''} ${p?.category || ''}`);
            if (avoid.length && avoid.some((k) => k && hay.includes(k))) continue;
            seen.add(pid);
            out.push({ ...p, tier });
        }
        return out;
    };

    let primaryProducts = materialize(pickedPrimary, 'primary');
    let suggestionProducts = materialize(pickedSuggestion, 'suggestion');

    // Fallback: best-per-category if GPT didn't pick
    if (!primaryProducts.length) {
        const primaryCats = new Set(primaryFinal.map((n) => n.category));
        for (const item of primaryFinal) {
            const list = candidatesByCategory[item.category] || [];
            for (const p of list) {
                const pid = String(p?._id || '');
                if (!pid || seen.has(pid)) continue;
                seen.add(pid);
                primaryProducts.push({ ...p, tier: 'primary' });
                break;
            }
        }
    }

    if (!suggestionProducts.length && suggestedFinal.length) {
        for (const item of suggestedFinal) {
            const list = candidatesByCategory[item.category] || [];
            for (const p of list) {
                const pid = String(p?._id || '');
                if (!pid || seen.has(pid)) continue;
                seen.add(pid);
                suggestionProducts.push({ ...p, tier: 'suggestion' });
                break;
            }
        }
    }

    // Ensure each suggestion is from a unique category (not in primary)
    const primaryCategories = new Set(primaryProducts.map((p) => String(p.category || '')));
    suggestionProducts = suggestionProducts.filter((p) => !primaryCategories.has(String(p.category || '')));

    // Enforce uniqueness of suggestion categories
    const sugCatsSeen = new Set();
    suggestionProducts = suggestionProducts.filter((p) => {
        const c = String(p.category || '');
        if (sugCatsSeen.has(c)) return false;
        sugCatsSeen.add(c);
        return true;
    });

    let finalProducts = [...primaryProducts, ...suggestionProducts];

    if (!finalProducts.length) {
        finalProducts = await getGenericKit();
    }

    // Top up suggestions from remaining categories if we still have room
    if (finalProducts.length < KIT_SIZE) {
        const topUp = await Product.find({ stock: { $gt: 0 } })
            .select(selectForKit)
            .sort({ ratings: -1, numOfReviews: -1, orderCount: -1, createdAt: -1 })
            .limit(KIT_SIZE * 3)
            .lean();

        const allCats = new Set([...primaryCategories, ...sugCatsSeen]);
        for (const p of topUp) {
            const id = String(p?._id || '');
            const cat = String(p?.category || '');
            if (!id || seen.has(id)) continue;
            if (allCats.has(cat)) continue; // unique categories only
            seen.add(id);
            allCats.add(cat);
            finalProducts.push({ ...p, tier: 'suggestion' });
            if (finalProducts.length >= KIT_SIZE) break;
        }
    }

    return res.status(200).json({
        success: true,
        products: finalProducts.slice(0, KIT_SIZE),
    });
});

const getDefaultDealEndsAt = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    return end;
};

const getDefaultDealOfDayEndsAt = () => {
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
};

const isValidObjectIdString = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());

const orderWithPreferredProduct = (products, preferred) => {
    if (!preferred) return products;
    const id = String(preferred?._id || '');
    const remaining = Array.isArray(products)
        ? products.filter((p) => String(p?._id || '') !== id)
        : [];
    return [preferred, ...remaining];
};

const pickRotatingProduct = (products) => {
    if (!Array.isArray(products) || products.length === 0) return null;
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const idx = dayIndex % products.length;
    return products[idx] || products[0];
};

const getOrCreateDealConfig = async () => {
    let config = await DealConfig.findOne();
    if (!config) {
        config = await DealConfig.create({ endsAt: getDefaultDealEndsAt() });
    }
    return config;
};

// Get Deal Config (public)
exports.getDealConfig = asyncErrorHandler(async (req, res) => {
    const config = await getOrCreateDealConfig();
    res.status(200).json({
        success: true,
        endsAt: config.endsAt,
        dealOfDayProductId: config.dealOfDayProductId || '',
        dealOfDayEndsAt: config.dealOfDayEndsAt || null,
        heroImageUrl: config.heroImageUrl || '',
        heroLink: config.heroLink || '',
    });
});

// Update Deal Config ---ADMIN
exports.updateDealConfig = asyncErrorHandler(async (req, res, next) => {
    const rawEndsAt = req.body?.endsAt;
    const endsAt = rawEndsAt ? new Date(rawEndsAt) : null;

    if (!endsAt || Number.isNaN(endsAt.getTime())) {
        return next(new ErrorHandler('Please provide a valid endsAt datetime', 400));
    }

    const config = await getOrCreateDealConfig();
    config.endsAt = endsAt;

    const productIdRaw = typeof req.body?.dealOfDayProductId === 'string'
        ? req.body.dealOfDayProductId
        : undefined;
    const hasProductIdField = productIdRaw !== undefined;
    const nextProductId = hasProductIdField ? String(productIdRaw || '').trim() : undefined;

    const endsAtRaw = req.body?.dealOfDayEndsAt;
    const hasDealOfDayEndsAt = endsAtRaw !== undefined && endsAtRaw !== null && endsAtRaw !== '';
    const parsedDealOfDayEndsAt = hasDealOfDayEndsAt ? new Date(endsAtRaw) : null;

    if (hasDealOfDayEndsAt && (!parsedDealOfDayEndsAt || Number.isNaN(parsedDealOfDayEndsAt.getTime()))) {
        return next(new ErrorHandler('Please provide a valid Deal Of The Day end datetime', 400));
    }

    if (hasProductIdField) {
        if (!nextProductId) {
            config.dealOfDayProductId = '';
            config.dealOfDayEndsAt = null;
        } else if (!isValidObjectIdString(nextProductId)) {
            return next(new ErrorHandler('Please provide a valid Deal Of The Day product ID', 400));
        } else {
            config.dealOfDayProductId = nextProductId;
            config.dealOfDayEndsAt = hasDealOfDayEndsAt ? parsedDealOfDayEndsAt : getDefaultDealOfDayEndsAt();
        }
    } else if (hasDealOfDayEndsAt && config.dealOfDayProductId) {
        config.dealOfDayEndsAt = parsedDealOfDayEndsAt;
    }

    // Optionally update hero image URL and link if provided
    if (typeof req.body?.heroImageUrl === 'string') {
        config.heroImageUrl = String(req.body.heroImageUrl || '').trim();
    }
    if (typeof req.body?.heroLink === 'string') {
        config.heroLink = String(req.body.heroLink || '').trim();
    }

    await config.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        endsAt: config.endsAt,
        dealOfDayProductId: config.dealOfDayProductId || '',
        dealOfDayEndsAt: config.dealOfDayEndsAt || null,
        heroImageUrl: config.heroImageUrl || '',
        heroLink: config.heroLink || '',
    });
});

// Get Deal Products (Deals of the Day)
exports.getDealProducts = asyncErrorHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 12, 24);

    const config = await getOrCreateDealConfig();

    const isDealOfDayActive = Boolean(
        config.dealOfDayProductId &&
        config.dealOfDayEndsAt &&
        new Date(config.dealOfDayEndsAt).getTime() > Date.now()
    );

    let preferredProduct = null;
    if (isDealOfDayActive && isValidObjectIdString(config.dealOfDayProductId)) {
        preferredProduct = await Product.findById(config.dealOfDayProductId);
    }

    let products = await Product.find({ dealOfDay: true })
        .sort({ createdAt: -1 })
        .limit(limit);

    if (!preferredProduct) {
        const rotating = pickRotatingProduct(products);
        if (rotating) {
            products = orderWithPreferredProduct(products, rotating);
        } else {
            const fallback = await Product.find({ stock: { $gt: 0 } })
                .sort({ ratings: -1, createdAt: -1 })
                .limit(1);
            if (fallback.length) {
                products = fallback;
            }
        }
    } else {
        products = orderWithPreferredProduct(products, preferredProduct);
    }

    res.status(200).json({
        success: true,
        products,
        endsAt: config.endsAt,
        dealOfDayProductId: config.dealOfDayProductId || '',
        dealOfDayEndsAt: config.dealOfDayEndsAt || null,
        heroImageUrl: config.heroImageUrl || '',
        heroLink: config.heroLink || '',
    });
});

// Toggle Deal Flag ---ADMIN
exports.toggleDealOfDay = asyncErrorHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler('Product Not Found', 404));
    }

    const requested = req.body?.dealOfDay;
    const nextValue = typeof requested === 'boolean' ? requested : !product.dealOfDay;
    product.dealOfDay = nextValue;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        dealOfDay: product.dealOfDay,
        product,
    });
});

// Get Product Details
exports.getProductDetails = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        product,
    });
});

// Get All Products ---ADMIN
exports.getAdminProducts = asyncErrorHandler(async (req, res, next) => {
    const hasPaginationParams = req.query.page !== undefined || req.query.limit !== undefined;

    const pickRange = (field, op) => {
        const direct = req.query?.[`${field}[${op}]`];
        const nested = req.query?.[field]?.[op];
        const v = direct !== undefined ? direct : nested;
        if (v === undefined || v === null || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };

    const keywordRaw = String(req.query.keyword || '').trim();
    const category = req.query.category ? String(req.query.category).trim() : '';
    const subCategory = req.query.subCategory ? String(req.query.subCategory).trim() : '';

    const query = {};

    if (keywordRaw) {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(keywordRaw);
        const isHexLike = /^[0-9a-fA-F]{4,24}$/.test(keywordRaw);
        const nameRegex = { $regex: keywordRaw, $options: 'i' };

        if (isObjectId) {
            query.$or = [{ _id: keywordRaw }, { name: nameRegex }];
        } else if (isHexLike) {
            query.$or = [
                { name: nameRegex },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$_id' },
                            regex: keywordRaw,
                            options: 'i',
                        },
                    },
                },
            ];
        } else {
            query.name = nameRegex;
        }
    }

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;

    const priceGte = pickRange('price', 'gte');
    const priceLte = pickRange('price', 'lte');
    if (priceGte !== undefined || priceLte !== undefined) {
        query.price = {};
        if (priceGte !== undefined) query.price.$gte = priceGte;
        if (priceLte !== undefined) query.price.$lte = priceLte;
    }

    const stockGte = pickRange('stock', 'gte');
    const stockLte = pickRange('stock', 'lte');
    if (stockGte !== undefined || stockLte !== undefined) {
        query.stock = {};
        if (stockGte !== undefined) query.stock.$gte = stockGte;
        if (stockLte !== undefined) query.stock.$lte = stockLte;
    }

    const hasAnyFilter = Boolean(keywordRaw || category || subCategory || priceGte !== undefined || priceLte !== undefined || stockGte !== undefined || stockLte !== undefined);

    if (!hasPaginationParams && !hasAnyFilter) {
        const products = await Product.find();

        return res.status(200).json({
            success: true,
            products,
        });
    }

    const pageRaw = Number(req.query.page);
    const limitRaw = Number(req.query.limit);

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const resultPerPage = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 5000) : 500;
    const skip = resultPerPage * (page - 1);

    const [products, productsCount, filteredProductsCount] = await Promise.all([
        Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(resultPerPage),
        Product.countDocuments(),
        Product.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        products,
        productsCount,
        filteredProductsCount,
        resultPerPage,
        page,
    });
});

// Create Product ---ADMIN
exports.createProduct = asyncErrorHandler(async (req, res, next) => {

    let images = [];
    if (typeof req.body.images === "string") {
        images.push(req.body.images);
    } else {
        images = req.body.images;
    }

    const imagesLink = [];

    for (let i = 0; i < images.length; i++) {
        const uploaded = await uploadToCloudinaryOrFallback({
            data: images[i],
            folder: 'products',
            fallbackPrefix: `local-product-${i}`,
        });

        imagesLink.push(uploaded);
    }

    const brandLogo = await uploadToCloudinaryOrFallback({
        data: req.body.logo,
        folder: 'brands',
        fallbackPrefix: 'local-brand',
    });

    req.body.brand = {
        name: req.body.brandname,
        logo: brandLogo
    }
    req.body.images = imagesLink;
    req.body.user = req.user.id;

    let specs = [];
    if (Array.isArray(req.body.specifications)) {
        specs = req.body.specifications.map((s) => (typeof s === 'string' ? JSON.parse(s) : s));
    } else if (req.body.specifications) {
        specs = [typeof req.body.specifications === 'string' ? JSON.parse(req.body.specifications) : req.body.specifications];
    }
    req.body.specifications = specs;

    // Catalogue highlight tags (optional)
    const catalogNormal = parseStringArray(req.body.catalogHighlightNormal ?? req.body.catalogHighlightsNormal);
    const catalogActive = parseStringArray(req.body.catalogHighlightActive ?? req.body.catalogHighlightsActive);
    req.body.catalogHighlights = {
        normal: catalogNormal,
        active: catalogActive,
    };

    // Volume variants (optional)
    const isVolumeProduct = parseBoolean(req.body.isVolumeProduct);
    const volumeVariants = parseVolumeVariants(req.body.volumeVariants);
    req.body.isVolumeProduct = isVolumeProduct;
    req.body.volumeVariants = volumeVariants;

    // Size variants (optional)
    const isSizeProduct = parseBoolean(req.body.isSizeProduct);
    const sizeVariants = parseSizeVariants(req.body.sizeVariants);
    req.body.isSizeProduct = isSizeProduct;
    req.body.sizeVariants = sizeVariants;

    // Color variants (optional)
    const isColorProduct = parseBoolean(req.body.isColorProduct);
    const colorVariants = parseColorVariants(req.body.colorVariants);
    req.body.isColorProduct = isColorProduct;
    req.body.colorVariants = colorVariants;

    // Gift ribbon toggle (optional)
    if (req.body.isGiftable !== undefined) {
        req.body.isGiftable = parseBoolean(req.body.isGiftable);
    }

    const deriveBaseFromVariants = (variants, firstKey) => {
        if (!Array.isArray(variants) || variants.length <= 0) return;
        const first = variants[0];
        req.body.price = first.price;
        req.body.cuttedPrice = first.cuttedPrice || first.price;
        const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        if (Number.isFinite(totalStock) && totalStock > 0) req.body.stock = totalStock;
    };

    // Prefer color > size > volume if multiple are provided.
    if (isColorProduct && colorVariants.length > 0) deriveBaseFromVariants(colorVariants, 'color');
    else if (isSizeProduct && sizeVariants.length > 0) deriveBaseFromVariants(sizeVariants, 'size');
    else if (isVolumeProduct && volumeVariants.length > 0) deriveBaseFromVariants(volumeVariants, 'volume');

    const product = await Product.create(req.body);

    // Best-effort Meilisearch sync (do not block the request)
    upsertProductToMeili(product);
    invalidateKeywordIndex();

    res.status(201).json({
        success: true,
        product
    });
});

// Update Product ---ADMIN
exports.updateProduct = asyncErrorHandler(async (req, res, next) => {

    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    if (req.body.images !== undefined) {
        let images = [];
        if (typeof req.body.images === "string") {
            images.push(req.body.images);
        } else {
            images = req.body.images;
        }
        if (canUseCloudinary()) {
            for (let i = 0; i < product.images.length; i++) {
                const publicId = product.images[i].public_id;
                if (publicId && !publicId.startsWith('local-')) {
                    await cloudinary.v2.uploader.destroy(publicId);
                }
            }
        }

        const imagesLink = [];

        for (let i = 0; i < images.length; i++) {
            const uploaded = await uploadToCloudinaryOrFallback({
                data: images[i],
                folder: 'products',
                fallbackPrefix: `local-product-${i}`,
            });

            imagesLink.push(uploaded);
        }
        req.body.images = imagesLink;
    }

    if (typeof req.body.logo === 'string' ? req.body.logo.length > 0 : Boolean(req.body.logo)) {
        if (canUseCloudinary()) {
            const publicId = product.brand?.logo?.public_id;
            if (publicId && !publicId.startsWith('local-')) {
                await cloudinary.v2.uploader.destroy(publicId);
            }
        }

        const brandLogo = await uploadToCloudinaryOrFallback({
            data: req.body.logo,
            folder: 'brands',
            fallbackPrefix: 'local-brand',
        });

        req.body.brand = {
            name: req.body.brandname,
            logo: brandLogo
        }
    }

    let specs = [];
    if (Array.isArray(req.body.specifications)) {
        specs = req.body.specifications.map((s) => (typeof s === 'string' ? JSON.parse(s) : s));
    } else if (req.body.specifications) {
        specs = [typeof req.body.specifications === 'string' ? JSON.parse(req.body.specifications) : req.body.specifications];
    }
    req.body.specifications = specs;
    req.body.user = req.user.id;

    // Catalogue highlight tags (optional) - only overwrite if client sent them
    const sentCatalogNormal = req.body.catalogHighlightNormal !== undefined || req.body.catalogHighlightsNormal !== undefined;
    const sentCatalogActive = req.body.catalogHighlightActive !== undefined || req.body.catalogHighlightsActive !== undefined;
    if (sentCatalogNormal || sentCatalogActive) {
        const catalogNormal = parseStringArray(req.body.catalogHighlightNormal ?? req.body.catalogHighlightsNormal);
        const catalogActive = parseStringArray(req.body.catalogHighlightActive ?? req.body.catalogHighlightsActive);
        req.body.catalogHighlights = {
            normal: catalogNormal,
            active: catalogActive,
        };
    }

    // Volume variants (optional)
    const isVolumeProduct = parseBoolean(req.body.isVolumeProduct);
    const volumeVariants = parseVolumeVariants(req.body.volumeVariants);

    // Size variants (optional)
    const isSizeProduct = parseBoolean(req.body.isSizeProduct);
    const sizeVariants = parseSizeVariants(req.body.sizeVariants);

    // Color variants (optional)
    const isColorProduct = parseBoolean(req.body.isColorProduct);
    const colorVariants = parseColorVariants(req.body.colorVariants);

    // Only overwrite variant fields if the client actually sent them.
    if (req.body.isVolumeProduct !== undefined) req.body.isVolumeProduct = isVolumeProduct;
    if (req.body.volumeVariants !== undefined) req.body.volumeVariants = volumeVariants;

    if (req.body.isSizeProduct !== undefined) req.body.isSizeProduct = isSizeProduct;
    if (req.body.sizeVariants !== undefined) req.body.sizeVariants = sizeVariants;

    if (req.body.isColorProduct !== undefined) req.body.isColorProduct = isColorProduct;
    if (req.body.colorVariants !== undefined) req.body.colorVariants = colorVariants;

    // Gift ribbon toggle (optional)
    if (req.body.isGiftable !== undefined) {
        req.body.isGiftable = parseBoolean(req.body.isGiftable);
    }

    const deriveBaseFromVariants = (variants) => {
        if (!Array.isArray(variants) || variants.length <= 0) return;
        const first = variants[0];
        req.body.price = first.price;
        req.body.cuttedPrice = first.cuttedPrice || first.price;
        const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        if (Number.isFinite(totalStock) && totalStock > 0) req.body.stock = totalStock;
    };

    if (isColorProduct && colorVariants.length > 0) deriveBaseFromVariants(colorVariants);
    else if (isSizeProduct && sizeVariants.length > 0) deriveBaseFromVariants(sizeVariants);
    else if (isVolumeProduct && volumeVariants.length > 0) deriveBaseFromVariants(volumeVariants);

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    // Best-effort Meilisearch sync (do not block the request)
    upsertProductToMeili(product);
    invalidateKeywordIndex();

    res.status(201).json({
        success: true,
        product
    });
});

// Delete Product ---ADMIN
exports.deleteProduct = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    for (let i = 0; i < product.images.length; i++) {
        await cloudinary.v2.uploader.destroy(product.images[i].public_id);
    }

    await product.remove();

    // Best-effort Meilisearch sync (do not block the request)
    deleteProductFromMeili(product._id);
    invalidateKeywordIndex();

    res.status(201).json({
        success: true
    });
});

// Create OR Update Reviews
exports.createProductReview = asyncErrorHandler(async (req, res, next) => {

    const { rating, comment, productId } = req.body;

    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment,
    }

    const product = await Product.findById(productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const isReviewed = product.reviews.find(review => review.user.toString() === req.user._id.toString());

    if (isReviewed) {

        product.reviews.forEach((rev) => { 
            if (rev.user.toString() === req.user._id.toString())
                (rev.rating = rating, rev.comment = comment);
        });
    } else {
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
    }

    let avg = 0;

    product.reviews.forEach((rev) => {
        avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true
    });
});

// Get All Reviews of Product
exports.getProductReviews = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        reviews: product.reviews
    });
});

// Delete Reveiws
exports.deleteReview = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const reviews = product.reviews.filter((rev) => rev._id.toString() !== req.query.id.toString());

    let avg = 0;

    reviews.forEach((rev) => {
        avg += rev.rating;
    });

    let ratings = 0;

    if (reviews.length === 0) {
        ratings = 0;
    } else {
        ratings = avg / reviews.length;
    }

    const numOfReviews = reviews.length;

    await Product.findByIdAndUpdate(req.query.productId, {
        reviews,
        ratings: Number(ratings),
        numOfReviews,
    }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});

// Get Best Seller Products (public)
// Prefer products with orderCount > 0; fill with top-rated items if needed.
exports.getBestSellerProducts = asyncErrorHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 20) : 8;

    const bestSellers = await Product.find({ orderCount: { $gt: 0 } })
        .sort({ orderCount: -1, ratings: -1, createdAt: -1 })
        .select(HOME_PRODUCT_CARD_SELECT)
        .limit(limit)
        .lean();

    let products = Array.isArray(bestSellers) ? bestSellers : [];

    // If not enough ordered products, top up with highly rated items (excluding duplicates).
    if (products.length < limit) {
        const excludeIds = products.map((p) => p._id).filter(Boolean);
        const remaining = limit - products.length;

        const fallback = await Product.find({ _id: { $nin: excludeIds } })
            .sort({ ratings: -1, numOfReviews: -1, createdAt: -1 })
            .select(HOME_PRODUCT_CARD_SELECT)
            .limit(remaining)
            .lean();

        products = products.concat((fallback || []).map((p) => ({ ...p, orderCount: p.orderCount || 0 })));
    }

    res.status(200).json({
        success: true,
        products,
    });
});