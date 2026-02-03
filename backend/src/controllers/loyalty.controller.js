/**
 * Loyalty Controller
 * Điều khiển các request liên quan đến chương trình khách hàng thân thiết (Tích điểm, Hạng thành viên).
 */
const loyaltyService = require('../services/loyalty.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const prisma = require('../config/database');

/**
 * Get loyalty status
 * Lấy trạng thái thành viên
 * 
 * Chức năng: Xem điểm tích lũy hiện tại và hạng thành viên của user.
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Gọi `loyaltyService.getStatus`.
 * 3. Trả về object chứa điểm và hạng.
 * Kích hoạt khi: Người dùng vào trang "Tài khoản của tôi" hoặc trang "Khách hàng thân thiết".
 * GET /api/loyalty/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const status = await loyaltyService.getStatus(req.user.id);
    sendSuccess(res, status, 'Loyalty status retrieved successfully');
});

/**
 * Check discount eligibility
 * Kiểm tra ưu đãi giảm giá
 * 
 * Chức năng: Kiểm tra xem user có được hưởng ưu đãi giảm giá nào dựa trên hạng thành viên không.
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Gọi `loyaltyService.checkDiscountEligibility`.
 * 3. Trả về thông tin discount (nếu có).
 * Kích hoạt khi: Tính toán giá ở giỏ hàng hoặc Checkout.
 * GET /api/loyalty/discount/check
 */
const checkDiscount = asyncHandler(async (req, res) => {
    const eligibility = await loyaltyService.checkDiscountEligibility(req.user.id);
    sendSuccess(res, eligibility, 'Discount eligibility checked');
});

/**
 * Get loyalty points history
 * Lấy lịch sử tích điểm
 * 
 * Chức năng: Xem lịch sử biến động điểm thưởng (tích điểm từ đơn hàng).
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Truy vấn bảng `Order` tìm các đơn hàng có `loyaltyPointsEarned > 0`.
 * 3. Transform dữ liệu thành dạng lịch sử (Ngày, Nội dung, Số điểm).
 * 4. Trả về danh sách có phân trang.
 * Kích hoạt khi: User xem tab "Lịch sử tích điểm".
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
