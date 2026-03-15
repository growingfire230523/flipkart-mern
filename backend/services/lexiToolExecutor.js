/**
 * Lexi Tool Executor
 *
 * Executes tool calls requested by the LLM against MongoDB / Meilisearch.
 * Every function receives { args, userId, userRole } and returns a plain
 * JS object that gets JSON-stringified and sent back to the LLM as a tool
 * result message.
 */

const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const SupportTicket = require('../models/supportTicketModel');
const MailingList = require('../models/mailingListModel');
const MailCampaign = require('../models/mailCampaignModel');
const DealConfig = require('../models/dealConfigModel');
const Payment = require('../models/paymentModel');
const { getProductsIndex, isMeiliEnabled } = require('./meiliClient');

// ── Helpers ────────────────────────────────────────────────────────

const MONTH_MAP = {
    january: 0, jan: 0, '1': 0,
    february: 1, feb: 1, '2': 1,
    march: 2, mar: 2, '3': 2,
    april: 3, apr: 3, '4': 3,
    may: 4, '5': 4,
    june: 5, jun: 5, '6': 5,
    july: 6, jul: 6, '7': 6,
    august: 7, aug: 7, '8': 7,
    september: 8, sep: 8, '9': 8,
    october: 9, oct: 9, '10': 9,
    november: 10, nov: 10, '11': 10,
    december: 11, dec: 11, '12': 11,
};

const parseMonth = (v) => {
    if (v === undefined || v === null) return undefined;
    const key = String(v).trim().toLowerCase();
    return MONTH_MAP[key] !== undefined ? MONTH_MAP[key] : undefined;
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const dateRange = (period, startDate, endDate) => {
    const now = new Date();
    const sod = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

    if (period === 'today') return { start: sod(now), end: new Date() };
    if (period === 'yesterday') {
        const y = sod(now); y.setDate(y.getDate() - 1);
        return { start: y, end: sod(now) };
    }
    if (period === 'last_7_days') {
        const s = sod(now); s.setDate(s.getDate() - 7);
        return { start: s, end: new Date() };
    }
    if (period === 'last_30_days') {
        const s = sod(now); s.setDate(s.getDate() - 30);
        return { start: s, end: new Date() };
    }
    if (period === 'this_month') {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date() };
    }
    if (period === 'last_month') {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: s, end: e };
    }
    if (period === 'this_year') {
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date() };
    }
    if (startDate) {
        return {
            start: new Date(startDate),
            end: endDate ? new Date(endDate) : new Date(),
        };
    }
    // Default to last 30 days
    const s = sod(now); s.setDate(s.getDate() - 30);
    return { start: s, end: new Date() };
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtCurrency = (n) => `₹${fmt(n)}`;

const productCard = (p) => ({
    _id: p._id,
    name: p.name,
    price: p.price,
    cuttedPrice: p.cuttedPrice,
    image: p.images?.[0]?.url || null,
    ratings: p.ratings,
    numOfReviews: p.numOfReviews,
});

// ── Tool implementations ───────────────────────────────────────────

const executors = {
    // ── search_products ────────────────────────────────────────────
    async search_products({ args }) {
        const limit = clamp(args.limit || 6, 1, 10);
        const keyword = String(args.keyword || '').trim();

        // Try Meilisearch first (graceful fallback to MongoDB if unavailable)
        if (isMeiliEnabled() && keyword) {
            try {
                const index = getProductsIndex();
                if (index) {
                    const filterClauses = [];
                    if (args.category) filterClauses.push(`category = "${args.category}"`);
                    if (args.brand) filterClauses.push(`brandName = "${args.brand}"`);
                    if (args.minPrice != null) filterClauses.push(`price >= ${args.minPrice}`);
                    if (args.maxPrice != null) filterClauses.push(`price <= ${args.maxPrice}`);
                    if (args.minRating != null) filterClauses.push(`ratings >= ${args.minRating}`);
                    const filter = filterClauses.length ? filterClauses.join(' AND ') : undefined;

                    const result = await index.search(keyword, {
                        limit,
                        filter,
                        attributesToRetrieve: ['id'],
                    });

                    if (result?.hits?.length) {
                        const ids = result.hits.map((h) => String(h.id));
                        const products = await Product.find({ _id: { $in: ids } })
                            .select('_id name price cuttedPrice images ratings numOfReviews')
                            .lean();
                        const byId = new Map(products.map((p) => [String(p._id), p]));
                        const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
                        return { products: ordered.map(productCard), source: 'meilisearch' };
                    }
                }
            } catch (meiliErr) {
                console.warn('[search_products] Meilisearch unavailable, falling back to MongoDB:', meiliErr.message);
            }
        }

        // Fallback: MongoDB
        const query = {};
        if (keyword) {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            query.$or = [
                { name: regex },
                { category: regex },
                { 'brand.name': regex },
                { description: regex },
            ];
        }
        if (args.category) query.category = new RegExp(args.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (args.brand) query['brand.name'] = new RegExp(args.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (args.minPrice != null || args.maxPrice != null) {
            query.price = {};
            if (args.minPrice != null) query.price.$gte = args.minPrice;
            if (args.maxPrice != null) query.price.$lte = args.maxPrice;
        }
        if (args.minRating != null) query.ratings = { $gte: args.minRating };

        let sort = { ratings: -1, numOfReviews: -1 };
        if (args.sortBy === 'price_asc') sort = { price: 1 };
        else if (args.sortBy === 'price_desc') sort = { price: -1 };
        else if (args.sortBy === 'newest') sort = { createdAt: -1 };
        else if (args.sortBy === 'bestselling') sort = { orderCount: -1 };

        const products = await Product.find(query)
            .sort(sort)
            .limit(limit)
            .select('_id name price cuttedPrice images ratings numOfReviews')
            .lean();

        return { products: products.map(productCard), source: 'mongodb' };
    },

    // ── get_product_details ────────────────────────────────────────
    async get_product_details({ args }) {
        let product;
        if (args.productId) {
            product = await Product.findById(args.productId)
                .select('_id name price cuttedPrice images ratings numOfReviews stock category brand description highlights')
                .lean();
        } else if (args.productName) {
            const regex = new RegExp(args.productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            product = await Product.findOne({ name: regex })
                .select('_id name price cuttedPrice images ratings numOfReviews stock category brand description highlights')
                .lean();
        }
        if (!product) return { error: 'Product not found.' };
        return {
            _id: product._id,
            name: product.name,
            price: product.price,
            cuttedPrice: product.cuttedPrice,
            image: product.images?.[0]?.url,
            ratings: product.ratings,
            numOfReviews: product.numOfReviews,
            stock: product.stock,
            category: product.category,
            brand: product.brand?.name,
            highlights: (product.highlights || []).slice(0, 5),
        };
    },

    // ── get_my_orders ──────────────────────────────────────────────
    async get_my_orders({ args, userId }) {
        const filter = { user: userId };
        if (args.status) filter.orderStatus = new RegExp(args.status, 'i');

        if (args.month || args.year) {
            const now = new Date();
            const year = args.year || now.getFullYear();
            const month = parseMonth(args.month);
            if (month !== undefined) {
                filter.createdAt = {
                    $gte: new Date(year, month, 1),
                    $lt: new Date(year, month + 1, 1),
                };
            }
        }

        const limit = clamp(args.limit || 5, 1, 15);
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('_id orderStatus totalPrice createdAt shippedAt deliveredAt orderItems')
            .lean();

        return {
            count: orders.length,
            orders: orders.map((o) => ({
                orderId: o._id,
                status: o.orderStatus,
                total: fmtCurrency(o.totalPrice),
                placed: new Date(o.createdAt).toLocaleDateString('en-IN'),
                shipped: o.shippedAt ? new Date(o.shippedAt).toLocaleDateString('en-IN') : null,
                delivered: o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString('en-IN') : null,
                items: (o.orderItems || []).map((i) => i.name).slice(0, 5),
            })),
        };
    },

    // ── get_order_status ───────────────────────────────────────────
    async get_order_status({ args, userId, userRole }) {
        const order = await Order.findById(args.orderId)
            .select('_id orderStatus totalPrice createdAt shippedAt deliveredAt user orderItems paymentInfo')
            .lean();
        if (!order) return { error: 'Order not found.' };

        // Non-admin can only see own orders
        if (userRole !== 'admin' && String(order.user) !== String(userId)) {
            return { error: 'You can only view your own orders. Please check the Order ID.' };
        }

        return {
            orderId: order._id,
            status: order.orderStatus,
            total: fmtCurrency(order.totalPrice),
            placed: new Date(order.createdAt).toLocaleDateString('en-IN'),
            shipped: order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('en-IN') : null,
            delivered: order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-IN') : null,
            payment: order.paymentInfo?.status || 'unknown',
            items: (order.orderItems || []).map((i) => ({ name: i.name, qty: i.quantity, price: fmtCurrency(i.price) })),
        };
    },

    // ── get_my_profile ─────────────────────────────────────────────
    async get_my_profile({ userId }) {
        const u = await User.findById(userId).select('name email role gender phone createdAt defaultShippingAddress').lean();
        if (!u) return { error: 'User not found.' };
        return {
            name: u.name,
            email: u.email,
            role: u.role,
            gender: u.gender,
            phone: u.phone || null,
            memberSince: new Date(u.createdAt).toLocaleDateString('en-IN'),
            address: u.defaultShippingAddress || null,
        };
    },

    // ── create_support_ticket ──────────────────────────────────────
    async create_support_ticket({ args, userId }) {
        const ticket = await SupportTicket.create({
            user: userId,
            message: String(args.message || '').slice(0, 2000),
        });
        return { ticketId: ticket._id, status: 'Open', message: 'Support ticket created. Our team will get back to you soon.' };
    },

    // ── search_users (admin) ───────────────────────────────────────
    async search_users({ args }) {
        const filter = {};
        if (args.name) filter.name = new RegExp(args.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (args.email) filter.email = new RegExp(args.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (args.role) filter.role = args.role;
        if (args.month || args.year) {
            const now = new Date();
            const year = args.year || now.getFullYear();
            const month = parseMonth(args.month);
            if (month !== undefined) {
                filter.createdAt = { $gte: new Date(year, month, 1), $lt: new Date(year, month + 1, 1) };
            }
        }
        const limit = clamp(args.limit || 10, 1, 50);
        const [total, users] = await Promise.all([
            User.countDocuments(filter),
            User.find(filter).sort({ createdAt: -1 }).limit(limit).select('_id name email role createdAt').lean(),
        ]);
        return {
            total,
            showing: users.length,
            users: users.map((u) => ({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                registered: new Date(u.createdAt).toLocaleDateString('en-IN'),
            })),
        };
    },

    // ── get_user_count (admin) ─────────────────────────────────────
    async get_user_count({ args }) {
        const filter = {};
        if (args.role) filter.role = args.role;
        if (args.sinceDays) {
            const d = new Date();
            d.setDate(d.getDate() - args.sinceDays);
            filter.createdAt = { $gte: d };
        }
        const count = await User.countDocuments(filter);
        return { count };
    },

    // ── get_order_analytics (admin) ────────────────────────────────
    async get_order_analytics({ args }) {
        const { start, end } = dateRange(args.period, args.startDate, args.endDate);
        const match = { createdAt: { $gte: start, $lt: end } };

        const pipeline = [{ $match: match }];

        if (args.groupBy) {
            const groupId = args.groupBy === 'day'
                ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                : args.groupBy === 'week'
                ? { $isoWeek: '$createdAt' }
                : { $dateToString: { format: '%Y-%m', date: '$createdAt' } };

            pipeline.push(
                { $group: { _id: groupId, orders: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
                { $sort: { _id: 1 } }
            );
            const buckets = await Order.aggregate(pipeline);
            return {
                period: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
                groupBy: args.groupBy,
                buckets: buckets.map((b) => ({ label: b._id, orders: b.orders, revenue: fmtCurrency(b.revenue) })),
            };
        }

        pipeline.push({
            $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalPrice' }, avgOrder: { $avg: '$totalPrice' } },
        });
        const [result] = await Order.aggregate(pipeline);
        return {
            period: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
            orders: result?.count || 0,
            revenue: fmtCurrency(result?.revenue || 0),
            averageOrderValue: fmtCurrency(Math.round(result?.avgOrder || 0)),
        };
    },

    // ── compare_periods (admin) ────────────────────────────────────
    async compare_periods({ args }) {
        const run = async (start, end) => {
            const [result] = await Order.aggregate([
                { $match: { createdAt: { $gte: new Date(start), $lt: new Date(end) } } },
                { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalPrice' }, avg: { $avg: '$totalPrice' } } },
            ]);
            return { orders: result?.count || 0, revenue: result?.revenue || 0, avg: Math.round(result?.avg || 0) };
        };

        const [p1, p2] = await Promise.all([
            run(args.period1Start, args.period1End),
            run(args.period2Start, args.period2End),
        ]);

        const revDiff = p1.revenue - p2.revenue;
        const revPct = p2.revenue ? ((revDiff / p2.revenue) * 100).toFixed(1) : 'N/A';

        return {
            period1: { label: args.period1Label || 'Period 1', ...p1, revenue: fmtCurrency(p1.revenue), avg: fmtCurrency(p1.avg) },
            period2: { label: args.period2Label || 'Period 2', ...p2, revenue: fmtCurrency(p2.revenue), avg: fmtCurrency(p2.avg) },
            comparison: {
                revenueDifference: fmtCurrency(Math.abs(revDiff)),
                direction: revDiff >= 0 ? 'increase' : 'decrease',
                percentChange: `${revPct}%`,
                ordersDifference: p1.orders - p2.orders,
            },
        };
    },

    // ── get_top_products (admin) ───────────────────────────────────
    async get_top_products({ args }) {
        const limit = clamp(args.limit || 10, 1, 20);

        if (args.sortBy === 'revenue' || args.sortBy === 'quantity') {
            const match = {};
            if (args.startDate || args.endDate) {
                match.createdAt = {};
                if (args.startDate) match.createdAt.$gte = new Date(args.startDate);
                if (args.endDate) match.createdAt.$lt = new Date(args.endDate);
            }
            const pipeline = [
                { $match: match },
                { $unwind: '$orderItems' },
            ];
            if (args.category) {
                pipeline.push({
                    $lookup: { from: 'products', localField: 'orderItems.product', foreignField: '_id', as: '_prod' },
                });
                pipeline.push({ $match: { '_prod.category': new RegExp(args.category, 'i') } });
            }
            pipeline.push({
                $group: {
                    _id: '$orderItems.product',
                    name: { $first: '$orderItems.name' },
                    totalRevenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
                    totalQty: { $sum: '$orderItems.quantity' },
                },
            });
            pipeline.push({ $sort: args.sortBy === 'revenue' ? { totalRevenue: -1 } : { totalQty: -1 } });
            pipeline.push({ $limit: limit });

            const results = await Order.aggregate(pipeline);
            return {
                sortedBy: args.sortBy,
                products: results.map((r, i) => ({
                    rank: i + 1,
                    productId: r._id,
                    name: r.name,
                    totalRevenue: fmtCurrency(r.totalRevenue),
                    totalQuantity: r.totalQty,
                })),
            };
        }

        // By rating or reviews
        const query = {};
        if (args.category) query.category = new RegExp(args.category, 'i');
        const sort = args.sortBy === 'reviews' ? { numOfReviews: -1 } : { ratings: -1, numOfReviews: -1 };
        const products = await Product.find(query).sort(sort).limit(limit)
            .select('_id name price ratings numOfReviews category').lean();
        return {
            sortedBy: args.sortBy || 'rating',
            products: products.map((p, i) => ({
                rank: i + 1,
                name: p.name,
                price: fmtCurrency(p.price),
                ratings: p.ratings,
                reviews: p.numOfReviews,
                category: p.category,
            })),
        };
    },

    // ── get_inventory_status (admin) ───────────────────────────────
    async get_inventory_status({ args }) {
        const threshold = args.threshold || 5;
        const limit = clamp(args.limit || 10, 1, 30);
        const mode = args.mode || 'all';

        const result = {};

        if (mode === 'low_stock' || mode === 'all') {
            const lowStock = await Product.find({ stock: { $gt: 0, $lte: threshold } })
                .sort({ stock: 1 }).limit(limit).select('_id name stock price category').lean();
            result.lowStock = lowStock.map((p) => ({ name: p.name, stock: p.stock, price: fmtCurrency(p.price), category: p.category }));
        }
        if (mode === 'out_of_stock' || mode === 'all') {
            const oos = await Product.find({ stock: { $lte: 0 } })
                .sort({ createdAt: -1 }).limit(limit).select('_id name category').lean();
            result.outOfStock = oos.map((p) => ({ name: p.name, category: p.category }));
            result.outOfStockCount = await Product.countDocuments({ stock: { $lte: 0 } });
        }
        if (mode === 'category_summary' || mode === 'all') {
            const summary = await Product.aggregate([
                { $group: { _id: '$category', totalProducts: { $sum: 1 }, totalStock: { $sum: '$stock' }, avgPrice: { $avg: '$price' } } },
                { $sort: { totalProducts: -1 } },
            ]);
            result.categorySummary = summary.map((s) => ({
                category: s._id, products: s.totalProducts, totalStock: s.totalStock, avgPrice: fmtCurrency(Math.round(s.avgPrice)),
            }));
        }

        return result;
    },

    // ── get_category_analytics (admin) ─────────────────────────────
    async get_category_analytics({ args }) {
        const match = {};
        if (args.startDate || args.endDate) {
            match.createdAt = {};
            if (args.startDate) match.createdAt.$gte = new Date(args.startDate);
            if (args.endDate) match.createdAt.$lt = new Date(args.endDate);
        }

        const pipeline = [
            { $match: match },
            { $unwind: '$orderItems' },
            { $lookup: { from: 'products', localField: 'orderItems.product', foreignField: '_id', as: '_prod' } },
            { $unwind: { path: '$_prod', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_prod.category',
                    orders: { $sum: 1 },
                    revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
                    quantity: { $sum: '$orderItems.quantity' },
                },
            },
            { $sort: { revenue: -1 } },
        ];

        const results = await Order.aggregate(pipeline);
        return {
            categories: results.map((r) => ({
                category: r._id || 'Unknown',
                orders: r.orders,
                revenue: fmtCurrency(r.revenue),
                unitsSold: r.quantity,
            })),
        };
    },

    // ── get_all_orders (admin) ─────────────────────────────────────
    async get_all_orders({ args }) {
        const filter = {};
        if (args.status) filter.orderStatus = new RegExp(args.status, 'i');
        if (args.userId) filter.user = args.userId;
        if (args.minAmount || args.maxAmount) {
            filter.totalPrice = {};
            if (args.minAmount) filter.totalPrice.$gte = args.minAmount;
            if (args.maxAmount) filter.totalPrice.$lte = args.maxAmount;
        }
        if (args.startDate || args.endDate) {
            filter.createdAt = {};
            if (args.startDate) filter.createdAt.$gte = new Date(args.startDate);
            if (args.endDate) filter.createdAt.$lt = new Date(args.endDate);
        }

        let sort = { createdAt: -1 };
        if (args.sortBy === 'oldest') sort = { createdAt: 1 };
        if (args.sortBy === 'amount_desc') sort = { totalPrice: -1 };
        if (args.sortBy === 'amount_asc') sort = { totalPrice: 1 };

        const limit = clamp(args.limit || 10, 1, 20);
        const [total, orders] = await Promise.all([
            Order.countDocuments(filter),
            Order.find(filter).sort(sort).limit(limit)
                .select('_id user orderStatus totalPrice createdAt orderItems')
                .populate('user', 'name email')
                .lean(),
        ]);

        return {
            total,
            showing: orders.length,
            orders: orders.map((o) => ({
                orderId: o._id,
                user: o.user ? `${o.user.name} (${o.user.email})` : 'Unknown',
                status: o.orderStatus,
                total: fmtCurrency(o.totalPrice),
                placed: new Date(o.createdAt).toLocaleDateString('en-IN'),
                itemCount: (o.orderItems || []).length,
            })),
        };
    },

    // ── get_support_tickets (admin) ────────────────────────────────
    async get_support_tickets({ args }) {
        const filter = {};
        if (args.status) filter.status = args.status;
        if (args.keyword) filter.message = new RegExp(args.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        const limit = clamp(args.limit || 10, 1, 30);
        const [total, tickets] = await Promise.all([
            SupportTicket.countDocuments(filter),
            SupportTicket.find(filter).sort({ createdAt: -1 }).limit(limit)
                .populate('user', 'name email').lean(),
        ]);

        return {
            total,
            showing: tickets.length,
            tickets: tickets.map((t) => ({
                ticketId: t._id,
                user: t.user ? `${t.user.name} (${t.user.email})` : 'Unknown',
                status: t.status,
                message: String(t.message || '').slice(0, 200),
                created: new Date(t.createdAt).toLocaleDateString('en-IN'),
            })),
        };
    },

    // ── get_mailing_list_stats (admin) ─────────────────────────────
    async get_mailing_list_stats({ args }) {
        const [total, unsubscribed, bySource] = await Promise.all([
            MailingList.countDocuments({}),
            MailingList.countDocuments({ unsubscribed: true }),
            MailingList.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        ]);

        const result = {
            total,
            active: total - unsubscribed,
            unsubscribed,
            bySource: bySource.map((s) => ({ source: s._id, count: s.count })),
        };

        if (args.includeRecent) {
            const limit = clamp(args.limit || 5, 1, 20);
            const recent = await MailingList.find({}).sort({ subscribedAt: -1 }).limit(limit)
                .select('email name source subscribedAt unsubscribed').lean();
            result.recentSubscribers = recent.map((r) => ({
                email: r.email, name: r.name, source: r.source,
                date: new Date(r.subscribedAt).toLocaleDateString('en-IN'),
                active: !r.unsubscribed,
            }));
        }

        return result;
    },

    // ── get_campaign_stats (admin) ─────────────────────────────────
    async get_campaign_stats({ args }) {
        const filter = {};
        if (args.status) filter.status = args.status;
        const limit = clamp(args.limit || 5, 1, 20);

        const campaigns = await MailCampaign.find(filter).sort({ createdAt: -1 }).limit(limit)
            .select('subject status mode totals scheduledAt createdAt').lean();

        return {
            campaigns: campaigns.map((c) => ({
                subject: c.subject,
                status: c.status,
                mode: c.mode,
                totalRecipients: c.totals?.total || 0,
                sent: c.totals?.sent || 0,
                failed: c.totals?.failed || 0,
                scheduled: c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('en-IN') : null,
                created: new Date(c.createdAt).toLocaleDateString('en-IN'),
            })),
        };
    },

    // ── get_payment_analytics (admin) ──────────────────────────────
    async get_payment_analytics({ args }) {
        const match = {};
        if (args.startDate || args.endDate) {
            match.createdAt = {};
            if (args.startDate) match.createdAt.$gte = new Date(args.startDate);
            if (args.endDate) match.createdAt.$lt = new Date(args.endDate);
        }

        const [byMode, byStatus, total] = await Promise.all([
            Payment.aggregate([{ $match: match }, { $group: { _id: '$paymentMode', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Payment.aggregate([
                { $match: match },
                { $group: { _id: '$resultInfo.resultStatus', count: { $sum: 1 }, totalAmount: { $sum: { $toDouble: '$txnAmount' } } } },
                { $sort: { count: -1 } },
            ]),
            Payment.countDocuments(match),
        ]);

        return {
            totalTransactions: total,
            byPaymentMode: byMode.map((m) => ({ mode: m._id, count: m.count })),
            byStatus: byStatus.map((s) => ({ status: s._id, count: s.count, totalAmount: fmtCurrency(s.totalAmount) })),
        };
    },

    // ── get_deal_config (admin) ────────────────────────────────────
    async get_deal_config() {
        const config = await DealConfig.findOne({}).sort({ updatedAt: -1 }).lean();
        if (!config) return { message: 'No deal configuration found.' };
        return {
            endsAt: config.endsAt ? new Date(config.endsAt).toLocaleString('en-IN') : null,
            dealOfDayProductId: config.dealOfDayProductId || null,
            dealOfDayEndsAt: config.dealOfDayEndsAt ? new Date(config.dealOfDayEndsAt).toLocaleString('en-IN') : null,
            heroImageUrl: config.heroImageUrl || null,
            heroLink: config.heroLink || null,
        };
    },

    // ── get_dashboard_overview (admin) ─────────────────────────────
    async get_dashboard_overview() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lowStockThreshold = 5;

        const orderStats = async (start, end) => {
            const match = end ? { createdAt: { $gte: start, $lt: end } } : { createdAt: { $gte: start } };
            const [result] = await Order.aggregate([{ $match: match }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }]);
            return { orders: result?.count || 0, revenue: result?.revenue || 0 };
        };

        const [users, products, today, yesterday, thisMonth, pending, lowStock, openTickets] = await Promise.all([
            User.countDocuments({}),
            Product.countDocuments({}),
            orderStats(todayStart),
            orderStats(yesterdayStart, todayStart),
            orderStats(thisMonthStart),
            Order.countDocuments({ orderStatus: { $in: ['Processing', 'Shipped'] } }),
            Product.find({ stock: { $gt: 0, $lte: lowStockThreshold } }).sort({ stock: 1 }).limit(5).select('name stock').lean(),
            SupportTicket.countDocuments({ status: 'Open' }),
        ]);

        return {
            totalUsers: users,
            totalProducts: products,
            today: { orders: today.orders, revenue: fmtCurrency(today.revenue) },
            yesterday: { orders: yesterday.orders, revenue: fmtCurrency(yesterday.revenue) },
            thisMonth: { orders: thisMonth.orders, revenue: fmtCurrency(thisMonth.revenue) },
            pendingOrders: pending,
            openSupportTickets: openTickets,
            lowStockProducts: lowStock.map((p) => `${p.name} (stock: ${p.stock})`),
        };
    },
};

/**
 * Execute a tool call.
 * @param {string} toolName
 * @param {object} args  - parsed arguments from LLM
 * @param {{ userId: string|null, userRole: string }} context
 * @returns {Promise<object>}
 */
const executeTool = async (toolName, args, { userId, userRole }) => {
    const fn = executors[toolName];
    if (!fn) return { error: `Unknown tool: ${toolName}` };

    try {
        return await fn({ args: args || {}, userId, userRole });
    } catch (err) {
        console.error(`[lexiToolExecutor] ${toolName} error:`, err.message);
        return { error: `Tool execution failed: ${err.message}` };
    }
};

module.exports = { executeTool };
