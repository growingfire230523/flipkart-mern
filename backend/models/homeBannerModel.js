const mongoose = require('mongoose');

const bannerSlotSchema = new mongoose.Schema(
    {
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
    { _id: false }
);

const homeBannerSchema = new mongoose.Schema(
    {
        slot1: { type: bannerSlotSchema, default: () => ({}) },
        slot2: { type: bannerSlotSchema, default: () => ({}) },
        slot3: { type: bannerSlotSchema, default: () => ({}) },
        slot4: { type: bannerSlotSchema, default: () => ({}) },
    },
    { timestamps: true }
);

module.exports = mongoose.model('HomeBanner', homeBannerSchema);
