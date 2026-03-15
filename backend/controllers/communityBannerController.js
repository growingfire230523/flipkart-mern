const cloudinary = require('cloudinary');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const CommunityBanner = require('../models/communityBannerModel');

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
        if (isLikelyTlsCertError(e) && !shouldAllowInsecureCloudinaryTls()) {
            throw new ErrorHandler(
                'Cloudinary upload failed due to a TLS certificate error (often caused by corporate proxies). Recommended: configure Node to trust your proxy/root CA (e.g., NODE_EXTRA_CA_CERTS). Dev-only workaround: set CLOUDINARY_INSECURE_TLS=true in backend/config/config.env and restart the backend.',
                502
            );
        }

        throw new ErrorHandler(`Cloudinary upload failed: ${String(e?.message || e)}`, 502);
    }
};

const getOrCreate = async () => {
    let doc = await CommunityBanner.findOne();
    if (!doc) doc = await CommunityBanner.create({ isActive: false });
    return doc;
};

exports.getPublicCommunityBanner = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    if (!doc.isActive || !doc?.image?.url) {
        return res.status(200).json({ banner: null });
    }

    res.status(200).json({
        banner: {
            image: doc.image,
            link: doc.link || '',
            updatedAt: doc.updatedAt,
        },
    });
});

exports.getAdminCommunityBanner = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();
    res.status(200).json({
        banner: {
            isActive: Boolean(doc.isActive),
            image: doc.image,
            link: doc.link || '',
            updatedAt: doc.updatedAt,
        },
    });
});

exports.upsertAdminCommunityBanner = asyncErrorHandler(async (req, res, next) => {
    const doc = await getOrCreate();

    const link = String(req.body?.link || '').trim();
    const isActiveRaw = req.body?.isActive;
    const isActive = typeof isActiveRaw === 'string'
        ? ['true', '1', 'yes'].includes(isActiveRaw.toLowerCase())
        : Boolean(isActiveRaw);

    const image = req?.files?.image;

    if (image) {
        let fileBuffer = image.data;
        if (!Buffer.isBuffer(fileBuffer) && image?.tempFilePath) {
            try {
                const fs = require('fs');
                fileBuffer = fs.readFileSync(image.tempFilePath);
            } catch {
                fileBuffer = null;
            }
        }

        if (!Buffer.isBuffer(fileBuffer)) {
            return next(new ErrorHandler('Invalid image payload.', 400));
        }

        const maxBytes = Number(process.env.COMMUNITY_BANNER_IMAGE_MAX_BYTES || 6_000_000);
        if (Number.isFinite(maxBytes) && maxBytes > 0 && fileBuffer.length > maxBytes) {
            return next(new ErrorHandler('Image is too large. Please upload a smaller image.', 413));
        }

        const mimeType = String(image?.mimetype || '').trim() || 'image/jpeg';
        if (!mimeType.startsWith('image/')) {
            return next(new ErrorHandler('Invalid file type. Please upload an image.', 400));
        }

        const base64 = fileBuffer.toString('base64');
        const imageDataUrl = `data:${mimeType};base64,${base64}`;

        const uploaded = await uploadToCloudinaryOrFallback({
            data: imageDataUrl,
            folder: 'lexy-community-banner',
            fallbackPrefix: 'community-banner',
        });

        // best-effort delete previous cloudinary asset
        if (canUseCloudinary() && doc?.image?.public_id) {
            try {
                await cloudinary.v2.uploader.destroy(doc.image.public_id);
            } catch {
                // ignore
            }
        }

        doc.image = uploaded;
    }

    // If admin tries to activate without an image, reject.
    if (isActive && !doc?.image?.url) {
        return next(new ErrorHandler('Please upload a banner image before enabling it.', 400));
    }

    doc.link = link;
    doc.isActive = Boolean(isActive);

    await doc.save();

    res.status(200).json({
        banner: {
            isActive: doc.isActive,
            image: doc.image,
            link: doc.link || '',
            updatedAt: doc.updatedAt,
        },
    });
});

exports.clearAdminCommunityBanner = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    if (canUseCloudinary() && doc?.image?.public_id) {
        try {
            await cloudinary.v2.uploader.destroy(doc.image.public_id);
        } catch {
            // ignore
        }
    }

    doc.isActive = false;
    doc.link = '';
    doc.image = { public_id: '', url: '' };
    await doc.save();

    res.status(200).json({ banner: null });
});
