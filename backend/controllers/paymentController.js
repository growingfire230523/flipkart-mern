const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/paymentModel');
const ErrorHandler = require('../utils/errorHandler');

// ── Razorpay instance (lazy-initialized) ───────────────────────────
let razorpayInstance = null;

const getRazorpay = () => {
    if (razorpayInstance) return razorpayInstance;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return razorpayInstance;
};

// ── Create Razorpay Order ──────────────────────────────────────────
// POST /api/v1/payment/process
exports.createRazorpayOrder = asyncErrorHandler(async (req, res, next) => {
    const { amount } = req.body || {};
    if (!amount) return next(new ErrorHandler('Amount is required.', 400));

    const rp = getRazorpay();
    if (!rp) return next(new ErrorHandler('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.', 500));

    const options = {
        amount: Math.round(Number(amount) * 100), // Razorpay expects paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
    };

    const order = await rp.orders.create(options);

    res.status(200).json({
        success: true,
        order,
        key: process.env.RAZORPAY_KEY_ID,
    });
});

// ── Verify Razorpay Payment ────────────────────────────────────────
// POST /api/v1/payment/verify
exports.verifyPayment = asyncErrorHandler(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return next(new ErrorHandler('Missing payment verification details.', 400));
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return next(new ErrorHandler('Razorpay key secret not configured.', 500));

    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        return next(new ErrorHandler('Payment signature verification failed.', 400));
    }

    // Store payment record
    await Payment.create({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'PAID',
        amount: req.body.amount || 0,
        method: req.body.method || 'razorpay',
    });

    res.status(200).json({
        success: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
    });
});

// ── Razorpay Webhook ───────────────────────────────────────────────
// POST /api/v1/payment/webhook
exports.razorpayWebhook = asyncErrorHandler(async (req, res, next) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return res.status(200).json({ status: 'ok', message: 'Webhook secret not configured, skipping.' });
    }

    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    const razorpaySignature = req.headers['x-razorpay-signature'];
    if (digest !== razorpaySignature) {
        return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
        const payment = payload.payment?.entity;
        if (payment) {
            await Payment.findOneAndUpdate(
                { paymentId: payment.id },
                {
                    status: 'CAPTURED',
                    method: payment.method,
                    amount: payment.amount / 100,
                    currency: payment.currency,
                },
                { upsert: true, new: true }
            );
        }
    } else if (event === 'payment.failed') {
        const payment = payload.payment?.entity;
        if (payment) {
            await Payment.findOneAndUpdate(
                { paymentId: payment.id },
                { status: 'FAILED' },
                { upsert: true, new: true }
            );
        }
    }

    res.status(200).json({ status: 'ok' });
});

// ── Get Payment Status ─────────────────────────────────────────────
// GET /api/v1/payment/status/:id
exports.getPaymentStatus = asyncErrorHandler(async (req, res, next) => {
    const payment = await Payment.findOne({
        $or: [
            { orderId: req.params.id },
            { paymentId: req.params.id },
        ]
    });

    if (!payment) {
        return next(new ErrorHandler('Payment Details Not Found', 404));
    }

    res.status(200).json({
        success: true,
        txn: {
            id: payment.paymentId,
            status: payment.status,
        },
    });
});

// ── Get Razorpay Key (public) ──────────────────────────────────────
// GET /api/v1/payment/key
exports.getRazorpayKey = asyncErrorHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID,
    });
});

// ── Initiate Refund ────────────────────────────────────────────────
// Called internally from shiprocketController when refund is needed
exports.initiateRefund = async (razorpayPaymentId, amount) => {
    const rp = getRazorpay();
    if (!rp) throw new Error('Razorpay not configured');

    const refund = await rp.payments.refund(razorpayPaymentId, {
        amount: Math.round(Number(amount) * 100), // paise
    });

    return refund;
};
