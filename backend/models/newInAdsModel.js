const mongoose = require('mongoose');

const newInAdsSchema = new mongoose.Schema(
    {
        left: {
            link: {
                type: String,
                trim: true,
                maxlength: [512, 'Link cannot exceed 512 characters'],
                default: '',
            },
            image: {
                public_id: { type: String, default: '' },
                url: { type: String, default: '' },
            },
        },
        right: {
            link: {
                type: String,
                trim: true,
                maxlength: [512, 'Link cannot exceed 512 characters'],
                default: '',
            },
            image: {
                public_id: { type: String, default: '' },
                url: { type: String, default: '' },
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('NewInAds', newInAdsSchema);
