/**
 * Payment Routes
 * Routes for payment processing
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
 */

// POST /api/payment/create - Create payment for order
router.post('/create', authenticate, validate(createPaymentSchema), paymentController.createPayment);

// GET /api/payment/order/:orderId - Get payment by order ID
router.get('/order/:orderId', authenticate, paymentController.getPaymentByOrder);

// PUT /api/payment/confirm-cod - Confirm COD payment (Warehouse/Admin)
router.put('/confirm-cod', authenticate, paymentController.confirmCOD);

/**
 * VNPAY callback routes (no auth required - called by VNPAY)
 */

// GET /api/payment/vnpay/return - VNPAY return URL (redirect)
router.get('/vnpay/return', paymentController.vnpayReturn);

// POST /api/payment/vnpay/ipn - VNPAY IPN (webhook)
// Also support GET for testing
router.post('/vnpay/ipn', paymentController.vnpayIpn);
router.get('/vnpay/ipn', paymentController.vnpayIpn);

module.exports = router;
