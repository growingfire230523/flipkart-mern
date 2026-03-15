const { getProductsIndex, isMeiliEnabled } = require('./meiliClient');

const DEFAULT_SYNONYMS = {
    'airbrush': ['air brush'],
    'air brush': ['airbrush'],
    'highlighter': ['glow', 'shimmer'],
    'glow': ['highlighter', 'shimmer'],
    'shimmer': ['glow', 'highlighter'],
    'moisturiser': ['moisturizer'],
    'moisturizer': ['moisturiser'],
    'sunscreen': ['sun screen', 'spf'],
    'sun screen': ['sunscreen', 'spf'],
};

const getIndexSettings = () => ({
    searchableAttributes: [
        'name',
        'tags',
        'brandName',
        'category',
        'subCategory',
        'highlights',
        'specificationTexts',
        'description',
    ],
    filterableAttributes: [
        'brandName',
        'category',
        'subCategory',
        'finish',
        'coverage',
        'color',
        'size',
        'fragranceNote',
        'exclusivesServices',
        'formulation',
        'price',
        'cuttedPrice',
        'stock',
        'ratings',
        'numOfReviews',
        'orderCount',
        'dealOfDay',
        'isGiftable',
        'createdAt',
    ],
    sortableAttributes: ['price', 'ratings', 'orderCount', 'createdAt'],
    rankingRules: ['exactness', 'words', 'typo', 'proximity', 'attribute', 'sort'],
    typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
            oneTypo: 4,
            twoTypos: 8,
        },
    },
    synonyms: DEFAULT_SYNONYMS,
});

const ensureProductsIndexConfigured = async () => {
    if (!isMeiliEnabled()) return { enabled: false };
    const index = getProductsIndex();
    if (!index) return { enabled: false };

    const settings = getIndexSettings();
    const task = await index.updateSettings(settings);

    try {
        const client = index.client;
        await client.waitForTask(task.taskUid);
    } catch {
        // Non-fatal; settings update is async.
    }

    return { enabled: true, task };
};

module.exports = {
    ensureProductsIndexConfigured,
    getIndexSettings,
};
