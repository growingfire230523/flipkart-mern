const validator = require('validator');
const MailingList = require('../models/mailingListModel');
const MailCampaign = require('../models/mailCampaignModel');
const sendEmail = require('../utils/sendEmail');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const normalizePhone = require('../utils/normalizePhone');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const upsertMailingListEntry = async ({ email, name, userId, source, phone, whatsappPromoOptIn }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!validator.isEmail(normalizedEmail)) return null;

    const update = {
        $setOnInsert: {
            subscribedAt: new Date(),
        },
        $set: {
            email: normalizedEmail,
        },
    };

    if (name) update.$set.name = String(name || '').trim();
    if (userId) update.$set.userId = userId;
    if (source) update.$setOnInsert.source = source;

    if (phone !== undefined) {
        update.$set.phone = phone ? String(phone).trim() : null;
    }

    if (typeof whatsappPromoOptIn === 'boolean') {
        update.$set.whatsappPromoOptIn = whatsappPromoOptIn;
        if (whatsappPromoOptIn) {
            update.$set.whatsappPromoOptInAt = new Date();
        }
    }

    const entry = await MailingList.findOneAndUpdate(
        { email: normalizedEmail },
        update,
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return entry;
};

exports.subscribeToMailingList = asyncErrorHandler(async (req, res, next) => {
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || '').trim();
    const phoneRaw = req.body?.phone;
    const whatsappPromoOptIn = req.body?.whatsappPromoOptIn;

    if (!validator.isEmail(email)) {
        return next(new ErrorHandler('Please provide a valid email address.', 400));
    }

    let phone;
    if (phoneRaw !== undefined && String(phoneRaw).trim() !== '') {
        const normalized = normalizePhone(phoneRaw, 'IN');
        if (!normalized) {
            return next(new ErrorHandler('Please provide a valid phone number for WhatsApp.', 400));
        }
        if (!String(normalized).startsWith('+91')) {
            return next(new ErrorHandler('Please provide an Indian WhatsApp number in +91 format.', 400));
        }
        phone = normalized;
    }

    const promoOptInProvided = whatsappPromoOptIn !== undefined;
    const promoOptInBool = promoOptInProvided
        ? (typeof whatsappPromoOptIn === 'boolean'
            ? whatsappPromoOptIn
            : String(whatsappPromoOptIn || '').toLowerCase() === 'true')
        : undefined;

    if (promoOptInBool === true && !phone) {
        return next(new ErrorHandler('Phone number is required to opt in for WhatsApp promotions.', 400));
    }

    const entry = await upsertMailingListEntry({
        email,
        name,
        source: 'footer',
        phone,
        whatsappPromoOptIn: promoOptInBool,
    });
    if (entry?.unsubscribed) {
        entry.unsubscribed = false;
        entry.unsubscribedAt = null;
        await entry.save();
    }

    res.status(200).json({
        success: true,
        entry: entry ? {
            id: entry._id,
            email: entry.email,
            name: entry.name,
            phone: entry.phone,
            whatsappPromoOptIn: entry.whatsappPromoOptIn,
            source: entry.source,
            subscribedAt: entry.subscribedAt,
        } : null,
    });
});

exports.getAdminMailingList = asyncErrorHandler(async (req, res) => {
    const entries = await MailingList.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        entries,
    });
});

const buildFilterQuery = ({ keyword, source, dateFrom, dateTo }) => {
    const query = {};

    if (source) {
        query.source = source;
    }

    if (keyword) {
        const regex = new RegExp(String(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [{ email: regex }, { name: regex }];
    }

    if (dateFrom || dateTo) {
        query.subscribedAt = {};
        if (dateFrom) query.subscribedAt.$gte = new Date(dateFrom);
        if (dateTo) query.subscribedAt.$lte = new Date(dateTo);
    }

    return query;
};

const normalizeFileArray = (files) => {
    if (!files) return [];
    if (Array.isArray(files)) return files;
    return [files];
};

const readFileBuffer = (file) => {
    let fileBuffer = file?.data;
    if (!Buffer.isBuffer(fileBuffer) && file?.tempFilePath) {
        try {
            const fs = require('fs');
            fileBuffer = fs.readFileSync(file.tempFilePath);
        } catch {
            fileBuffer = null;
        }
    }
    return Buffer.isBuffer(fileBuffer) ? fileBuffer : null;
};

const parseAttachments = (files, next) => {
    const maxBytes = Number(process.env.MAIL_CAMPAIGN_ATTACHMENT_MAX_BYTES || 3_000_000);
    const maxTotalBytes = Number(process.env.MAIL_CAMPAIGN_ATTACHMENT_TOTAL_MAX_BYTES || 8_000_000);
    const allowedTypes = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    ]);

    const list = normalizeFileArray(files);
    const attachments = [];
    let totalBytes = 0;

    for (const file of list) {
        if (!file) continue;

        const fileBuffer = readFileBuffer(file);
        if (!fileBuffer) {
            next(new ErrorHandler('Invalid attachment payload.', 400));
            return null;
        }

        if (Number.isFinite(maxBytes) && maxBytes > 0 && fileBuffer.length > maxBytes) {
            next(new ErrorHandler('Attachment is too large. Please upload a smaller file.', 413));
            return null;
        }

        totalBytes += fileBuffer.length;
        if (Number.isFinite(maxTotalBytes) && maxTotalBytes > 0 && totalBytes > maxTotalBytes) {
            next(new ErrorHandler('Total attachment size is too large.', 413));
            return null;
        }

        const mimeType = String(file?.mimetype || '').trim() || 'application/octet-stream';
        const isAllowed = mimeType.startsWith('image/') || allowedTypes.has(mimeType);
        if (!isAllowed) {
            next(new ErrorHandler('Unsupported attachment type. Use images, PDF, or DOC files.', 400));
            return null;
        }

        attachments.push({
            name: String(file?.name || 'attachment').trim(),
            contentType: mimeType,
            size: fileBuffer.length,
            dataBase64: fileBuffer.toString('base64'),
        });
    }

    return attachments;
};

const buildUnsubscribeLink = (email) => {
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/mailing-list/unsubscribe?email=${encodeURIComponent(email)}`;
};

const buildEmailContent = ({ subject, body, email }) => {
    const unsubscribeUrl = buildUnsubscribeLink(email);
    const footerHtml = `
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
        <p style="font-size:12px;color:#666;line-height:1.5;">
            You are receiving this email because you subscribed to LEXI updates.
            <br />
            <a href="${unsubscribeUrl}">Unsubscribe</a>
        </p>
    `;

    const footerText = `\n\n---\nYou are receiving this email because you subscribed to LEXI updates.\nUnsubscribe: ${unsubscribeUrl}`;

    const looksLikeHtml = /<\s*\/?\s*[a-z][\s\S]*>/i.test(body || '');
    const html = looksLikeHtml ? `${body}${footerHtml}` : undefined;
    const text = looksLikeHtml ? undefined : `${body}${footerText}`;

    return { subject, html, text };
};

const sendCampaignToRecipients = async (campaign, recipients) => {
    let sent = 0;
    let failed = 0;

    const attachments = Array.isArray(campaign?.attachments)
        ? campaign.attachments.map((att) => ({
            filename: att.name,
            type: att.contentType,
            content: att.dataBase64,
        }))
        : [];

    for (const entry of recipients) {
        const email = entry.email;
        const content = buildEmailContent({ subject: campaign.subject, body: campaign.body, email });
        try {
            await sendEmail({
                email,
                subject: campaign.subject,
                html: content.html,
                text: content.text,
                attachments,
                throwOnError: true,
            });
            sent += 1;
        } catch (e) {
            failed += 1;
        }

        if ((sent + failed) % 25 === 0) {
            // small pause to avoid provider bursts
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, 150));
        }
    }

    return { sent, failed };
};

const processCampaign = async (campaignId) => {
    const campaign = await MailCampaign.findById(campaignId);
    if (!campaign) return;
    if (campaign.status === 'sent') return;

    campaign.status = 'sending';
    await campaign.save();

    try {
        const query = buildFilterQuery(campaign.filters || {});
        query.unsubscribed = { $ne: true };

        const recipients = await MailingList.find(query).sort({ subscribedAt: -1 });
        campaign.totals.total = recipients.length;
        await campaign.save();

        const { sent, failed } = await sendCampaignToRecipients(campaign, recipients);
        campaign.totals.sent = sent;
        campaign.totals.failed = failed;
        campaign.status = failed > 0 ? 'failed' : 'sent';
        await campaign.save();
    } catch (e) {
        campaign.status = 'failed';
        campaign.lastError = String(e?.message || e);
        await campaign.save();
    }
};

let schedulerStarted = false;
exports.startMailingListScheduler = () => {
    if (schedulerStarted) return;
    schedulerStarted = true;

    setInterval(async () => {
        const now = new Date();
        const due = await MailCampaign.find({
            status: 'scheduled',
            scheduledAt: { $lte: now },
        }).limit(5);

        for (const campaign of due) {
            await processCampaign(campaign._id);
        }
    }, 60 * 1000);
};

exports.createMailCampaign = asyncErrorHandler(async (req, res, next) => {
    const subject = String(req.body?.subject || '').trim();
    const body = String(req.body?.body || '').trim();
    const mode = String(req.body?.mode || 'immediate');

    if (!subject) return next(new ErrorHandler('Please provide a subject.', 400));
    if (!body) return next(new ErrorHandler('Please provide an email body.', 400));

    const scheduledAtRaw = req.body?.scheduledAt;
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

    if (mode === 'scheduled' && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
        return next(new ErrorHandler('Please provide a valid schedule date/time.', 400));
    }

    let rawFilters = req.body?.filters || {};
    if (typeof rawFilters === 'string') {
        try {
            rawFilters = JSON.parse(rawFilters);
        } catch {
            rawFilters = {};
        }
    }

    const filters = {
        keyword: String(rawFilters?.keyword || '').trim(),
        source: String(rawFilters?.source || '').trim(),
        dateFrom: rawFilters?.dateFrom || null,
        dateTo: rawFilters?.dateTo || null,
    };

    const attachments = parseAttachments(req?.files?.attachments, next);
    if (attachments === null) return;

    const campaign = await MailCampaign.create({
        subject,
        body,
        attachments,
        mode: mode === 'scheduled' ? 'scheduled' : 'immediate',
        scheduledAt: mode === 'scheduled' ? scheduledAt : null,
        status: mode === 'scheduled' ? 'scheduled' : 'queued',
        filters,
        createdBy: req.user?._id,
    });

    if (campaign.mode === 'immediate') {
        setImmediate(() => processCampaign(campaign._id));
    }

    res.status(200).json({
        success: true,
        campaignId: campaign._id,
        status: campaign.status,
    });
});

exports.unsubscribeFromMailingList = asyncErrorHandler(async (req, res) => {
    const email = normalizeEmail(req.query?.email);
    if (!validator.isEmail(email)) {
        return res.status(400).send('Invalid unsubscribe request.');
    }

    const entry = await MailingList.findOne({ email });
    if (!entry) {
        return res.status(200).send('You are already unsubscribed.');
    }

    entry.unsubscribed = true;
    entry.unsubscribedAt = new Date();
    await entry.save();

    res.status(200).send('You have been unsubscribed.');
});

exports.deleteMailingListEntry = asyncErrorHandler(async (req, res, next) => {
    const entry = await MailingList.findById(req.params.id);

    if (!entry) {
        return next(new ErrorHandler('Mail list entry not found', 404));
    }

    await entry.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Mail list entry deleted',
    });
});

exports.upsertMailingListEntry = upsertMailingListEntry;
