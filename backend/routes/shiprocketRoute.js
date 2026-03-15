const express = require('express');
const {
    shiprocketWebhook,
    createShipment,
    updateOrderStatus,
    cancelOrder,
    requestReturn,
    processReturn,
    completeRefund,
    getTracking,
    checkCodAvailability,
} = require('../controllers/shiprocketController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// ── Public webhook (Shiprocket pushes updates here) ────────────────
router.route('/shiprocket/webhook').post(shiprocketWebhook);

// ── Customer actions ───────────────────────────────────────────────
router.route('/order/:id/cancel').put(isAuthenticatedUser, cancelOrder);
router.route('/order/:id/return').post(isAuthenticatedUser, requestReturn);
router.route('/order/:id/tracking').get(isAuthenticatedUser, getTracking);
router.route('/shipping/cod-check').get(isAuthenticatedUser, checkCodAvailability);

// ── Admin actions ──────────────────────────────────────────────────
router.route('/admin/order/:id/ship').post(isAuthenticatedUser, authorizeRoles('admin'), createShipment);
router.route('/admin/order/:id/status').put(isAuthenticatedUser, authorizeRoles('admin'), updateOrderStatus);
router.route('/admin/order/:id/return').put(isAuthenticatedUser, authorizeRoles('admin'), processReturn);
router.route('/admin/order/:id/refund').put(isAuthenticatedUser, authorizeRoles('admin'), completeRefund);

module.exports = router;
