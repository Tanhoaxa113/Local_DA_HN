/**
 * Loyalty Service
 * Handles loyalty points, tier management, and discount eligibility with Lazy Reset
 */
const prisma = require('../config/database');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Get user's loyalty status
 * @param {number} userId - User ID
 * @returns {Promise<object>} Loyalty status
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
 * @param {number} userId - User ID
 * @returns {Promise<object>} Eligibility result
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
 * @param {number} userId - User ID
 * @returns {Promise<object>} Updated usage
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
 * @param {number} orderTotal - Order total amount
 * @param {number} tierMultiplier - Tier point multiplier
 * @returns {number} Points earned
 */
const calculatePoints = (orderTotal, tierMultiplier = 1) => {
    // 1 point per X VND (configurable)
    const basePoints = Math.floor(orderTotal / config.loyalty.pointsPerAmount);
    return Math.floor(basePoints * tierMultiplier);
};

/**
 * Add points to user
 * @param {number} userId - User ID
 * @param {number} points - Points to add
 * @returns {Promise<object>} Updated user
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
 * @param {number} userId - User ID
 * @param {number} points - Points to deduct
 * @returns {Promise<object>} Updated user
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
 * @param {number} userId - User ID
 * @returns {Promise<object|null>} New tier if upgraded, null otherwise
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
 * @param {number} points - Number of points
 * @returns {number} Value in VND
 */
const getPointValue = (points) => {
    return points * (config.loyalty.pointValue / 100);
};

/**
 * Get leaderboard (top users by points)
 * @param {number} limit - Number of users to return
 * @returns {Promise<object[]>} Top users
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
