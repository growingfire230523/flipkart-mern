/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../config/config.env') });

const mongoose = require('mongoose');
const Product = require('../models/productModel');
const { isMeiliEnabled, getProductsIndex } = require('../services/meiliClient');
const { ensureProductsIndexConfigured } = require('../services/meiliProductIndex');
const { mapProductToMeiliDocument } = require('../services/meiliProductMapper');

const BATCH_SIZE = Number(process.env.MEILI_REINDEX_BATCH_SIZE) || 1000;

const connectMongo = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set. Check backend/config/config.env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Mongoose Connected');
};

const main = async () => {
    if (!isMeiliEnabled()) {
        throw new Error('MEILI_HOST is not set. Aborting.');
    }

    await connectMongo();

    try {
        await ensureProductsIndexConfigured();
        const index = getProductsIndex();

        const total = await Product.countDocuments();
        console.log(`[meili] reindexing products: ${total}`);

        let processed = 0;
        let page = 0;

        while (processed < total) {
            const products = await Product.find()
                .sort({ _id: 1 })
                .skip(page * BATCH_SIZE)
                .limit(BATCH_SIZE)
                .lean();

            if (!products.length) break;

            const docs = products
                .map(mapProductToMeiliDocument)
                .filter(Boolean);

            const task = await index.addDocuments(docs);
            try {
                await index.client.waitForTask(task.taskUid);
            } catch {
                // ignore
            }

            processed += products.length;
            page += 1;
            console.log(`[meili] indexed ${processed}/${total}`);
        }

        console.log('[meili] done');
    } finally {
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }
    }
};

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
