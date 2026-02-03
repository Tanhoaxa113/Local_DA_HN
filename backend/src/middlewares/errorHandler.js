/**
 * Global error handler middleware
 * Middleware xử lý lỗi tập trung
 */
const config = require('../config');
const { ApiError } = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
    let error = err;

    // If not an ApiError, convert it
    // Nếu lỗi chưa phải là ApiError (VD: lỗi cú pháp, lỗi hệ thống), chuyển về ApiError chuẩn
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
 * Xử lý lỗi 404 (Không tìm thấy route)
 */
const notFoundHandler = (req, res, next) => {
    const error = new ApiError(404, `Route ${req.originalUrl} not found`);
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
