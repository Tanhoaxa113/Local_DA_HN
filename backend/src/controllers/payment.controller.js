/**
 * Payment Controller
 * Handles HTTP requests for payment endpoints
 */
const paymentService = require('../services/payment.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Get client IP from request
 * @param {object} req - Express request
 * @returns {string} Client IP
 */
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        '127.0.0.1';
};

/**
 * Create payment for order
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
 * GET /api/payment/vnpay/return
 */
const vnpayReturn = asyncHandler(async (req, res) => {
    const result = await paymentService.handleVnpayReturn(req.query);

    // Redirect to frontend with result
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = new URL(`${frontendUrl}/payment/result`);

    redirectUrl.searchParams.set('success', result.success);
    redirectUrl.searchParams.set('orderId', result.orderId);
    redirectUrl.searchParams.set('orderNumber', result.orderNumber);
    redirectUrl.searchParams.set('message', result.message);

    res.redirect(redirectUrl.toString());
});

/**
 * Handle VNPAY IPN (server-to-server callback)
 * POST /api/payment/vnpay/ipn
 * Note: This must return specific format for VNPAY
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
 * GET /api/payment/order/:orderId
 */
const getPaymentByOrder = asyncHandler(async (req, res) => {
    const payment = await paymentService.getByOrderId(
        parseInt(req.params.orderId, 10)
    );

    sendSuccess(res, payment, 'Payment retrieved');
});

module.exports = {
    createPayment,
    vnpayReturn,
    vnpayIpn,
    getPaymentByOrder,
};
