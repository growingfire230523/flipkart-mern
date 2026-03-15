const mongoose = require('mongoose');

const mailCampaignSchema = new mongoose.Schema(
    {
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        body: {
            type: String,
            required: true,
        },
        attachments: [
            {
                name: { type: String, default: '' },
                contentType: { type: String, default: '' },
                size: { type: Number, default: 0 },
                dataBase64: { type: String, default: '' },
            },
        ],
        mode: {
            type: String,
            enum: ['immediate', 'scheduled'],
            default: 'immediate',
        },
        scheduledAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ['queued', 'scheduled', 'sending', 'sent', 'failed'],
            default: 'queued',
        },
        filters: {
            keyword: { type: String, default: '' },
            source: { type: String, default: '' },
            dateFrom: { type: Date, default: null },
            dateTo: { type: Date, default: null },
        },
        totals: {
            total: { type: Number, default: 0 },
            sent: { type: Number, default: 0 },
            failed: { type: Number, default: 0 },
        },
        lastError: {
            type: String,
            default: '',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('MailCampaign', mailCampaignSchema);
