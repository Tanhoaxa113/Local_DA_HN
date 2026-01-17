/**
 * Global error handler middleware
 */
const config = require('../config');
const { ApiError } = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
    let error = err;

    // If not an ApiError, convert it
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        error = new ApiError(statusCode, message, false);
    }

    const response = {
        success: false,
        message: error.message,
        ...(config.app.env === 'development' && {
            stack: error.stack,
            originalError: err.message,
        }),
    };

    // Log error in development
    if (config.app.env === 'development') {
        console.error('❌ Error:', err);
    }

    res.status(error.statusCode).json(response);
};

/**
 * Handle 404 Not Found
 */
const notFoundHandler = (req, res, next) => {
    const error = new ApiError(404, `Route ${req.originalUrl} not found`);
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
