const https = require('https');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../config/config.env') });

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

if (!endpoint || !apiKey || !deployment || !apiVersion) {
    console.error('Missing one or more AZURE_OPENAI_* env vars.');
    process.exit(1);
}

const u = new URL(endpoint.startsWith('http') ? endpoint : `https://${endpoint}`);

const path = `/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

const payload = JSON.stringify({
    messages: [
        { role: 'system', content: 'You are a test. Reply with only OK.' },
        { role: 'user', content: 'OK' },
    ],
    temperature: 0,
    max_tokens: 20,
});

const req = https.request(
    {
        hostname: u.hostname,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'api-key': apiKey,
        },
        timeout: 15000,
    },
    (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
            console.log('status', res.statusCode);
            console.log(data);
        });
    }
);

req.on('timeout', () => req.destroy(new Error('timeout')));
req.on('error', (e) => {
    console.error('error', e.message);
    process.exit(1);
});

req.write(payload);
req.end();
