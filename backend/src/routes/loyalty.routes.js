/**
 * Loyalty Routes
 * Endpoints for loyalty points and tier management
 */
const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

// GET /api/loyalty/status - Get user's loyalty status
router.get('/status', loyaltyController.getStatus);

// GET /api/loyalty/discount/check - Check discount eligibility
router.get('/discount/check', loyaltyController.checkDiscount);

// GET /api/loyalty/history - Get points history
router.get('/history', loyaltyController.getHistory);

module.exports = router;
