/**
 * Middleware exports
 */
const { errorHandler, notFoundHandler } = require('./errorHandler');
const { authenticate, optionalAuth } = require('./auth.middleware');
const {
    requireRole,
    requireRoleLevel,
    requirePermission,
    requireOwnerOrRole,
    requireStaff,
    requireManager,
    requireAdmin,
} = require('./rbac.middleware');
const { validate, sanitize } = require('./validate.middleware');

module.exports = {
    // Error handling
    errorHandler,
    notFoundHandler,

    // Authentication
    authenticate,
    optionalAuth,

    // RBAC
    requireRole,
    requireRoleLevel,
    requirePermission,
    requireOwnerOrRole,
    requireStaff,
    requireManager,
    requireAdmin,

    // Validation
    validate,
    sanitize,
};
