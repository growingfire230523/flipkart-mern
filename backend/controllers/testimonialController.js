const cloudinary = require('cloudinary');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const Testimonial = require('../models/testimonialModel');

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

exports.getTestimonials = asyncErrorHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;

    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(limit);

    res.status(200).json({ testimonials });
});

exports.createTestimonial = asyncErrorHandler(async (req, res, next) => {
    const name = String(req.body?.name || '').trim();
    const role = String(req.body?.role || '').trim();
    const review = String(req.body?.review || '').trim();
    const ratingNumber = Number(req.body?.rating);

    if (!name) return next(new ErrorHandler('Please enter your name.', 400));
    if (!review) return next(new ErrorHandler('Please write a review.', 400));

    if (!Number.isFinite(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
        return next(new ErrorHandler('Rating must be between 1 and 5.', 400));
    }

    const readUploadImage = (file) => {
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

        if (!Buffer.isBuffer(fileBuffer)) return null;

        const maxBytes = Number(process.env.TESTIMONIAL_IMAGE_MAX_BYTES || 5_000_000);
        if (Number.isFinite(maxBytes) && maxBytes > 0 && fileBuffer.length > maxBytes) {
            return { error: 'Image is too large. Please upload a smaller image.', status: 413 };
        }

        const mimeType = String(file?.mimetype || '').trim() || 'image/jpeg';
        if (!mimeType.startsWith('image/')) {
            return { error: 'Invalid file type. Please upload an image.', status: 400 };
        }

        const base64 = fileBuffer.toString('base64');
        const imageDataUrl = `data:${mimeType};base64,${base64}`;
        return { imageDataUrl };
    };

    const avatarFile = req?.files?.image;
    if (!avatarFile) {
        return next(new ErrorHandler('No image uploaded. Field name must be "image".', 400));
    }

    const avatarParsed = readUploadImage(avatarFile);
    if (!avatarParsed || avatarParsed.error) {
        return next(new ErrorHandler(avatarParsed?.error || 'Invalid image payload.', avatarParsed?.status || 400));
    }

    const productImageFile = req?.files?.productImage;
    if (!productImageFile) {
        return next(new ErrorHandler('No product image uploaded. Field name must be "productImage".', 400));
    }

    const productParsed = readUploadImage(productImageFile);
    if (!productParsed || productParsed.error) {
        return next(new ErrorHandler(productParsed?.error || 'Invalid product image payload.', productParsed?.status || 400));
    }

    const uploaded = await uploadToCloudinaryOrFallback({
        data: avatarParsed.imageDataUrl,
        folder: 'lexy-testimonials',
        fallbackPrefix: 'testimonial',
    });

    const uploadedProduct = await uploadToCloudinaryOrFallback({
        data: productParsed.imageDataUrl,
        folder: 'lexy-testimonials',
        fallbackPrefix: 'testimonial-product',
    });

    const testimonial = await Testimonial.create({
        name,
        role: role || 'Happy Customer',
        rating: ratingNumber,
        review,
        image: uploaded,
        productImage: uploadedProduct,
    });

    res.status(201).json({ testimonial });
});
