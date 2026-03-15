const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
    },
    paymentId: {
        type: String,
        required: true,
    },
    signature: {
        type: String,
    },
    status: {
        type: String,
        required: true,
        enum: ['CREATED', 'PAID', 'CAPTURED', 'FAILED', 'REFUNDED'],
        default: 'CREATED',
    },
    amount: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: 'INR',
    },
    method: {
        type: String,
    },
    refundId: {
        type: String,
    },
    refundAmount: {
        type: Number,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ paymentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);