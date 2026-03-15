/**
 * Smart Search Suggestion Service
 *
 * Extracts keywords/phrases from the product catalog and provides
 * Flipkart/Amazon-style autocomplete suggestions:
 *   - Keyword phrases (not full product names)
 *   - Grouped by category
 *   - Fuzzy / typo-tolerant prefix matching
 *   - "Did you mean?" corrections
 *   - Trending searches
 *
 * Works with MongoDB only — no Meilisearch dependency.
 * When Meilisearch is available, it's used as an accelerator.
 */

const Product = require('../models/productModel');
const SearchQuery = require('../models/searchQueryModel');

// ── Stop words to skip when extracting keywords ────────────────────

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do',
    'for', 'from', 'get', 'has', 'have', 'he', 'her', 'his', 'how',
    'i', 'if', 'in', 'is', 'it', 'its', 'just', 'like', 'me', 'my',
    'no', 'nor', 'not', 'of', 'on', 'or', 'our', 'out', 'own', 'per',
    'she', 'so', 'than', 'that', 'the', 'their', 'them', 'then',
    'there', 'these', 'they', 'this', 'to', 'too', 'up', 'us', 'use',
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
    'who', 'why', 'will', 'with', 'you', 'your',
    'ml', 'gm', 'g', 'kg', 'oz', 'fl', 'pc', 'pcs', 'set',
    'new', 'pack', 'combo', 'free', 'best', 'top', 'buy',
]);

// ── In-memory keyword index ────────────────────────────────────────

let keywordIndex = [];       // Array of { keyword, category, subCategory, score }
let indexBuiltAt = null;
let buildInProgress = null;
const INDEX_TTL_MS = 10 * 60 * 1000;  // Rebuild every 10 minutes

// ── Synonyms for fuzzy matching ────────────────────────────────────

const SYNONYMS = {
    'lipstick': ['lip', 'lips', 'lip color', 'lip colour'],
    'lip': ['lipstick', 'lip gloss', 'lip liner', 'lip balm', 'lip care', 'lips'],
    'lips': ['lip', 'lipstick', 'lip kit'],
    'moisturizer': ['moisturiser', 'moisturizing', 'hydrating'],
    'moisturiser': ['moisturizer', 'moisturizing', 'hydrating'],
    'sunscreen': ['sun screen', 'spf', 'sun protection', 'sunblock'],
    'foundation': ['base', 'base makeup'],
    'mascara': ['lash', 'lashes', 'eye lash'],
    'eyeliner': ['eye liner', 'liner', 'kajal'],
    'kajal': ['eyeliner', 'kohl'],
    'concealer': ['cover', 'blemish'],
    'perfume': ['fragrance', 'cologne', 'scent', 'parfum', 'eau de'],
    'fragrance': ['perfume', 'scent'],
    'serum': ['face serum', 'skin serum'],
    'cleanser': ['face wash', 'cleaning', 'cleansing'],
    'face wash': ['cleanser', 'cleansing'],
    'toner': ['toning', 'skin toner'],
    'primer': ['face primer', 'makeup primer'],
    'blush': ['blusher', 'cheek color'],
    'highlighter': ['glow', 'shimmer', 'illuminator'],
    'contour': ['contouring', 'sculpt'],
    'nail': ['nail polish', 'nail paint', 'nail art', 'nails'],
    'shampoo': ['hair wash', 'hair cleanser'],
    'conditioner': ['hair conditioner'],
    'mask': ['face mask', 'sheet mask', 'hair mask'],
    'cream': ['moisturizer', 'lotion', 'face cream'],
    'lotion': ['body lotion', 'moisturizer'],
    'oil': ['face oil', 'hair oil', 'body oil'],
    'eye': ['eye care', 'eye cream', 'eye shadow', 'eyeshadow'],
    'eyeshadow': ['eye shadow', 'eye color'],
    'palette': ['eyeshadow palette', 'makeup palette'],
    'brush': ['makeup brush', 'brushes'],
    'sponge': ['beauty blender', 'makeup sponge'],
    'kit': ['set', 'combo', 'collection'],
    'skin care': ['skincare'],
    'skincare': ['skin care'],
    'makeup': ['make up', 'cosmetics'],
    'hair care': ['haircare'],
    'haircare': ['hair care'],
    'body care': ['bodycare', 'body wash'],
};

// ── Text processing helpers ────────────────────────────────────────

const normalize = (str) => String(str || '').trim().toLowerCase().replace(/[^a-z0-9\s&'-]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenize = (str) => {
    const words = normalize(str).split(' ');
    return words.filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
};

/**
 * Extract meaningful keyword phrases from a product name.
 * e.g. "Maybelline New York Color Sensational Creamy Matte Lipstick" →
 *   ["maybelline", "color sensational", "creamy matte lipstick", "matte lipstick",
 *    "lipstick", "creamy matte", "matte"]
 */
const extractPhrases = (name) => {
    const tokens = tokenize(name);
    if (!tokens.length) return [];

    const phrases = new Set();

    // Individual meaningful tokens
    for (const t of tokens) {
        if (t.length >= 3) phrases.add(t);
    }

    // Bigrams and trigrams (meaningful multi-word phrases)
    for (let i = 0; i < tokens.length; i++) {
        if (i + 1 < tokens.length) {
            phrases.add(`${tokens[i]} ${tokens[i + 1]}`);
        }
        if (i + 2 < tokens.length) {
            phrases.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
        }
    }

    return Array.from(phrases);
};

/**
 * Levenshtein distance for typo tolerance.
 */
const levenshtein = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    // Optimisation: if lengths differ by > 3, skip (won't match within threshold)
    if (Math.abs(a.length - b.length) > 3) return 4;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = b[i - 1] === a[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
};

// ── Build keyword index from product data ──────────────────────────

const buildKeywordIndex = async () => {
    const products = await Product.find({})
        .select('name category subCategory brand highlights')
        .lean();

    const keywordMap = new Map(); // keyword → { categories: Set, score: number }

    for (const p of products) {
        const cat = normalize(p.category || '');
        const subCat = normalize(p.subCategory || '');
        const brand = normalize(p.brand?.name || '');
        const name = normalize(p.name || '');

        // Extract phrases from product name
        const namePhrases = extractPhrases(p.name);
        for (const phrase of namePhrases) {
            const entry = keywordMap.get(phrase) || { categories: new Map(), score: 0 };
            const catKey = cat || 'all';
            entry.categories.set(catKey, (entry.categories.get(catKey) || 0) + 1);
            entry.score += 1;
            keywordMap.set(phrase, entry);
        }

        // Add category itself as a keyword
        if (cat && cat.length >= 3) {
            const entry = keywordMap.get(cat) || { categories: new Map(), score: 0 };
            entry.categories.set(cat, (entry.categories.get(cat) || 0) + 5);
            entry.score += 5;
            keywordMap.set(cat, entry);
        }

        // Add subcategory
        if (subCat && subCat.length >= 3) {
            const entry = keywordMap.get(subCat) || { categories: new Map(), score: 0 };
            const catKey = cat || 'all';
            entry.categories.set(catKey, (entry.categories.get(catKey) || 0) + 4);
            entry.score += 4;
            keywordMap.set(subCat, entry);
        }

        // Add brand name  
        if (brand && brand.length >= 2) {
            const entry = keywordMap.get(brand) || { categories: new Map(), score: 0 };
            const catKey = cat || 'all';
            entry.categories.set(catKey, (entry.categories.get(catKey) || 0) + 3);
            entry.score += 3;
            keywordMap.set(brand, entry);
        }

        // Add highlights as keywords
        if (Array.isArray(p.highlights)) {
            for (const h of p.highlights) {
                const hTokens = tokenize(h);
                for (const t of hTokens) {
                    if (t.length >= 3) {
                        const entry = keywordMap.get(t) || { categories: new Map(), score: 0 };
                        const catKey = cat || 'all';
                        entry.categories.set(catKey, (entry.categories.get(catKey) || 0) + 1);
                        entry.score += 0.5;
                        keywordMap.set(t, entry);
                    }
                }
            }
        }
    }

    // Convert to sorted array
    const index = [];
    for (const [keyword, data] of keywordMap) {
        // Find the dominant category
        let topCat = '';
        let topCount = 0;
        for (const [c, count] of data.categories) {
            if (count > topCount) { topCat = c; topCount = count; }
        }

        index.push({
            keyword,
            category: topCat,
            score: data.score,
            productCount: topCount,
        });
    }

    // Sort by score descending
    index.sort((a, b) => b.score - a.score);

    return index;
};

const getKeywordIndex = async () => {
    const now = Date.now();
    if (keywordIndex.length > 0 && indexBuiltAt && (now - indexBuiltAt) < INDEX_TTL_MS) {
        return keywordIndex;
    }

    // Prevent concurrent rebuilds
    if (buildInProgress) return buildInProgress;

    buildInProgress = buildKeywordIndex()
        .then((idx) => {
            keywordIndex = idx;
            indexBuiltAt = Date.now();
            console.log(`[search] keyword index built: ${idx.length} entries`);
            return idx;
        })
        .catch((err) => {
            console.error('[search] keyword index build failed:', err.message);
            return keywordIndex; // Return stale if available
        })
        .finally(() => {
            buildInProgress = null;
        });

    return buildInProgress;
};

// ── Smart suggestions ──────────────────────────────────────────────

/**
 * Get keyword suggestions for a search prefix.
 * Returns grouped keyword suggestions (like Flipkart/Amazon).
 *
 * @param {string} input - User's current typed input
 * @param {number} limit - Max suggestions to return
 * @returns {Promise<{ suggestions: Array, didYouMean: string|null }>}
 */
const getSmartSuggestions = async (input, limit = 10) => {
    const query = normalize(input);
    if (!query || query.length < 1) return { suggestions: [], didYouMean: null };

    const index = await getKeywordIndex();
    const results = [];
    let didYouMean = null;

    // ── Phase 1: Prefix match (fastest, highest priority) ──────────
    const prefixMatches = [];
    for (const entry of index) {
        if (entry.keyword.startsWith(query)) {
            prefixMatches.push({ ...entry, matchType: 'prefix', matchScore: entry.score + 100 });
        } else {
            // Check if any word in a multi-word keyword starts with query
            const words = entry.keyword.split(' ');
            if (words.some((w) => w.startsWith(query))) {
                prefixMatches.push({ ...entry, matchType: 'word_prefix', matchScore: entry.score + 50 });
            }
        }
    }
    results.push(...prefixMatches);

    // ── Phase 2: Contains match (if prefix didn't find enough) ─────
    if (results.length < limit) {
        for (const entry of index) {
            if (entry.keyword.includes(query) && !results.some((r) => r.keyword === entry.keyword)) {
                results.push({ ...entry, matchType: 'contains', matchScore: entry.score + 20 });
            }
        }
    }

    // ── Phase 3: Synonym expansion ─────────────────────────────────
    if (results.length < limit) {
        const synonyms = SYNONYMS[query] || [];
        // Also check partial synonym matches
        for (const [key, vals] of Object.entries(SYNONYMS)) {
            if (key.startsWith(query) || query.startsWith(key)) {
                synonyms.push(key, ...vals);
            }
        }

        const uniqueSynonyms = [...new Set(synonyms)];
        for (const syn of uniqueSynonyms) {
            for (const entry of index) {
                if (entry.keyword.includes(syn) && !results.some((r) => r.keyword === entry.keyword)) {
                    results.push({ ...entry, matchType: 'synonym', matchScore: entry.score + 10 });
                }
                if (results.length >= limit * 2) break;
            }
        }
    }

    // ── Phase 4: Fuzzy / typo-tolerant matching ────────────────────
    if (results.length < limit && query.length >= 4) {
        const maxDist = query.length <= 5 ? 1 : 2;
        const fuzzyMatches = [];

        for (const entry of index) {
            if (results.some((r) => r.keyword === entry.keyword)) continue;

            // Compare against the first word of the keyword for efficiency
            const firstWord = entry.keyword.split(' ')[0];
            const dist = levenshtein(query, firstWord);
            if (dist <= maxDist && dist > 0) {
                fuzzyMatches.push({ ...entry, matchType: 'fuzzy', matchScore: entry.score + (5 - dist) });
            }

            if (fuzzyMatches.length >= limit) break;
        }

        // If we found fuzzy matches and no prefix/contains matches, suggest correction
        if (results.length === 0 && fuzzyMatches.length > 0) {
            const bestFuzzy = fuzzyMatches.sort((a, b) => b.matchScore - a.matchScore)[0];
            didYouMean = bestFuzzy.keyword;
        }

        results.push(...fuzzyMatches);
    }

    // ── Phase 5: Multi-token query matching (e.g. "red lip") ───────
    const queryTokens = query.split(' ').filter((t) => t.length >= 2);
    if (queryTokens.length >= 2 && results.length < limit) {
        for (const entry of index) {
            if (results.some((r) => r.keyword === entry.keyword)) continue;
            const allMatch = queryTokens.every((t) => entry.keyword.includes(t));
            if (allMatch) {
                results.push({ ...entry, matchType: 'multi_token', matchScore: entry.score + 30 });
            }
        }
    }

    // ── Sort by matchScore and deduplicate ──────────────────────────
    results.sort((a, b) => b.matchScore - a.matchScore);

    // Deduplicate and group by category
    const seen = new Set();
    const deduped = [];
    for (const r of results) {
        if (seen.has(r.keyword)) continue;
        seen.add(r.keyword);
        deduped.push(r);
        if (deduped.length >= limit) break;
    }

    // ── Format for frontend ────────────────────────────────────────
    const suggestions = deduped.map((r) => ({
        keyword: r.keyword,
        category: r.category && r.category !== 'all' ? r.category : null,
        type: r.matchType,
    }));

    return { suggestions, didYouMean };
};

// ── Trending searches ──────────────────────────────────────────────

/**
 * Record a search query for trending analytics.
 */
const recordSearch = async (query) => {
    const q = normalize(query);
    if (!q || q.length < 2) return;

    try {
        await SearchQuery.findOneAndUpdate(
            { query: q },
            { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
            { upsert: true, new: true }
        );
    } catch (err) {
        // Non-critical — don't block the search response
        console.error('[search] recordSearch error:', err.message);
    }
};

/**
 * Get trending search queries.
 */
const getTrendingSearches = async (limit = 8) => {
    try {
        const trending = await SearchQuery.find({ count: { $gte: 2 } })
            .sort({ count: -1, lastSearchedAt: -1 })
            .limit(limit)
            .select('query count')
            .lean();

        if (trending.length >= 3) {
            return trending.map((t) => ({ keyword: t.query, searches: t.count }));
        }

        // If not enough tracked searches yet, generate from product data
        const index = await getKeywordIndex();
        const popular = index
            .filter((e) => e.keyword.length >= 4 && !e.keyword.includes(' '))
            .slice(0, limit)
            .map((e) => ({ keyword: e.keyword, searches: e.productCount }));

        return popular;
    } catch (err) {
        console.error('[search] getTrending error:', err.message);
        return [];
    }
};

// ── Invalidate index (call after product CRUD) ─────────────────────

const invalidateKeywordIndex = () => {
    indexBuiltAt = null;
};

module.exports = {
    getSmartSuggestions,
    recordSearch,
    getTrendingSearches,
    invalidateKeywordIndex,
    getKeywordIndex,
};
