/**
 * Order Validation Schemas
 * Validation schemas for order and cart endpoints
 */

const addToCartSchema = {
    body: {
        variantId: {
            required: true,
            type: 'integer',
            min: 1,
        },
        quantity: {
            required: false,
            type: 'integer',
            min: 1,
            max: 99,
        },
    },
};

const updateCartItemSchema = {
    params: {
        itemId: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        quantity: {
            required: true,
            type: 'integer',
            min: 0,
            max: 99,
        },
    },
};

const createOrderSchema = {
    body: {
        addressId: {
            required: true,
            type: 'integer',
            min: 1,
        },
        paymentMethod: {
            required: true,
            type: 'string',
            enum: ['COD', 'VNPAY', 'BANK_TRANSFER'],
        },
        note: {
            required: false,
            type: 'string',
            maxLength: 500,
        },
        useLoyaltyPoints: {
            required: false,
            type: 'integer',
            min: 0,
        },
    },
};

const updateOrderStatusSchema = {
    params: {
        id: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        status: {
            required: true,
            type: 'string',
            enum: [
                'PENDING_PAYMENT',
                'PROCESSING_FAILED',
                'PENDING_CONFIRMATION',
                'PREPARING',
                'READY_TO_SHIP',
                'IN_TRANSIT',
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'RETURNED_TO_WAREHOUSE',
                'DELIVERED',
                'REFUND_REQUESTED',
                'REFUNDING',
                'REFUNDED',
                'REFUND_CONFIRMED',
                'COMPLETED',
                'CANCELLED',
            ],
        },
        note: {
            required: false,
            type: 'string',
            maxLength: 500,
        },
    },
};

const cancelOrderSchema = {
    params: {
        id: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        reason: {
            required: false,
            type: 'string',
            maxLength: 500,
        },
    },
};

const refundRequestSchema = {
    params: {
        id: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        reason: {
            required: true,
            type: 'string',
            minLength: 10,
            maxLength: 1000,
        },
    },
};

const orderQuerySchema = {
    query: {
        page: {
            required: false,
            type: 'integer',
            min: 1,
        },
        limit: {
            required: false,
            type: 'integer',
            min: 1,
            max: 100,
        },
        status: {
            required: false,
            type: 'string',
        },
        paymentStatus: {
            required: false,
            type: 'string',
            enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'],
        },
        paymentMethod: {
            required: false,
            type: 'string',
            enum: ['COD', 'VNPAY', 'BANK_TRANSFER'],
        },
        startDate: {
            required: false,
            type: 'string',
        },
        endDate: {
            required: false,
            type: 'string',
        },
        search: {
            required: false,
            type: 'string',
            maxLength: 100,
        },
        sortBy: {
            required: false,
            type: 'string',
            enum: ['createdAt', 'totalAmount', 'status'],
        },
        sortOrder: {
            required: false,
            type: 'string',
            enum: ['asc', 'desc'],
        },
    },
};

module.exports = {
    addToCartSchema,
    updateCartItemSchema,
    createOrderSchema,
    updateOrderStatusSchema,
    cancelOrderSchema,
    refundRequestSchema,
    orderQuerySchema,
};
