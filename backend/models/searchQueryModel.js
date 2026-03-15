const mongoose = require('mongoose');

const searchQuerySchema = new mongoose.Schema({
    query: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
        unique: true,
    },
    count: {
        type: Number,
        default: 1,
    },
    lastSearchedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

// Compound index for trending queries (high count + recent)
searchQuerySchema.index({ count: -1, lastSearchedAt: -1 });

module.exports = mongoose.model('SearchQuery', searchQuerySchema);
