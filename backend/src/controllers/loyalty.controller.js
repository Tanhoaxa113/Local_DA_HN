/**
 * Loyalty Controller
 * Handles HTTP requests for loyalty endpoints
 */
const loyaltyService = require('../services/loyalty.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const prisma = require('../config/database');

/**
 * Get loyalty status
 * GET /api/loyalty/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const status = await loyaltyService.getStatus(req.user.id);
    sendSuccess(res, status, 'Loyalty status retrieved successfully');
});

/**
 * Check discount eligibility
 * GET /api/loyalty/discount/check
 */
const checkDiscount = asyncHandler(async (req, res) => {
    const eligibility = await loyaltyService.checkDiscountEligibility(req.user.id);
    sendSuccess(res, eligibility, 'Discount eligibility checked');
});

/**
 * Get loyalty points history
 * GET /api/loyalty/history
 */
const getHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // Get orders where points were earned
    const orders = await prisma.order.findMany({
        where: {
            userId: req.user.id,
            loyaltyPointsEarned: { gt: 0 },
        },
        select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            loyaltyPointsEarned: true,
            completedAt: true,
            createdAt: true,
        },
        orderBy: { completedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
    });

    // Transform data for frontend
    const history = orders.map(order => ({
        id: order.id,
        description: `Đơn hàng #${order.orderNumber}`,
        points: order.loyaltyPointsEarned,
        type: 'EARNED',
        date: order.completedAt || order.createdAt,
    }));

    // Get total count
    const total = await prisma.order.count({
        where: {
            userId: req.user.id,
            loyaltyPointsEarned: { gt: 0 },
        },
    });

    sendSuccess(res, {
        data: history,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
    }, 'Points history retrieved successfully');
});

module.exports = {
    getStatus,
    checkDiscount,
    getHistory,
};
