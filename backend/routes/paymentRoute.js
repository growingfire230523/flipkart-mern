const express = require('express');
const { createRazorpayOrder, verifyPayment, razorpayWebhook, getPaymentStatus, getRazorpayKey } = require('../controllers/paymentController');
const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

// Create Razorpay order
router.route('/payment/process').post(isAuthenticatedUser, createRazorpayOrder);

// Verify payment after Razorpay checkout
router.route('/payment/verify').post(isAuthenticatedUser, verifyPayment);

// Razorpay webhook (server-to-server, no auth)
router.route('/payment/webhook').post(razorpayWebhook);

// Get payment status
router.route('/payment/status/:id').get(isAuthenticatedUser, getPaymentStatus);

// Get Razorpay key (public)
router.route('/payment/key').get(getRazorpayKey);

module.exports = router;