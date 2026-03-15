const { MeiliSearch } = require('meilisearch');

let cachedClient;

const isMeiliEnabled = () => Boolean(process.env.MEILI_HOST);

const getMeiliClient = () => {
    if (!isMeiliEnabled()) return null;

    if (!cachedClient) {
        cachedClient = new MeiliSearch({
            host: process.env.MEILI_HOST,
            apiKey: process.env.MEILI_API_KEY || undefined,
        });
    }

    return cachedClient;
};

const getProductsIndexName = () => process.env.MEILI_PRODUCTS_INDEX || 'products';

const getProductsIndex = () => {
    const client = getMeiliClient();
    if (!client) return null;
    return client.index(getProductsIndexName());
};

module.exports = {
    isMeiliEnabled,
    getMeiliClient,
    getProductsIndexName,
    getProductsIndex,
};
