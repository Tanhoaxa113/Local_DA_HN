/**
 * Loyalty Service
 * Handles loyalty points, tier management, and discount eligibility with Lazy Reset
 * Quản lý điểm thưởng, hạng thành viên và ưu đãi (Cơ chế Reset trễ)
 */
const prisma = require('../config/database');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Get user's loyalty status
 * Lấy thông tin điểm và hạng thành viên
 *
 * Chức năng: Xem thông tin Loyalty của user.
 * Luồng xử lý:
 * 1. Lấy thông tin User kèm Tier.
 * 2. Tính toán số lần đã dùng mã giảm giá trong tháng hiện tại (cơ chế Lazy Reset - chỉ query tháng này).
 * 3. Tính toán tiến độ thăng hạng (còn thiếu bao nhiêu điểm để lên hạng tiếp theo).
 * @param {number} userId - ID User.
 * @returns {Promise<object>} Status, Tier, Discount Info, Next Tier Info.
 */
const getStatus = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tier: true },
    });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get current month's discount usage
    const usage = await prisma.memberTierUsageLog.findUnique({
        where: {
            userId_tierId_month_year: {
                userId,
                tierId: user.tierId,
                month: currentMonth,
                year: currentYear,
            },
        },
    });

    const usageCount = usage?.usageCount || 0;
    const monthlyLimit = user.tier.monthlyDiscountLimit;
    const remainingUses = Math.max(0, monthlyLimit - usageCount);

    // Get all tiers for progress display
    const allTiers = await prisma.memberTier.findMany({
        orderBy: { minPoints: 'asc' },
    });

    // Find next tier
    const currentTierIndex = allTiers.findIndex(t => t.id === user.tierId);
    const nextTier = allTiers[currentTierIndex + 1] || null;

    return {
        points: user.loyaltyPoints,
        tier: {
            id: user.tier.id,
            name: user.tier.name,
            discountPercent: user.tier.discountPercent,
            monthlyDiscountLimit: user.tier.monthlyDiscountLimit,
            pointMultiplier: user.tier.pointMultiplier,
        },
        monthlyDiscount: {
            usedThisMonth: usageCount,
            remainingThisMonth: remainingUses,
            limit: monthlyLimit,
            eligible: remainingUses > 0,
        },
        nextTier: nextTier ? {
            name: nextTier.name,
            pointsRequired: nextTier.minPoints,
            pointsNeeded: Math.max(0, nextTier.minPoints - user.loyaltyPoints),
        } : null,
        allTiers: allTiers.map(t => ({
            name: t.name,
            minPoints: t.minPoints,
            discountPercent: t.discountPercent,
            isCurrent: t.id === user.tierId,
        })),
    };
};

/**
 * Check discount eligibility using Lazy Reset logic
 * Kiểm tra quyền lợi giảm giá
 *
 * Chức năng: Kiểm tra xem user còn lượt giảm giá tháng này không.
 * Logic Lazy Reset: Không cần chạy batch job reset mỗi tháng. Chỉ cần query chính xác `month` và `year` hiện tại.
 * Nếu chưa có record cho tháng này -> Tự hiểu là chưa dùng lần nào (0).
 * @param {number} userId - ID User.
 * @returns {Promise<object>} Kết quả kiểm tra.
 */
const checkDiscountEligibility = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tier: true },
    });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (user.tier.monthlyDiscountLimit === 0) {
        return {
            eligible: false,
            discountPercent: 0,
            reason: 'Your tier does not include monthly discounts',
        };
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Lazy Reset: Query current month's usage
    // If no record exists for this month, usage is 0 (implicitly reset)
    const usage = await prisma.memberTierUsageLog.findUnique({
        where: {
            userId_tierId_month_year: {
                userId,
                tierId: user.tierId,
                month: currentMonth,
                year: currentYear,
            },
        },
    });

    const usageCount = usage?.usageCount || 0;

    if (usageCount >= user.tier.monthlyDiscountLimit) {
        return {
            eligible: false,
            discountPercent: 0,
            usedThisMonth: usageCount,
            limit: user.tier.monthlyDiscountLimit,
            reason: 'Monthly discount limit reached',
        };
    }

    return {
        eligible: true,
        discountPercent: Number(user.tier.discountPercent),
        usedThisMonth: usageCount,
        remainingUses: user.tier.monthlyDiscountLimit - usageCount,
        limit: user.tier.monthlyDiscountLimit,
    };
};

/**
 * Record discount usage
 * Ghi nhận đã sử dụng giảm giá
 *
 * Chức năng: Tăng số lần sử dụng giảm giá trong tháng.
 * Luồng xử lý: Sử dụng `upsert` (Create nếu chưa có, Update nếu đã có) vào bảng Log.
 * @param {number} userId - ID User.
 * @returns {Promise<object>} Usage record.
 */
const recordDiscountUsage = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tier: true },
    });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Upsert: Create or update the usage log for current month
    const usage = await prisma.memberTierUsageLog.upsert({
        where: {
            userId_tierId_month_year: {
                userId,
                tierId: user.tierId,
                month: currentMonth,
                year: currentYear,
            },
        },
        update: {
            usageCount: { increment: 1 },
        },
        create: {
            userId,
            tierId: user.tierId,
            month: currentMonth,
            year: currentYear,
            usageCount: 1,
        },
    });

    return usage;
};

/**
 * Calculate loyalty points for an order
 * Tính điểm thưởng cho đơn hàng
 *
 * Công thức: (Tổng tiền / Hệ số quy đổi) * Hệ số nhân của hạng thành viên.
 * @param {number} orderTotal - Tổng tiền.
 * @param {number} tierMultiplier - Hệ số nhân (VD: Vàng x1.5).
 * @returns {number} Số điểm nhận được.
 */
const calculatePoints = (orderTotal, tierMultiplier = 1) => {
    // 1 point per X VND (configurable)
    const basePoints = Math.floor(orderTotal / config.loyalty.pointsPerAmount);
    return Math.floor(basePoints * tierMultiplier);
};

/**
 * Add points to user
 * Cộng điểm tích lũy
 *
 * Chức năng: Cộng điểm sau khi hoàn thành đơn.
 * Side Effect: Sau khi cộng điểm, tự động kiểm tra xem có được thăng hạng không (`checkTierUpgrade`).
 * @param {number} userId - ID User.
 * @param {number} points - Số điểm cộng.
 * @returns {Promise<object>} User đã update.
 */
const addPoints = async (userId, points) => {
    if (points <= 0) return null;

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            loyaltyPoints: { increment: points },
        },
        include: { tier: true },
    });

    // Check for tier upgrade
    await checkTierUpgrade(userId);

    return user;
};

/**
 * Deduct points from user
 * Trừ điểm tích lũy
 *
 * Chức năng: User dùng điểm để thanh toán hoặc đổi quà.
 * @param {number} userId - ID User.
 * @param {number} points - Số điểm trừ.
 * @returns {Promise<object>} User đã update.
 */
const deductPoints = async (userId, points) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (user.loyaltyPoints < points) {
        throw new ApiError(400, 'Insufficient loyalty points');
    }

    return prisma.user.update({
        where: { id: userId },
        data: {
            loyaltyPoints: { decrement: points },
        },
    });
};

/**
 * Check and perform tier upgrade if eligible
 * Kiểm tra và nâng hạng thành viên
 *
 * Chức năng: So sánh điểm hiện tại với điểm yêu cầu các hạng.
 * Luồng xử lý:
 * 1. Lấy danh sách Hạng sắp xếp giảm dần theo điểm yêu cầu.
 * 2. Tìm hạng cao nhất mà user đủ điểm.
 * 3. Nếu hạng đó khác hạng hiện tại -> Update TierId.
 * @param {number} userId - ID User.
 * @returns {Promise<object|null>} Hạng mới nếu được thăng hạng, null nếu không.
 */
const checkTierUpgrade = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tier: true },
    });

    if (!user) {
        return null;
    }

    // Get all tiers sorted by min points descending
    const tiers = await prisma.memberTier.findMany({
        orderBy: { minPoints: 'desc' },
    });

    // Find the highest tier user qualifies for
    const qualifiedTier = tiers.find(t => user.loyaltyPoints >= t.minPoints);

    if (qualifiedTier && qualifiedTier.id !== user.tierId) {
        // Upgrade user
        await prisma.user.update({
            where: { id: userId },
            data: { tierId: qualifiedTier.id },
        });

        return qualifiedTier;
    }

    return null;
};

/**
 * Get value of points in currency
 * Quy đổi điểm ra tiền
 * @param {number} points - Số điểm.
 * @returns {number} Giá trị tiền VND.
 */
const getPointValue = (points) => {
    return points * (config.loyalty.pointValue / 100);
};

/**
 * Get leaderboard (top users by points)
 * Xếp hạng thành viên
 *
 * Chức năng: Lấy danh sách Top khách hàng tích điểm nhiều nhất.
 * @param {number} limit - Số lượng lấy (default 10).
 * @returns {Promise<object[]>} Danh sách User kèm Rank.
 */
const getLeaderboard = async (limit = 10) => {
    const users = await prisma.user.findMany({
        where: {
            isActive: true,
            role: { name: 'CUSTOMER' },
        },
        include: {
            tier: true,
        },
        orderBy: { loyaltyPoints: 'desc' },
        take: limit,
        select: {
            id: true,
            fullName: true,
            loyaltyPoints: true,
            tier: { select: { name: true } },
        },
    });

    return users.map((user, index) => ({
        rank: index + 1,
        ...user,
    }));
};

module.exports = {
    getStatus,
    checkDiscountEligibility,
    recordDiscountUsage,
    calculatePoints,
    addPoints,
    deductPoints,
    checkTierUpgrade,
    getPointValue,
    getLeaderboard,
};
