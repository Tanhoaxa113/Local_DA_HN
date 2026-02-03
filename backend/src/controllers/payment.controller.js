/**
 * Payment Controller
 * Điều khiển các hoạt động liên quan đến thanh toán
 */
const paymentService = require('../services/payment.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Get client IP from request
 * Lấy địa chỉ IP của client
 * @param {object} req - Express request
 * @returns {string} Client IP
 */
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const ip = req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        '127.0.0.1';

    return ip === '::1' ? '127.0.0.1' : ip;
};

/**
 * Create payment for order
 * Tạo yêu cầu thanh toán (VNPAY)
 *
 * Chức năng: Tạo URL thanh toán để redirect người dùng sang cổng thanh toán (VNPAY).
 * Luồng xử lý:
 * 1. Nhận `orderId`.
 * 2. Lấy IP của người dùng.
 * 3. Gọi `paymentService.createPayment` để sinh URL thanh toán.
 * 4. Trả về URL.
 * Kích hoạt khi: Người dùng chọn thanh toán online sau khi tạo đơn hàng.
 * POST /api/payment/create
 */
const createPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const clientIp = getClientIp(req);

    const result = await paymentService.createPayment(
        parseInt(orderId, 10),
        clientIp
    );

    sendSuccess(res, result, 'Payment URL created');
});

/**
 * Handle VNPAY return (redirect from payment page)
 * Xử lý khi user quay lại từ VNPAY
 *
 * Chức năng: Nhận kết quả thanh toán khi người dùng được redirect về từ VNPAY.
 * Luồng xử lý:
 * 1. Nhận các tham số từ query param trên URL return.
 * 2. Gọi logic kiểm tra chữ ký (`handleVnpayReturn`).
 * 3. Redirect người dùng về trang kết quả trên Frontend (kèm theo trạng thái thành công/thất bại).
 * Kích hoạt khi: Người dùng thanh toán xong (hoặc hủy) trên VNPAY và được chuyển về website.
 * GET /api/payment/vnpay/return
 */
const vnpayReturn = asyncHandler(async (req, res) => {
    const result = await paymentService.handleVnpayReturn(req.query);

    // Redirect to frontend with result
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = new URL(`${frontendUrl}/payment/result`);

    // Ensure orderNumber is clean (strip timestamp suffix if present)
    let orderNumber = result.orderNumber;
    if (orderNumber && typeof orderNumber === 'string' && orderNumber.includes('_')) {
        orderNumber = orderNumber.split('_')[0];
    }

    redirectUrl.searchParams.set('success', result.success);
    redirectUrl.searchParams.set('orderId', result.orderId);
    redirectUrl.searchParams.set('orderNumber', orderNumber);
    redirectUrl.searchParams.set('message', result.message);

    res.redirect(redirectUrl.toString());
});

/**
 * Handle VNPAY IPN (server-to-server callback)
 * Xử lý IPN từ VNPAY (Server gọi Server)
 *
 * Chức năng: Cập nhật trạng thái đơn hàng ngầm (kể cả khi user tắt trình duyệt).
 * Luồng xử lý:
 * 1. Nhận thông tin từ VNPAY gọi sang.
 * 2. Kiểm tra chữ ký bảo mật.
 * 3. Cập nhật trạng thái đơn hàng trong DB nếu thanh toán thành công.
 * 4. Trả về mã phản hồi cho VNPAY (bắt buộc theo tài liệu VNPAY).
 * Kích hoạt khi: Hệ thống VNPAY notify kết quả thanh toán về server.
 * POST /api/payment/vnpay/ipn
 */
const vnpayIpn = asyncHandler(async (req, res) => {
    // VNPay may send params as query or body
    const vnpParams = { ...req.query, ...req.body };

    const result = await paymentService.handleVnpayIpn(vnpParams);

    // Must return exactly this format
    res.json(result);
});

/**
 * Get payment status by order ID
 * Lấy trạng thái thanh toán
 *
 * Chức năng: Kiểm tra xem đơn hàng đã được thanh toán chưa.
 * Luồng xử lý: Truy vấn bảng Payment theo OrderId.
 * Kích hoạt khi: Hệ thống cần check lại trạng thái thanh toán.
 * GET /api/payment/order/:orderId
 */
const getPaymentByOrder = asyncHandler(async (req, res) => {
    const payment = await paymentService.getByOrderId(
        parseInt(req.params.orderId, 10)
    );

    sendSuccess(res, payment, 'Payment retrieved');
});

/**
 * Confirm COD payment collected
 * Xác nhận đã thu tiền COD
 *
 * Chức năng: Nhân viên xác nhận đã thu tiền mặt của khách (đối với phương thức Thanh toán khi nhận hàng).
 * Luồng xử lý:
 * 1. Chỉ nhân viên/admin được gọi.
 * 2. Cập nhật trạng thái thanh toán của đơn hàng thành "PAID".
 * Kích hoạt khi: Shipper báo đã giao và thu tiền.
 * PUT /api/payment/confirm-cod
 */
const confirmCOD = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const result = await paymentService.confirmCOD(parseInt(orderId, 10));
    sendSuccess(res, result, 'COD payment confirmed');
});

module.exports = {
    createPayment,
    vnpayReturn,
    vnpayIpn,
    getPaymentByOrder,
    confirmCOD,
};
