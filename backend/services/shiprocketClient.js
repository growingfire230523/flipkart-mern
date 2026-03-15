/**
 * Shiprocket API Client
 *
 * Handles authentication (token caching), order creation, shipment creation,
 * AWB assignment, tracking, cancellation, and return pickup via
 * the Shiprocket v1 REST API.
 *
 * Docs: https://apidocs.shiprocket.in/
 */

const https = require('https');

// ── Token cache ────────────────────────────────────────────────────

let cachedToken = null;
let tokenExpiresAt = 0; // epoch ms

const isConfigured = () =>
    Boolean(
        String(process.env.SHIPROCKET_EMAIL || '').trim() &&
        String(process.env.SHIPROCKET_PASSWORD || '').trim()
    );

// ── HTTP helper ────────────────────────────────────────────────────

const apiRequest = (method, path, body, token) =>
    new Promise((resolve, reject) => {
        const host = 'apiv2.shiprocket.in';
        const payload = body ? JSON.stringify(body) : undefined;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

        const req = https.request(
            { hostname: host, path: `/v1/external${path}`, method, headers, timeout: 30000 },
            (res) => {
                let data = '';
                res.on('data', (c) => (data += c));
                res.on('end', () => {
                    let parsed;
                    try { parsed = JSON.parse(data); } catch { parsed = data; }
                    if (res.statusCode >= 400) {
                        const err = new Error(
                            (parsed && parsed.message) || `Shiprocket ${res.statusCode}`
                        );
                        err.statusCode = res.statusCode;
                        err.data = parsed;
                        return reject(err);
                    }
                    resolve(parsed);
                });
            }
        );
        req.on('timeout', () => req.destroy(new Error('Shiprocket: request timed out')));
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });

// ── Auth ───────────────────────────────────────────────────────────

const authenticate = async () => {
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

    const email = String(process.env.SHIPROCKET_EMAIL || '').trim();
    const password = String(process.env.SHIPROCKET_PASSWORD || '').trim();

    const res = await apiRequest('POST', '/auth/login', { email, password });
    cachedToken = res.token;
    // Shiprocket tokens are valid for 10 days; we cache for 9 days.
    tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
    return cachedToken;
};

const authedRequest = async (method, path, body) => {
    const token = await authenticate();
    return apiRequest(method, path, body, token);
};

// ── Create Order on Shiprocket ─────────────────────────────────────

const createOrder = async ({
    orderId,
    orderDate,
    pickupLocation,
    billingName,
    billingAddress,
    billingCity,
    billingState,
    billingPincode,
    billingCountry,
    billingPhone,
    billingEmail,
    shippingIsBilling = true,
    orderItems, // [{ name, sku, units, sellingPrice, hsn }]
    subTotal,
    length, width, height, weight,
}) => {
    const payload = {
        order_id: String(orderId),
        order_date: orderDate, // YYYY-MM-DD HH:mm
        pickup_location: pickupLocation || String(process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary').trim(),
        billing_customer_name: billingName,
        billing_address: billingAddress,
        billing_city: billingCity,
        billing_state: billingState,
        billing_pincode: billingPincode,
        billing_country: billingCountry || 'India',
        billing_phone: billingPhone,
        billing_email: billingEmail,
        shipping_is_billing: shippingIsBilling,
        order_items: orderItems,
        sub_total: subTotal,
        length: length || 20,
        breadth: width || 15,
        height: height || 10,
        weight: weight || 0.5,
        payment_method: 'Prepaid',
    };

    return authedRequest('POST', '/orders/create/adhoc', payload);
};

// ── Generate AWB (assign courier) ──────────────────────────────────

const assignAWB = async (shipmentId, courierId) => {
    const body = { shipment_id: shipmentId };
    if (courierId) body.courier_id = courierId;
    return authedRequest('POST', '/courier/assign/awb', body);
};

// ── Request Pickup ─────────────────────────────────────────────────

const requestPickup = async (shipmentId) =>
    authedRequest('POST', '/courier/generate/pickup', {
        shipment_id: [shipmentId],
    });

// ── Track by AWB ───────────────────────────────────────────────────

const trackByAWB = async (awbCode) =>
    authedRequest('GET', `/courier/track/awb/${encodeURIComponent(awbCode)}`);

// ── Track by Shiprocket order ID ───────────────────────────────────

const trackByOrderId = async (shiprocketOrderId) =>
    authedRequest('GET', `/courier/track?order_id=${encodeURIComponent(shiprocketOrderId)}`);

// ── Cancel Order ───────────────────────────────────────────────────

const cancelOrder = async (shiprocketOrderIds) =>
    authedRequest('POST', '/orders/cancel', {
        ids: Array.isArray(shiprocketOrderIds) ? shiprocketOrderIds : [shiprocketOrderIds],
    });

// ── Create Return Order ────────────────────────────────────────────

const createReturn = async ({
    orderId,
    orderDate,
    pickupName,
    pickupAddress,
    pickupCity,
    pickupState,
    pickupPincode,
    pickupPhone,
    orderItems,
    subTotal,
    length, width, height, weight,
}) => {
    const payload = {
        order_id: String(orderId) + '-RET',
        order_date: orderDate,
        pickup_customer_name: pickupName,
        pickup_address: pickupAddress,
        pickup_city: pickupCity,
        pickup_state: pickupState,
        pickup_pincode: pickupPincode,
        pickup_country: 'India',
        pickup_phone: pickupPhone,
        order_items: orderItems,
        sub_total: subTotal,
        length: length || 20,
        breadth: width || 15,
        height: height || 10,
        weight: weight || 0.5,
        payment_method: 'Prepaid',
    };

    return authedRequest('POST', '/orders/create/return', payload);
};

// ── Check serviceability ────────────────────────────────────────────

const checkServiceability = async ({ pickupPincode, deliveryPincode, weight, cod = false }) =>
    authedRequest(
        'GET',
        `/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight || 0.5}&cod=${cod ? 1 : 0}`
    );

// ── Map Shiprocket status to our order status ──────────────────────

const STATUS_MAP = {
    // Shiprocket status_id → our orderStatus
    1: 'Order Confirmed',      // AWB Assigned
    2: 'Order Confirmed',      // Label Generated
    3: 'Packed',               // Pickup Scheduled/Generated
    4: 'Packed',               // Pickup Queued
    5: 'Shipped',              // Out For Pickup (manifested)
    6: 'Shipped',              // Picked Up
    7: 'In Transit',           // In Transit
    8: 'Out For Delivery',     // Out For Delivery
    9: 'Delivered',            // Delivered
    10: 'Cancelled',           // Cancelled
    // RTO statuses
    17: 'In Transit',          // RTO In Transit
    18: 'Delivered',           // RTO Delivered
};

const mapShiprocketStatus = (statusId) => STATUS_MAP[statusId] || null;

module.exports = {
    isConfigured,
    createOrder,
    assignAWB,
    requestPickup,
    trackByAWB,
    trackByOrderId,
    cancelOrder,
    createReturn,
    checkServiceability,
    mapShiprocketStatus,
};
