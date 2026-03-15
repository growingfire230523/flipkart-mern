const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Attaches req.user if a valid auth cookie exists.
// Never throws for missing/invalid tokens (safe for public routes).
module.exports = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) return next();

        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedData?.id) return next();

        const user = await User.findById(decodedData.id);
        if (user) req.user = user;
    } catch (_) {
        // ignore auth errors for optional auth
    }

    next();
};
