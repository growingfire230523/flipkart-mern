const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    authProvider: {
        type: String,
        enum: ['local', 'google', 'facebook', 'phone'],
        default: 'local',
    },
    googleId: {
        type: String,
        index: true,
    },
    facebookId: {
        type: String,
        index: true,
    },
    name: {
        type: String,
        required: [true, "Please Enter Your Name"],
    },
    email: {
        type: String,
        required: function () {
            return this.authProvider === 'local' || this.authProvider === 'google';
        },
        unique: true,
        sparse: true,
    },
    gender: {
        type: String,
        required: function () {
            return this.authProvider === 'local';
        },
        default: 'Not specified',
    },
    password: {
        type: String,
        required: function () {
            return this.authProvider === 'local';
        },
        minLength: [8, "Password should have atleast 8 chars"],
        select: false,
    },
    avatar: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    role: {
        type: String,
        default: "user",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    phone: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    phoneVerified: {
        type: Boolean,
        default: false,
    },
    pendingPhone: {
        type: String,
    },
    phoneOtp: {
        hash: String,
        expiresAt: Date,
        purpose: {
            type: String,
            enum: ['login', 'link'],
        },
        lastSentAt: Date,
        sendWindowStart: Date,
        sendCount: {
            type: Number,
            default: 0,
        },
        verifyAttempts: {
            type: Number,
            default: 0,
        },
    },

    whatsappTransactionalOptIn: {
        type: Boolean,
        default: false,
    },
    whatsappTransactionalOptInAt: {
        type: Date,
        default: null,
    },
    whatsappPromoOptIn: {
        type: Boolean,
        default: false,
    },
    whatsappPromoOptInAt: {
        type: Date,
        default: null,
    },
    defaultShippingAddress: {
        address: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        pincode: { type: String },
        phoneNo: { type: String },
    },
});

userSchema.pre("save", async function (next) {

    if (!this.isModified("password")) {
        next();
    }

    if (!this.password) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.getJWTToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
}

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

userSchema.methods.getResetPasswordToken = async function () {

    // generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // generate hash token and add to db
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
}

module.exports = mongoose.model('User', userSchema);