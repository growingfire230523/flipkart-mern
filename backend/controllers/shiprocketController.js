/**
 * Shiprocket Controller
 *
 * Handles:
 * - Webhook from Shiprocket (auto-updates order status & tracking events)
 * - Admin: create shipment on Shiprocket
 * - Admin: cancel shipment
 * - Admin: approve/reject return requests
 * - Customer: request cancellation / return
 * - Tracking endpoint (pulls latest from Shiprocket)
 * - Multi-channel notifications on every status change
 */

const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/sendSms');
const normalizePhone = require('../utils/normalizePhone');
const { sendWhatsAppText } = require('../services/whatsappClient');
const shiprocket = require('../services/shiprocketClient');

// ── Helpers ────────────────────────────────────────────────────────

const truthy = (v) => String(v || '').toLowerCase() === 'true';

const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

const fmtDateTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })} - ${dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};

const addTrackingEvent = (order, { status, label, description, location, source }) => {
    order.trackingEvents.push({
        status,
        label,
        description: description || '',
        timestamp: new Date(),
        location: location || '',
        source: source || 'system',
    });
};

// ── Notification dispatcher ────────────────────────────────────────

const STATUS_MESSAGES = {
    'Order Confirmed': (name, oid) => `Hi ${name}, your order #${oid} is confirmed! We'll keep you updated.`,
    'Packed': (name, oid) => `Hi ${name}, your order #${oid} has been packed and is ready for pickup.`,
    'Shipped': (name, oid, extra) => `Hi ${name}, your order #${oid} has been shipped${extra?.courier ? ` via ${extra.courier}` : ''}. ${extra?.trackingId ? `Tracking: ${extra.trackingId}` : ''}`,
    'In Transit': (name, oid) => `Hi ${name}, your order #${oid} is in transit to your city.`,
    'Out For Delivery': (name, oid) => `Hi ${name}, your order #${oid} is out for delivery! Be ready.`,
    'Delivered': (name, oid) => `Hi ${name}, your order #${oid} has been delivered. Thank you for shopping!`,
    'Cancelled': (name, oid) => `Hi ${name}, your order #${oid} has been cancelled. If you paid online, refund will be processed shortly.`,
    'Return Requested': (name, oid) => `Hi ${name}, your return request for order #${oid} has been submitted. We'll review it soon.`,
    'Returned': (name, oid) => `Hi ${name}, your returned items for order #${oid} have been received.`,
    'Refunded': (name, oid) => `Hi ${name}, refund for order #${oid} has been initiated. It will reflect in 5-7 business days.`,
};

const sendOrderNotification = async (order, status, extra = {}) => {
    try {
        const user = await User.findById(order.user?._id || order.user).select('name email phone whatsappTransactionalOptIn').lean();
        if (!user) return;

        const name = user.name || 'there';
        const oid = String(order._id).slice(-8).toUpperCase();
        const msgFn = STATUS_MESSAGES[status];
        if (!msgFn) return;

        const message = msgFn(name, oid, extra);

        // Email
        try {
            await sendEmail({
                email: user.email,
                subject: `Order Update: ${status}`,
                text: message,
                html: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
            });
        } catch (e) {
            console.error('[notify] email error:', e.message);
        }

        const phone = normalizePhone(user.phone || order.shippingInfo?.phoneNo, 'IN');

        // SMS
        if (phone) {
            try {
                await sendSms({ to: phone, message });
            } catch (e) {
                console.error('[notify] sms error:', e.message);
            }
        }

        // WhatsApp
        if (phone && user.whatsappTransactionalOptIn && truthy(process.env.WHATSAPP_ALLOW_TEXT)) {
            try {
                await sendWhatsAppText({ to: phone, body: message });
            } catch (e) {
                console.error('[notify] whatsapp error:', e.message);
            }
        }
    } catch (e) {
        console.error('[notify] error:', e.message);
    }
};

// ── Webhook: Shiprocket push updates ───────────────────────────────

exports.shiprocketWebhook = asyncErrorHandler(async (req, res) => {
    const payload = req.body;
    console.log('[shiprocket-webhook] received:', JSON.stringify(payload).slice(0, 500));

    // Validate webhook token if configured
    const webhookToken = String(process.env.SHIPROCKET_WEBHOOK_TOKEN || '').trim();
    if (webhookToken) {
        const incomingToken = req.headers['x-shiprocket-token'] || req.query.token || '';
        if (incomingToken !== webhookToken) {
            return res.status(401).json({ success: false, message: 'Invalid webhook token' });
        }
    }

    const awb = payload.awb || payload.awb_code || '';
    const shiprocketOrderId = String(payload.order_id || payload.shiprocket_order_id || '').trim();
    const srStatus = payload.current_status || payload.status || '';
    const srStatusId = Number(payload.current_status_id || payload.status_id || 0);
    const srLocation = payload.scans?.city || payload.current_city || '';
    const edd = payload.etd || payload.estimated_delivery_date || '';

    // Find matching order
    let order;
    if (awb) {
        order = await Order.findOne({ 'courier.awbCode': awb });
    }
    if (!order && shiprocketOrderId) {
        order = await Order.findOne({ 'courier.shiprocketOrderId': shiprocketOrderId });
    }

    if (!order) {
        console.warn('[shiprocket-webhook] no matching order for AWB:', awb, 'SR-order:', shiprocketOrderId);
        return res.status(200).json({ success: true, message: 'No matching order' });
    }

    // Map to our status
    const newStatus = shiprocket.mapShiprocketStatus(srStatusId);
    const prevStatus = order.orderStatus;

    // Add tracking event
    addTrackingEvent(order, {
        status: newStatus || srStatus,
        label: srStatus,
        description: payload.status_description || srStatus,
        location: srLocation,
        source: 'webhook',
    });

    // Update EDD
    if (edd) {
        order.estimatedDelivery = new Date(edd);
    }

    // Update status + timestamps
    if (newStatus && newStatus !== prevStatus) {
        order.orderStatus = newStatus;

        if (newStatus === 'Packed') order.packedAt = new Date();
        if (newStatus === 'Shipped') order.shippedAt = order.shippedAt || new Date();
        if (newStatus === 'In Transit') order.inTransitAt = new Date();
        if (newStatus === 'Out For Delivery') order.outForDeliveryAt = new Date();
        if (newStatus === 'Delivered') order.deliveredAt = new Date();
        if (newStatus === 'Cancelled') order.cancelledAt = new Date();

        // Notify
        await sendOrderNotification(order, newStatus, {
            courier: order.courier?.name,
            trackingId: order.courier?.awbCode,
        });
    }

    await order.save({ validateBeforeSave: false });

    res.status(200).json({ success: true });
});

// ── Admin: Create shipment on Shiprocket ───────────────────────────

exports.createShipment = asyncErrorHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return next(new ErrorHandler('Order Not Found', 404));

    if (!shiprocket.isConfigured()) {
        return next(new ErrorHandler('Shiprocket is not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.', 500));
    }

    // Format date for Shiprocket
    const dt = new Date(order.createdAt);
    const orderDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

    const srItems = order.orderItems.map((item, idx) => ({
        name: item.name,
        sku: String(item.product || `PROD-${idx}`),
        units: item.quantity,
        selling_price: item.price,
        hsn: '',
    }));

    // Create order on Shiprocket
    const srResult = await shiprocket.createOrder({
        orderId: order._id,
        orderDate,
        billingName: order.user?.name || 'Customer',
        billingAddress: order.shippingInfo.address,
        billingCity: order.shippingInfo.city,
        billingState: order.shippingInfo.state,
        billingPincode: String(order.shippingInfo.pincode),
        billingCountry: order.shippingInfo.country || 'India',
        billingPhone: String(order.shippingInfo.phoneNo),
        billingEmail: order.user?.email || '',
        orderItems: srItems,
        subTotal: order.totalPrice,
        length: req.body.length || 20,
        width: req.body.width || 15,
        height: req.body.height || 10,
        weight: req.body.weight || 0.5,
    });

    // Save Shiprocket IDs
    order.courier.shiprocketOrderId = String(srResult.order_id || '');
    order.courier.shiprocketShipmentId = String(srResult.shipment_id || '');

    // If shipment was created, try to assign AWB
    if (srResult.shipment_id) {
        try {
            const awbResult = await shiprocket.assignAWB(srResult.shipment_id, req.body.courierId);
            if (awbResult?.response?.data) {
                const awbData = awbResult.response.data;
                order.courier.awbCode = String(awbData.awb_code || '');
                order.courier.name = String(awbData.courier_name || '');
                order.courier.trackingUrl = `https://shiprocket.co/tracking/${awbData.awb_code || ''}`;
            }
        } catch (e) {
            console.warn('[createShipment] AWB assignment failed:', e.message);
        }

        // Request pickup
        try {
            await shiprocket.requestPickup(srResult.shipment_id);
        } catch (e) {
            console.warn('[createShipment] Pickup request failed:', e.message);
        }
    }

    // Update status
    if (order.orderStatus === 'Order Confirmed' || order.orderStatus === 'Processing') {
        order.orderStatus = 'Packed';
        order.packedAt = new Date();
        addTrackingEvent(order, {
            status: 'Packed',
            label: 'Seller has processed your order',
            description: 'Your order has been packed and is ready for pickup by the courier.',
            source: 'admin',
        });
        await sendOrderNotification(order, 'Packed');
    }

    // EDD from Shiprocket
    if (srResult.etd) {
        order.estimatedDelivery = new Date(srResult.etd);
    }

    await order.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        shiprocketOrderId: order.courier.shiprocketOrderId,
        awbCode: order.courier.awbCode,
        courierName: order.courier.name,
    });
});

// ── Admin: Manual status update (extended) ─────────────────────────

exports.updateOrderStatus = asyncErrorHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone whatsappTransactionalOptIn');
    if (!order) return next(new ErrorHandler('Order Not Found', 404));

    const { status, trackingId, courierName, estimatedDelivery } = req.body;
    if (!status) return next(new ErrorHandler('Status is required', 400));

    const prevStatus = order.orderStatus;

    // Block invalid transitions
    if (['Delivered', 'Cancelled', 'Refunded'].includes(prevStatus) && status !== 'Return Requested') {
        return next(new ErrorHandler(`Cannot change status from ${prevStatus}`, 400));
    }

    order.orderStatus = status;

    // Set timestamps
    if (status === 'Order Confirmed') order.confirmedAt = order.confirmedAt || new Date();
    if (status === 'Packed') order.packedAt = order.packedAt || new Date();
    if (status === 'Shipped') {
        order.shippedAt = order.shippedAt || new Date();
        // Deduct stock on first ship
        if (prevStatus !== 'Shipped') {
            for (const item of order.orderItems) {
                await updateStock(item.product, item.quantity);
            }
        }
    }
    if (status === 'In Transit') order.inTransitAt = order.inTransitAt || new Date();
    if (status === 'Out For Delivery') order.outForDeliveryAt = order.outForDeliveryAt || new Date();
    if (status === 'Delivered') order.deliveredAt = new Date();
    if (status === 'Cancelled') order.cancelledAt = new Date();

    // Courier info from admin
    if (trackingId) order.courier.trackingId = trackingId;
    if (courierName) order.courier.name = courierName;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);

    // Tracking event
    addTrackingEvent(order, {
        status,
        label: status,
        description: req.body.description || `Order status updated to ${status}`,
        source: 'admin',
    });

    await order.save({ validateBeforeSave: false });

    // Notify
    if (prevStatus !== status) {
        await sendOrderNotification(order, status, {
            courier: order.courier?.name,
            trackingId: order.courier?.awbCode || order.courier?.trackingId,
        });
    }

    res.status(200).json({ success: true });
});

// ── Customer: Cancel order ─────────────────────────────────────────

exports.cancelOrder = asyncErrorHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler('Order Not Found', 404));

    // Only own orders
    if (String(order.user) !== String(req.user._id)) {
        return next(new ErrorHandler('Not authorized', 403));
    }

    // Can only cancel before shipping
    const cancellable = ['Processing', 'Order Confirmed', 'Packed'];
    if (!cancellable.includes(order.orderStatus)) {
        return next(new ErrorHandler(`Cannot cancel order in "${order.orderStatus}" status. Please request a return instead.`, 400));
    }

    order.orderStatus = 'Cancelled';
    order.cancelledAt = new Date();
    order.cancellation = {
        reason: String(req.body.reason || 'Customer requested cancellation').slice(0, 500),
        cancelledBy: 'customer',
        refundStatus: 'Pending',
        refundAmount: order.totalPrice,
    };

    addTrackingEvent(order, {
        status: 'Cancelled',
        label: 'Order Cancelled',
        description: `Cancelled by customer: ${order.cancellation.reason}`,
        source: 'system',
    });

    // Cancel on Shiprocket if applicable
    if (shiprocket.isConfigured() && order.courier.shiprocketOrderId) {
        try {
            await shiprocket.cancelOrder(order.courier.shiprocketOrderId);
        } catch (e) {
            console.warn('[cancelOrder] Shiprocket cancel failed:', e.message);
        }
    }

    // Auto-trigger Razorpay refund for online payments
    if (order.paymentInfo?.method === 'razorpay' && order.paymentInfo?.id && order.totalPrice > 0) {
        try {
            const { initiateRefund } = require('./paymentController');
            const refund = await initiateRefund(order.paymentInfo.id, order.totalPrice);
            order.cancellation.refundStatus = 'Refunded';
            order.cancellation.refundId = refund.id;
        } catch (err) {
            console.warn('[cancelOrder] Razorpay refund failed:', err.message);
        }
    }

    await order.save({ validateBeforeSave: false });
    await sendOrderNotification(order, 'Cancelled');

    res.status(200).json({ success: true, message: 'Order cancelled successfully.' });
});

// ── Customer: Request return ───────────────────────────────────────

exports.requestReturn = asyncErrorHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler('Order Not Found', 404));

    if (String(order.user) !== String(req.user._id)) {
        return next(new ErrorHandler('Not authorized', 403));
    }

    if (order.orderStatus !== 'Delivered') {
        return next(new ErrorHandler('Returns can only be requested for delivered orders.', 400));
    }

    if (order.returnRequest) {
        return next(new ErrorHandler('A return request already exists for this order.', 400));
    }

    // Check return window (7 days)
    const daysSinceDelivery = (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
        return next(new ErrorHandler('Return window of 7 days has expired.', 400));
    }

    // Filter to refundable items only
    const returnItemIds = req.body.items || []; // array of product IDs to return
    const returnItems = order.orderItems
        .filter((item) => {
            if (returnItemIds.length === 0) return item.isRefundable !== false;
            return returnItemIds.includes(String(item.product)) && item.isRefundable !== false;
        });

    if (returnItems.length === 0) {
        return next(new ErrorHandler('No refundable items found in this order.', 400));
    }

    const refundAmount = returnItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    order.orderStatus = 'Return Requested';
    order.returnRequest = {
        reason: String(req.body.reason || 'Customer initiated return').slice(0, 500),
        description: String(req.body.description || '').slice(0, 1000),
        status: 'Requested',
        requestedAt: new Date(),
        refundAmount,
        items: returnItems.map((item) => ({
            product: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
        })),
    };

    addTrackingEvent(order, {
        status: 'Return Requested',
        label: 'Return Requested',
        description: `Customer requested return for ${returnItems.length} item(s).`,
        source: 'system',
    });

    await order.save({ validateBeforeSave: false });
    await sendOrderNotification(order, 'Return Requested');

    res.status(200).json({ success: true, message: 'Return request submitted.' });
});

// ── Admin: Process return (approve/reject) ─────────────────────────

exports.processReturn = asyncErrorHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler('Order Not Found', 404));
    if (!order.returnRequest) return next(new ErrorHandler('No return request found.', 400));

    const { action, adminNote } = req.body; // action: 'approve' | 'reject'

    if (action === 'reject') {
        order.returnRequest.status = 'Rejected';
        order.returnRequest.resolvedAt = new Date();
        order.returnRequest.adminNote = String(adminNote || '').slice(0, 500);
        order.orderStatus = 'Delivered'; // revert

        addTrackingEvent(order, {
            status: 'Return Rejected',
            label: 'Return Request Rejected',
            description: adminNote || 'Your return request has been rejected.',
            source: 'admin',
        });

        await order.save({ validateBeforeSave: false });
        return res.status(200).json({ success: true, message: 'Return rejected.' });
    }

    // Approve
    order.returnRequest.status = 'Approved';
    order.returnRequest.adminNote = String(adminNote || '').slice(0, 500);

    addTrackingEvent(order, {
        status: 'Return Approved',
        label: 'Return Approved',
        description: 'Your return has been approved. Pickup will be scheduled.',
        source: 'admin',
    });

    // Create return on Shiprocket if configured
    if (shiprocket.isConfigured()) {
        try {
            const dt = new Date();
            const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

            const srReturn = await shiprocket.createReturn({
                orderId: order._id,
                orderDate: dateStr,
                pickupName: order.shippingInfo.address ? order.user?.name || 'Customer' : 'Customer',
                pickupAddress: order.shippingInfo.address,
                pickupCity: order.shippingInfo.city,
                pickupState: order.shippingInfo.state,
                pickupPincode: String(order.shippingInfo.pincode),
                pickupPhone: String(order.shippingInfo.phoneNo),
                orderItems: order.returnRequest.items.map((item, idx) => ({
                    name: item.name,
                    sku: String(item.product || `RET-${idx}`),
                    units: item.quantity,
                    selling_price: item.price,
                    hsn: '',
                })),
                subTotal: order.returnRequest.refundAmount,
            });
            order.returnRequest.shiprocketReturnId = String(srReturn.order_id || '');
            order.returnRequest.status = 'Pickup Scheduled';
        } catch (e) {
            console.warn('[processReturn] Shiprocket return creation failed:', e.message);
        }
    }

    await order.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'Return approved.' });
});

// ── Admin: Complete refund ─────────────────────────────────────────

exports.completeRefund = asyncErrorHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler('Order Not Found', 404));
    if (!order.returnRequest) return next(new ErrorHandler('No return request found.', 400));

    const refundAmount = order.returnRequest.refundAmount || 0;

    // Auto-trigger Razorpay refund for online payments
    let razorpayRefund = null;
    if (order.paymentInfo?.method === 'razorpay' && order.paymentInfo?.id && refundAmount > 0) {
        try {
            const { initiateRefund } = require('./paymentController');
            razorpayRefund = await initiateRefund(order.paymentInfo.id, refundAmount);
        } catch (err) {
            console.error('Razorpay refund failed:', err.message);
            // Continue — admin can manually refund
        }
    }

    order.returnRequest.status = 'Refunded';
    order.returnRequest.resolvedAt = new Date();
    order.returnRequest.refundMethod = razorpayRefund
        ? 'Razorpay (Auto)'
        : String(req.body.refundMethod || 'Original Payment Method').slice(0, 100);
    order.orderStatus = 'Refunded';

    addTrackingEvent(order, {
        status: 'Refunded',
        label: 'Refund Processed',
        description: `₹${refundAmount} refunded via ${order.returnRequest.refundMethod}.${razorpayRefund ? ` Refund ID: ${razorpayRefund.id}` : ''}`,
        source: 'admin',
    });

    // Restore stock on refund
    for (const item of (order.returnRequest.items || [])) {
        if (item.product) {
            try {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            } catch (_) { /* ignore */ }
        }
    }

    await order.save({ validateBeforeSave: false });
    await sendOrderNotification(order, 'Refunded');

    res.status(200).json({ success: true, message: 'Refund processed.' });
});

// ── Public: Get live tracking ──────────────────────────────────────

exports.getTracking = asyncErrorHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler('Order Not Found', 404));

    // Pull fresh tracking from Shiprocket if AWB exists
    if (shiprocket.isConfigured() && order.courier.awbCode) {
        try {
            const trackData = await shiprocket.trackByAWB(order.courier.awbCode);
            const activities = trackData?.tracking_data?.shipment_track_activities || [];

            // Merge new events
            const existingTimestamps = new Set(
                order.trackingEvents.map((e) => `${e.label}-${e.timestamp.toISOString()}`)
            );

            for (const act of activities) {
                const key = `${act['sr-status']}-${new Date(act.date).toISOString()}`;
                if (!existingTimestamps.has(key)) {
                    order.trackingEvents.push({
                        status: act['sr-status'] || act.activity,
                        label: act['sr-status'] || act.activity,
                        description: act.activity || '',
                        timestamp: new Date(act.date),
                        location: act.location || '',
                        source: 'shiprocket',
                    });
                }
            }

            // Update EDD
            const shipmentTrack = trackData?.tracking_data?.shipment_track?.[0];
            if (shipmentTrack?.edd) {
                order.estimatedDelivery = new Date(shipmentTrack.edd);
            }

            // Sort events by timestamp descending
            order.trackingEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            await order.save({ validateBeforeSave: false });
        } catch (e) {
            console.warn('[getTracking] Shiprocket tracking fetch failed:', e.message);
        }
    }

    res.status(200).json({
        success: true,
        orderStatus: order.orderStatus,
        estimatedDelivery: order.estimatedDelivery,
        courier: order.courier,
        trackingEvents: order.trackingEvents,
        confirmedAt: order.confirmedAt || order.createdAt,
        packedAt: order.packedAt,
        shippedAt: order.shippedAt,
        inTransitAt: order.inTransitAt,
        outForDeliveryAt: order.outForDeliveryAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        returnRequest: order.returnRequest,
        cancellation: order.cancellation,
    });
});

// ── Helper ─────────────────────────────────────────────────────────

async function updateStock(id, quantity) {
    const product = await Product.findById(id);
    if (product) {
        product.stock -= quantity;
        await product.save({ validateBeforeSave: false });
    }
}

// ── COD Serviceability Check ───────────────────────────────────────
// GET /api/v1/shipping/cod-check?pincode=110001
exports.checkCodAvailability = asyncErrorHandler(async (req, res, next) => {
    const { pincode } = req.query;
    if (!pincode) return next(new ErrorHandler('Pincode is required.', 400));

    // Default: COD available if Shiprocket is not configured
    if (!shiprocket.isConfigured()) {
        return res.status(200).json({
            success: true,
            codAvailable: true,
            message: 'Shipping provider not configured. COD allowed by default.',
        });
    }

    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || '110001';

    try {
        const result = await shiprocket.checkServiceability({
            pickupPincode,
            deliveryPincode: String(pincode),
            weight: 0.5,
            cod: true,
        });

        // Shiprocket returns available_courier_companies for COD
        const codCouriers = result?.data?.available_courier_companies || [];
        const codAvailable = codCouriers.length > 0;

        res.status(200).json({
            success: true,
            codAvailable,
            estimatedDays: codAvailable ? codCouriers[0]?.etd : null,
            message: codAvailable ? 'COD available for this pincode.' : 'COD not available for this pincode.',
        });
    } catch (err) {
        console.warn('[checkCodAvailability] Shiprocket check failed:', err.message);
        // Fallback: allow COD if check fails
        res.status(200).json({
            success: true,
            codAvailable: true,
            message: 'Unable to verify. COD allowed by default.',
        });
    }
});
