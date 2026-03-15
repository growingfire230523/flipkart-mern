const cloudinary = require('cloudinary');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const HomeBanner = require('../models/homeBannerModel');

const canUseCloudinary = () => Boolean(
    process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

const shouldAllowInsecureCloudinaryTls = () =>
    String(process.env.CLOUDINARY_INSECURE_TLS || '').toLowerCase() === 'true' &&
    process.env.NODE_ENV !== 'production';

const isLikelyTlsCertError = (err) => {
    const code = String(err?.code || '').toUpperCase();
    const msg = String(err?.message || '').toLowerCase();
    return (
        code.includes('UNABLE_TO_GET_ISSUER_CERT_LOCALLY') ||
        code.includes('SELF_SIGNED_CERT_IN_CHAIN') ||
        code.includes('CERT_HAS_EXPIRED') ||
        msg.includes('unable to get local issuer certificate') ||
        msg.includes('self signed certificate')
    );
};

const withOptionalInsecureTls = async (fn) => {
    if (!shouldAllowInsecureCloudinaryTls()) return fn();
    const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        return await fn();
    } finally {
        if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    }
};

const uploadToCloudinaryOrFallback = async ({ data, folder, fallbackPrefix }) => {
    const fallback = {
        public_id: `${fallbackPrefix}-${Date.now()}`,
        url: typeof data === 'string' ? data : '',
    };

    if (!canUseCloudinary()) return fallback;

    try {
        const result = await withOptionalInsecureTls(() => cloudinary.v2.uploader.upload(data, { folder }));
        return {
            public_id: result.public_id,
            url: result.secure_url,
        };
    } catch (e) {
        // For homepage banners we prefer to keep the app working even if
        // Cloudinary is misconfigured or unreachable. Log the error and
        // fall back to storing the raw data URL instead of failing.
        if (isLikelyTlsCertError(e) && !shouldAllowInsecureCloudinaryTls()) {
            // Helpful message in logs for local/proxy issues.
            // eslint-disable-next-line no-console
            console.error('Cloudinary TLS error while uploading home hero banner. Falling back to inline image URL.', e);
        } else {
            // eslint-disable-next-line no-console
            console.error('Cloudinary upload failed for home hero banner. Falling back to inline image URL.', e);
        }

        return fallback;
    }
};

const readImageFileToDataUrl = async (file, { maxBytes, fieldName }, next) => {
    if (!file) return null;

    let fileBuffer = file.data;
    if (!Buffer.isBuffer(fileBuffer) && file?.tempFilePath) {
        try {
            const fs = require('fs');
            fileBuffer = fs.readFileSync(file.tempFilePath);
        } catch {
            fileBuffer = null;
        }
    }

    if (!Buffer.isBuffer(fileBuffer)) {
        next(new ErrorHandler(`Invalid ${fieldName} image payload.`, 400));
        return null;
    }

    if (Number.isFinite(maxBytes) && maxBytes > 0 && fileBuffer.length > maxBytes) {
        next(new ErrorHandler(`${fieldName} image is too large. Please upload a smaller image.`, 413));
        return null;
    }

    const mimeType = String(file?.mimetype || '').trim() || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
        next(new ErrorHandler(`Invalid file type for ${fieldName}. Please upload an image.`, 400));
        return null;
    }

    const base64 = fileBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
};

const safeDestroyCloudinary = async (publicId) => {
    if (!canUseCloudinary()) return;
    if (!publicId) return;
    try {
        await cloudinary.v2.uploader.destroy(publicId);
    } catch {
        // ignore
    }
};

const getOrCreate = async () => {
    let doc = await HomeBanner.findOne();
    if (!doc) doc = await HomeBanner.create({});
    return doc;
};

const slots = ['slot1', 'slot2', 'slot3', 'slot4'];

const serializeSlotsToArray = (doc) => {
    if (!doc) return [];
    return slots.map((slotKey, index) => {
        const slot = doc[slotKey] || {};
        return {
            key: `banner${index + 1}`,
            link: slot.link || '',
            image: slot.image || { public_id: '', url: '' },
        };
    });
};

exports.getPublicHomeHeroBanners = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();
    const all = serializeSlotsToArray(doc);
    const banners = all.filter((b) => b?.image?.url);

    if (!banners.length) {
        return res.status(200).json({ banners: [] });
    }

    res.status(200).json({
        banners: banners.map((b) => ({ image: b.image, link: b.link || '' })),
        updatedAt: doc.updatedAt,
    });
});

exports.getAdminHomeHeroBanners = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();
    res.status(200).json({
        banners: serializeSlotsToArray(doc),
        updatedAt: doc.updatedAt,
    });
});

exports.upsertAdminHomeHeroBanners = asyncErrorHandler(async (req, res, next) => {
    const doc = await getOrCreate();

    const maxBytes = Number(process.env.HOME_BANNER_IMAGE_MAX_BYTES || 6_000_000);

    for (let i = 0; i < slots.length; i += 1) {
        const slotKey = slots[i];
        const linkField = `banner${i + 1}Link`;
        const fileField = `banner${i + 1}Image`;

        const linkRaw = req.body?.[linkField];
        const link = String(linkRaw || '').trim();

        doc[slotKey] = doc[slotKey] || {};
        doc[slotKey].link = link;

        const file = req?.files?.[fileField];
        if (!file) continue;

        const dataUrl = await readImageFileToDataUrl(file, { maxBytes, fieldName: `Banner ${i + 1}` }, next);
        if (!dataUrl) return;

        const uploaded = await uploadToCloudinaryOrFallback({
            data: dataUrl,
            folder: 'home-hero-banners',
            fallbackPrefix: `home-banner-${i + 1}`,
        });

        await safeDestroyCloudinary(doc[slotKey]?.image?.public_id);

        doc[slotKey].image = uploaded;
    }

    await doc.save();

    res.status(200).json({
        banners: serializeSlotsToArray(doc),
        updatedAt: doc.updatedAt,
    });
});

exports.clearAdminHomeHeroBanners = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    for (let i = 0; i < slots.length; i += 1) {
        const slotKey = slots[i];
        if (!doc[slotKey]) continue;

        await safeDestroyCloudinary(doc[slotKey]?.image?.public_id);
        doc[slotKey].link = '';
        doc[slotKey].image = { public_id: '', url: '' };
    }

    await doc.save();

    res.status(200).json({ banners: [] });
});
