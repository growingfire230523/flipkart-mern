let twilio;

const canUseTwilio = () => Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID)
);

const getTwilioClient = () => {
    if (!twilio) {
        // Lazy require so local dev without creds can still boot.
        // eslint-disable-next-line global-require
        twilio = require('twilio');
    }
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

const sendSms = async ({ to, message }) => {
    const smsMode = String(process.env.SMS_MODE || 'log').toLowerCase();

    // Dev-only workaround for corporate proxies.
    if (String(process.env.SMS_INSECURE_TLS || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    if (!to) {
        console.warn('[sendSms] called without `to`');
        return false;
    }

    if (smsMode === 'log') {
        console.log('[sendSms] SMS_MODE=log (not sending).');
        console.log('[sendSms] to=', to);
        console.log('[sendSms] message=', message);
        return true;
    }

    if (!canUseTwilio()) {
        console.warn('[sendSms] Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)');
        return false;
    }

    try {
        const client = getTwilioClient();
        const messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();

        await client.messages.create({
            to,
            ...(messagingServiceSid
                ? { messagingServiceSid }
                : { from: String(process.env.TWILIO_FROM || '').trim() }),
            body: message,
        });
        console.log('SMS Sent (Twilio)');
        return true;
    } catch (e) {
        console.error('[sendSms] Twilio failed:', e?.message || e);
        if (e?.response?.data) {
            try {
                console.error('[sendSms] Twilio response:', JSON.stringify(e.response.data));
            } catch {
                console.error('[sendSms] Twilio response (raw):', e.response.data);
            }
        }
        return false;
    }
};

module.exports = sendSms;
