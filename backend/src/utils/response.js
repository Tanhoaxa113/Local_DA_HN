/**
 * Standard API response helpers
 * Helper chuẩn hóa định dạng response trả về cho Client
 */

/**
 * Send success response (200 OK)
 * Trả về thành công
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta = null) => {
    const response = {
        success: true,
        message,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send created response (201 Created)
 * Trả về khi tạo mới thành công
 */
const sendCreated = (res, data, message = 'Created successfully') => {
    return sendSuccess(res, data, message, 201);
};

/**
 * Send paginated response
 * Trả về danh sách có phân trang theo chuẩn.
 * 
 * Cấu trúc trả về:
 * {
 *   success: true,
 *   message: "...",
 *   data: [...items],
 *   meta: {
 *     pagination: {
 *       page: 1,      // Trang hiện tại
 *       limit: 10,    // Số lượng item/trang
 *       total: 50,    // Tổng số item trong DB
 *       totalPages: 5,// Tổng số trang
 *       hasNextPage: true, // Còn trang sau không?
 *       hasPrevPage: false // Có trang trước không?
 *     }
 *   }
 * }
 */
const sendPaginated = (res, data, page, limit, total, message = 'Success') => {
    const totalPages = Math.ceil(total / limit);

    return sendSuccess(res, data, message, 200, {
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    });
};

/**
 * Send no content response (204 No Content)
 * Trả về thành công nhưng không có nội dung (thường dùng cho DELETE)
 */
const sendNoContent = (res) => {
    return res.status(204).send();
};

/**
 * Send error response (Default 500)
 * Trả về lỗi (Tuy nhiên thường dùng middleware errorHandler hơn)
 */
const sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

module.exports = {
    sendSuccess,
    sendCreated,
    sendPaginated,
    sendNoContent,
    sendError,
};
