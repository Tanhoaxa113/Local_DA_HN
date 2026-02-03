/**
 * Custom error class for API errors
 * Class lỗi tùy chỉnh cho API, kế thừa từ Error chuẩn của JS
 */
class ApiError extends Error {
    /**
     * @param {number} statusCode - HTTP Status Code (400, 401, 404, 500...)
     * @param {string} message - Error message display to user/dev
     * @param {boolean} isOperational - True = Business logic error (Validation, Auth...), False = System error (Crash, DB connection...)
     */
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Auto determine status: 4xx -> 'fail', 5xx -> 'error'
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        // Capture stack trace for debugging (excluding constructor call)
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Common API error factory methods
 * Các phương thức tạo lỗi nhanh
 */
const createError = {
    badRequest: (message = 'Bad Request') => new ApiError(400, message), // 400: Lỗi dữ liệu đầu vào
    unauthorized: (message = 'Unauthorized') => new ApiError(401, message), // 401: Chưa đăng nhập
    forbidden: (message = 'Forbidden') => new ApiError(403, message), // 403: Không có quyền
    notFound: (message = 'Not Found') => new ApiError(404, message), // 404: Không tìm thấy
    conflict: (message = 'Conflict') => new ApiError(409, message), // 409: Xung đột (VD: Trùng email)
    unprocessable: (message = 'Unprocessable Entity') => new ApiError(422, message), // 422: Dữ liệu không hợp lệ (Validation)
    tooManyRequests: (message = 'Too Many Requests') => new ApiError(429, message), // 429: Quá nhiều Request
    internal: (message = 'Internal Server Error') => new ApiError(500, message, false), // 500: Lỗi Server
};

// Attach createError to the class for convenience
ApiError.create = createError;

// Hybrid export: support both `const ApiError = require(...)` and `const { ApiError } = require(...)`
module.exports = ApiError;
module.exports.ApiError = ApiError;
module.exports.createError = createError;
