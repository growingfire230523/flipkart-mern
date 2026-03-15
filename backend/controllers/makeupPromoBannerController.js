const cloudinary = require('cloudinary');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const MakeupPromoBanner = require('../models/makeupPromoBannerModel');

const canUseCloudinary = () =>
    Boolean(process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const shouldAllowInsecureCloudinaryTls = () =>
    String(process.env.CLOUDINARY_INSECURE_TLS || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';

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

const uploadToCloudinaryOrFallback = async ({ data, folder, fallbackPrefix }, next) => {
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
        if (isLikelyTlsCertError(e) && !shouldAllowInsecureCloudinaryTls()) {
            return next(
                new ErrorHandler(
                    'Cloudinary upload failed due to a TLS certificate error (often caused by corporate proxies). Recommended: configure Node to trust your proxy/root CA (e.g., NODE_EXTRA_CA_CERTS). Dev-only workaround: set CLOUDINARY_INSECURE_TLS=true in backend/config/config.env and restart the backend.',
                    502
                )
            );
        }

        return next(new ErrorHandler(`Cloudinary upload failed: ${String(e?.message || e)}`, 502));
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
    let doc = await MakeupPromoBanner.findOne();
    if (!doc) doc = await MakeupPromoBanner.create({});
    return doc;
};

exports.getPublicMakeupPromoBanner = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    if (!doc?.image?.url) {
        return res.status(200).json({ banner: null });
    }

    res.status(200).json({
        banner: {
            heading: doc.heading || '',
            subheading: doc.subheading || '',
            ctaText: doc.ctaText || 'Shop now',
            link: doc.link || '',
            image: doc.image,
            updatedAt: doc.updatedAt,
        },
    });
});

exports.getAdminMakeupPromoBanner = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    res.status(200).json({
        banner: {
            heading: doc.heading || '',
            subheading: doc.subheading || '',
            ctaText: doc.ctaText || 'Shop now',
            link: doc.link || '',
            image: doc.image || { public_id: '', url: '' },
            updatedAt: doc.updatedAt,
        },
    });
});

exports.upsertAdminMakeupPromoBanner = asyncErrorHandler(async (req, res, next) => {
    const doc = await getOrCreate();

    doc.heading = String(req.body?.heading || '').trim().slice(0, 120);
    doc.subheading = String(req.body?.subheading || '').trim().slice(0, 200);
    doc.ctaText = String(req.body?.ctaText || '').trim().slice(0, 60) || 'Shop now';
    doc.link = String(req.body?.link || '').trim().slice(0, 512);

    const maxBytes = Number(process.env.MAKEUP_PROMO_BANNER_IMAGE_MAX_BYTES || 8_000_000);

    const imageFile = req?.files?.image;
    if (imageFile) {
        const dataUrl = await readImageFileToDataUrl(imageFile, { maxBytes, fieldName: 'Makeup banner' }, next);
        if (!dataUrl) return;

        const uploaded = await uploadToCloudinaryOrFallback(
            {
                data: dataUrl,
                folder: 'makeup-promo-banner',
                fallbackPrefix: 'makeup-promo',
            },
            next
        );

        if (!uploaded) return;

        await safeDestroyCloudinary(doc?.image?.public_id);
        doc.image = uploaded;
    }

    await doc.save();

    res.status(200).json({
        banner: {
            heading: doc.heading || '',
            subheading: doc.subheading || '',
            ctaText: doc.ctaText || 'Shop now',
            link: doc.link || '',
            image: doc.image || { public_id: '', url: '' },
            updatedAt: doc.updatedAt,
        },
    });
});

exports.clearAdminMakeupPromoBanner = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    await safeDestroyCloudinary(doc?.image?.public_id);

    doc.heading = '';
    doc.subheading = '';
    doc.ctaText = 'Shop now';
    doc.link = '';
    doc.image = { public_id: '', url: '' };

    await doc.save();

    res.status(200).json({ banner: null });
});
