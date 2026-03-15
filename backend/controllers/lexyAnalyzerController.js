const https = require('https');
const fs = require('fs');
const Product = require('../models/productModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');

const OPENAI_HOST = 'api.openai.com';
const OPENAI_CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

const shouldAllowInsecureTls = () => {
    const flag =
        process.env.LEXY_ANALYZER_INSECURE_TLS ||
        process.env.OPENAI_INSECURE_TLS ||
        process.env.VOICE_TRANSCRIBE_INSECURE_TLS ||
        process.env.IMAGE_SEARCH_INSECURE_TLS;
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

const callOpenAIFaceAnalyzer = async ({ apiKey, model, imageDataUrl }) => {
    const allowInsecureTls = shouldAllowInsecureTls();

    const system =
        'You are a beauty e-commerce assistant analyzing a selfie image for cosmetic recommendations. ' +
        'Always respond in English. ' +
        'Return ONLY JSON with keys: skinTone, undertone, faceShape, keyFeatures, confidence, suggestedSearches. ' +
        'skinTone must be one of: Fair, Light, Medium, Tan, Deep. ' +
        'undertone must be one of: Cool, Warm, Neutral. ' +
        'faceShape must be one of: Oval, Round, Square, Heart, Long. ' +
        'keyFeatures must be an array of 3 short strings (e.g., "Eyes", "Lips", "Cheekbones"). ' +
        'confidence must be a number from 0 to 100. ' +
        'suggestedSearches must be an array of exactly 4 short search queries (2-6 words each) suitable for a cosmetics store (e.g., "matte red lipstick", "hydrating face serum"). ' +
        'If the image does not contain a clear face, still return valid JSON but set confidence to 0 and use generic suggestedSearches.';

    const userText =
        'Analyze the face in the image and infer cosmetic-relevant attributes (skin tone category + undertone + face shape). ' +
        'Do not mention sensitive traits like ethnicity or race. Provide only the requested JSON.';

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
                        resolve(JSON.parse(content));
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

const normalizeString = (v) => String(v || '').trim();

const pickKeywords = (text) => {
    if (!text || typeof text !== 'string') return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 10);
};

const findCatalogProductsFromQueries = async (queries) => {
    const list = Array.isArray(queries) ? queries : [];
    const keywords = list
        .flatMap((q) => pickKeywords(String(q || '')))
        .filter(Boolean)
        .slice(0, 10);

    if (keywords.length === 0) return [];

    const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(pattern, 'i');

    const products = await Product.find({
        $or: [{ name: regex }, { category: regex }, { 'brand.name': regex }],
    })
        .select('_id name price cuttedPrice images ratings numOfReviews brand category')
        .limit(8);

    return products;
};

exports.analyzeFace = asyncErrorHandler(async (req, res, next) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return next(new ErrorHandler('Lexy analyzer is not configured. Set OPENAI_API_KEY in backend/config/config.env and restart the server.', 500));
    }

    const image = req?.files?.image;
    if (!image) {
        return next(new ErrorHandler('No image uploaded. Field name must be "image".', 400));
    }

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

    const maxBytes = Number(process.env.LEXY_ANALYZER_MAX_BYTES || 3_000_000);
    if (Number.isFinite(maxBytes) && maxBytes > 0 && fileBuffer.length > maxBytes) {
        return next(new ErrorHandler('Image is too large. Please upload a smaller image.', 413));
    }

    const mimeType = normalizeString(image?.mimetype) || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
        return next(new ErrorHandler('Invalid file type. Please upload an image.', 400));
    }

    const base64 = fileBuffer.toString('base64');
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    const model = normalizeString(process.env.LEXY_ANALYZER_MODEL || 'gpt-4o-mini');

    let result;
    try {
        result = await callOpenAIFaceAnalyzer({ apiKey, model, imageDataUrl });
    } catch (err) {
        if (isLikelyTlsCertError(err)) {
            return next(
                new ErrorHandler(
                    'TLS certificate error while calling OpenAI for face analysis. If you are behind a corporate proxy, configure Node to trust your proxy/root CA (recommended). As a dev-only workaround you can set LEXY_ANALYZER_INSECURE_TLS=true in backend/config/config.env and restart the backend.',
                    502
                )
            );
        }
        return next(new ErrorHandler(String(err?.message || 'Face analysis failed.'), 502));
    }

    const payload = {
        skinTone: normalizeString(result?.skinTone),
        undertone: normalizeString(result?.undertone),
        faceShape: normalizeString(result?.faceShape),
        keyFeatures: Array.isArray(result?.keyFeatures) ? result.keyFeatures.map((x) => normalizeString(x)).filter(Boolean).slice(0, 6) : [],
        confidence: Number(result?.confidence),
        suggestedSearches: Array.isArray(result?.suggestedSearches)
            ? result.suggestedSearches.map((x) => normalizeString(x)).filter(Boolean).slice(0, 4)
            : [],
    };

    // Ensure stable shape for frontend.
    if (!Number.isFinite(payload.confidence)) payload.confidence = 0;
    if (payload.keyFeatures.length === 0) payload.keyFeatures = ['Eyes', 'Lips', 'Cheekbones'];
    while (payload.suggestedSearches.length < 4) payload.suggestedSearches.push('hydrating face serum');

    let products = [];
    try {
        products = await findCatalogProductsFromQueries(payload.suggestedSearches);
    } catch {
        products = [];
    }

    payload.products = (products || []).map((p) => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        cuttedPrice: p.cuttedPrice,
        images: p.images,
        ratings: p.ratings,
        numOfReviews: p.numOfReviews,
        brand: p.brand,
        category: p.category,
    }));

    res.status(200).json(payload);
});
