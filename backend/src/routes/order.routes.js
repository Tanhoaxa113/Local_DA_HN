/**
 * Order Routes
 * Routes for order management
 */
const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole, requireStaff } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
    createOrderSchema,
    updateOrderStatusSchema,
    cancelOrderSchema,
    refundRequestSchema,
    orderQuerySchema,
} = require('../validators/order.validator');

/**
 * All order routes require authentication
 */
router.use(authenticate);

/**
 * Customer routes
 */

// POST /api/orders - Create order from cart
router.post('/', validate(createOrderSchema), orderController.create);

// GET /api/orders/my - Get my orders
router.get('/my', validate(orderQuerySchema), orderController.getMyOrders);

// GET /api/orders/number/:orderNumber - Get order by order number
router.get('/number/:orderNumber', orderController.getByOrderNumber);

// GET /api/orders/:id - Get order by ID
router.get('/:id', orderController.getById);

// GET /api/orders/:id/next-statuses - Get valid next statuses
router.get('/:id/next-statuses', orderController.getNextStatuses);

// POST /api/orders/:id/cancel - Cancel order
router.post('/:id/cancel', validate(cancelOrderSchema), orderController.cancel);

// POST /api/orders/:id/refund - Request refund
router.post('/:id/refund', validate(refundRequestSchema), orderController.requestRefund);

// POST /api/orders/:id/confirm - Confirm order received
router.post('/:id/confirm', orderController.confirmOrder);

/**
 * Staff routes
 */

// GET /api/orders - Get all orders (staff only)
router.get('/', requireStaff, validate(orderQuerySchema), orderController.getAll);

// PATCH /api/orders/:id/status - Update order status (staff only)
router.patch('/:id/status', requireStaff, validate(updateOrderStatusSchema), orderController.updateStatus);

module.exports = router;
