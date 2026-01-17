/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
    const { email, password, fullName, phone } = req.body;

    const result = await authService.register({
        email,
        password,
        fullName,
        phone,
    });

    sendCreated(res, result, 'Registration successful');
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    sendSuccess(res, result, 'Login successful');
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await authService.refresh(refreshToken);

    sendSuccess(res, result, 'Token refreshed successfully');
});

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    sendSuccess(res, null, 'Logout successful');
});

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
const logoutAll = asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user.id);

    sendSuccess(res, null, 'Logged out from all devices successfully');
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    sendSuccess(res, user, 'Profile retrieved successfully');
});

/**
 * Update current user profile
 * PUT /api/auth/me
 */
const updateMe = asyncHandler(async (req, res) => {
    const { fullName, phone, avatar } = req.body;

    const user = await authService.updateProfile(req.user.id, {
        fullName,
        phone,
        avatar,
    });

    sendSuccess(res, user, 'Profile updated successfully');
});

/**
 * Change password
 * POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    sendSuccess(res, null, 'Password changed successfully. Please login again.');
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    getMe,
    updateMe,
    changePassword,
};
