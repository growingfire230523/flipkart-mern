const nodeMailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmail = async (options) => {

    const emailMode = String(process.env.EMAIL_MODE || 'send').toLowerCase();
    // For dev environments where outbound TLS is intercepted (corporate proxy), allow opting-in.
    if (String(process.env.EMAIL_INSECURE_TLS || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_MAIL);
    const hasSmtp = Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_MAIL &&
        process.env.SMTP_PASSWORD
    );

    if (emailMode === 'log') {
        const subject = options?.subject || 'Notification';
        console.log('[sendEmail] EMAIL_MODE=log (not sending).');
        console.log('[sendEmail] to=', options?.email);
        console.log('[sendEmail] subject=', subject);
        if (options?.html) console.log('[sendEmail] html=', options.html);
        if (options?.text) console.log('[sendEmail] text=', options.text);
        if (options?.message) console.log('[sendEmail] message=', options.message);
        if (options?.templateId) console.log('[sendEmail] templateId=', options.templateId);
        if (options?.data) console.log('[sendEmail] data=', options.data);
        if (options?.data?.reset_url) console.log('[sendEmail] reset_url=', options.data.reset_url);
        return true;
    }

    if (!hasSendGrid && !hasSmtp) {
        const msg = 'Email service is not configured (set SENDGRID_* or SMTP_* env vars).';
        console.warn(msg);
        if (options?.throwOnError) {
            throw new Error(msg);
        }
        return false;
    }

    // const transporter = nodeMailer.createTransport({
    //     host: process.env.SMTP_HOST,
    //     port: process.env.SMTP_PORT,
    //     service: process.env.SMTP_SERVICE,
    //     auth: {
    //         user: process.env.SMTP_MAIL,
    //         pass: process.env.SMTP_PASSWORD,
    //     },
    // });

    // const mailOptions = {
    //     from: process.env.SMTP_MAIL,
    //     to: options.email,
    //     subject: options.subject,
    //     html: options.message,
    // };

    // await transporter.sendMail(mailOptions);

    if (!options?.email) {
        console.warn('sendEmail called without an email address');
        return false;
    }

    const subject = options.subject || 'Notification';
    const looksLikeHtml = (value) => typeof value === 'string' && /<\s*\/?\s*[a-z][\s\S]*>/i.test(value);

    // Backward-compatible:
    // - Prefer explicit `html`/`text` if provided
    // - Otherwise treat `message` as HTML if it looks like HTML, else as text
    const html = options.html ?? (looksLikeHtml(options.message) ? options.message : undefined);
    const text = options.text ?? (!options.html && !looksLikeHtml(options.message) ? options.message : undefined);

    const attachments = Array.isArray(options?.attachments) ? options.attachments : [];

    if (hasSendGrid) {
        const msg = {
            to: options.email,
            from: process.env.SENDGRID_MAIL,
        };

        if (options.templateId) {
            msg.templateId = options.templateId;
            msg.dynamic_template_data = options.data || {};
        } else {
            msg.subject = subject;
            if (html) msg.html = html;
            if (text) msg.text = text;
        }

        if (attachments.length) {
            msg.attachments = attachments
                .filter((att) => att?.content && att?.filename)
                .map((att) => ({
                    content: att.content,
                    filename: att.filename,
                    type: att.type || undefined,
                    disposition: 'attachment',
                }));
        }

        try {
            await sgMail.send(msg);
            console.log('Email Sent (SendGrid)');
            return true;
        } catch (error) {
            console.error('[sendEmail] SendGrid failed:', error?.message || error);
            if (error?.response?.body) {
                try {
                    console.error('[sendEmail] SendGrid response body:', JSON.stringify(error.response.body));
                } catch (e) {
                    console.error('[sendEmail] SendGrid response body (raw):', error.response.body);
                }
            }

            // If SMTP is configured, fall back automatically.
            if (!hasSmtp) {
                if (options?.throwOnError) throw error;
                return false;
            }
        }
    }

    // SMTP fallback (nodemailer)
    const transporter = nodeMailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    try {
        await transporter.sendMail({
            from: process.env.SMTP_MAIL,
            to: options.email,
            subject,
            html,
            text,
            attachments: attachments.map((att) => ({
                filename: att.filename,
                content: Buffer.from(att.content, 'base64'),
                contentType: att.type || undefined,
            })),
        });
        console.log('Email Sent (SMTP)');
        return true;
    } catch (error) {
        console.error('[sendEmail] SMTP failed:', error?.message || error);
        if (options?.throwOnError) throw error;
        return false;
    }
};

module.exports = sendEmail;