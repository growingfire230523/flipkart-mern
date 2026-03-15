const https = require('https');
const fs = require('fs');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');

const OPENAI_HOST = 'api.openai.com';
const OPENAI_CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

const shouldAllowInsecureTls = () => {
    const flag = process.env.IMAGE_SEARCH_INSECURE_TLS || process.env.OPENAI_INSECURE_TLS || process.env.VOICE_TRANSCRIBE_INSECURE_TLS;
    return String(flag || '').trim().toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';
};

const isLikelyTlsCertError = (err) => {
    const code = String(err?.code || '').toUpperCase();
    const msg = String(err?.message || '').toLowerCase();
    return (
        code.includes('CERT') ||
        code.includes('UNABLE_TO_GET_ISSUER_CERT_LOCALLY') ||
        code.includes('SELF_SIGNED_CERT') ||
        code.includes('DEPTH_ZERO_SELF_SIGNED_CERT') ||
        msg.includes('unable to get local issuer certificate') ||
        msg.includes('self signed certificate') ||
        msg.includes('certificate')
    );
};

const isNetworkOrDnsError = (err) => {
    const code = String(err?.code || '').toUpperCase();
    const msg = String(err?.message || '').toLowerCase();
    return (
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN' ||
        code === 'ECONNREFUSED' ||
        msg.includes('getaddrinfo') ||
        msg.includes('dns') ||
        msg.includes('network is unreachable')
    );
};

const callOpenAIImageKeywords = async ({ apiKey, model, imageDataUrl }) => {
    const allowInsecureTls = shouldAllowInsecureTls();

    const system =
        'You generate product search queries for an e-commerce store from an image. ' +
        'Always respond in English. ' +
        'CRITICAL: Identify the most common, canonical retail product name/category (what users type). ' +
        'Avoid generic wording like "device", "item", "product", "beauty product", "makeup". ' +
        'Prefer short exact labels. Examples: ' +
        '"Air Conditioner" (not "Air Conditioning device"), ' +
        '"Mascara" (not "Mascara makeup"), ' +
        '"Armani Perfume" (not "Armani beauty product"). ' +
        'Return ONLY JSON with keys: query (string) and keywords (array of strings). No extra text.';

    const userText =
        'Analyze the image and extract 3-8 short search keywords. ' +
        'The first keyword should be the best single canonical product name/category. ' +
        'Then produce a single query string (2-6 words) that a customer would type to find that exact product type (optionally include brand). ' +
        'Do not add generic words like device/product/item/makeup/beauty. ' +
        'If unclear, guess the most likely product category using common retail terms.';

    const payload = {
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: system },
            {
                role: 'user',
                content: [
                    { type: 'text', text: userText },
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                ],
            },
        ],
    };

    const body = Buffer.from(JSON.stringify(payload));

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                method: 'POST',
                hostname: OPENAI_HOST,
                path: OPENAI_CHAT_COMPLETIONS_PATH,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': body.length,
                },
                ...(allowInsecureTls ? { rejectUnauthorized: false } : null),
                timeout: 60_000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    let parsed;
                    try {
                        parsed = JSON.parse(data);
                    } catch {
                        const snippet = String(data || '').slice(0, 400);
                        return reject(new Error(`OpenAI: invalid JSON response (status ${res.statusCode}). Body: ${snippet}`));
                    }

                    if (res.statusCode >= 400) {
                        const msg = parsed?.error?.message || `OpenAI: HTTP ${res.statusCode}`;
                        return reject(new Error(msg));
                    }

                    const content = parsed?.choices?.[0]?.message?.content;
                    if (!content) return reject(new Error('OpenAI: empty response'));

                    try {
                        const obj = JSON.parse(content);
                        resolve(obj);
                    } catch {
                        const snippet = String(content || '').slice(0, 400);
                        reject(new Error(`OpenAI: could not parse JSON content. Content: ${snippet}`));
                    }
                });
            }
        );

        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('OpenAI: request timed out')));
        req.write(body);
        req.end();
    });
};

const normalizeLabel = (value) => {
    let s = String(value || '').trim();
    if (!s) return '';

    // Prefer canonical phrasing for common cases.
    s = s.replace(/\bair\s*conditioning\b/gi, 'air conditioner');

    // Remove generic filler words that make queries vague.
    s = s.replace(/\b(beauty\s+product|cosmetic\s+product|beauty|cosmetic|product|device|item|makeup)\b/gi, ' ');

    // Clean up whitespace.
    s = s.replace(/\s{2,}/g, ' ').trim();

    return s;
};

exports.imageSearch = asyncErrorHandler(async (req, res, next) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return next(new ErrorHandler('Image search is not configured. Set OPENAI_API_KEY in backend/config/config.env and restart the server.', 500));
    }

    const image = req?.files?.image;
    if (!image) {
        return next(new ErrorHandler('No image uploaded. Field name must be "image".', 400));
    }

    // express-fileupload gives either `data` (Buffer) or `tempFilePath` depending on config.
    let fileBuffer = image.data;
    if (!Buffer.isBuffer(fileBuffer) && image?.tempFilePath) {
        try {
            fileBuffer = fs.readFileSync(image.tempFilePath);
        } catch {
            fileBuffer = null;
        }
    }

    if (!Buffer.isBuffer(fileBuffer)) {
        return next(new ErrorHandler('Invalid image payload.', 400));
    }

    // Prevent huge base64 payloads to OpenAI. (base64 adds ~33% overhead)
    const maxBytes = Number(process.env.IMAGE_SEARCH_MAX_BYTES || 4_000_000);
    if (Number.isFinite(maxBytes) && maxBytes > 0 && fileBuffer.length > maxBytes) {
        return next(new ErrorHandler('Image is too large. Please upload a smaller image.', 413));
    }

    const mimeType = String(image?.mimetype || '').trim() || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
        return next(new ErrorHandler('Invalid file type. Please upload an image.', 400));
    }

    const base64 = fileBuffer.toString('base64');
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    const model = String(process.env.OPENAI_IMAGE_KEYWORDS_MODEL || 'gpt-4o-mini').trim();

    let result;
    try {
        result = await callOpenAIImageKeywords({ apiKey, model, imageDataUrl });
    } catch (err) {
        if (isLikelyTlsCertError(err)) {
            return next(
                new ErrorHandler(
                    'TLS certificate error while calling OpenAI for image analysis. If you are behind a corporate proxy, configure Node to trust your proxy/root CA (recommended). As a dev-only workaround you can set IMAGE_SEARCH_INSECURE_TLS=true in backend/config/config.env and restart the backend.',
                    502
                )
            );
        }
        if (isNetworkOrDnsError(err)) {
            return next(
                new ErrorHandler(
                    'Unable to reach OpenAI for image analysis (network/DNS error). Please check your internet connection, firewall, or DNS settings and ensure api.openai.com is accessible from this machine.',
                    502
                )
            );
        }
        return next(new ErrorHandler(String(err?.message || 'Image analysis failed.'), 502));
    }

    const keywords = Array.isArray(result?.keywords)
        ? result.keywords
              .map((k) => normalizeLabel(k))
              .filter(Boolean)
              .slice(0, 10)
        : [];

    const queryFromModel = normalizeLabel(result?.query);
    const query = queryFromModel || keywords.join(' ');

    if (!query) {
        return next(new ErrorHandler('Could not extract keywords from the image. Please try a clearer photo.', 422));
    }

    res.status(200).json({ query, keywords });
});
