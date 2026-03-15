const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

const connectDatabase = () => {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is not set. Check backend/config/config.env');
    }

    mongoose
        .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            console.log("Mongoose Connected");
        })
        .catch((err) => {
            console.error('Mongoose connection failed:', err.message);
            process.exit(1);
        });
}

module.exports = connectDatabase;