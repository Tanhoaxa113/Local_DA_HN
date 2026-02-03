/**
 * Order Routes
 * Routes for order management
 * Routes quản lý đơn hàng
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
 * Tất cả route đơn hàng đều cần đăng nhập
 */
router.use(authenticate);

/**
 * Customer routes
 * Routes dành cho khách hàng
 */

// POST /api/orders - Create order from cart
// Tạo đơn hàng mới từ giỏ hàng hiện tại
router.post('/', validate(createOrderSchema), orderController.create);

// GET /api/orders/my - Get my orders
// Lấy danh sách đơn hàng của tôi
router.get('/my', validate(orderQuerySchema), orderController.getMyOrders);

// GET /api/orders/number/:orderNumber - Get order by order number
// Tìm đơn hàng theo mã đơn (Order Number)
router.get('/number/:orderNumber', orderController.getByOrderNumber);

// GET /api/orders/:id - Get order by ID
// Lấy chi tiết đơn hàng theo ID
router.get('/:id', orderController.getById);

// GET /api/orders/:id/next-statuses - Get valid next statuses
// Lấy các trạng thái tiếp theo hợp lệ (để hiển thị nút hành động)
router.get('/:id/next-statuses', orderController.getNextStatuses);

// POST /api/orders/:id/cancel - Cancel order
// Hủy đơn hàng (Chỉ hủy được khi còn ở trạng thái PENDING/CONFIRMED)
router.post('/:id/cancel', validate(cancelOrderSchema), orderController.cancel);

// POST /api/orders/:id/refund - Request refund
// Yêu cầu hoàn tiền (Đối với đơn hàng đã thanh toán nhưng bị lỗi/hủy)
router.post('/:id/refund', validate(refundRequestSchema), orderController.requestRefund);

// POST /api/orders/:id/confirm - Confirm order received
// Xác nhận đã nhận hàng (Chuyển trạng thái sang COMPLETED)
router.post('/:id/confirm', orderController.confirmOrder);

/**
 * Staff routes
 * Routes dành cho nhân viên
 */

// GET /api/orders - Get all orders (staff only)
// Lấy danh sách toàn bộ đơn hàng (Quản lý)
router.get('/', requireStaff, validate(orderQuerySchema), orderController.getAll);

// PATCH /api/orders/:id/status - Update order status (staff only)
// Cập nhật trạng thái đơn hàng (Duyệt, Giao hàng...)
router.patch('/:id/status', requireStaff, validate(updateOrderStatusSchema), orderController.updateStatus);

module.exports = router;
