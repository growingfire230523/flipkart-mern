const Product = require('../models/productModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const { isMeiliEnabled } = require('../services/meiliClient');
const { searchProducts } = require('../services/meiliProductSearch');

const clampInt = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
};

const normalizeText = (v) => String(v || '').trim().toLowerCase();

const safeBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    const s = String(v || '').trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
};

const PRODUCT_SELECT =
    'name price cuttedPrice ratings numOfReviews orderCount stock images brand.name category subCategory description highlights createdAt';

const escapeRegExp = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRegexOr = (tokens) => {
    const list = (tokens || []).map((t) => String(t || '').trim()).filter(Boolean);
    if (!list.length) return null;
    const pattern = list.map(escapeRegExp).join('|');
    return new RegExp(pattern, 'i');
};

const buildSearchText = (tokens) =>
    Array.from(new Set((tokens || []).map((t) => String(t || '').trim()).filter(Boolean))).join(' ').trim();

const scoreSort = { ratings: -1, numOfReviews: -1, orderCount: -1, createdAt: -1 };

const maybeFilterCategory = (doc, categoryRegex) => {
    if (!categoryRegex) return true;
    const cat = String(doc?.category || '');
    const sub = String(doc?.subCategory || '');
    return categoryRegex.test(cat) || categoryRegex.test(sub);
};

const getCandidates = async ({ keywords, categoryRegex, limit, reqQuery }) => {
    const searchText = buildSearchText(keywords);

    if (searchText && isMeiliEnabled()) {
        try {
            const meili = await searchProducts({
                keyword: searchText,
                queryString: reqQuery || {},
                page: 1,
                limit: Math.max(8, limit * 2),
            });

            if (meili?.enabled && Array.isArray(meili.products)) {
                return meili.products
                    .filter((p) => Number(p?.stock || 0) > 0)
                    .filter((p) => maybeFilterCategory(p, categoryRegex))
                    .slice(0, limit);
            }
        } catch {
            // fall back
        }
    }

    const base = { stock: { $gt: 0 } };

    if (searchText) {
        // Prefer $text if available.
        try {
            const docs = await Product.find({ ...base, $text: { $search: searchText } }, { score: { $meta: 'textScore' } })
                .select(PRODUCT_SELECT)
                .sort({ score: { $meta: 'textScore' }, ...scoreSort })
                .limit(limit)
                .lean();

            return (docs || []).filter((p) => maybeFilterCategory(p, categoryRegex));
        } catch {
            // ignore
        }

        // Regex fallback: match tokens in key fields.
        const rx = buildRegexOr(keywords);
        const ors = rx
            ? [
                  { name: { $regex: rx } },
                  { description: { $regex: rx } },
                  { highlights: { $regex: rx } },
                  { subCategory: { $regex: rx } },
                  { category: { $regex: rx } },
                  { 'brand.name': { $regex: rx } },
              ]
            : [];

        const filter = ors.length ? { ...base, $or: ors } : base;
        const docs = await Product.find(filter)
            .select(PRODUCT_SELECT)
            .sort(scoreSort)
            .limit(limit)
            .lean();

        return (docs || []).filter((p) => maybeFilterCategory(p, categoryRegex));
    }

    const docs = await Product.find(base).select(PRODUCT_SELECT).sort(scoreSort).limit(limit).lean();
    return (docs || []).filter((p) => maybeFilterCategory(p, categoryRegex));
};

const toSkinToneLabel = (tone) => {
    const n = Number(tone);
    if (!Number.isFinite(n)) return 'medium';
    if (n <= 2) return 'fair';
    if (n === 3) return 'light-medium';
    if (n === 4) return 'medium';
    if (n === 5) return 'tan';
    return 'deep';
};

const buildLexyPlan = ({ features = {}, type = 'All', tone = 3 }) => {
    const skinType = normalizeText(type);
    const toneLabel = toSkinToneLabel(tone);

    const wants = {
        dry: safeBool(features?.dry) || skinType === 'dry',
        oily: safeBool(features?.oily) || skinType === 'oily',
        combination: safeBool(features?.combination) || skinType === 'combination',
        normal: safeBool(features?.normal) || skinType === 'normal',
        acne: safeBool(features?.acne),
        sensitive: safeBool(features?.sensitive),
        pigmentation: safeBool(features?.pigmentation) || safeBool(features?.['dark spots']),
        dull: safeBool(features?.dull),
        redness: safeBool(features?.redness),
        pores: safeBool(features?.pore) || safeBool(features?.blackheads) || safeBool(features?.whiteheads),
        fineLines: safeBool(features?.['fine lines']) || safeBool(features?.wrinkles),
        darkCircles: safeBool(features?.['dark circles']) || safeBool(features?.['eye bags']),
    };

    const baseSkincare = ['skincare', 'skin care'];
    const baseMakeup = ['makeup', 'make up', 'cosmetics'];

    const skincareSlots = [];

    skincareSlots.push({
        label: 'Cleanser',
        concern: ['cleanser'],
        categoryRegex: /skin\s*care|skincare/i,
        keywords: [
            ...baseSkincare,
            'cleanser',
            wants.sensitive ? 'gentle' : null,
            wants.dry ? 'hydrating' : null,
            wants.oily || wants.acne ? 'oil control' : null,
            wants.acne ? 'salicylic' : null,
        ],
    });

    skincareSlots.push({
        label: 'Moisturizer',
        concern: ['moisturizer'],
        categoryRegex: /skin\s*care|skincare/i,
        keywords: [
            ...baseSkincare,
            'moisturizer',
            wants.dry ? 'hydrating' : null,
            wants.oily ? 'gel' : null,
            wants.sensitive ? 'ceramide' : null,
            wants.sensitive ? 'fragrance free' : null,
        ],
    });

    skincareSlots.push({
        label: 'Sunscreen',
        concern: ['sunscreen'],
        categoryRegex: /skin\s*care|skincare/i,
        keywords: [
            ...baseSkincare,
            'sunscreen',
            'spf',
            wants.oily ? 'non greasy' : null,
            wants.sensitive ? 'mineral' : null,
        ],
    });

    const treatmentKeywords = [
        ...baseSkincare,
        'serum',
        wants.acne ? 'acne' : null,
        wants.acne ? 'salicylic' : null,
        wants.pores ? 'bha' : null,
        wants.pigmentation ? 'vitamin c' : null,
        wants.pigmentation ? 'niacinamide' : null,
        wants.redness ? 'centella' : null,
        wants.dull ? 'brightening' : null,
        wants.fineLines ? 'retinol' : null,
    ];

    const hasAnyConcern =
        wants.acne || wants.sensitive || wants.pigmentation || wants.dull || wants.redness || wants.pores || wants.fineLines || wants.darkCircles;

    if (hasAnyConcern) {
        skincareSlots.push({
            label: 'Treatment',
            concern: ['treatment'],
            categoryRegex: /skin\s*care|skincare/i,
            keywords: treatmentKeywords,
        });
    }

    const makeupKeywords = [
        ...baseMakeup,
        'foundation',
        wants.oily ? 'matte' : null,
        wants.dry ? 'hydrating' : null,
        toneLabel === 'deep' ? 'deep shade' : null,
        toneLabel === 'fair' ? 'fair shade' : null,
    ];

    const makeup = [
        {
            concern: ['foundation'],
            keywords: makeupKeywords,
            categoryRegex: /make\s*up|makeup|cosmetic/i,
        },
        {
            concern: ['concealer'],
            keywords: [...baseMakeup, 'concealer', wants.darkCircles ? 'dark circles' : null],
            categoryRegex: /make\s*up|makeup|cosmetic/i,
        },
        {
            concern: ['primer'],
            keywords: [...baseMakeup, 'primer', wants.oily ? 'pore' : null, wants.oily ? 'matte' : null],
            categoryRegex: /make\s*up|makeup|cosmetic/i,
        },
    ];

    return { skincareSlots, makeupSlots: makeup };
};

const pickUnique = ({ slots, candidatesBySlot, perSlot = 4, maxTotal = 18 }) => {
    const used = new Set();
    const out = {};

    let total = 0;
    for (const slot of slots) {
        const label = slot.label;
        const list = candidatesBySlot[label] || [];
        const picked = [];

        for (const p of list) {
            const id = String(p?._id || '');
            if (!id || used.has(id)) continue;
            used.add(id);

            picked.push({
                ...p,
                concern: slot.concern || [],
            });

            total += 1;
            if (picked.length >= perSlot) break;
            if (total >= maxTotal) break;
        }

        out[label] = picked;
        if (total >= maxTotal) break;
    }

    return out;
};

exports.getLexyRecommendations = asyncErrorHandler(async (req, res, next) => {
    const features = req.body?.features || {};
    const type = req.body?.type || 'All';
    const tone = req.body?.tone || 3;

    const limitPerSlot = clampInt(process.env.LEXY_RECO_PER_SLOT_LIMIT, 4, 16, 8);

    const plan = buildLexyPlan({ features, type, tone });

    const skincareCandidatesBySlot = {};
    for (const slot of plan.skincareSlots) {
        // eslint-disable-next-line no-await-in-loop
        skincareCandidatesBySlot[slot.label] = await getCandidates({
            keywords: slot.keywords,
            categoryRegex: slot.categoryRegex,
            limit: limitPerSlot,
            reqQuery: req.query,
        });
    }

    const general = pickUnique({
        slots: plan.skincareSlots,
        candidatesBySlot: skincareCandidatesBySlot,
        perSlot: 4,
        maxTotal: 16,
    });

    const makeupCandidates = [];
    const usedMakeup = new Set();
    for (const slot of plan.makeupSlots) {
        // eslint-disable-next-line no-await-in-loop
        const cands = await getCandidates({
            keywords: slot.keywords,
            categoryRegex: slot.categoryRegex,
            limit: 8,
            reqQuery: req.query,
        });

        for (const p of cands) {
            const id = String(p?._id || '');
            if (!id || usedMakeup.has(id)) continue;
            usedMakeup.add(id);
            makeupCandidates.push({ ...p, concern: slot.concern || [] });
            if (makeupCandidates.length >= 6) break;
        }
        if (makeupCandidates.length >= 6) break;
    }

    // If we couldn't find anything, the store might not have categories indexed yet.
    // Return a helpful error instead of empty UI.
    const anySkincare = Object.values(general).some((arr) => Array.isArray(arr) && arr.length);
    if (!anySkincare && makeupCandidates.length === 0) {
        return next(new ErrorHandler('Could not find matching products in the store catalog yet.', 404));
    }

    return res.status(200).json({
        general,
        makeup: makeupCandidates,
    });
});
