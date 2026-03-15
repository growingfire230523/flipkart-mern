const { getProductsIndex, isMeiliEnabled } = require('./meiliClient');
const { mapProductToMeiliDocument } = require('./meiliProductMapper');

const safeLog = (...args) => {
    if (process.env.MEILI_LOGGING === 'true') console.log(...args);
};

const upsertProductToMeili = async (productDoc) => {
    if (!isMeiliEnabled()) return;
    const index = getProductsIndex();
    if (!index) return;

    const doc = mapProductToMeiliDocument(productDoc);
    if (!doc) return;

    try {
        await index.addDocuments([doc]);
    } catch (e) {
        safeLog('[meili] upsert failed:', e?.message || e);
    }
};

const deleteProductFromMeili = async (productId) => {
    if (!isMeiliEnabled()) return;
    const index = getProductsIndex();
    if (!index) return;

    const id = String(productId || '').trim();
    if (!id) return;

    try {
        await index.deleteDocument(id);
    } catch (e) {
        safeLog('[meili] delete failed:', e?.message || e);
    }
};

module.exports = {
    upsertProductToMeili,
    deleteProductFromMeili,
};
