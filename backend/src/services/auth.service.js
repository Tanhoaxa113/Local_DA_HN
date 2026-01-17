/**
 * Authentication Service
 * Handles user registration, login, token management, and password operations
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

/**
 * Generate access token
 * @param {object} payload - Token payload
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

/**
 * Generate refresh token
 * @param {object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Access token expired');
        }
        throw new ApiError(401, 'Invalid access token');
    }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded payload
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Refresh token expired');
        }
        throw new ApiError(401, 'Invalid refresh token');
    }
};

/**
 * Calculate token expiry date
 * @param {string} expiresIn - Duration string (e.g., '7d', '30d')
 * @returns {Date} Expiry date
 */
const calculateExpiryDate = (expiresIn) => {
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
        d: 24 * 60 * 60 * 1000,
        h: 60 * 60 * 1000,
        m: 60 * 1000,
        s: 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
};

/**
 * Register a new user
 * @param {object} userData - User registration data
 * @returns {Promise<object>} Created user with tokens
 */
const register = async (userData) => {
    const { email, password, fullName, phone } = userData;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new ApiError(409, 'Email already registered');
    }

    // Get default role (CUSTOMER) and tier (BRONZE)
    const [customerRole, bronzeTier] = await Promise.all([
        prisma.role.findUnique({ where: { name: 'CUSTOMER' } }),
        prisma.memberTier.findUnique({ where: { name: 'BRONZE' } }),
    ]);

    if (!customerRole || !bronzeTier) {
        throw new ApiError(500, 'System not properly initialized. Please run database seed.');
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            fullName,
            phone,
            roleId: customerRole.id,
            tierId: bronzeTier.id,
        },
        include: {
            role: true,
            tier: true,
        },
    });

    // Generate tokens
    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: calculateExpiryDate(config.jwt.refreshExpiresIn),
        },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
        user: userWithoutPassword,
        tokens: {
            accessToken,
            refreshToken,
        },
    };
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} User with tokens
 */
const login = async (email, password) => {
    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            role: true,
            tier: true,
        },
    });

    if (!user) {
        throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
        throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: calculateExpiryDate(config.jwt.refreshExpiresIn),
        },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
        user: userWithoutPassword,
        tokens: {
            accessToken,
            refreshToken,
        },
    };
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<object>} New access token
 */
const refresh = async (refreshToken) => {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
            user: {
                include: {
                    role: true,
                },
            },
        },
    });

    if (!storedToken) {
        throw new ApiError(401, 'Refresh token not found or already used');
    }

    if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new ApiError(401, 'Refresh token expired');
    }

    if (!storedToken.user.isActive) {
        throw new ApiError(403, 'Account is deactivated');
    }

    // Generate new access token
    const tokenPayload = {
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role.name,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    return {
        accessToken: newAccessToken,
    };
};

/**
 * Logout user (invalidate refresh token)
 * @param {string} refreshToken - Refresh token to invalidate
 * @returns {Promise<void>}
 */
const logout = async (refreshToken) => {
    if (!refreshToken) {
        return; // Nothing to do
    }

    // Delete refresh token from database
    await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
    });
};

/**
 * Logout from all devices (invalidate all refresh tokens)
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
const logoutAll = async (userId) => {
    await prisma.refreshToken.deleteMany({
        where: { userId },
    });
};

/**
 * Get current user profile
 * @param {number} userId - User ID
 * @returns {Promise<object>} User profile
 */
const getProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: true,
            tier: true,
            addresses: {
                orderBy: { isDefault: 'desc' },
            },
        },
    });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} Updated user
 */
const updateProfile = async (userId, updateData) => {
    const { fullName, phone, avatar } = updateData;

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(fullName && { fullName }),
            ...(phone && { phone }),
            ...(avatar && { avatar }),
        },
        include: {
            role: true,
            tier: true,
        },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
        throw new ApiError(400, 'Current password is incorrect');
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens for security
    await logoutAll(userId);
};

/**
 * Clean up expired refresh tokens
 * @returns {Promise<number>} Number of deleted tokens
 */
const cleanupExpiredTokens = async () => {
    const result = await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: { lt: new Date() },
        },
    });

    return result.count;
};

module.exports = {
    hashPassword,
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    register,
    login,
    refresh,
    logout,
    logoutAll,
    getProfile,
    updateProfile,
    changePassword,
    cleanupExpiredTokens,
};
