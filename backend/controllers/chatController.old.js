const https = require('https');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const SupportTicket = require('../models/supportTicketModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');

const OPENAI_HOST = 'api.openai.com';
const OPENAI_PATH = '/v1/chat/completions';
const OPENAI_RESPONSES_PATH = '/v1/responses';

const shouldAllowInsecureTls = () => {
    const flag = process.env.OPENAI_INSECURE_TLS || process.env.VOICE_TRANSCRIBE_INSECURE_TLS;
    return String(flag || '').trim().toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';
};

const getAzureOpenAIConfig = () => {
    const endpointRaw = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    if (!endpointRaw || !apiKey) return null;

    let endpointUrl;
    try {
        endpointUrl = new URL(String(endpointRaw).trim());
    } catch (_) {
        try {
            endpointUrl = new URL(`https://${String(endpointRaw).trim().replace(/^https?:\/\//i, '')}`);
        } catch (__) {
            return null;
        }
    }

    const origin = endpointUrl.origin;
    const hostname = endpointUrl.hostname;

    // Always build the path from deployment + apiVersion to avoid mismatches when
    // users paste a full URL that points to a different deployment.
    if (!deployment || !apiVersion) return null;

    const path = `/openai/deployments/${encodeURIComponent(String(deployment).trim())}/chat/completions?api-version=${encodeURIComponent(
        String(apiVersion).trim()
    )}`;

    return {
        origin,
        hostname,
        path,
        apiKey: String(apiKey).trim(),
    };
};

const safeJsonParse = (text) => {
    try {
        return JSON.parse(text);
    } catch (_) {
        return null;
    }
};

const INVENTORY_DENIAL_PATTERNS = [
    /\b(i\s+)?(currently\s+)?(do\s+not|don't|cannot|can't)\s+have\s+access\b/i,
    /\bno\s+access\b/i,
    /\b(can\s*not|cannot|can't)\s+access\b/i,
    /\bplease\s+share\b/i,
    /\bshare\s+the\s+available\b/i,
    /\bcheck\s+the\s+inventory\b/i,
    /\badmin\s+dashboard\b/i,
    /\bproduct\s+list\b/i,
];

const enforceInventoryAccessMessaging = ({ reply, hasProducts }) => {
    const text = String(reply || '').trim();
    if (!text) return text;

    const violates = INVENTORY_DENIAL_PATTERNS.some((re) => re.test(text));
    if (!violates) return text;

    if (hasProducts) {
        return (
            "Yes — I can access the store’s live product catalog. I’ve pulled a few relevant options from your inventory; check the product cards below. If you tell me your budget and what you’re looking for, I’ll narrow it down." 
        );
    }

    return (
        "Yes — I can access the store’s live product catalog (including newly uploaded products). Tell me what you want (category/brand/price range/concern), and I’ll pull matching items from the website."
    );
};

const STOPWORDS = new Set([
    'the',
    'and',
    'for',
    'with',
    'this',
    'that',
    'you',
    'your',
    'have',
    'has',
    'had',
    'should',
    'could',
    'would',
    'can',
    'cant',
    'cannot',
    'dont',
    'does',
    'doesnt',
    'know',
    'knowledge',
    'about',
    'products',
    'product',
    'store',
    'website',
    'catalog',
    'inventory',
    'available',
    'list',
    'share',
    'please',
]);

const pickKeywords = (text) => {
    if (!text || typeof text !== 'string') return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
        .slice(0, 8);
};

const wantsCatalogAssurance = (text) => {
    const t = String(text || '').toLowerCase();
    return (
        t.includes('access') && (t.includes('product') || t.includes('products') || t.includes('catalog') || t.includes('inventory'))
    );
};

const getFallbackProducts = async () => {
    // Lightweight “top picks” when user asks generic questions (e.g., “do you know the products?”)
    // This is still live DB data, so new uploads automatically appear.
    try {
        const products = await Product.find({})
            .sort({ ratings: -1, numOfReviews: -1, price: 1 })
            .limit(6)
            .select('_id name price cuttedPrice images ratings numOfReviews')
            .lean();
        return products || [];
    } catch (_) {
        return [];
    }
};

const findRelevantProducts = async (userMessage) => {
    const keywords = pickKeywords(userMessage);
    if (keywords.length === 0) {
        return wantsCatalogAssurance(userMessage) ? await getFallbackProducts() : [];
    }

    // Build an OR regex across a few keywords.
    const pattern = keywords.slice(0, 5).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(pattern, 'i');

    // Score matches so name hits rank above category/brand hits.
    const products = await Product.aggregate([
        {
            $match: {
                $or: [
                    { name: regex },
                    { category: regex },
                    { 'brand.name': regex },
                    { description: regex },
                    { highlights: regex },
                    { 'specifications.title': regex },
                    { 'specifications.description': regex },
                ],
            },
        },
        {
            $addFields: {
                _lexyScore: {
                    $add: [
                        { $cond: [{ $regexMatch: { input: '$name', regex } }, 2, 0] },
                        { $cond: [{ $regexMatch: { input: '$category', regex } }, 1, 0] },
                        { $cond: [{ $regexMatch: { input: '$brand.name', regex } }, 1, 0] },
                        { $cond: [{ $regexMatch: { input: '$description', regex } }, 1, 0] },
                    ],
                },
            },
        },
        { $sort: { _lexyScore: -1, ratings: -1, numOfReviews: -1, price: 1 } },
        {
            $project: {
                _id: 1,
                name: 1,
                price: 1,
                cuttedPrice: 1,
                images: 1,
                ratings: 1,
                numOfReviews: 1,
            },
        },
        { $limit: 6 },
    ]);

    return products;
};

const extractMongoObjectId = (text) => {
    if (!text || typeof text !== 'string') return null;
    const m = text.match(/[0-9a-fA-F]{24}/);
    return m ? m[0] : null;
};

const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfToday = () => startOfDay(new Date());

const startOfYesterday = () => {
    const d = startOfToday();
    d.setDate(d.getDate() - 1);
    return d;
};

const startOfThisMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

const lastNDaysStart = (n) => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - n);
    return d;
};

const isAdminUser = (req) => req?.user?.role === 'admin';

const getOrderStats = async ({ start, end }) => {
    const match = end
        ? { createdAt: { $gte: start, $lt: end } }
        : {
              createdAt: { $gte: start },
          };

    const [count, total] = await Promise.all([
        Order.countDocuments(match),
        Order.aggregate([{ $match: match }, { $group: { _id: null, amount: { $sum: '$totalPrice' } } }]),
    ]);

    const amount = Number(total?.[0]?.amount || 0);
    return { count, amount };
};

const extractEmail = (text) => {
    if (!text || typeof text !== 'string') return null;
    const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m ? m[0] : null;
};

const wantsUserExistenceCheck = (lower) => {
    if (!lower) return false;
    return (
        lower.includes('user exists') ||
        lower.includes('does user exist') ||
        lower.includes('check user exists') ||
        lower.includes('verify user') ||
        lower.includes('validate user') ||
        (lower.includes('check') && lower.includes('user') && (lower.includes('exist') || lower.includes('exists'))) ||
        (lower.includes('is') && lower.includes('user') && lower.includes('registered'))
    );
};

const isAffirmation = (text) => {
    const t = String(text || '')
        .trim()
        .toLowerCase();
    return (
        t === 'yes' ||
        t === 'y' ||
        t === 'ok' ||
        t === 'okay' ||
        t === 'sure' ||
        t === 'yes please' ||
        t === 'give details' ||
        t === 'yes give details' ||
        t === 'show details' ||
        t === 'details'
    );
};

const historyMentionsUsersList = (history) => {
    if (!Array.isArray(history)) return false;
    const recent = history.slice(-6);
    return recent.some((m) => {
        const content = String(m?.content || '').toLowerCase();
        return (
            content.includes('registered users') ||
            content.includes('list users') ||
            content.includes('all users') ||
            content.includes('user list') ||
            (content.includes('users') && (content.includes('details') || content.includes('show')))
        );
    });
};

const handleBusinessIntent = async ({ req, message, history }) => {
    const text = String(message || '').trim();
    const lower = text.toLowerCase();

    // Never request secrets in chat (credentials/tokens)
    if (lower.includes('token') || lower.includes('password') || lower.includes('credential')) {
        return {
            handled: true,
            reply:
                'For security, do not share passwords, tokens, or credentials in chat. Please login via the website UI. If you are logged in as admin, I can answer admin-only queries directly from the database.',
        };
    }

    // Admin: list registered users (real DB data; prevents LLM hallucinations)
    const wantsUserList =
        lower.includes('registered users') ||
        lower.includes('list users') ||
        lower.includes('all users') ||
        lower.includes('user list') ||
        (lower.includes('users') && (lower.includes('details') || lower.includes('show')));

    const followupUserList = isAffirmation(lower) && historyMentionsUsersList(history);

    if (wantsUserList || followupUserList) {
        if (!req.user) {
            return { handled: true, reply: 'Please login as admin to view registered users.' };
        }
        if (!isAdminUser(req)) {
            return { handled: true, reply: 'Registered user details are available to admin accounts only.' };
        }

        const limit = Math.min(Math.max(Number(process.env.LEXY_USERS_LIST_LIMIT || 10), 1), 50);
        const [total, users] = await Promise.all([
            User.countDocuments({}),
            User.find({}).sort({ createdAt: -1 }).limit(limit).select('_id name email role createdAt'),
        ]);

        if (!users.length) {
            return { handled: true, reply: 'No users found in the database.' };
        }

        const lines = users.map(
            (u, idx) =>
                `${idx + 1}. ${u.name} — ${u.email} — role: ${u.role} — id: ${u._id} — created: ${new Date(
                    u.createdAt
                ).toLocaleDateString()}`
        );

        return {
            handled: true,
            reply: `Total registered users: ${total}\nShowing latest ${users.length}:\n${lines.join('\n')}`,
        };
    }

    // Admin: check if a user exists / is registered (by email)
    const followupUserExists = isAffirmation(lower) && Array.isArray(history) && history.slice(-6).some((m) => {
        const c = String(m?.content || '').toLowerCase();
        return wantsUserExistenceCheck(c);
    });

    if (wantsUserExistenceCheck(lower) || followupUserExists) {
        if (!req.user) {
            return { handled: true, reply: 'Please login as admin to verify whether a user exists.' };
        }
        if (!isAdminUser(req)) {
            return { handled: true, reply: 'User verification is available to admin accounts only.' };
        }

        const email = extractEmail(text);
        if (!email) {
            return {
                handled: true,
                reply: 'Send the user email address and I will confirm whether it is registered.',
            };
        }

        const u = await User.findOne({ email: email.toLowerCase() }).select('_id name email role createdAt');
        if (!u) return { handled: true, reply: `No — ${email} is not registered.` };

        return {
            handled: true,
            reply: `Yes — user exists.\nName: ${u.name}\nEmail: ${u.email}\nRole: ${u.role}\nUser ID: ${u._id}\nCreated: ${new Date(
                u.createdAt
            ).toLocaleString()}`,
        };
    }

    // User profile (self)
    if (
        lower.includes('my profile') ||
        lower.includes('my account') ||
        lower.includes('who am i') ||
        (lower.includes('my') && lower.includes('email'))
    ) {
        if (!req.user) {
            return { handled: true, reply: 'Please login first and then ask again.' };
        }

        return {
            handled: true,
            reply: `Name: ${req.user.name}\nEmail: ${req.user.email}\nRole: ${req.user.role}\nUser ID: ${req.user._id}`,
        };
    }

    // Order history (self)
    if (lower.includes('my orders') || lower.includes('order history') || lower.includes('previous orders')) {
        if (!req.user) {
            return { handled: true, reply: 'Please login first so I can fetch your order history.' };
        }

        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('_id orderStatus totalPrice createdAt');

        if (!orders.length) {
            return { handled: true, reply: 'No orders found for your account yet.' };
        }

        const lines = orders.map(
            (o) =>
                `Order ${o._id} — ${o.orderStatus} — ₹${Number(o.totalPrice || 0).toLocaleString()} — ${new Date(
                    o.createdAt
                ).toLocaleDateString()}`
        );

        return {
            handled: true,
            reply: `Your recent orders:\n${lines.join('\n')}\n\nTip: ask “track order <orderId>” for full status.`,
        };
    }

    // Admin dashboard overview
    if (lower.includes('dashboard') || lower.includes('overview') || lower.includes('summary') || lower.includes('analytics')) {
        if (!req.user) {
            return { handled: true, reply: 'Please login as admin to view dashboard analytics.' };
        }
        if (!isAdminUser(req)) {
            return { handled: true, reply: 'Dashboard analytics are available to admin accounts only.' };
        }

        const todayStart = startOfToday();
        const yesterdayStart = startOfYesterday();
        const lowStockThreshold = Number(process.env.LEXY_LOW_STOCK_THRESHOLD || 5);

        const [usersCount, productsCount, todayStats, yesterdayStats, pendingCount, lowStock] = await Promise.all([
            User.countDocuments({}),
            Product.countDocuments({}),
            getOrderStats({ start: todayStart }),
            getOrderStats({ start: yesterdayStart, end: todayStart }),
            Order.countDocuments({ orderStatus: { $in: ['Processing', 'Shipped'] } }),
            Product.find({ stock: { $lte: lowStockThreshold } }).sort({ stock: 1 }).limit(5).select('name stock'),
        ]);

        const lowStockLines = lowStock.length
            ? lowStock.map((p) => `${p.name} (stock: ${p.stock})`).join('\n')
            : 'None';

        return {
            handled: true,
            reply:
                `Dashboard overview:\n` +
                `Users: ${usersCount}\n` +
                `Products: ${productsCount}\n` +
                `Today orders: ${todayStats.count} | Revenue: ₹${todayStats.amount.toLocaleString()}\n` +
                `Yesterday orders: ${yesterdayStats.count} | Revenue: ₹${yesterdayStats.amount.toLocaleString()}\n` +
                `Pending (Processing/Shipped): ${pendingCount}\n` +
                `Low stock (<= ${lowStockThreshold}):\n${lowStockLines}`,
        };
    }

    // Admin user lookup (by email)
    if ((lower.includes('find user') || lower.includes('lookup user') || lower.includes('user details')) && lower.includes('@')) {
        if (!req.user) {
            return { handled: true, reply: 'Please login as admin to lookup users.' };
        }
        if (!isAdminUser(req)) {
            return { handled: true, reply: 'User lookup is available to admin accounts only.' };
        }

        const email = extractEmail(text);
        if (!email) return { handled: true, reply: 'Please provide a valid email address to lookup the user.' };

        const u = await User.findOne({ email: email.toLowerCase() }).select('_id name email role createdAt');
        if (!u) return { handled: true, reply: 'No user found with that email.' };

        return {
            handled: true,
            reply: `User found:\nName: ${u.name}\nEmail: ${u.email}\nRole: ${u.role}\nUser ID: ${u._id}\nCreated: ${new Date(
                u.createdAt
            ).toLocaleString()}`,
        };
    }

    // Capability / access question
    if (
        (lower.includes('database') || lower.includes('db')) &&
        (lower.includes('access') || lower.includes('connected') || lower.includes('connect'))
    ) {
        if (req.user && isAdminUser(req)) {
            return {
                handled: true,
                reply:
                    "Yes — for admin accounts I can securely query the store database for analytics (today/yesterday/last 7 days/month sales), inventory/stock, and order details. Ask: 'yesterday sales', 'orders today', or 'stock for <product name>'.",
            };
        }

        return {
            handled: true,
            reply:
                "I can access the product catalog for recommendations. For private data (your orders) please login and ask 'track order <orderId>'. Admin-only analytics/inventory requires an admin login.",
        };
    }

    // 1) Order status lookup (requires login; non-admin can only view own orders)
    if (lower.includes('order') && (lower.includes('status') || lower.includes('track') || lower.includes('tracking'))) {
        const orderId = extractMongoObjectId(text);
        if (!orderId) {
            return {
                handled: true,
                reply: 'Please share the 24-character Order ID and I can check its status.',
            };
        }
        if (!req.user) {
            return {
                handled: true,
                reply: 'Please login first, then share your Order ID so I can check the status securely.',
            };
        }

        const order = await Order.findById(orderId).select('orderStatus totalPrice createdAt shippedAt deliveredAt user');
        if (!order) {
            return { handled: true, reply: 'I could not find that order. Please double-check the Order ID.' };
        }

        const isOwner = String(order.user) === String(req.user._id);
        if (!isOwner && !isAdminUser(req)) {
            return { handled: true, reply: 'I can’t access that order. Please check from the account that placed it.' };
        }

        const parts = [
            `Order ${orderId}`,
            `Status: ${order.orderStatus}`,
            `Total: ₹${Number(order.totalPrice || 0).toLocaleString()}`,
        ];

        if (order.shippedAt) parts.push(`Shipped: ${new Date(order.shippedAt).toLocaleString()}`);
        if (order.deliveredAt) parts.push(`Delivered: ${new Date(order.deliveredAt).toLocaleString()}`);
        parts.push(`Placed: ${new Date(order.createdAt).toLocaleString()}`);

        return { handled: true, reply: parts.join('\n') };
    }

    // 2) Admin analytics: date-range sales / orders
    const wantsSalesMetric =
        lower.includes('sale') || lower.includes('sales') || lower.includes('revenue') || lower.includes('turnover') || lower.includes('orders');

    const isToday = lower.includes('today') || lower.includes('sold today');
    const isYesterday = lower.includes('yesterday');
    const isLast7Days = lower.includes('last 7') || lower.includes('last seven') || lower.includes('past week') || lower.includes('last week');
    const isThisMonth = lower.includes('this month') || lower.includes('current month');

    if (wantsSalesMetric && (isToday || isYesterday || isLast7Days || isThisMonth)) {
        if (!req.user) {
            return { handled: true, reply: 'Please login as admin to view sales analytics.' };
        }
        if (!isAdminUser(req)) {
            return { handled: true, reply: 'This metric is available to admin accounts only.' };
        }

        let label = 'Today';
        let start = startOfToday();
        let end;

        if (isYesterday) {
            label = 'Yesterday';
            start = startOfYesterday();
            end = startOfToday();
        } else if (isLast7Days) {
            label = 'Last 7 days';
            start = lastNDaysStart(7);
        } else if (isThisMonth) {
            label = 'This month';
            start = startOfThisMonth();
        }

        const { count, amount } = await getOrderStats({ start, end });
        return { handled: true, reply: `${label} orders: ${count}\n${label} revenue (gross): ₹${amount.toLocaleString()}` };
    }

    // 3) Inventory / stock lookup (admin-only)
    if (lower.includes('stock') || lower.includes('inventory')) {
        if (!req.user) {
            return { handled: true, reply: 'Please login as admin to check inventory.' };
        }
        if (!isAdminUser(req)) {
            return { handled: true, reply: 'Inventory management is available to admin accounts only.' };
        }

        const productId = extractMongoObjectId(text);
        if (productId) {
            const product = await Product.findById(productId).select('_id name stock price');
            if (!product) return { handled: true, reply: 'Product not found for that ID.' };
            return {
                handled: true,
                reply: `${product.name}\nStock: ${product.stock}\nPrice: ₹${Number(product.price || 0).toLocaleString()}`,
            };
        }

        // Try keyword search from the message.
        const keywords = pickKeywords(text).slice(0, 5);
        if (keywords.length === 0) {
            return { handled: true, reply: 'Tell me the product name (or paste the Product ID) to check stock.' };
        }
        const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const regex = new RegExp(pattern, 'i');
        const products = await Product.find({ name: regex }).select('_id name stock price').limit(3);

        if (!products.length) {
            return { handled: true, reply: 'No matching products found. Try a more specific product name.' };
        }

        const lines = products.map((p) => `${p.name} (stock: ${p.stock}, ₹${Number(p.price || 0).toLocaleString()})`);
        return { handled: true, reply: lines.join('\n') };
    }

    // 4) Support chat (creates a support ticket; requires login)
    if (lower.includes('support') || lower.includes('customer care') || lower.includes('help')) {
        // Avoid hijacking normal shopping queries like "help me choose a phone".
        const looksLikeSupport = lower.includes('refund') || lower.includes('return') || lower.includes('cancel') || lower.includes('complaint') || lower.includes('issue') || lower.includes('problem') || lower.includes('not delivered');
        if (looksLikeSupport) {
            if (!req.user) {
                return { handled: true, reply: 'Please login first so I can create a support request for your account.' };
            }

            const ticket = await SupportTicket.create({ user: req.user._id, message: text.slice(0, 2000) });
            return {
                handled: true,
                reply: `Support ticket created: ${ticket._id}\nOur team will get back to you soon.`,
            };
        }
    }

    return { handled: false };
};

const callOpenAIChatCompletions = ({ apiKey, model, messages, debug = false }) =>
    new Promise((resolve, reject) => {
        const payloadObject = {
            model,
            messages,
            temperature: 0.4,
        };
        const payload = JSON.stringify(payloadObject);

        const allowInsecureTls = shouldAllowInsecureTls();
        const agent = allowInsecureTls
            ? new https.Agent({ rejectUnauthorized: false })
            : undefined;

        const req = https.request(
            {
                hostname: OPENAI_HOST,
                path: OPENAI_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    Authorization: `Bearer ${apiKey}`,
                },
                ...(agent ? { agent } : null),
                timeout: 20000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    const parsed = safeJsonParse(data);
                    if (!parsed) {
                        return reject(new Error(`OpenAI: invalid JSON response (status ${res.statusCode})`));
                    }
                    if (res.statusCode && res.statusCode >= 400) {
                        const message = parsed?.error?.message || `OpenAI: HTTP ${res.statusCode}`;
                        return reject(new Error(message));
                    }

                    const content = parsed?.choices?.[0]?.message?.content;
                    if (!content) return reject(new Error('OpenAI: empty response'));
                    if (debug) {
                        return resolve({
                            content,
                            raw: parsed,
                            statusCode: res.statusCode,
                            allowInsecureTls,
                        });
                    }
                    resolve(content);
                });
            }
        );

        req.on('timeout', () => {
            req.destroy(new Error('OpenAI: request timed out'));
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });

const callAzureOpenAIChatCompletions = ({ azure, messages, temperature, maxTokens }) =>
    new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            messages,
            temperature,
            max_tokens: maxTokens,
        });

        const req = https.request(
            {
                hostname: azure.hostname,
                path: azure.path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    'api-key': azure.apiKey,
                },
                timeout: 15000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    const parsed = safeJsonParse(data);
                    if (!parsed) {
                        return reject(new Error(`Azure OpenAI: invalid JSON response (status ${res.statusCode})`));
                    }
                    if (res.statusCode && res.statusCode >= 400) {
                        const message = parsed?.error?.message || `Azure OpenAI: HTTP ${res.statusCode}`;
                        return reject(new Error(message));
                    }

                    const content = parsed?.choices?.[0]?.message?.content;
                    if (!content) return reject(new Error('Azure OpenAI: empty response'));
                    resolve(content);
                });
            }
        );

        req.on('timeout', () => {
            req.destroy(new Error('Azure OpenAI: request timed out'));
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });

exports.chatWithLexy = asyncErrorHandler(async (req, res) => {
    const message = (req.body?.message || '').toString().trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const memory = (req.body?.memory || '').toString().trim().slice(0, 600);
    const debugEnabled = false;

    console.log('[chat] incoming:', message.slice(0, 120));

    if (!message) {
        return res.status(400).json({
            success: false,
            message: 'Message is required',
        });
    }

    // Try built-in business intents first (order status, admin analytics, inventory, support tickets)
    const intent = await handleBusinessIntent({ req, message, history });
    if (intent?.handled) {
        console.log('[chat] handled by business intent, reply:', (intent.reply || '').slice(0, 80));
        return res.status(200).json({
            success: true,
            reply: intent.reply,
            products: [],
        });
    }

    let products = await findRelevantProducts(message);
    if ((!products || products.length === 0) && wantsCatalogAssurance(message)) {
        products = await getFallbackProducts();
    }

    const mappedProducts = products.map((p) => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        cuttedPrice: p.cuttedPrice,
        images: p.images,
        ratings: p.ratings,
        numOfReviews: p.numOfReviews,
    }));

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const azure = getAzureOpenAIConfig();

    // Sanitize/limit client-provided history to reduce prompt injection + payload size.
    const normalizedHistory = history
        .filter((m) => m && typeof m === 'object')
        .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: (m.content || '').toString().slice(0, 2000),
        }))
        .filter((m) => m.content.trim().length > 0)
        .slice(-6);

    const authContext = req.user
        ? isAdminUser(req)
            ? 'The current user is authenticated as an admin.'
            : 'The current user is authenticated as a normal user.'
        : 'The current user may be anonymous (not logged in).';

    const system = {
        role: 'system',
        content:
            'You are Lexy, a helpful assistant for an e-commerce site. ' +
            authContext +
            ' Be concise and practical. ' +
            'Never ask the user to paste passwords, tokens, API keys, cookies, or login credentials into chat. ' +
            'You have access to the store’s live product catalog via the backend database. Newly uploaded products will be available automatically. ' +
            'The "Product list (JSON)" you receive is a filtered set of relevant matches for the user’s message (not the whole catalog). ' +
            'Do NOT ask the user to provide a list of products available in the store. If the provided product list is empty, ask for preferences (category/brand/budget/concern) and offer to search again — but never request a catalog list or suggest checking the admin dashboard. ' +
            'If authentication is required, instruct them to login via the website UI. ' +
            'If you mention products, only use the provided product list and do not invent prices or availability. ' +
            'If asked for recommendations, suggest up to 3 items from the provided list with short reasons. ' +
            'Never fabricate user lists, user emails, order metrics, or inventory numbers. ' +
            'If asked for private data and you do not have a database-backed result, request the needed identifier (email/order id) or ask them to login (admin-only where applicable). ' +
            'If you do not have enough context, ask one clarifying question.',
    };

    const memoryContext = memory
        ? {
              role: 'system',
              content: `Known user preferences (may be stale): ${memory}`,
          }
        : null;

    const productContext = mappedProducts.length
        ? {
              role: 'system',
              content:
                  'Product list (JSON): ' +
                  JSON.stringify(
                      mappedProducts.map((p) => ({
                          _id: p._id,
                          name: p.name,
                          price: p.price,
                          cuttedPrice: p.cuttedPrice,
                          image: p.images?.[0]?.url,
                          ratings: p.ratings,
                          numOfReviews: p.numOfReviews,
                      }))
                  ),
          }
        : null;

    let reply;
    let debug = null;

    if (!apiKey && !azure) {
        reply = mappedProducts.length
            ? "I found a few matching products on the website — check the suggestions below. If you tell me your budget/brand preference, I can narrow it down."
            : "Sorry — I couldn't find that product on the website right now. Try a different keyword (brand/category), or share your budget and preferred features.";
    } else {
        const messages = [system];
        if (memoryContext) messages.push(memoryContext);
        if (productContext) messages.push(productContext);
        messages.push(...normalizedHistory);
        messages.push({ role: 'user', content: message });

        try {
            if (azure) {
                reply = await callAzureOpenAIChatCompletions({
                    azure,
                    messages,
                    temperature: 0.4,
                    maxTokens: 300,
                });
                if (debugEnabled) {
                    debug = {
                        provider: 'azure',
                        model: 'azure-deployment',
                        mappedProductsCount: mappedProducts.length,
                        normalizedHistoryCount: normalizedHistory.length,
                        allowInsecureTls: false,
                    };
                }
            } else {
                const result = await callOpenAIChatCompletions({ apiKey, model, messages, debug: debugEnabled });
                reply = debugEnabled ? result?.content : result;
                if (debugEnabled) {
                    const raw = result?.raw;
                    debug = {
                        provider: 'openai',
                        model: String(raw?.model || model || '').trim() || undefined,
                        openaiResponseId: raw?.id,
                        finishReason: raw?.choices?.[0]?.finish_reason,
                        usage: raw?.usage,
                        mappedProductsCount: mappedProducts.length,
                        normalizedHistoryCount: normalizedHistory.length,
                        allowInsecureTls: Boolean(result?.allowInsecureTls),
                    };
                }
            }
        } catch (e) {
            // Fail gracefully: still return product matches. If no matches, use a clearer “not found” response.
            reply = mappedProducts.length
                ? "I found a few matching products on the website — check the suggestions below. If you share your budget or preferred brand, I can narrow it down."
                : "Sorry — I couldn't find that product on the website right now. Try searching with a different keyword (brand/category) or a broader query.";
            console.warn('[chat] AI provider error:', e.message);
            console.warn('[chat] falling back to product-based reply, products:', mappedProducts.length);
            if (debugEnabled) {
                debug = {
                    provider: azure ? 'azure' : 'openai',
                    model: azure ? 'azure-deployment' : String(model || '').trim() || undefined,
                    error: String(e?.message || e),
                    mappedProductsCount: mappedProducts.length,
                    normalizedHistoryCount: normalizedHistory.length,
                };
            }
        }
    }

    const replyBeforeEnforcement = reply;
    const replyAfterEnforcement = enforceInventoryAccessMessaging({ reply, hasProducts: mappedProducts.length > 0 });
    if (debugEnabled) {
        debug = {
            ...(debug || {}),
            replyBeforeEnforcement,
            replyAfterEnforcement,
        };
    }

    console.log('[chat] reply:', (replyAfterEnforcement || '').slice(0, 100), '| products:', mappedProducts.length);

    return res.status(200).json({
        success: true,
        reply: replyAfterEnforcement,
        products: mappedProducts,
        ...(debugEnabled ? { debug } : null),
    });
});
