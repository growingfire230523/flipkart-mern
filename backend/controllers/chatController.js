const https = require('https');
const ChatSession = require('../models/chatSessionModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const { getToolsForRole } = require('../services/lexiTools');
const { executeTool } = require('../services/lexiToolExecutor');

// ── Configuration helpers ──────────────────────────────────────────

const OPENAI_HOST = 'api.openai.com';
const OPENAI_PATH = '/v1/chat/completions';
const MAX_TOOL_ROUNDS = 3;

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

    if (!deployment || !apiVersion) return null;

    const path = `/openai/deployments/${encodeURIComponent(String(deployment).trim())}/chat/completions?api-version=${encodeURIComponent(
        String(apiVersion).trim()
    )}`;

    return {
        hostname: endpointUrl.hostname,
        path,
        apiKey: String(apiKey).trim(),
    };
};

const safeJsonParse = (text) => {
    try { return JSON.parse(text); }
    catch (_) { return null; }
};

// ── OpenAI / Azure call with function-calling support ──────────────

/**
 * Call OpenAI Chat Completions (supports tool_calls).
 * Returns the full message object from choices[0].message.
 */
const callOpenAI = ({ apiKey, model, messages, tools }) =>
    new Promise((resolve, reject) => {
        const body = { model, messages, temperature: 0.4 };
        if (tools && tools.length > 0) {
            body.tools = tools;
            body.tool_choice = 'auto';
        }
        const payload = JSON.stringify(body);

        const allowInsecureTls = shouldAllowInsecureTls();
        const agent = allowInsecureTls ? new https.Agent({ rejectUnauthorized: false }) : undefined;

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
                ...(agent ? { agent } : {}),
                timeout: 30000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    const parsed = safeJsonParse(data);
                    if (!parsed) return reject(new Error(`OpenAI: invalid JSON (status ${res.statusCode})`));
                    if (res.statusCode >= 400) {
                        return reject(new Error(parsed?.error?.message || `OpenAI: HTTP ${res.statusCode}`));
                    }
                    const msg = parsed?.choices?.[0]?.message;
                    if (!msg) return reject(new Error('OpenAI: empty response'));
                    resolve(msg);
                });
            }
        );
        req.on('timeout', () => req.destroy(new Error('OpenAI: request timed out')));
        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });

/**
 * Call Azure OpenAI Chat Completions (supports tool_calls).
 */
const callAzureOpenAI = ({ azure, messages, tools }) =>
    new Promise((resolve, reject) => {
        const body = { messages, temperature: 0.4, max_tokens: 800 };
        if (tools && tools.length > 0) {
            body.tools = tools;
            body.tool_choice = 'auto';
        }
        const payload = JSON.stringify(body);

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
                timeout: 30000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    const parsed = safeJsonParse(data);
                    if (!parsed) return reject(new Error(`Azure OpenAI: invalid JSON (status ${res.statusCode})`));
                    if (res.statusCode >= 400) {
                        return reject(new Error(parsed?.error?.message || `Azure OpenAI: HTTP ${res.statusCode}`));
                    }
                    const msg = parsed?.choices?.[0]?.message;
                    if (!msg) return reject(new Error('Azure OpenAI: empty response'));
                    resolve(msg);
                });
            }
        );
        req.on('timeout', () => req.destroy(new Error('Azure OpenAI: request timed out')));
        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });

// ── System prompt builder ──────────────────────────────────────────

const buildSystemPrompt = (userRole, userName, memory) => {
    const roleDesc =
        userRole === 'admin'
            ? 'The current user is an authenticated **admin**. They can access all store analytics, user data, orders, inventory, payments, campaigns, and support tickets via tool calls.'
            : userRole === 'user'
            ? `The current user is an authenticated customer${userName ? ` named ${userName}` : ''}. They can search products, view their own orders, profile, and create support tickets.`
            : 'The current user is a guest (not logged in). They can search and browse products. For personal data (orders, profile), they must log in first.';

    let prompt =
        `You are **Lexy**, the intelligent AI shopping assistant for an e-commerce beauty & lifestyle store.\n\n` +
        `## Role & Capabilities\n` +
        `${roleDesc}\n\n` +
        `## Core Rules\n` +
        `1. **Always use tools** to fetch real data. NEVER fabricate product names, prices, stock levels, order details, analytics numbers, or user data.\n` +
        `2. If a query requires data you don't have, call the appropriate tool. If no tool can answer it, say so honestly.\n` +
        `3. For product recommendations, call \`search_products\` first, then present results in a helpful way.\n` +
        `4. Never ask the user to paste passwords, tokens, API keys, or credentials.\n` +
        `5. When the user asks for something that requires login and they aren't logged in, tell them to log in via the website.\n` +
        `6. If a user asks for something admin-only and they aren't admin, politely decline.\n` +
        `7. If you cannot help or the issue is complex, offer to create a support ticket using \`create_support_ticket\`.\n` +
        `8. Keep responses concise but complete. Use bullet points for lists.\n` +
        `9. When displaying product results, include name, price, and rating. The frontend will render product cards automatically from tool results.\n` +
        `10. **NEVER** include markdown image syntax like ![name](url) or raw image URLs in your text responses. The frontend renders product images automatically from tool data — embedding image links in text creates ugly raw-URL output.\n` +
        `11. For admin analytics, present numbers with clear labels and formatting.\n`;

    if (memory) {
        prompt += `\n## Known User Preferences\n${memory}\n`;
    }

    return prompt;
};

// ── Normalise client-supplied history ──────────────────────────────

const normalizeClientHistory = (history) => {
    if (!Array.isArray(history)) return [];
    return history
        .filter((m) => m && typeof m === 'object')
        .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || '').slice(0, 2000),
        }))
        .filter((m) => m.content.trim().length > 0)
        .slice(-10);
};

// ── Session helpers ────────────────────────────────────────────────

const loadOrCreateSession = async (sessionId, userId, guestId) => {
    if (sessionId) {
        const existing = await ChatSession.findById(sessionId);
        if (existing) return existing;
    }
    if (userId) {
        const existing = await ChatSession.findOne({ user: userId }).sort({ lastActiveAt: -1 });
        if (existing) return existing;
    }
    return new ChatSession({
        user: userId || undefined,
        guestId: userId ? undefined : (guestId || 'guest'),
    });
};

const trimSessionMessages = (session, maxMessages = 40) => {
    if (session.messages.length > maxMessages) {
        session.messages = session.messages.slice(-maxMessages);
    }
};

// ── Main chat endpoint ─────────────────────────────────────────────

exports.chatWithLexy = asyncErrorHandler(async (req, res) => {
    const message = String(req.body?.message || '').trim();
    const clientHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const memory = String(req.body?.memory || '').trim().slice(0, 600);
    const sessionId = req.body?.sessionId || null;

    console.log('[chat] incoming:', message.slice(0, 120));

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Block credential extraction attempts
    const lower = message.toLowerCase();
    if (lower.includes('password') || lower.includes('credential') || lower.includes('api key') || lower.includes('secret key')) {
        return res.status(200).json({
            success: true,
            reply: 'For security, please do not share passwords, tokens, or credentials in chat. Use the website login page instead.',
            products: [],
        });
    }

    // ── Determine user context ─────────────────────────────────────
    const userId = req.user?._id || null;
    const userRole = req.user?.role === 'admin' ? 'admin' : (req.user ? 'user' : 'anonymous');
    const userName = req.user?.name || null;

    // ── Load / create chat session ─────────────────────────────────
    const session = await loadOrCreateSession(sessionId, userId);

    // ── Build conversation messages for OpenAI ─────────────────────
    const systemPrompt = buildSystemPrompt(userRole, userName, memory || undefined);
    const systemMsg = { role: 'system', content: systemPrompt };

    // Use server-side session if populated, otherwise fall back to client history
    const priorMessages = session.messages.length > 0
        ? session.messages.slice(-20).map((m) => {
            const msg = { role: m.role, content: m.content || '' };
            if (m.toolCallId) msg.tool_call_id = m.toolCallId;
            if (m.toolCalls) msg.tool_calls = m.toolCalls;
            return msg;
        })
        : normalizeClientHistory(clientHistory);

    const openaiMessages = [systemMsg, ...priorMessages, { role: 'user', content: message }];

    // ── Select provider ────────────────────────────────────────────
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const azure = getAzureOpenAIConfig();
    const tools = getToolsForRole(userRole);

    if (!apiKey && !azure) {
        return res.status(200).json({
            success: true,
            reply: "I'm having trouble connecting to my AI backend right now. Please try again in a moment.",
            products: [],
            sessionId: session._id || undefined,
        });
    }

    // ── Agentic loop (up to MAX_TOOL_ROUNDS) ───────────────────────
    let collectedProducts = [];
    let finalReply = null;

    try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            console.log(`[chat] round ${round + 1}, messages: ${openaiMessages.length}`);

            const assistantMsg = azure
                ? await callAzureOpenAI({ azure, messages: openaiMessages, tools })
                : await callOpenAI({ apiKey, model, messages: openaiMessages, tools });

            const toolCalls = assistantMsg.tool_calls;

            if (!toolCalls || toolCalls.length === 0) {
                // LLM gave a final text response
                finalReply = assistantMsg.content || '';
                break;
            }

            // Append assistant message with tool_calls (no content)
            openaiMessages.push({
                role: 'assistant',
                content: assistantMsg.content || null,
                tool_calls: toolCalls,
            });

            // Execute each tool call
            for (const tc of toolCalls) {
                const fnName = tc.function?.name;
                const fnArgs = safeJsonParse(tc.function?.arguments) || {};

                console.log(`[chat] tool call: ${fnName}`, JSON.stringify(fnArgs).slice(0, 200));

                const result = await executeTool(fnName, fnArgs, { userId, userRole });

                // Collect products for the frontend product cards
                if (result.products && Array.isArray(result.products)) {
                    collectedProducts.push(...result.products);
                }

                // Send tool result back
                openaiMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: JSON.stringify(result),
                });
            }
            // Loop continues — LLM will process tool results
        }

        // If we exhausted rounds without a text reply, ask LLM for a summary
        if (finalReply === null) {
            openaiMessages.push({
                role: 'user',
                content: 'Please summarize the information gathered and respond to the original question.',
            });
            const summaryMsg = azure
                ? await callAzureOpenAI({ azure, messages: openaiMessages, tools: [] })
                : await callOpenAI({ apiKey, model, messages: openaiMessages, tools: [] });
            finalReply = summaryMsg.content || 'I gathered the data but had trouble summarizing. Please try rephrasing your question.';
        }
    } catch (err) {
        console.error('[chat] AI provider error:', err.message);
        finalReply = "I'm having trouble processing your request right now. Please try again in a moment.";
    }

    // ── Deduplicate collected products ──────────────────────────────
    const seenIds = new Set();
    const uniqueProducts = collectedProducts.filter((p) => {
        const id = String(p._id);
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
    }).slice(0, 10);

    // ── Persist to session ─────────────────────────────────────────
    session.messages.push({ role: 'user', content: message });
    session.messages.push({
        role: 'assistant',
        content: finalReply,
        products: uniqueProducts,
    });
    trimSessionMessages(session);
    session.lastActiveAt = Date.now();

    try {
        await session.save();
    } catch (saveErr) {
        console.error('[chat] session save error:', saveErr.message);
    }

    console.log('[chat] reply:', (finalReply || '').slice(0, 100), '| products:', uniqueProducts.length);

    return res.status(200).json({
        success: true,
        reply: finalReply,
        products: uniqueProducts,
        sessionId: session._id,
    });
});
