const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────────────

const trackingEventSchema = new mongoose.Schema(
    {
        status: { type: String, required: true },
        label: { type: String, required: true },
        description: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        location: { type: String, default: '' },
        source: { type: String, enum: ['system', 'admin', 'shiprocket', 'webhook'], default: 'system' },
    },
    { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
    {
        reason: { type: String, required: true },
        description: { type: String, default: '' },
        status: {
            type: String,
            enum: ['Requested', 'Approved', 'Pickup Scheduled', 'Picked Up', 'Refund Initiated', 'Refunded', 'Rejected'],
            default: 'Requested',
        },
        requestedAt: { type: Date, default: Date.now },
        resolvedAt: { type: Date },
        refundAmount: { type: Number, default: 0 },
        refundMethod: { type: String, default: '' },
        adminNote: { type: String, default: '' },
        shiprocketReturnId: { type: String, default: '' },
        items: [
            {
                product: { type: mongoose.Schema.ObjectId, ref: 'Product' },
                name: { type: String },
                quantity: { type: Number, default: 1 },
                price: { type: Number },
                image: { type: String },
            },
        ],
    },
    { _id: true }
);

// ── Main order schema ──────────────────────────────────────────────

const orderSchema = new mongoose.Schema({
    shippingInfo: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pincode: {
            type: Number,
            required: true
        },
        phoneNo: {
            type: Number,
            required: true
        },
    },
    orderItems: [
        {
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            image: {
                type: String,
                required: true
            },
            product: {
                type: mongoose.Schema.ObjectId,
                ref: "Product",
                required: true
            },
            isRefundable: {
                type: Boolean,
                default: true
            },
        },
    ],
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    paymentInfo: {
        id: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true
        },
        method: {
            type: String,  // 'razorpay' | 'COD'
        },
        razorpayOrderId: {
            type: String,
        },
    },
    paidAt: {
        type: Date,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    },

    // ── Flipkart-style status flow ─────────────────────────────────
    // Order Confirmed → Packed → Shipped → Out For Delivery → Delivered
    // Also supports: Cancelled, Return Requested, Returned, Refunded
    orderStatus: {
        type: String,
        required: true,
        default: "Order Confirmed",
        enum: [
            'Processing',           // legacy compat
            'Order Confirmed',
            'Packed',
            'Shipped',
            'In Transit',
            'Out For Delivery',
            'Delivered',
            'Cancelled',
            'Return Requested',
            'Returned',
            'Refunded',
        ],
    },

    // ── Timestamps for each milestone ──────────────────────────────
    confirmedAt: { type: Date },
    packedAt: { type: Date },
    shippedAt: { type: Date },
    inTransitAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },

    // ── Courier / Shiprocket fields ────────────────────────────────
    courier: {
        name: { type: String, default: '' },
        trackingId: { type: String, default: '' },
        awbCode: { type: String, default: '' },
        shiprocketOrderId: { type: String, default: '' },
        shiprocketShipmentId: { type: String, default: '' },
        trackingUrl: { type: String, default: '' },
    },

    // ── Estimated delivery date (from Shiprocket) ──────────────────
    estimatedDelivery: { type: Date },

    // ── Full tracking event timeline ───────────────────────────────
    trackingEvents: {
        type: [trackingEventSchema],
        default: [],
    },

    // ── Cancellation ───────────────────────────────────────────────
    cancellation: {
        reason: { type: String, default: '' },
        cancelledBy: { type: String, enum: ['customer', 'admin', 'system', ''], default: '' },
        refundStatus: { type: String, default: '' },
        refundAmount: { type: Number, default: 0 },
    },

    // ── Return / Refund ────────────────────────────────────────────
    returnRequest: {
        type: returnRequestSchema,
        default: undefined,
    },

    invoice: {
        public_id: String,
        url: String,
        uploadedAt: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model("Order", orderSchema);