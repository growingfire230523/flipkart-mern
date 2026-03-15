const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'assistant', 'system', 'tool'],
            required: true,
        },
        content: {
            type: String,
            default: '',
        },
        toolCallId: { type: String, default: null },
        toolCalls: { type: mongoose.Schema.Types.Mixed, default: null },
        products: [
            {
                _id: mongoose.Schema.Types.ObjectId,
                name: String,
                price: Number,
                cuttedPrice: Number,
                image: String,
                ratings: Number,
                numOfReviews: Number,
            },
        ],
    },
    { _id: false, timestamps: false }
);

const chatSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            index: true,
        },
        guestId: {
            type: String,
            index: true,
        },
        messages: {
            type: [chatMessageSchema],
            default: [],
        },
        memory: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        lastActiveAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// TTL: auto-delete sessions with no activity for 30 days
chatSessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
