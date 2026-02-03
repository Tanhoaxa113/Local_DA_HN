/**
 * Authentication Routes
 * Routes for user authentication and profile management
 * Routes xác thực người dùng và quản lý hồ sơ cá nhân
 */
const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
    registerSchema,
    loginSchema,
    refreshSchema,
    changePasswordSchema,
    updateProfileSchema,
} = require('../validators/auth.validator');

/**
 * Public routes (no authentication required)
 * Các route công khai (không cần đăng nhập)
 */

// POST /api/auth/register - Register new user
// Đăng ký tài khoản mới
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login - Login user
// Đăng nhập
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh - Refresh access token
// Làm mới Access Token (khi Token cũ hết hạn)
router.post('/refresh', validate(refreshSchema), authController.refresh);

// POST /api/auth/logout - Logout user
// Đăng xuất (xóa Refresh Token phía Client)
router.post('/logout', authController.logout);

/**
 * Protected routes (authentication required)
 * Các route bảo mật (cần Access Token)
 */

// GET /api/auth/me - Get current user profile
// Lấy thông tin user hiện tại
router.get('/me', authenticate, authController.getMe);

// PUT /api/auth/me - Update current user profile
// Cập nhật hồ sơ cá nhân
router.put('/me', authenticate, validate(updateProfileSchema), authController.updateMe);

// POST /api/auth/change-password - Change password
// Đổi mật khẩu
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

// POST /api/auth/logout-all - Logout from all devices
// Đăng xuất khỏi mọi thiết bị (Thu hồi tất cả Refresh Token của user này)
router.post('/logout-all', authenticate, authController.logoutAll);

module.exports = router;
