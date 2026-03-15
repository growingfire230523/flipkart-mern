const cloudinary = require('cloudinary');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const NewInAds = require('../models/newInAdsModel');

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
    let doc = await NewInAds.findOne();
    if (!doc) doc = await NewInAds.create({});
    return doc;
};

const normalizeLink = (value) => String(value || '').trim();

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

exports.getPublicNewInAds = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    const left = doc?.left?.image?.url ? { image: doc.left.image, link: doc.left.link || '' } : null;
    const right = doc?.right?.image?.url ? { image: doc.right.image, link: doc.right.link || '' } : null;

    if (!left && !right) {
        return res.status(200).json({ ads: null });
    }

    res.status(200).json({
        ads: {
            left,
            right,
            updatedAt: doc.updatedAt,
        },
    });
});

exports.getAdminNewInAds = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();
    res.status(200).json({
        ads: {
            left: {
                link: doc?.left?.link || '',
                image: doc?.left?.image || { public_id: '', url: '' },
            },
            right: {
                link: doc?.right?.link || '',
                image: doc?.right?.image || { public_id: '', url: '' },
            },
            updatedAt: doc.updatedAt,
        },
    });
});

exports.upsertAdminNewInAds = asyncErrorHandler(async (req, res, next) => {
    const doc = await getOrCreate();

    const leftLink = normalizeLink(req.body?.leftLink);
    const rightLink = normalizeLink(req.body?.rightLink);

    const maxBytes = Number(process.env.NEW_IN_AD_IMAGE_MAX_BYTES || 6_000_000);

    const leftImageFile = req?.files?.leftImage;
    const rightImageFile = req?.files?.rightImage;

    if (leftImageFile) {
        const dataUrl = await readImageFileToDataUrl(leftImageFile, { maxBytes, fieldName: 'Left ad' }, next);
        if (!dataUrl) return;

        const uploaded = await uploadToCloudinaryOrFallback({
            data: dataUrl,
            folder: 'new-in-ads',
            fallbackPrefix: 'new-in-left',
        });

        await safeDestroyCloudinary(doc?.left?.image?.public_id);

        doc.left.image = uploaded;
    }

    if (rightImageFile) {
        const dataUrl = await readImageFileToDataUrl(rightImageFile, { maxBytes, fieldName: 'Right ad' }, next);
        if (!dataUrl) return;

        const uploaded = await uploadToCloudinaryOrFallback({
            data: dataUrl,
            folder: 'new-in-ads',
            fallbackPrefix: 'new-in-right',
        });

        await safeDestroyCloudinary(doc?.right?.image?.public_id);

        doc.right.image = uploaded;
    }

    doc.left.link = leftLink;
    doc.right.link = rightLink;

    await doc.save();

    res.status(200).json({
        ads: {
            left: { link: doc.left.link || '', image: doc.left.image },
            right: { link: doc.right.link || '', image: doc.right.image },
            updatedAt: doc.updatedAt,
        },
    });
});

exports.clearAdminNewInAds = asyncErrorHandler(async (req, res) => {
    const doc = await getOrCreate();

    await safeDestroyCloudinary(doc?.left?.image?.public_id);
    await safeDestroyCloudinary(doc?.right?.image?.public_id);

    doc.left = { link: '', image: { public_id: '', url: '' } };
    doc.right = { link: '', image: { public_id: '', url: '' } };

    await doc.save();

    res.status(200).json({ ads: null });
});
