/**
 * Authentication Middleware
 * JWT token verification and user attachment to request
 * Middleware xác thực (Verify Token & Attach User)
 */
const { verifyAccessToken } = require('../services/auth.service');
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Extract token from Authorization header
 * Lấy Token từ Header (Authorization: Bearer <token>)
 * @param {object} req - Express request object
 * @returns {string|null} Token or null
 */
const extractToken = (req) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
};

/**
 * Required authentication middleware
 * Verifies JWT and attaches user to request
 * Throws error if not authenticated
 * Middleware yêu cầu đăng nhập bắt buộc
 */
const authenticate = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            throw new ApiError(401, 'Authentication required. Please provide a valid token.');
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                role: true,
                tier: true,
            },
        });

        if (!user) {
            throw new ApiError(401, 'User not found. Token may be invalid.');
        }

        if (!user.isActive) {
            throw new ApiError(403, 'Account is deactivated. Please contact support.');
        }

        // Attach user to request (without password)
        const { password: _, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 * Useful for public routes that show personalized content if logged in
 * Middleware đăng nhập tùy chọn (Không bắt buộc, nhưng nếu có token hợp lệ thì attach user)
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            req.user = null;
            return next();
        }

        // Try to verify token
        const decoded = verifyAccessToken(token);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                role: true,
                tier: true,
            },
        });

        if (user && user.isActive) {
            const { password: _, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // Token invalid or expired, continue without user
        // Nếu lỗi Token (hết hạn/sai), coi như khách vãng lai (không lỗi)
        req.user = null;
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuth,
    extractToken,
};
