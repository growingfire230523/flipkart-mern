const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const normalizePhone = require('../utils/normalizePhone');
const { sendWhatsAppTemplate, sendWhatsAppText } = require('../services/whatsappClient');
const cloudinary = require('cloudinary');

const truthy = (value) => String(value || '').toLowerCase() === 'true';

const safeSendWhatsApp = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return { skipped: true, reason: 'whatsapp_send_failed', error: String(e?.message || e) };
    }
};

const sendOrderWhatsApp = async ({ to, userName, orderId, totalPrice, status }) => {
    if (!to) return { skipped: true, reason: 'missing_to' };

    const languageCode = String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en').trim();
    const allowText = truthy(process.env.WHATSAPP_ALLOW_TEXT);

    if (status === 'placed') {
        const templateName = String(process.env.WHATSAPP_TEMPLATE_ORDER_PLACED || '').trim();
        if (templateName) {
            return safeSendWhatsApp(() =>
                sendWhatsAppTemplate({
                    to,
                    name: templateName,
                    languageCode,
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: String(userName || 'Customer') },
                                { type: 'text', text: String(orderId) },
                                { type: 'text', text: String(totalPrice) },
                            ],
                        },
                    ],
                })
            );
        }

        if (allowText) {
            const msg = `Hi ${userName || 'there'}, your order ${orderId} is confirmed. Total: ${totalPrice}.`;
            return safeSendWhatsApp(() => sendWhatsAppText({ to, body: msg }));
        }

        return { skipped: true, reason: 'no_template_and_text_disabled' };
    }

    if (status === 'shipped') {
        const templateName = String(process.env.WHATSAPP_TEMPLATE_ORDER_SHIPPED || '').trim();
        if (templateName) {
            return safeSendWhatsApp(() =>
                sendWhatsAppTemplate({
                    to,
                    name: templateName,
                    languageCode,
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: String(userName || 'Customer') },
                                { type: 'text', text: String(orderId) },
                            ],
                        },
                    ],
                })
            );
        }

        if (allowText) {
            const msg = `Hi ${userName || 'there'}, your order ${orderId} has been shipped.`;
            return safeSendWhatsApp(() => sendWhatsAppText({ to, body: msg }));
        }

        return { skipped: true, reason: 'no_template_and_text_disabled' };
    }

    if (status === 'delivered') {
        const templateName = String(process.env.WHATSAPP_TEMPLATE_ORDER_DELIVERED || '').trim();
        if (templateName) {
            return safeSendWhatsApp(() =>
                sendWhatsAppTemplate({
                    to,
                    name: templateName,
                    languageCode,
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: String(userName || 'Customer') },
                                { type: 'text', text: String(orderId) },
                            ],
                        },
                    ],
                })
            );
        }

        if (allowText) {
            const msg = `Hi ${userName || 'there'}, your order ${orderId} has been delivered.`;
            return safeSendWhatsApp(() => sendWhatsAppText({ to, body: msg }));
        }

        return { skipped: true, reason: 'no_template_and_text_disabled' };
    }

    return { skipped: true, reason: 'unknown_status' };
};

// Create New Order
exports.newOrder = asyncErrorHandler(async (req, res, next) => {

    const {
        shippingInfo,
        orderItems,
        paymentInfo,
        totalPrice,
    } = req.body;

    const whatsappTransactionalOptIn = req.body?.whatsappTransactionalOptIn;

    const isMockPayments = String(process.env.MOCK_PAYMENTS || '').toLowerCase() === 'true';

    // In real payment mode, guard against duplicate orders for the same paymentInfo.
    // In MOCK_PAYMENTS mode, allow repeated test orders with the same payload so email flows
    // and admin dashboards can be exercised freely.
    if (!isMockPayments && paymentInfo) {
        const orderExist = await Order.findOne({ paymentInfo });
        if (orderExist) {
            return next(new ErrorHandler("Order Already Placed", 400));
        }
    }

    const order = await Order.create({
        shippingInfo,
        orderItems,
        paymentInfo,
        totalPrice,
        paidAt: Date.now(),
        user: req.user._id,
        orderStatus: 'Order Confirmed',
        confirmedAt: new Date(),
        trackingEvents: [{
            status: 'Order Confirmed',
            label: 'Order Confirmed',
            description: 'Your order has been placed successfully.',
            timestamp: new Date(),
            source: 'system',
        }],
    });

    // Populate isRefundable from product catalog for each order item
    try {
        const productIds = orderItems.map((i) => i.product).filter(Boolean);
        if (productIds.length) {
            const products = await Product.find({ _id: { $in: productIds } }).select('_id isRefundable').lean();
            const refundMap = new Map(products.map((p) => [String(p._id), p.isRefundable !== false]));
            for (const item of order.orderItems) {
                item.isRefundable = refundMap.get(String(item.product)) ?? true;
            }
            await order.save({ validateBeforeSave: false });
        }
    } catch (_) {
        // Non-critical: default isRefundable=true will apply
    }

    const normalizedPhone = normalizePhone(shippingInfo?.phoneNo, 'IN');
    const optedIn = typeof whatsappTransactionalOptIn === 'boolean'
        ? whatsappTransactionalOptIn
        : String(whatsappTransactionalOptIn || '').toLowerCase() === 'true';

    const freshUser = await User.findById(req.user._id);
    if (freshUser) {
        // Persist the latest shipping address as the user's default.
        try {
            if (shippingInfo && typeof shippingInfo === 'object') {
                freshUser.defaultShippingAddress = {
                    address: String(shippingInfo.address || '').trim() || undefined,
                    city: String(shippingInfo.city || '').trim() || undefined,
                    state: String(shippingInfo.state || '').trim() || undefined,
                    country: String(shippingInfo.country || '').trim() || undefined,
                    pincode: String(shippingInfo.pincode || '').trim() || undefined,
                    phoneNo: String(shippingInfo.phoneNo || '').trim() || undefined,
                };
            }
        } catch {
            // ignore formatting errors
        }

        if (optedIn && normalizedPhone) {
            // Only set phone if empty or identical; phone is unique on User.
            if (!freshUser.phone || freshUser.phone === normalizedPhone) {
                freshUser.phone = normalizedPhone;
            }
            if (!freshUser.whatsappTransactionalOptIn) {
                freshUser.whatsappTransactionalOptIn = true;
                freshUser.whatsappTransactionalOptInAt = new Date();
            }
        }

        try {
            await freshUser.save({ validateBeforeSave: false });
        } catch {
            // Ignore duplicate phone conflicts or other save issues.
        }
    }

    // Increment per-product orderCount once per order (distinct by product).
    const uniqueProductIds = Array.from(
        new Set((orderItems || []).map((i) => (i && i.product ? String(i.product) : null)).filter(Boolean))
    );

    if (uniqueProductIds.length) {
        await Product.bulkWrite(
            uniqueProductIds.map((id) => ({
                updateOne: {
                    filter: { _id: id },
                    update: { $inc: { orderCount: 1 } },
                }
            }))
        );
    }

    const hasOrderTemplate = Boolean(process.env.SENDGRID_ORDER_TEMPLATEID);

    if (hasOrderTemplate) {
        await sendEmail({
            email: req.user.email,
            templateId: process.env.SENDGRID_ORDER_TEMPLATEID,
            data: {
                name: req.user.name,
                shippingInfo,
                orderItems,
                totalPrice,
                oid: order._id,
            }
        });
    } else {
        const itemsSummary = (orderItems || [])
            .map((i) => {
                const name = i && (i.name || i.productName || 'Item');
                const qty = i && i.quantity != null ? i.quantity : 1;
                const price = i && i.price != null ? i.price : '';
                return `- ${name} x${qty}${price !== '' ? ` @ ${price}` : ''}`;
            })
            .join('\n');

        const greetingName = req.user && req.user.name ? req.user.name : 'there';
        const text = `Hi ${greetingName},\n\nThank you for your order!\n\nOrder ID: ${order._id}\nTotal: ${totalPrice}\n\nItems:\n${itemsSummary}\n\nWe will notify you when your order is shipped.\n\nBest regards,\nTeam Lexy`;
        const html = `
            <p>Hi ${greetingName},</p>
            <p>Thank you for your order!</p>
            <p><strong>Order ID:</strong> ${order._id}<br/>
            <strong>Total:</strong> ${totalPrice}</p>
            <p><strong>Items:</strong></p>
            <ul>
                ${(orderItems || [])
                    .map((i) => {
                        const name = i && (i.name || i.productName || 'Item');
                        const qty = i && i.quantity != null ? i.quantity : 1;
                        const price = i && i.price != null ? i.price : '';
                        return `<li>${name} x${qty}${price !== '' ? ` @ ${price}` : ''}</li>`;
                    })
                    .join('')}
            </ul>
            <p>We will notify you when your order is shipped.</p>
            <p>Best regards,<br/>Team Lexy</p>
        `;

        await sendEmail({
            email: req.user.email,
            subject: 'Your order confirmation',
            text,
            html,
        });
    }

    if (optedIn && normalizedPhone) {
        await sendOrderWhatsApp({
            to: normalizedPhone,
            userName: req.user?.name,
            orderId: order._id,
            totalPrice,
            status: 'placed',
        });
    }

    res.status(201).json({
        success: true,
        order,
    });
});

// Get Single Order Details
exports.getSingleOrderDetails = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    res.status(200).json({
        success: true,
        order,
    });
});


// Get Logged In User Orders
exports.myOrders = asyncErrorHandler(async (req, res, next) => {

    // In theory this route is protected by auth middleware, but be defensive
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) {
        return next(new ErrorHandler("Please login to view your orders", 401));
    }

    const orders = await Order.find({ user: userId });

    if (!orders) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    res.status(200).json({
        success: true,
        orders,
    });
});


// Get All Orders ---ADMIN
exports.getAllOrders = asyncErrorHandler(async (req, res, next) => {

    const orders = await Order.find();

    if (!orders) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    let totalAmount = 0;
    orders.forEach((order) => {
        totalAmount += order.totalPrice;
    });

    res.status(200).json({
        success: true,
        orders,
        totalAmount,
    });
});

// Update Order Status ---ADMIN (legacy endpoint, now delegates to extended updateOrderStatus)
exports.updateOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id).populate('user', 'name email phone whatsappTransactionalOptIn');

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    if (order.orderStatus === "Delivered") {
        return next(new ErrorHandler("Already Delivered", 400));
    }

    const prevStatus = order.orderStatus;
    const newStatus = req.body.status;

    if (newStatus === "Shipped" && prevStatus !== "Shipped") {
        order.shippedAt = Date.now();
        order.orderItems.forEach(async (i) => {
            await updateStock(i.product, i.quantity)
        });
    }

    order.orderStatus = newStatus;
    if (newStatus === "Delivered") {
        order.deliveredAt = Date.now();
    }
    if (newStatus === "Packed") {
        order.packedAt = order.packedAt || new Date();
    }
    if (newStatus === "In Transit") {
        order.inTransitAt = order.inTransitAt || new Date();
    }
    if (newStatus === "Out For Delivery") {
        order.outForDeliveryAt = order.outForDeliveryAt || new Date();
    }
    if (newStatus === "Cancelled") {
        order.cancelledAt = new Date();
    }

    // Add tracking event
    order.trackingEvents.push({
        status: newStatus,
        label: newStatus,
        description: `Order status updated to ${newStatus}`,
        timestamp: new Date(),
        source: 'admin',
    });

    await order.save({ validateBeforeSave: false });

    const nextStatus = order.orderStatus;
    const statusChanged = prevStatus !== nextStatus;
    const user = order.user;
    const to = user && user.phone ? String(user.phone) : null;
    const canSend = statusChanged && user && user.whatsappTransactionalOptIn && to;

    if (canSend && nextStatus === 'Shipped') {
        await sendOrderWhatsApp({
            to,
            userName: user?.name,
            orderId: order._id,
            totalPrice: order.totalPrice,
            status: 'shipped',
        });
    }

    if (canSend && nextStatus === 'Delivered') {
        await sendOrderWhatsApp({
            to,
            userName: user?.name,
            orderId: order._id,
            totalPrice: order.totalPrice,
            status: 'delivered',
        });
    }

    res.status(200).json({
        success: true
    });
});

async function updateStock(id, quantity) {
    const product = await Product.findById(id);
    product.stock -= quantity;
    await product.save({ validateBeforeSave: false });
}

// Delete Order ---ADMIN
exports.deleteOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    await order.remove();

    res.status(200).json({
        success: true,
    });
});

const canUseCloudinary = () => Boolean(
    process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

const shouldAllowInsecureCloudinaryTls = () =>
    String(process.env.CLOUDINARY_INSECURE_TLS || '').toLowerCase() === 'true' &&
    process.env.NODE_ENV !== 'production';

const isLikelyTlsCertError = (err) => {
    const code = String(err?.code || '').toUpperCase();
    const msg = String(err?.message || '').toLowerCase();
    return (
        code.includes('UNABLE_TO_GET_ISSUER_CERT_LOCALLY') ||
        code.includes('SELF_SIGNED_CERT_IN_CHAIN') ||
        code.includes('CERT_HAS_EXPIRED') ||
        msg.includes('unable to get local issuer certificate') ||
        msg.includes('self signed certificate')
    );
};

const withOptionalInsecureTls = async (fn) => {
    if (!shouldAllowInsecureCloudinaryTls()) return fn();
    const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        return await fn();
    } finally {
        if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    }
};

const isPaymentDone = (paymentStatus, orderStatus) => {
    const status = String(paymentStatus || '').toUpperCase();
    if (!status) return false;
    if (status === 'COD') return String(orderStatus || '') === 'Delivered';
    return ['PAID', 'CAPTURED', 'SUCCESS', 'COMPLETED'].includes(status);
};

// Admin: Upload/Replace Invoice PDF
exports.uploadInvoice = asyncErrorHandler(async (req, res, next) => {

    if (!req.files || !req.files.invoice) {
        return next(new ErrorHandler('Please upload an invoice PDF (field name: invoice)', 400));
    }

    const file = req.files.invoice;
    const mime = String(file?.mimetype || '').toLowerCase();
    if (mime !== 'application/pdf') {
        return next(new ErrorHandler('Only PDF invoices are supported.', 400));
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ErrorHandler('Order Not Found', 404));
    }

    if (!canUseCloudinary()) {
        return next(new ErrorHandler('Cloudinary is not configured. Cannot upload invoice.', 500));
    }

    const base64 = Buffer.from(file.data).toString('base64');
    const dataUri = `data:application/pdf;base64,${base64}`;

    const publicId = order.invoice?.public_id || `invoices/invoice_${order._id}`;

    let result;
    try {
        result = await withOptionalInsecureTls(() =>
            cloudinary.v2.uploader.upload(dataUri, {
                folder: 'invoices',
                public_id: publicId.replace(/^invoices\//, ''),
                resource_type: 'raw',
                overwrite: true,
            })
        );
    } catch (e) {
        if (isLikelyTlsCertError(e) && !shouldAllowInsecureCloudinaryTls()) {
            return next(new ErrorHandler(
                'Cloudinary upload failed due to a TLS certificate error (often caused by corporate proxies). Recommended: configure Node to trust your proxy/root CA (e.g., NODE_EXTRA_CA_CERTS). Dev-only workaround: set CLOUDINARY_INSECURE_TLS=true in backend/config/config.env and restart the backend.',
                502
            ));
        }

        return next(new ErrorHandler(`Cloudinary upload failed: ${String(e?.message || e)}`, 502));
    }

    order.invoice = {
        public_id: result.public_id,
        url: result.secure_url,
        uploadedAt: new Date(),
    };

    await order.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        invoice: order.invoice,
    });
});

// User/Admin: Download uploaded invoice
exports.downloadInvoice = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
        return next(new ErrorHandler('Order Not Found', 404));
    }

    const isOwner = String(order.user?._id || order.user) === String(req.user?._id);
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
        return next(new ErrorHandler('Not authorized to access this invoice', 403));
    }

    if (!order.invoice || !order.invoice.url) {
        return next(new ErrorHandler('Invoice not uploaded yet.', 404));
    }

    if (!isAdmin) {
        if (order.orderStatus !== 'Delivered' || !isPaymentDone(order.paymentInfo?.status, order.orderStatus)) {
            return next(new ErrorHandler('Invoice is available after delivery and successful payment.', 403));
        }
    }

    res.redirect(order.invoice.url);
});