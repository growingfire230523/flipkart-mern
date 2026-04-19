const https = require('https');
let twilioClient = null;

const getTwilioClient = () => {
    if (!twilioClient) {
        const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
        const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
        if (!accountSid || !authToken) {
            throw new Error('Twilio not configured for WhatsApp (set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)');
        }
        const twilio = require('twilio');
        twilioClient = twilio(accountSid, authToken);
    }
    return twilioClient;
};

const jsonRequest = (url, { method = 'POST', headers = {}, body } = {}) =>
    new Promise((resolve, reject) => {
        const req = https.request(
            url,
            {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const statusCode = res.statusCode || 0;
                    let parsed = null;
                    try {
                        parsed = data ? JSON.parse(data) : null;
                    } catch {
                        parsed = data || null;
                    }

                    if (statusCode >= 200 && statusCode < 300) {
                        resolve({ ok: true, statusCode, data: parsed });
                        return;
                    }

                    const message =
                        (parsed && typeof parsed === 'object' && parsed.error && parsed.error.message) ||
                        `WhatsApp API request failed (${statusCode})`;
                    const error = new Error(message);
                    error.statusCode = statusCode;
                    error.data = parsed;
                    reject(error);
                });
            }
        );

        req.on('error', reject);
        if (body !== undefined) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });

const getConfig = () => {
    const provider = String(process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();

    if (provider === 'twilio') {
        const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
        const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
        const fromRaw = String(process.env.TWILIO_WHATSAPP_FROM || '').trim() || String(process.env.TWILIO_FROM || '').trim();

        const enabled = Boolean(accountSid && authToken && fromRaw);

        return {
            provider: 'twilio',
            enabled,
            accountSid,
            authToken,
            from: fromRaw,
        };
    }

    const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
    const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
    const graphVersion = String(process.env.WHATSAPP_GRAPH_VERSION || 'v20.0').trim();

    return {
        provider: 'meta',
        enabled: Boolean(accessToken && phoneNumberId),
        accessToken,
        phoneNumberId,
        graphVersion,
    };
};

const normalizeMetaRecipient = (to) => {
    let value = String(to || '').trim();
    if (!value) return '';
    if (value.toLowerCase().startsWith('whatsapp:')) {
        value = value.slice('whatsapp:'.length);
    }
    // Meta expects an international number without symbols (digits only).
    return value.replace(/\D/g, '');
};

const isLogMode = () => String(process.env.WHATSAPP_MODE || '').toLowerCase() === 'log';

const sendWhatsAppText = async ({ to, body, previewUrl = false }) => {
    if (isLogMode()) {
        console.log('[whatsapp] WHATSAPP_MODE=log (not sending)');
        console.log('[whatsapp] to:', to);
        console.log('[whatsapp] body:', body);
        return { skipped: false, ok: true, logged: true };
    }

    const cfg = getConfig();
    if (!cfg.enabled) return { skipped: true, reason: 'whatsapp_not_configured' };

    // Twilio WhatsApp: use Twilio REST API instead of Meta Graph
    if (cfg.provider === 'twilio') {
        const client = getTwilioClient();

        let toNumber = String(to || '').trim();
        if (!toNumber) return { skipped: true, reason: 'missing_to' };

        // Twilio requires whatsapp:+<number>
        if (!toNumber.startsWith('whatsapp:')) {
            toNumber = `whatsapp:${toNumber}`;
        }

        let fromNumber = String(cfg.from || '').trim();
        if (!fromNumber) return { skipped: true, reason: 'missing_from' };
        if (!fromNumber.startsWith('whatsapp:')) {
            fromNumber = `whatsapp:${fromNumber}`;
        }

        const messageBody = String(body || '').slice(0, 1600);

        const msg = await client.messages.create({
            from: fromNumber,
            to: toNumber,
            body: messageBody,
        });

        return { skipped: false, ok: true, statusCode: 201, data: msg };
    }

    // Default: Meta WhatsApp Business Cloud API
    const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`;

    const toMeta = normalizeMetaRecipient(to);
    if (!toMeta) return { skipped: true, reason: 'missing_to' };

    const payload = {
        messaging_product: 'whatsapp',
        to: toMeta,
        type: 'text',
        text: {
            preview_url: Boolean(previewUrl),
            body: String(body || '').slice(0, 4096),
        },
    };

    const res = await jsonRequest(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${cfg.accessToken}`,
        },
        body: payload,
    });

    return { skipped: false, ...res };
};

const sendWhatsAppTemplate = async ({ to, name, languageCode = 'en', components = [] }) => {
    if (isLogMode()) {
        console.log('[whatsapp] WHATSAPP_MODE=log (not sending template)');
        console.log('[whatsapp] to:', to, '| template:', name, '| lang:', languageCode);
        console.log('[whatsapp] components:', JSON.stringify(components));
        return { skipped: false, ok: true, logged: true };
    }

    const cfg = getConfig();
    if (!cfg.enabled) return { skipped: true, reason: 'whatsapp_not_configured' };

    // Template sends are only implemented for Meta. For Twilio we
    // currently rely on plain-text messages (WHATSAPP_ALLOW_TEXT=true).
    if (cfg.provider === 'twilio') {
        return { skipped: true, reason: 'templates_not_supported_for_twilio' };
    }

    if (!name) return { skipped: true, reason: 'missing_template_name' };

    const toMeta = normalizeMetaRecipient(to);
    if (!toMeta) return { skipped: true, reason: 'missing_to' };

    const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`;

    const payload = {
        messaging_product: 'whatsapp',
        to: toMeta,
        type: 'template',
        template: {
            name,
            language: { code: languageCode },
            components: Array.isArray(components) ? components : [],
        },
    };

    const res = await jsonRequest(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${cfg.accessToken}`,
        },
        body: payload,
    });

    return { skipped: false, ...res };
};

const sendWhatsAppOtp = async ({ to, otp }) => {
    if (isLogMode()) {
        console.log('[whatsapp] WHATSAPP_MODE=log (not sending OTP)');
        console.log('[whatsapp] to:', to, '| otp:', otp);
        return { skipped: false, ok: true, logged: true };
    }

    const templateName = String(process.env.WHATSAPP_TEMPLATE_OTP || '').trim();
    const languageCode = String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en').trim();

    if (templateName) {
        return sendWhatsAppTemplate({
            to,
            name: templateName,
            languageCode,
            components: [
                {
                    type: 'body',
                    parameters: [{ type: 'text', text: String(otp) }],
                },
            ],
        });
    }

    // Fallback: plain text (only when WHATSAPP_ALLOW_TEXT=true)
    const cfg = getConfig();
    if (!cfg.enabled) return { skipped: true, reason: 'whatsapp_not_configured' };

    const body = `Your Lexy OTP is ${otp}. It expires in 10 minutes. Do not share this with anyone.`;
    return sendWhatsAppText({ to, body });
};

module.exports = {
    getWhatsAppConfig: getConfig,
    sendWhatsAppText,
    sendWhatsAppTemplate,
    sendWhatsAppOtp,
};
