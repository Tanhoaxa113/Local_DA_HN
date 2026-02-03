/**
 * Payment Routes
 * Routes for payment processing
 * Routes quản lý thanh toán
 */
const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');

// Validation schema for create payment
const createPaymentSchema = {
    body: {
        orderId: {
            required: true,
            type: 'integer',
            min: 1,
        },
    },
};

/**
 * Protected routes
 * Routes bảo mật (Cần đăng nhập)
 */

// POST /api/payment/create - Create payment for order
// Tạo yêu cầu thanh toán (Tạo URL VNPAY hoặc khởi tạo COD)
router.post('/create', authenticate, validate(createPaymentSchema), paymentController.createPayment);

// GET /api/payment/order/:orderId - Get payment by order ID
// Lấy thông tin thanh toán của đơn hàng
router.get('/order/:orderId', authenticate, paymentController.getPaymentByOrder);

// PUT /api/payment/confirm-cod - Confirm COD payment (Warehouse/Admin)
// Xác nhận thanh toán COD (Dành cho Shipper/Kho xác nhận đã thu tiền)
router.put('/confirm-cod', authenticate, paymentController.confirmCOD);

/**
 * VNPAY callback routes (no auth required - called by VNPAY)
 * Routes Callback của VNPAY (Không cần auth token, VNPAY sẽ gọi trực tiếp vào đây)
 */

// GET /api/payment/vnpay/return - VNPAY return URL (redirect)
// Trang đích user được redirect về sau khi thanh toán xong trên VNPAY (Giao diện Client gọi)
router.get('/vnpay/return', paymentController.vnpayReturn);

// POST /api/payment/vnpay/ipn - VNPAY IPN (webhook)
// Also support GET for testing
// IPN (Instant Payment Notification): VNPAY gọi server-to-server để cập nhật trạng thái đơn (Ngầm)
router.post('/vnpay/ipn', paymentController.vnpayIpn);
router.get('/vnpay/ipn', paymentController.vnpayIpn);

module.exports = router;
