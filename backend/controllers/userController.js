const User = require('../models/userModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const sendToken = require('../utils/sendToken');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const cloudinary = require('cloudinary');
const bcrypt = require('bcryptjs');
const normalizePhone = require('../utils/normalizePhone');
const sendSms = require('../utils/sendSms');
const { upsertMailingListEntry } = require('./mailingListController');

const getFrontendBaseUrl = (req) => {
    const host = req.get('host');
    const isLocalhost = typeof host === 'string' && (host.includes('localhost') || host.startsWith('127.0.0.1'));
    const forwardedProto = req.headers['x-forwarded-proto'];
    const derivedProto = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : typeof forwardedProto === 'string'
            ? forwardedProto.split(',')[0]
            : req.protocol;

    const redirectProto = isLocalhost ? 'http' : (derivedProto || 'https');
    const envUrl = process.env.FRONTEND_URL ? String(process.env.FRONTEND_URL).replace(/\/$/, '') : null;

    if (envUrl) return envUrl;
    if (isLocalhost) return 'http://localhost:3000';
    return `${redirectProto}://${host}`;
};

// Register User
exports.registerUser = asyncErrorHandler(async (req, res, next) => {

    let avatar = { public_id: "", url: "" };

    const canUseCloudinary = Boolean(
        process.env.CLOUDINARY_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

    if (canUseCloudinary && req.body.avatar) {
        try {
            const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
                folder: "avatars",
                width: 150,
                crop: "scale",
            });

            avatar = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        } catch (e) {
            console.warn('[cloudinary] avatar upload failed during signup:', e.message);
        }
    }

    const { name, email, gender, password } = req.body;

    const user = await User.create({
        name, 
        email,
        gender,
        password,
        avatar,
        authProvider: 'local',
    });

    try {
        await upsertMailingListEntry({
            email,
            name,
            userId: user._id,
            source: 'signup',
        });
    } catch {
        // non-blocking
    }

    sendToken(user, 201, res);
});

// Login User
exports.loginUser = asyncErrorHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if(!email || !password) {
        return next(new ErrorHandler("Please Enter Email And Password", 400));
    }

    const user = await User.findOne({ email}).select("+password");

    if(!user) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    if (user.authProvider && user.authProvider !== 'local') {
        return next(new ErrorHandler(`This account uses ${user.authProvider} sign-in. Please continue with ${user.authProvider}.`, 400));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    sendToken(user, 201, res);
});

// Login / Register with Google (ID token)
exports.loginWithGoogle = asyncErrorHandler(async (req, res, next) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
        return next(new ErrorHandler('Google sign-in is not configured (missing GOOGLE_CLIENT_ID)', 500));
    }

    const credential = String(req.body?.credential || '').trim();
    if (!credential) {
        return next(new ErrorHandler('Missing Google credential', 400));
    }

    let payload;
    try {
        // Dev-only workaround for corporate proxies / custom CAs that break TLS to Google.
        if (
            String(process.env.GOOGLE_OAUTH_INSECURE_TLS || '').toLowerCase() === 'true' &&
            process.env.NODE_ENV !== 'production'
        ) {
            // eslint-disable-next-line no-process-env
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
        // Lazy-require so local installs without OAuth deps still boot.
        // Ensure you run: npm install google-auth-library
        // eslint-disable-next-line global-require
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(googleClientId);

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
        });
        payload = ticket.getPayload();
    } catch (e) {
        return next(new ErrorHandler(`Google token verification failed: ${e?.message || 'invalid token'}`, 401));
    }

    const email = String(payload?.email || '').trim().toLowerCase();
    const emailVerified = Boolean(payload?.email_verified);
    const googleId = String(payload?.sub || '').trim();
    const name = String(payload?.name || '').trim() || 'User';
    const picture = String(payload?.picture || '').trim();

    if (!email || !googleId) {
        return next(new ErrorHandler('Google token missing required profile fields', 401));
    }
    if (!emailVerified) {
        return next(new ErrorHandler('Google account email is not verified', 401));
    }

    let user = await User.findOne({ email });

    if (!user) {
        user = await User.create({
            name,
            email,
            authProvider: 'google',
            googleId,
            gender: 'Not specified',
            avatar: {
                public_id: '',
                url: picture,
            },
        });
    } else {
        // Link Google ID if not already linked
        if (!user.googleId) {
            user.googleId = googleId;
        }
        // Do not override local accounts; only set provider if empty.
        if (!user.authProvider) {
            user.authProvider = 'local';
        }
        if (!user.avatar?.url && picture) {
            user.avatar = { public_id: user.avatar?.public_id || '', url: picture };
        }
        await user.save({ validateBeforeSave: false });
    }

    try {
        await upsertMailingListEntry({
            email,
            name,
            userId: user._id,
            source: 'google',
        });
    } catch {
        // non-blocking
    }

    sendToken(user, 200, res);
});

// Logout User
exports.logoutUser = asyncErrorHandler(async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
});

// Get User Details
exports.getUserDetails = asyncErrorHandler(async (req, res, next) => {

    // Extra safety in case auth middleware runs but no user is attached
    const userId = req.user && (req.user.id || req.user._id);
    if (!userId) {
        return next(new ErrorHandler("Please login to access this resource", 401));
    }

    const user = await User.findById(userId);

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
        success: true,
        user,
    });
});

// Update primary delivery location (default shipping address)
exports.updateDeliveryLocation = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    const nextAddress = {
        address: String(req.body?.address || '').trim() || undefined,
        city: String(req.body?.city || '').trim() || undefined,
        state: String(req.body?.state || '').trim() || undefined,
        country: String(req.body?.country || '').trim() || undefined,
        pincode: String(req.body?.pincode || '').trim() || undefined,
        phoneNo: String(req.body?.phoneNo || '').trim() || undefined,
    };

    // If all fields are empty, treat as clearing the default address.
    const hasAnyField = Object.values(nextAddress).some((v) => v && String(v).length > 0);

    if (!hasAnyField) {
        user.defaultShippingAddress = undefined;
    } else {
        user.defaultShippingAddress = nextAddress;
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        defaultShippingAddress: user.defaultShippingAddress || null,
    });
});

// Forgot Password
exports.forgotPassword = asyncErrorHandler(async (req, res, next) => {

    const requestedEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!requestedEmail) {
        return next(new ErrorHandler('Please provide an email address', 400));
    }

    const user = await User.findOne({ email: requestedEmail });

    // Avoid account enumeration: always return a generic success response.
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    }

    const resetToken = await user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const frontendBaseUrl = getFrontendBaseUrl(req);
    const resetPasswordUrl = `${frontendBaseUrl}/password/reset/${resetToken}`;

    // const message = `Your password reset token is : \n\n ${resetPasswordUrl}`;
    const message = `Your password reset token is as follows:\n\n${resetPasswordUrl}\n\nIf you have not requested this email, then ignore it.`;
    const html = `<p>Your password reset token is as follows:</p><p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a></p><p>If you have not requested this email, then ignore it.</p>`;

    try {
        const usedTemplate = Boolean(process.env.SENDGRID_RESET_TEMPLATEID);

        const ok = await sendEmail({
            email: user.email,
            templateId: process.env.SENDGRID_RESET_TEMPLATEID,
            data: {
                reset_url: resetPasswordUrl,
                name: user.name,
            },
            subject: 'Password reset',
            message,
            html,
            throwOnError: process.env.NODE_ENV === 'production',
        });

        if (!ok) {
            console.warn('[forgotPassword] email send failed');
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[forgotPassword] reset link (dev):', resetPasswordUrl);
            }
        }

        // In dev, optionally return the reset URL so you can continue testing even if email is blocked
        // or the email provider accepts but delivery is delayed.
        if (process.env.NODE_ENV !== 'production' && String(process.env.EXPOSE_RESET_URL || '').toLowerCase() === 'true') {
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.',
                resetPasswordUrl,
            });
        }

        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
        });

    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler(error.message, 500))
    }
});

// Reset Password
exports.resetPassword = asyncErrorHandler(async (req, res, next) => {

    // create hash token
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({ 
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!user) {
        return next(new ErrorHandler("Invalid reset password token", 404));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Best-effort confirmation email (do not block reset success)
    try {
        const usedTemplate = Boolean(process.env.SENDGRID_PASSWORD_CHANGED_TEMPLATEID);
        await sendEmail({
            email: user.email,
            templateId: process.env.SENDGRID_PASSWORD_CHANGED_TEMPLATEID,
            data: {
                name: user.name,
            },
            subject: 'Your password was changed',
            message: usedTemplate
                ? undefined
                : `<p>Hi${user.name ? ` ${user.name}` : ''},</p>
                   <p>Your password was successfully changed.</p>
                   <p>If you did not do this, please reset your password immediately.</p>`,
        });
    } catch (e) {
        console.warn('[resetPassword] confirmation email failed:', e?.message);
    }

    sendToken(user, 200, res);
});

// Update Password
exports.updatePassword = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.user.id).select("+password");

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Old Password is Invalid", 400));
    }

    user.password = req.body.newPassword;
    await user.save();

    // Best-effort confirmation email (do not block password update)
    try {
        const usedTemplate = Boolean(process.env.SENDGRID_PASSWORD_CHANGED_TEMPLATEID);
        await sendEmail({
            email: user.email,
            templateId: process.env.SENDGRID_PASSWORD_CHANGED_TEMPLATEID,
            data: {
                name: user.name,
            },
            subject: 'Your password was changed',
            message: usedTemplate
                ? undefined
                : `<p>Hi${user.name ? ` ${user.name}` : ''},</p>
                   <p>Your password was successfully changed.</p>
                   <p>If you did not do this, please reset your password immediately.</p>`,
        });
    } catch (e) {
        console.warn('[updatePassword] confirmation email failed:', e?.message);
    }

    sendToken(user, 201, res);
});

// Update User Profile
exports.updateProfile = asyncErrorHandler(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
    }

    const canUseCloudinary = Boolean(
        process.env.CLOUDINARY_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

    const avatar = req.body.avatar;
    if (canUseCloudinary && typeof avatar === 'string' && avatar.trim() !== "") {
        try {
            const user = await User.findById(req.user.id);
            const imageId = user?.avatar?.public_id;

            if (imageId) {
                await cloudinary.v2.uploader.destroy(imageId);
            }

            const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                folder: "avatars",
                width: 150,
                crop: "scale",
            });

            newUserData.avatar = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            }
        } catch (e) {
            console.warn('[cloudinary] avatar upload failed during profile update:', e.message);
        }
    }

    await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: true,
    });

    res.status(200).json({
        success: true,
    });
});

// ADMIN DASHBOARD

exports.getAdminDashboardStats = asyncErrorHandler(async (req, res) => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    const [usersCount, productAggregate, orderSummary, orderStatusRows, salesByMonthRows] = await Promise.all([
        User.countDocuments(),
        Product.aggregate([
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalProducts: { $sum: 1 },
                                outOfStock: {
                                    $sum: {
                                        $cond: [{ $lte: ['$stock', 0] }, 1, 0],
                                    },
                                },
                            },
                        },
                    ],
                    categories: [
                        {
                            $match: {
                                category: { $type: 'string', $ne: '' },
                            },
                        },
                        {
                            $group: {
                                _id: '$category',
                                count: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ]),
        Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSalesAmount: { $sum: '$totalPrice' },
                },
            },
        ]),
        Order.aggregate([
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 },
                },
            },
        ]),
        Order.aggregate([
            {
                $project: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    totalPrice: 1,
                },
            },
            {
                $match: {
                    year: { $in: years },
                },
            },
            {
                $group: {
                    _id: { year: '$year', month: '$month' },
                    total: { $sum: '$totalPrice' },
                },
            },
        ]),
    ]);

    const productSummary = productAggregate?.[0]?.summary?.[0] || {};
    const totalProducts = Number(productSummary.totalProducts || 0);
    const outOfStock = Number(productSummary.outOfStock || 0);

    const productsByCategory = {};
    for (const row of productAggregate?.[0]?.categories || []) {
        const key = String(row?._id || '').trim();
        if (!key) continue;
        productsByCategory[key] = Number(row?.count || 0);
    }

    const orderSummaryRow = orderSummary?.[0] || {};
    const orderStatus = {};
    for (const row of orderStatusRows || []) {
        const key = String(row?._id || 'Unknown').trim() || 'Unknown';
        orderStatus[key] = Number(row?.count || 0);
    }

    const yearlySales = years.map((year) => ({
        year,
        monthly: Array(12).fill(0),
    }));

    for (const row of salesByMonthRows || []) {
        const year = Number(row?._id?.year);
        const monthIndex = Number(row?._id?.month) - 1;
        const bucket = yearlySales.find((entry) => entry.year === year);
        if (!bucket || monthIndex < 0 || monthIndex > 11) continue;
        bucket.monthly[monthIndex] = Number(row?.total || 0);
    }

    return res.status(200).json({
        success: true,
        summary: {
            totalSalesAmount: Number(orderSummaryRow.totalSalesAmount || 0),
            totalOrders: Number(orderSummaryRow.totalOrders || 0),
            totalProducts,
            totalUsers: Number(usersCount || 0),
        },
        charts: {
            yearlySales,
            orderStatus,
            productsByCategory,
            stockBreakdown: {
                outOfStock,
                inStock: Math.max(0, totalProducts - outOfStock),
            },
        },
    });
});

// Get All Users --ADMIN
exports.getAllUsers = asyncErrorHandler(async (req, res, next) => {

    const users = await User.find();

    res.status(200).json({
        success: true,
        users,
    });
});

// Get Single User Details --ADMIN
exports.getSingleUser = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        user,
    });
});

// Update User Role --ADMIN
exports.updateUserRole = asyncErrorHandler(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        gender: req.body.gender,
        role: req.body.role,
    }

    await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});

// Delete Role --ADMIN
exports.deleteUser = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    await user.remove();

    res.status(200).json({
        success: true
    });
});

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_SEND_PER_WINDOW = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 8;

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const canSendOtpToUser = (user) => {
    const now = Date.now();
    const lastSentAt = user?.phoneOtp?.lastSentAt ? new Date(user.phoneOtp.lastSentAt).getTime() : null;
    const windowStart = user?.phoneOtp?.sendWindowStart ? new Date(user.phoneOtp.sendWindowStart).getTime() : null;
    const sendCount = Number(user?.phoneOtp?.sendCount || 0);

    if (lastSentAt && now - lastSentAt < OTP_RESEND_COOLDOWN_MS) {
        return { ok: false, reason: 'Please wait before requesting another OTP.' };
    }

    if (!windowStart || now - windowStart > OTP_SEND_WINDOW_MS) {
        return { ok: true, resetWindow: true };
    }

    if (sendCount >= OTP_MAX_SEND_PER_WINDOW) {
        return { ok: false, reason: 'Too many OTP requests. Please try again later.' };
    }

    return { ok: true, resetWindow: false };
};

// Request OTP for phone login
exports.requestPhoneLoginOtp = asyncErrorHandler(async (req, res, next) => {
    const defaultCountry = process.env.PHONE_DEFAULT_COUNTRY || 'IN';
    const normalizedPhone = normalizePhone(req.body?.phone, defaultCountry);

    // Avoid enumeration: always return success.
    if (!normalizedPhone) {
        return res.status(200).json({
            success: true,
            message: 'If an account with that phone exists, an OTP has been sent.',
        });
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user || !user.phoneVerified) {
        return res.status(200).json({
            success: true,
            message: 'If an account with that phone exists, an OTP has been sent.',
        });
    }

    const check = canSendOtpToUser(user);
    if (!check.ok) {
        return next(new ErrorHandler(check.reason, 429));
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const now = new Date();
    user.phoneOtp = {
        hash: otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        purpose: 'login',
        lastSentAt: now,
        sendWindowStart: check.resetWindow ? now : (user.phoneOtp?.sendWindowStart || now),
        sendCount: check.resetWindow ? 1 : Number(user.phoneOtp?.sendCount || 0) + 1,
        verifyAttempts: 0,
    };

    await user.save({ validateBeforeSave: false });

    const smsText = `Your Lexy login OTP is ${otp}. It expires in 10 minutes.`;
    await sendSms({ to: normalizedPhone, message: smsText });

    res.status(200).json({
        success: true,
        message: 'If an account with that phone exists, an OTP has been sent.',
    });
});

// Verify OTP for phone login
exports.verifyPhoneLoginOtp = asyncErrorHandler(async (req, res, next) => {
    const defaultCountry = process.env.PHONE_DEFAULT_COUNTRY || 'IN';
    const normalizedPhone = normalizePhone(req.body?.phone, defaultCountry);
    const otp = String(req.body?.otp || '').trim();

    if (!normalizedPhone || !otp) {
        return next(new ErrorHandler('Invalid phone or OTP', 400));
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user || !user.phoneVerified || !user.phoneOtp?.hash || user.phoneOtp?.purpose !== 'login') {
        return next(new ErrorHandler('Invalid or expired OTP', 400));
    }

    if (user.phoneOtp?.expiresAt && new Date(user.phoneOtp.expiresAt).getTime() < Date.now()) {
        user.phoneOtp = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler('Invalid or expired OTP', 400));
    }

    if (Number(user.phoneOtp?.verifyAttempts || 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
        user.phoneOtp = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler('Too many attempts. Please request a new OTP.', 429));
    }

    const ok = await bcrypt.compare(otp, user.phoneOtp.hash);
    if (!ok) {
        user.phoneOtp.verifyAttempts = Number(user.phoneOtp.verifyAttempts || 0) + 1;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler('Invalid or expired OTP', 400));
    }

    user.phoneOtp = undefined;
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, res);
});

// Request OTP to link/verify a phone number (authenticated)
exports.requestLinkPhoneOtp = asyncErrorHandler(async (req, res, next) => {
    const defaultCountry = process.env.PHONE_DEFAULT_COUNTRY || 'IN';
    const normalizedPhone = normalizePhone(req.body?.phone, defaultCountry);
    if (!normalizedPhone) {
        return next(new ErrorHandler('Invalid phone number', 400));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    // If already verified for same phone, no-op.
    if (user.phoneVerified && user.phone === normalizedPhone) {
        return res.status(200).json({ success: true, message: 'Phone number already verified.' });
    }

    const existing = await User.findOne({ phone: normalizedPhone });
    if (existing && String(existing._id) !== String(user._id)) {
        return next(new ErrorHandler('This phone number is already linked to another account.', 409));
    }

    const check = canSendOtpToUser(user);
    if (!check.ok) {
        return next(new ErrorHandler(check.reason, 429));
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const now = new Date();

    user.pendingPhone = normalizedPhone;
    user.phoneVerified = false;
    user.phoneOtp = {
        hash: otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        purpose: 'link',
        lastSentAt: now,
        sendWindowStart: check.resetWindow ? now : (user.phoneOtp?.sendWindowStart || now),
        sendCount: check.resetWindow ? 1 : Number(user.phoneOtp?.sendCount || 0) + 1,
        verifyAttempts: 0,
    };

    await user.save({ validateBeforeSave: false });

    const smsText = `Your Lexy verification OTP is ${otp}. It expires in 10 minutes.`;
    await sendSms({ to: normalizedPhone, message: smsText });

    res.status(200).json({ success: true, message: 'OTP sent to phone number.' });
});

// Verify OTP to link/verify phone (authenticated)
exports.verifyLinkPhoneOtp = asyncErrorHandler(async (req, res, next) => {
    const otp = String(req.body?.otp || '').trim();
    if (!otp) {
        return next(new ErrorHandler('Please enter the OTP', 400));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorHandler('User not found', 404));
    }

    if (!user.pendingPhone || !user.phoneOtp?.hash || user.phoneOtp?.purpose !== 'link') {
        return next(new ErrorHandler('No pending phone verification. Please request an OTP first.', 400));
    }

    if (user.phoneOtp?.expiresAt && new Date(user.phoneOtp.expiresAt).getTime() < Date.now()) {
        user.phoneOtp = undefined;
        user.pendingPhone = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler('Invalid or expired OTP', 400));
    }

    if (Number(user.phoneOtp?.verifyAttempts || 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
        user.phoneOtp = undefined;
        user.pendingPhone = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler('Too many attempts. Please request a new OTP.', 429));
    }

    const ok = await bcrypt.compare(otp, user.phoneOtp.hash);
    if (!ok) {
        user.phoneOtp.verifyAttempts = Number(user.phoneOtp.verifyAttempts || 0) + 1;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler('Invalid or expired OTP', 400));
    }

    const phoneToLink = user.pendingPhone;
    const existing = await User.findOne({ phone: phoneToLink });
    if (existing && String(existing._id) !== String(user._id)) {
        return next(new ErrorHandler('This phone number is already linked to another account.', 409));
    }

    user.phone = phoneToLink;
    user.phoneVerified = true;
    user.pendingPhone = undefined;
    user.phoneOtp = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        message: 'Phone number verified successfully.',
        user,
    });
});