const mongoose = require('mongoose');

const volumeVariantSchema = new mongoose.Schema(
    {
        volume: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        cuttedPrice: {
            type: Number,
            default: 0,
        },
        stock: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const sizeVariantSchema = new mongoose.Schema(
    {
        size: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        cuttedPrice: {
            type: Number,
            default: 0,
        },
        stock: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const colorVariantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        hex: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        cuttedPrice: {
            type: Number,
            default: 0,
        },
        stock: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const fragranceMetaSchema = new mongoose.Schema(
    {
        gender: {
            type: String,
            enum: ['feminine', 'masculine', 'unisex', 'unknown'],
            default: 'unknown',
            index: true,
        },
        smellFamilies: {
            type: [String],
            default: [],
        },
        intensity: {
            type: String,
            enum: ['discreet', 'personal', 'outgoing', 'bold', 'unknown'],
            default: 'unknown',
        },
        notes: {
            type: [String],
            default: [],
        },
        occasions: {
            type: [String],
            default: [],
        },
        tags: {
            type: [String],
            default: [],
        },
        updatedAt: {
            type: Date,
            default: null,
        },
        updatedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { _id: false }
);

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter product name"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "Please enter product description"]
    },
    highlights: [
        {
            type: String,
            required: true
        }
    ],
    catalogHighlights: {
        normal: {
            type: [String],
            default: [],
        },
        active: {
            type: [String],
            default: [],
        },
    },
    specifications: [
        {
            title: {
                type: String,
                required: true
            },
            description: {
                type: String,
                required: true
            }
        }
    ],
    price: {
        type: Number,
        required: [true, "Please enter product price"]
    },
    cuttedPrice: {
        type: Number,
        required: [true, "Please enter cutted price"]
    },
    isVolumeProduct: {
        type: Boolean,
        default: false,
    },
    volumeVariants: {
        type: [volumeVariantSchema],
        default: [],
    },
    isSizeProduct: {
        type: Boolean,
        default: false,
    },
    sizeVariants: {
        type: [sizeVariantSchema],
        default: [],
    },
    isColorProduct: {
        type: Boolean,
        default: false,
    },
    colorVariants: {
        type: [colorVariantSchema],
        default: [],
    },
    images: [
        {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        }
    ],
    brand: {
        name: {
            type: String,
            required: true
        },
        logo: {
            public_id: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true,
            }
        }
    },
    category: {
        type: String,
        required: [true, "Please enter product category"]
    },
    subCategory: {
        type: String,
        trim: true,
        default: ''
    },
    stock: {
        type: Number,
        required: [true, "Please enter product stock"],
        maxlength: [4, "Stock cannot exceed limit"],
        default: 1
    },
    warranty: {
        type: Number,
        default: 1
    },
    ratings: {
        type: Number,
        default: 0
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    orderCount: {
        type: Number,
        default: 0
    },
    reviews: [
        {
            user: {
                type: mongoose.Schema.ObjectId,
                ref: "User",
                required: true
            },
            name: {
                type: String,
                required: true
            },
            rating: {
                type: Number,
                required: true
            },
            comment: {
                type: String,
                required: true
            }
        }
    ],

    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    dealOfDay: {
        type: Boolean,
        default: false,
    },
    isGiftable: {
        type: Boolean,
        default: false,
    },
    isRefundable: {
        type: Boolean,
        default: true,
    },

    // Optional: precomputed metadata used by the Fragrance Finder.
    fragranceMeta: {
        type: fragranceMetaSchema,
        default: undefined,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

productSchema.index({ category: 1, subCategory: 1 });

productSchema.index({ orderCount: -1, createdAt: -1 });

// Fast, relevance-ranked search. (MongoDB supports only one text index per collection.)
productSchema.index(
    {
        name: 'text',
        'brand.name': 'text',
        category: 'text',
        subCategory: 'text',
        description: 'text',
        highlights: 'text',
        'specifications.title': 'text',
        'specifications.description': 'text',
    },
    {
        name: 'ProductTextSearchIndex',
        weights: {
            name: 12,
            'brand.name': 8,
            category: 6,
            subCategory: 6,
            highlights: 3,
            'specifications.title': 2,
            'specifications.description': 1,
            description: 1,
        },
    }
);

module.exports = mongoose.model('Product', productSchema);