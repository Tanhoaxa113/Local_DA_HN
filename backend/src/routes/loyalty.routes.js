/**
 * Loyalty Routes
 * Endpoints for loyalty points and tier management
 * Routes quản lý điểm thưởng và hạng thành viên
 */
const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes require authentication
// Cần đăng nhập để xem điểm
router.use(authenticate);

// GET /api/loyalty/status - Get user's loyalty status
// Xem trạng thái Loyalty hiện tại (Điểm, Hạng, Tiến độ)
router.get('/status', loyaltyController.getStatus);

// GET /api/loyalty/discount/check - Check discount eligibility
// Kiểm tra xem có đủ điều kiện nhận ưu đãi không
router.get('/discount/check', loyaltyController.checkDiscount);

// GET /api/loyalty/history - Get points history
// Xem lịch sử tích điểm/trừ điểm
router.get('/history', loyaltyController.getHistory);

module.exports = router;
