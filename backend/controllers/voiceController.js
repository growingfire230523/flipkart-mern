const https = require('https');
const fs = require('fs');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');

const OPENAI_HOST = 'api.openai.com';
const OPENAI_AUDIO_TRANSCRIPTIONS_PATH = '/v1/audio/transcriptions';

const isPaidVoiceTranscriptionEnabled = () => {
    // Cost safety: disabled by default. Set ENABLE_PAID_VOICE_TRANSCRIPTION=true to enable.
    const flag = String(process.env.ENABLE_PAID_VOICE_TRANSCRIPTION || '').trim().toLowerCase();
    return flag === 'true' || flag === '1' || flag === 'yes';
};

const shouldAllowInsecureTls = () => {
    const flag = process.env.VOICE_TRANSCRIBE_INSECURE_TLS || process.env.OPENAI_INSECURE_TLS;
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

const getAzureOpenAIConfig = () => {
    const endpointRaw = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    if (!endpointRaw || !apiKey || !deployment || !apiVersion) return null;

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

    const hostname = endpointUrl.hostname;
    const path = `/openai/deployments/${encodeURIComponent(String(deployment).trim())}/audio/transcriptions?api-version=${encodeURIComponent(
        String(apiVersion).trim()
    )}`;

    return {
        hostname,
        path,
        apiKey: String(apiKey).trim(),
    };
};

const randomBoundary = () => `----voiceBoundary${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;

const buildMultipartBody = ({ boundary, fileBuffer, filename, mimeType, fields }) => {
    const delimiter = `--${boundary}\r\n`;
    const closeDelimiter = `--${boundary}--\r\n`;

    const parts = [];

    if (fields && typeof fields === 'object') {
        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined || value === null) continue;
            const stringValue = String(value);
            if (!stringValue.trim()) continue;
            parts.push(Buffer.from(`${delimiter}Content-Disposition: form-data; name="${key}"\r\n\r\n${stringValue}\r\n`));
        }
    }

    parts.push(
        Buffer.from(
            `${delimiter}Content-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
        )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n${closeDelimiter}`));

    return Buffer.concat(parts);
};

const callOpenAIAudioTranscription = ({ apiKey, model, fileBuffer, filename, mimeType }) =>
    new Promise((resolve, reject) => {
        const boundary = randomBoundary();
        const language = String(process.env.OPENAI_TRANSCRIBE_LANGUAGE || 'en').trim();
        const prompt = String(
            process.env.OPENAI_TRANSCRIBE_PROMPT ||
                'This is a voice search query for a cosmetics and beauty e-commerce store. Transcribe in English. Prefer beauty/cosmetics terms, product names, brands, ingredients, shades. Output only the search query.'
        ).trim();
        const temperature = String(process.env.OPENAI_TRANSCRIBE_TEMPERATURE ?? '0').trim();

        const body = buildMultipartBody({
            boundary,
            fileBuffer,
            filename,
            mimeType,
            fields: {
                model,
                language,
                prompt,
                temperature,
            },
        });

        const allowInsecureTls = shouldAllowInsecureTls();

        const req = https.request(
            {
                method: 'POST',
                hostname: OPENAI_HOST,
                path: OPENAI_AUDIO_TRANSCRIPTIONS_PATH,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
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
                    } catch (e) {
                        const snippet = String(data || '').slice(0, 400);
                        return reject(new Error(`OpenAI: invalid JSON response (status ${res.statusCode}). Body: ${snippet}`));
                    }

                    if (res.statusCode >= 400) {
                        const msg = parsed?.error?.message || `OpenAI: HTTP ${res.statusCode}`;
                        return reject(new Error(msg));
                    }

                    const text = String(parsed?.text || '').trim();
                    if (!text) return reject(new Error('OpenAI: empty transcription'));
                    resolve(text);
                });
            }
        );

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy(new Error('OpenAI: request timed out'));
        });

        req.write(body);
        req.end();
    });

const callAzureOpenAIAudioTranscription = ({ azure, model, fileBuffer, filename, mimeType }) =>
    new Promise((resolve, reject) => {
        const boundary = randomBoundary();
        // Azure deployment selects the model; many Azure setups reject an explicit `model` field.
        const body = buildMultipartBody({
            boundary,
            fileBuffer,
            filename,
            mimeType,
            fields: {},
        });

        const allowInsecureTls = shouldAllowInsecureTls();

        const req = https.request(
            {
                method: 'POST',
                hostname: azure.hostname,
                path: azure.path,
                headers: {
                    'api-key': azure.apiKey,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
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
                    } catch (e) {
                        const snippet = String(data || '').slice(0, 400);
                        return reject(new Error(`Azure OpenAI: invalid JSON response (status ${res.statusCode}). Body: ${snippet}`));
                    }

                    if (res.statusCode >= 400) {
                        const msg = parsed?.error?.message || `Azure OpenAI: HTTP ${res.statusCode}`;
                        return reject(new Error(msg));
                    }

                    const text = String(parsed?.text || '').trim();
                    if (!text) return reject(new Error('Azure OpenAI: empty transcription'));
                    resolve(text);
                });
            }
        );

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy(new Error('Azure OpenAI: request timed out'));
        });

        req.write(body);
        req.end();
    });

exports.transcribeVoice = asyncErrorHandler(async (req, res, next) => {
    if (!isPaidVoiceTranscriptionEnabled()) {
        return res.status(410).json({
            message:
                'Voice transcription endpoint is disabled to avoid paid provider usage. Use the in-browser voice search (Web Speech API) from the frontend, or set ENABLE_PAID_VOICE_TRANSCRIPTION=true to re-enable server transcription.',
        });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const azure = getAzureOpenAIConfig();
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || process.env.AZURE_OPENAI_TRANSCRIBE_MODEL || 'whisper-1';

    if (!apiKey && !azure) {
        return next(
            new ErrorHandler(
                'Voice transcription is not configured. Set OPENAI_API_KEY in backend/config/config.env and restart the server. (Azure fallback is also supported if configured.)',
                500
            )
        );
    }

    const audio = req?.files?.audio;
    if (!audio) {
        return next(new ErrorHandler('No audio uploaded. Field name must be "audio".', 400));
    }

    // express-fileupload gives either `data` (Buffer) or `tempFilePath` depending on config.
    let fileBuffer = audio.data;
    if (!Buffer.isBuffer(fileBuffer) && audio?.tempFilePath) {
        try {
            fileBuffer = fs.readFileSync(audio.tempFilePath);
        } catch {
            fileBuffer = null;
        }
    }
    if (!Buffer.isBuffer(fileBuffer)) {
        return next(new ErrorHandler('Invalid audio payload.', 400));
    }

    const filename = audio?.name || 'voice.webm';
    const mimeType = audio?.mimetype || 'audio/webm';

    // Prefer OpenAI API key (as requested); use Azure only if OpenAI key is missing.
    let text;
    try {
        text = apiKey
            ? await callOpenAIAudioTranscription({ apiKey, model, fileBuffer, filename, mimeType })
            : await callAzureOpenAIAudioTranscription({ azure, model, fileBuffer, filename, mimeType });
    } catch (err) {
        if (isLikelyTlsCertError(err)) {
            return next(
                new ErrorHandler(
                    'TLS certificate error while calling the transcription provider. If you are behind a corporate proxy, configure Node to trust your proxy/root CA (recommended). As a dev-only workaround you can set VOICE_TRANSCRIBE_INSECURE_TLS=true in backend/config/config.env and restart the backend.',
                    502
                )
            );
        }

        return next(new ErrorHandler(String(err?.message || 'Voice transcription failed.'), 502));
    }

    res.status(200).json({ text });
});

// ─── Text-to-Speech (OpenAI TTS) ────────────────────────────────────────────

const isPaidTTSEnabled = () => {
    const flag = String(process.env.ENABLE_PAID_TTS || '').trim().toLowerCase();
    return flag === 'true' || flag === '1' || flag === 'yes';
};

exports.textToSpeech = asyncErrorHandler(async (req, res, next) => {
    if (!isPaidTTSEnabled()) {
        return next(new ErrorHandler('Server-side TTS is disabled. Set ENABLE_PAID_TTS=true to enable.', 403));
    }

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) {
        return next(new ErrorHandler('OpenAI API key is not configured.', 500));
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
        return next(new ErrorHandler('Text is required for TTS.', 400));
    }

    const trimmed = text.trim().slice(0, 4096); // OpenAI TTS max input
    const model = String(process.env.OPENAI_TTS_MODEL || 'tts-1').trim();
    const voice = String(process.env.OPENAI_TTS_VOICE || 'nova').trim();

    const postData = JSON.stringify({ model, input: trimmed, voice });

    const options = {
        hostname: OPENAI_HOST,
        port: 443,
        path: '/v1/audio/speech',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
        },
    };

    if (shouldAllowInsecureTls()) {
        options.rejectUnauthorized = false;
    }

    const audioBuffer = await new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
            if (response.statusCode !== 200) {
                let body = '';
                response.on('data', (d) => { body += d; });
                response.on('end', () => reject(new Error(`OpenAI TTS error ${response.statusCode}: ${body}`)));
                return;
            }
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
        });
        request.on('error', reject);
        request.write(postData);
        request.end();
    });

    res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'no-store',
    });
    res.send(audioBuffer);
});
