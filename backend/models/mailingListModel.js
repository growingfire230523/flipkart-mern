const mongoose = require('mongoose');

const mailingListSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            default: '',
            trim: true,
        },
        phone: {
            type: String,
            default: null,
            trim: true,
            index: true,
        },
        whatsappPromoOptIn: {
            type: Boolean,
            default: false,
        },
        whatsappPromoOptInAt: {
            type: Date,
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        source: {
            type: String,
            enum: ['footer', 'signup', 'google', 'admin'],
            default: 'footer',
        },
        unsubscribed: {
            type: Boolean,
            default: false,
        },
        unsubscribedAt: {
            type: Date,
            default: null,
        },
        subscribedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('MailingList', mailingListSchema);
