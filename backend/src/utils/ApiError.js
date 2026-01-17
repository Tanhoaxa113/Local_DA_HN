/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Common API error factory methods
 */
const createError = {
    badRequest: (message = 'Bad Request') => new ApiError(400, message),
    unauthorized: (message = 'Unauthorized') => new ApiError(401, message),
    forbidden: (message = 'Forbidden') => new ApiError(403, message),
    notFound: (message = 'Not Found') => new ApiError(404, message),
    conflict: (message = 'Conflict') => new ApiError(409, message),
    unprocessable: (message = 'Unprocessable Entity') => new ApiError(422, message),
    tooManyRequests: (message = 'Too Many Requests') => new ApiError(429, message),
    internal: (message = 'Internal Server Error') => new ApiError(500, message, false),
};

// Attach createError to the class for convenience
ApiError.create = createError;

// Hybrid export: support both `const ApiError = require(...)` and `const { ApiError } = require(...)`
module.exports = ApiError;
module.exports.ApiError = ApiError;
module.exports.createError = createError;
