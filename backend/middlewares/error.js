const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(err);
    }

    let statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    let message = err.message || "Internal Server Error";

    // mongodb id error
    if (err.name === "CastError") {
        message = `Resource Not Found. Invalid: ${err.path}`;
        statusCode = 400;
    }

    // mongoose duplicate key error
    if (err.code === 11000) {
        message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        statusCode = 400;
    }

    // wrong jwt error
    if (err.name === "JsonWebTokenError") {
        message = 'JWT is invalid, try again';
        statusCode = 401;
    }

    // jwt expire error
    if (err.name === "TokenExpiredError") {
        message = 'JWT is expired, try again';
        statusCode = 401;
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
}