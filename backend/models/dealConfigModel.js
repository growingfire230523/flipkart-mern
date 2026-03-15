const mongoose = require('mongoose');

const dealConfigSchema = new mongoose.Schema(
    {
        endsAt: {
            type: Date,
            required: true,
        },
        dealOfDayProductId: {
            type: String,
            default: '',
        },
        dealOfDayEndsAt: {
            type: Date,
            default: null,
        },
        heroImageUrl: {
            type: String,
            default: '',
        },
        heroLink: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('DealConfig', dealConfigSchema);
