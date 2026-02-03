/**
 * Authentication Service
 * Xử lý logic đăng ký, đăng nhập, quản lý token và mật khẩu
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Hash a password using bcrypt
 * Mã hóa mật khẩu
 *
 * Chức năng: Mã hóa mật khẩu bằng thuật toán bcrypt để lưu vào DB.
 * Luồng xử lý: Sử dụng thư viện `bcryptjs` với salt rounds = 10.
 * @param {string} password - Mật khẩu dạng plain text.
 * @returns {Promise<string>} Mật khẩu đã mã hóa.
 */
const hashPassword = async (password) => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * So sánh mật khẩu
 *
 * Chức năng: Kiểm tra mật khẩu người dùng nhập vào có khớp với mật khẩu đã mã hóa trong DB không.
 * @param {string} password - Mật khẩu người dùng nhập.
 * @param {string} hash - Mật khẩu trong DB.
 * @returns {Promise<boolean>} True nếu khớp, False nếu không.
 */
const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

/**
 * Generate access token
 * Tạo Access Token
 *
 * Chức năng: Tạo JWT token dùng để xác thực API calls.
 * @param {object} payload - Thông tin người dùng (userId, email, role).
 * @returns {string} Chuỗi token JWT.
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

/**
 * Generate refresh token
 * Tạo Refresh Token
 *
 * Chức năng: Tạo token dài hạn dùng để cấp lại Access Token khi hết hạn.
 * @param {object} payload - Thông tin người dùng.
 * @returns {string} Chuỗi refresh token JWT.
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });
};

/**
 * Verify access token
 * Xác thực Access Token
 *
 * Chức năng: Kiểm tra tính hợp lệ của token gửi lên từ client.
 * @param {string} token - Chuỗi JWT.
 * @returns {object} Payload đã giải mã nếu token hợp lệ.
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
 * Xác thực Refresh Token
 *
 * Chức năng: Kiểm tra tính hợp lệ của refresh token.
 * @param {string} token - Chuỗi JWT refresh token.
 * @returns {object} Payload đã giải mã.
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
 * Tính ngày hết hạn token
 *
 * Chức năng: Chuyển đổi chuỗi thời gian (vd '7d') thành đối tượng Date.
 * @param {string} expiresIn - Chuỗi thời gian (vd '7d', '1h').
 * @returns {Date} Ngày giờ hết hạn cụ thể.
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
 * Đăng ký người dùng mới
 *
 * Chức năng: Tạo tài khoản mới trong cơ sở dữ liệu.
 * Luồng xử lý:
 * 1. Kiểm tra email đã tồn tại chưa.
 * 2. Lấy Role mặc định (CUSTOMER) và Tier mặc định (BRONZE).
 * 3. Mã hóa mật khẩu.
 * 4. Tạo bản ghi User mới trong DB.
 * 5. Tạo cặp Access/Refresh Token.
 * 6. Lưu Refresh Token vào DB để quản lý phiên.
 * 7. Trả về thông tin user (đã xóa password) và tokens.
 * @param {object} userData - Dữ liệu đăng ký (email, password, fullName...).
 * @returns {Promise<object>} User và Tokens.
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
 * Đăng nhập
 *
 * Chức năng: Xác thực và cấp quyền truy cập.
 * Luồng xử lý:
 * 1. Tìm user theo email.
 * 2. Kiểm tra tài khoản có bị khóa không (`isActive`).
 * 3. So sánh mật khẩu bằng `comparePassword`.
 * 4. Cập nhật `lastLoginAt`.
 * 5. Tạo và lưu tokens mới.
 * 6. Trả về user và tokens.
 * @param {string} email - Email đăng nhập.
 * @param {string} password - Mật khẩu.
 * @returns {Promise<object>} User và Tokens.
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
 * Làm mới Access Token
 *
 * Chức năng: Cấp lại access token mới khi cái cũ hết hạn.
 * Luồng xử lý:
 * 1. Xác thực refresh token (signature).
 * 2. Kiểm tra token có tồn tại trong DB không (để tránh token đã bị revoked).
 * 3. Kiểm tra token có hết hạn chưa (trong DB).
 * 4. Kiểm tra user có bị khóa không.
 * 5. Cấp lại access token mới (không cấp lại refresh token ở bước này - tùy chiến lược).
 * @param {string} refreshToken - Token làm mới.
 * @returns {Promise<object>} Access token mới.
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
 * Đăng xuất
 *
 * Chức năng: Hủy hiệu lực phiên đăng nhập hiện tại.
 * Luồng xử lý: Xóa bản ghi refresh token tương ứng khỏi DB.
 * @param {string} refreshToken - Token cần hủy.
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
 * Đăng xuất tất cả thiết bị
 *
 * Chức năng: Đăng xuất tài khoản khỏi mọi nơi.
 * Luồng xử lý: Xóa tất cả refresh token của userId này.
 * @param {number} userId - ID người dùng.
 */
const logoutAll = async (userId) => {
    await prisma.refreshToken.deleteMany({
        where: { userId },
    });
};

/**
 * Get current user profile
 * Lấy thông tin cá nhân
 *
 * Chức năng: Lấy thông tin chi tiết user (kèm role, tier, địa chỉ).
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object>} Thông tin user (đã xóa password).
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
 * Cập nhật thông tin cá nhân
 *
 * Chức năng: Cho phép user tự sửa tên, số điện thoại, avatar.
 * @param {number} userId - ID người dùng.
 * @param {object} updateData - Dữ liệu cần sửa.
 * @returns {Promise<object>} Thông tin user dã update.
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
 * Đổi mật khẩu
 *
 * Chức năng: Đổi mật khẩu đăng nhập.
 * Luồng xử lý:
 * 1. Kiểm tra user tồn tại.
 * 2. Xác thực mật khẩu cũ.
 * 3. Mã hóa và lưu mật khẩu mới.
 * 4. (Quan trọng) Đăng xuất khỏi mọi thiết bị khác để đảm bảo an toàn (`logoutAll`).
 * @param {number} userId - ID người dùng.
 * @param {string} currentPassword - Mật khẩu hiện tại.
 * @param {string} newPassword - Mật khẩu mới.
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
 * Dọn dẹp token hết hạn
 *
 * Chức năng: Chạy định kỳ (cron job) để xóa các token rác trong DB.
 * @returns {Promise<number>} Số lượng token đã xóa.
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
