/**
 * Standard API response helpers
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

const sendCreated = (res, data, message = 'Created successfully') => {
    return sendSuccess(res, data, message, 201);
};

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

const sendNoContent = (res) => {
    return res.status(204).send();
};

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
