const mongoose = require('mongoose');

const perfumePromoBannerSchema = new mongoose.Schema(
    {
        heading: {
            type: String,
            trim: true,
            maxlength: [120, 'Heading cannot exceed 120 characters'],
            default: '',
        },
        subheading: {
            type: String,
            trim: true,
            maxlength: [200, 'Subheading cannot exceed 200 characters'],
            default: '',
        },
        ctaText: {
            type: String,
            trim: true,
            maxlength: [60, 'CTA text cannot exceed 60 characters'],
            default: 'Shop now',
        },
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
    { timestamps: true }
);

module.exports = mongoose.model('PerfumePromoBanner', perfumePromoBannerSchema);
