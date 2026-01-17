/**
 * Authentication Routes
 * Routes for user authentication and profile management
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
 */

// POST /api/auth/register - Register new user
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login - Login user
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', validate(refreshSchema), authController.refresh);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

/**
 * Protected routes (authentication required)
 */

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, authController.getMe);

// PUT /api/auth/me - Update current user profile
router.put('/me', authenticate, validate(updateProfileSchema), authController.updateMe);

// POST /api/auth/change-password - Change password
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all', authenticate, authController.logoutAll);

module.exports = router;
