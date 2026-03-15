const mongoose = require('mongoose');

const communityBannerSchema = new mongoose.Schema(
    {
        isActive: {
            type: Boolean,
            default: false,
        },
        link: {
            type: String,
            trim: true,
            maxlength: [512, 'Link cannot exceed 512 characters'],
            default: '',
        },
        image: {
            public_id: {
                type: String,
                default: '',
            },
            url: {
                type: String,
                default: '',
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('CommunityBanner', communityBannerSchema);
