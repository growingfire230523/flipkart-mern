/**
 * OpenAI function-calling tool definitions for Lexi.
 *
 * Each tool has a `meta.role` field:
 *   'any'   → available to anonymous, logged-in users, and admins
 *   'user'  → requires authentication (user or admin)
 *   'admin' → admin only
 */

const tools = [
    // ─── Product discovery (any) ───────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'search_products',
            description:
                'Search the store product catalog. Supports keyword, category, brand, price range, rating, stock filters. Returns up to 6 product cards.',
            parameters: {
                type: 'object',
                properties: {
                    keyword: { type: 'string', description: 'Free-text search query (e.g. "waterproof mascara")' },
                    category: { type: 'string', description: 'Product category filter (e.g. "MAKEUP", "SKIN CARE", "PERFUME")' },
                    brand: { type: 'string', description: 'Brand name filter' },
                    minPrice: { type: 'number', description: 'Minimum price in INR' },
                    maxPrice: { type: 'number', description: 'Maximum price in INR' },
                    minRating: { type: 'number', description: 'Minimum average rating (0-5)' },
                    sortBy: {
                        type: 'string',
                        enum: ['price_asc', 'price_desc', 'rating', 'newest', 'bestselling'],
                        description: 'Sort order',
                    },
                    limit: { type: 'integer', description: 'Max products to return (default 6, max 10)' },
                },
                required: [],
            },
        },
        meta: { role: 'any' },
    },
    {
        type: 'function',
        function: {
            name: 'get_product_details',
            description: 'Get full details of a specific product by its ID or name.',
            parameters: {
                type: 'object',
                properties: {
                    productId: { type: 'string', description: '24-char MongoDB ObjectId' },
                    productName: { type: 'string', description: 'Product name (partial match)' },
                },
                required: [],
            },
        },
        meta: { role: 'any' },
    },

    // ─── Order queries (user) ──────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_my_orders',
            description:
                "Get the current user's own orders. Can filter by status, date range, or limit. Non-admin users can only see their own orders.",
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'Filter by order status (Processing, Shipped, Delivered)' },
                    limit: { type: 'integer', description: 'Max orders to return (default 5)' },
                    month: { type: 'string', description: 'Month name or number (e.g. "March", "3")' },
                    year: { type: 'integer', description: 'Year (e.g. 2026)' },
                },
                required: [],
            },
        },
        meta: { role: 'user' },
    },
    {
        type: 'function',
        function: {
            name: 'get_order_status',
            description: 'Get the status and details of a specific order by Order ID.',
            parameters: {
                type: 'object',
                properties: {
                    orderId: { type: 'string', description: '24-char Order ID' },
                },
                required: ['orderId'],
            },
        },
        meta: { role: 'user' },
    },

    // ─── User self-service (user) ──────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_my_profile',
            description: 'Get the current logged-in user profile (name, email, role, addresses).',
            parameters: { type: 'object', properties: {}, required: [] },
        },
        meta: { role: 'user' },
    },

    // ─── Support tickets (user) ────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'create_support_ticket',
            description: 'Create a support ticket for the current user. Use when the user has a complaint, issue, or wants to escalate.',
            parameters: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'The support issue description (max 2000 chars)' },
                },
                required: ['message'],
            },
        },
        meta: { role: 'user' },
    },

    // ─── Admin: User management ────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'search_users',
            description: 'Search for users by name, email, role, or registration date. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'User name (partial match)' },
                    email: { type: 'string', description: 'User email (partial match)' },
                    role: { type: 'string', enum: ['user', 'admin'], description: 'Filter by role' },
                    limit: { type: 'integer', description: 'Max users to return (default 10)' },
                    month: { type: 'string', description: 'Registration month (e.g. "March")' },
                    year: { type: 'integer', description: 'Registration year' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },
    {
        type: 'function',
        function: {
            name: 'get_user_count',
            description: 'Get total count of registered users, optionally filtered. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    role: { type: 'string', description: 'Filter by role' },
                    sinceDays: { type: 'integer', description: 'Users registered in last N days' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: Order analytics ────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_order_analytics',
            description:
                'Get order/revenue analytics for a date range. Returns count, total revenue, average order value. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    period: {
                        type: 'string',
                        enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_year', 'custom'],
                        description: 'Predefined period',
                    },
                    startDate: { type: 'string', description: 'Custom start date (ISO or YYYY-MM-DD)' },
                    endDate: { type: 'string', description: 'Custom end date (ISO or YYYY-MM-DD)' },
                    groupBy: { type: 'string', enum: ['day', 'week', 'month'], description: 'Group results by time bucket' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },
    {
        type: 'function',
        function: {
            name: 'compare_periods',
            description:
                'Compare order/revenue metrics between two time periods. E.g. "Compare March 2026 vs February 2026". Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    period1Label: { type: 'string', description: 'Human label for period 1 (e.g. "March 2026")' },
                    period1Start: { type: 'string', description: 'Start date of period 1 (ISO or YYYY-MM-DD)' },
                    period1End: { type: 'string', description: 'End date of period 1 (ISO or YYYY-MM-DD)' },
                    period2Label: { type: 'string', description: 'Human label for period 2 (e.g. "February 2026")' },
                    period2Start: { type: 'string', description: 'Start date of period 2 (ISO or YYYY-MM-DD)' },
                    period2End: { type: 'string', description: 'End date of period 2 (ISO or YYYY-MM-DD)' },
                },
                required: ['period1Start', 'period1End', 'period2Start', 'period2End'],
            },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: Product / inventory analytics ──────────────────────
    {
        type: 'function',
        function: {
            name: 'get_top_products',
            description: 'Get top-performing products by revenue, orders, or ratings. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    sortBy: {
                        type: 'string',
                        enum: ['revenue', 'quantity', 'rating', 'reviews'],
                        description: 'Ranking criterion',
                    },
                    category: { type: 'string', description: 'Filter by category' },
                    limit: { type: 'integer', description: 'Number of products (default 10)' },
                    startDate: { type: 'string', description: 'Only count orders after this date' },
                    endDate: { type: 'string', description: 'Only count orders before this date' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },
    {
        type: 'function',
        function: {
            name: 'get_inventory_status',
            description: 'Get inventory status: low-stock products, out-of-stock products, stock summary by category. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    mode: {
                        type: 'string',
                        enum: ['low_stock', 'out_of_stock', 'category_summary', 'all'],
                        description: 'What inventory info to retrieve',
                    },
                    threshold: { type: 'integer', description: 'Stock threshold for low_stock mode (default 5)' },
                    limit: { type: 'integer', description: 'Max products to return (default 10)' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },
    {
        type: 'function',
        function: {
            name: 'get_category_analytics',
            description: 'Get revenue, order count, and product count broken down by product category. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', description: 'Start date filter' },
                    endDate: { type: 'string', description: 'End date filter' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: All orders management ──────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_all_orders',
            description: 'List/search all orders across all users. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'Filter by order status' },
                    minAmount: { type: 'number', description: 'Minimum order total' },
                    maxAmount: { type: 'number', description: 'Maximum order total' },
                    userId: { type: 'string', description: 'Filter by user ID' },
                    startDate: { type: 'string', description: 'Orders placed after this date' },
                    endDate: { type: 'string', description: 'Orders placed before this date' },
                    limit: { type: 'integer', description: 'Max orders (default 10)' },
                    sortBy: { type: 'string', enum: ['newest', 'oldest', 'amount_desc', 'amount_asc'], description: 'Sort order' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: Support tickets ────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_support_tickets',
            description: 'List and filter support tickets across all users. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['Open', 'Closed'], description: 'Filter by ticket status' },
                    limit: { type: 'integer', description: 'Max tickets (default 10)' },
                    keyword: { type: 'string', description: 'Search ticket messages for keyword' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: Mailing list & campaigns ───────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_mailing_list_stats',
            description: 'Get mailing list subscriber stats: total, active, unsubscribed, by source. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    includeRecent: { type: 'boolean', description: 'Include list of recent subscribers' },
                    limit: { type: 'integer', description: 'Number of recent subscribers to include (default 5)' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },
    {
        type: 'function',
        function: {
            name: 'get_campaign_stats',
            description: 'Get email campaign stats: list recent campaigns with status, totals sent/failed, open rates. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', description: 'Number of campaigns (default 5)' },
                    status: { type: 'string', enum: ['queued', 'scheduled', 'sending', 'sent', 'failed'], description: 'Filter by status' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: Payment analytics ──────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_payment_analytics',
            description:
                'Get payment method breakdown, success/fail rates, gateway stats. Admin only.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', description: 'Start date' },
                    endDate: { type: 'string', description: 'End date' },
                },
                required: [],
            },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: Deal & banner config ───────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_deal_config',
            description: 'Get current deal/flash-sale configuration. Admin only.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
        meta: { role: 'admin' },
    },

    // ─── Admin: Dashboard overview ─────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_dashboard_overview',
            description:
                'High-level business dashboard: total users, products, today/yesterday revenue, pending orders, low stock. Admin only.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
        meta: { role: 'admin' },
    },
];

/**
 * Returns only the tools the given role may use.
 * @param {'admin'|'user'|'anonymous'} role
 */
const getToolsForRole = (role) => {
    return tools
        .filter((t) => {
            const required = t.meta?.role || 'any';
            if (required === 'any') return true;
            if (required === 'user') return role === 'user' || role === 'admin';
            if (required === 'admin') return role === 'admin';
            return false;
        })
        .map(({ meta, ...rest }) => rest); // strip meta before sending to OpenAI
};

const getToolNames = () => tools.map((t) => t.function.name);

module.exports = { tools, getToolsForRole, getToolNames };
