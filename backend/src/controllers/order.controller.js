/**
 * Order Controller
 * Handles HTTP requests for order endpoints
 */
const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');

/**
 * Create order from cart
 * POST /api/orders
 */
const create = asyncHandler(async (req, res) => {
    const { addressId, paymentMethod, note } = req.body;

    const order = await orderService.createFromCart(req.user.id, {
        addressId: parseInt(addressId, 10),
        paymentMethod,
        note,
    });

    sendCreated(res, order, 'Order created successfully');
});

/**
 * Get my orders
 * GET /api/orders/my
 */
const getMyOrders = asyncHandler(async (req, res) => {
    const result = await orderService.getAll({
        ...req.query,
        userId: req.user.id,
    });

    sendSuccess(res, result, 'Orders retrieved successfully');
});

/**
 * Get all orders (staff)
 * GET /api/orders
 */
const getAll = asyncHandler(async (req, res) => {
    const result = await orderService.getAll(req.query);

    sendSuccess(res, result, 'Orders retrieved successfully');
});

/**
 * Get order by ID
 * GET /api/orders/:id
 */
const getById = asyncHandler(async (req, res) => {
    const isStaff = ['SALES_STAFF', 'WAREHOUSE', 'SALES_MANAGER', 'ADMIN'].includes(req.user.role?.name);

    const order = await orderService.getById(
        parseInt(req.params.id, 10),
        isStaff ? null : req.user.id
    );

    sendSuccess(res, order, 'Order retrieved successfully');
});

/**
 * Get order by order number
 * GET /api/orders/number/:orderNumber
 */
const getByOrderNumber = asyncHandler(async (req, res) => {
    const isStaff = ['SALES_STAFF', 'WAREHOUSE', 'SALES_MANAGER', 'ADMIN'].includes(req.user.role?.name);

    const order = await orderService.getByOrderNumber(
        req.params.orderNumber,
        isStaff ? null : req.user.id
    );

    sendSuccess(res, order, 'Order retrieved successfully');
});

/**
 * Update order status
 * PATCH /api/orders/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;

    const order = await orderService.updateStatus(
        parseInt(req.params.id, 10),
        status,
        req.user.id,
        note || '',
        req.user.role?.name || 'CUSTOMER'
    );

    sendSuccess(res, order, 'Order status updated');
});

/**
 * Cancel order
 * POST /api/orders/:id/cancel
 */
const cancel = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const order = await orderService.cancel(
        parseInt(req.params.id, 10),
        req.user.id,
        reason || '',
        req.user.role?.name || 'CUSTOMER'
    );

    sendSuccess(res, order, 'Order cancelled');
});

/**
 * Request refund
 * POST /api/orders/:id/refund
 */
const requestRefund = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const order = await orderService.requestRefund(
        parseInt(req.params.id, 10),
        req.user.id,
        reason || ''
    );

    sendSuccess(res, order, 'Refund requested');
});

/**
 * Get valid next statuses for order
 * GET /api/orders/:id/next-statuses
 */
const getNextStatuses = asyncHandler(async (req, res) => {
    const statuses = await orderService.getNextStatuses(
        parseInt(req.params.id, 10),
        req.user.role?.name || 'CUSTOMER'
    );

    sendSuccess(res, statuses, 'Valid next statuses retrieved');
});

/**
 * Confirm order received
 * POST /api/orders/:id/confirm
 */
const confirmOrder = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const order = await orderService.getById(orderId, req.user.id);

    let nextStatus;
    let note;

    if (order.status === 'DELIVERED') {
        nextStatus = 'COMPLETED';
        note = 'Khách hàng xác nhận đã nhận được hàng';
    } else if (order.status === 'REFUNDED') {
        nextStatus = 'REFUND_CONFIRMED';
        note = 'Khách hàng xác nhận đã nhận được tiền hoàn';
    } else {
        throw new ApiError(400, 'Không thể xác nhận ở trạng thái này');
    }

    const updatedOrder = await orderService.updateStatus(
        orderId,
        nextStatus,
        req.user.id,
        note,
        'CUSTOMER'
    );

    sendSuccess(res, updatedOrder, 'Order confirmed');
});

module.exports = {
    create,
    getMyOrders,
    getAll,
    getById,
    getByOrderNumber,
    updateStatus,
    cancel,
    requestRefund,
    getNextStatuses,
    confirmOrder,
};
