const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please enter your name'],
            trim: true,
            maxlength: [60, 'Name cannot exceed 60 characters'],
        },
        role: {
            type: String,
            trim: true,
            maxlength: [80, 'Role cannot exceed 80 characters'],
            default: 'Happy Customer',
        },
        rating: {
            type: Number,
            required: [true, 'Please provide a rating'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        review: {
            type: String,
            required: [true, 'Please write a review'],
            trim: true,
            maxlength: [1000, 'Review cannot exceed 1000 characters'],
        },
        image: {
            public_id: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true,
            },
        },
        productImage: {
            public_id: {
                type: String,
            },
            url: {
                type: String,
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Testimonial', testimonialSchema);
