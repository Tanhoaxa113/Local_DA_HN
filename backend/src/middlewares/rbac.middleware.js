/**
 * Role-Based Access Control (RBAC) Middleware
 * Handles role and permission checks for protected routes
 * Middleware kiểm soát truy cập dựa trên Role (Phân quyền)
 */
const ApiError = require('../utils/ApiError');

/**
 * Role hierarchy levels
 * Higher number = more permissions
 * Cấp độ quyền hạn (Số càng cao quyền càng lớn)
 */
const ROLE_HIERARCHY = {
    CUSTOMER: 1,
    SALES_STAFF: 2,
    WAREHOUSE: 2,
    SALES_MANAGER: 3,
    ADMIN: 4,
};

/**
 * Permission definitions mapped to roles
 * Định nghĩa quyền hạn cụ thể cho từng Role
 */
const ROLE_PERMISSIONS = {
    CUSTOMER: [
        'profile:read',
        'profile:update',
        'products:read',
        'cart:manage',
        'orders:create',
        'orders:read:own',
        'orders:cancel:own',
        'addresses:manage',
        'refund:request',
    ],
    SALES_STAFF: [
        'profile:read',
        'profile:update',
        'products:read',
        'orders:read:all',
        'orders:confirm',
        'orders:update:status',
    ],
    WAREHOUSE: [
        'profile:read',
        'profile:update',
        'products:read',
        'products:update:stock',
        'orders:read:all',
        'orders:update:shipping',
        'orders:pack',
    ],
    SALES_MANAGER: [
        'profile:read',
        'profile:update',
        'products:read',
        'products:manage',
        'orders:read:all',
        'orders:confirm',
        'orders:update:status',
        'refund:approve',
        'reports:read',
        'users:read',
    ],
    ADMIN: [
        '*', // All permissions - Toàn quyền
    ],
};

/**
 * Check if user has required role
 * Kiểm tra xem user có thuộc danh sách Role cho phép không
 * @param  {...string} allowedRoles - Roles that are allowed
 * @returns {function} Express middleware
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }

        const userRole = req.user.role?.name;

        if (!userRole) {
            return next(new ApiError(403, 'User role not found'));
        }

        // Admin has access to everything
        if (userRole === 'ADMIN') {
            return next();
        }

        // Check if user's role is in the allowed roles
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        return next(new ApiError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`));
    };
};

/**
 * Check if user has at least the specified role level
 * Kiểm tra xem user có cấp độ quyền hạn tối thiểu yêu cầu không
 * @param {string} minRole - Minimum role required
 * @returns {function} Express middleware
 */
const requireRoleLevel = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }

        const userRole = req.user.role?.name;

        if (!userRole) {
            return next(new ApiError(403, 'User role not found'));
        }

        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

        if (userLevel >= requiredLevel) {
            return next();
        }

        return next(new ApiError(403, `Access denied. Minimum role required: ${minRole}`));
    };
};

/**
 * Check if user has specific permission
 * Kiểm tra quyền hạn cụ thể (Granular Permissions)
 * @param {string} permission - Required permission
 * @returns {function} Express middleware
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }

        const userRole = req.user.role?.name;

        if (!userRole) {
            return next(new ApiError(403, 'User role not found'));
        }

        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        // Check for wildcard permission (admin)
        if (userPermissions.includes('*')) {
            return next();
        }

        // Check for exact permission
        if (userPermissions.includes(permission)) {
            return next();
        }

        // Check for wildcard match (e.g., 'orders:*' matches 'orders:read')
        const permissionBase = permission.split(':')[0];
        if (userPermissions.includes(`${permissionBase}:*`)) {
            return next();
        }

        return next(new ApiError(403, `Access denied. Missing permission: ${permission}`));
    };
};

/**
 * Check if user owns the resource or has admin/manager role
 * Kiểm tra quyền sở hữu tài nguyên hoặc có quyền Admin/Manager
 * @param {function} getResourceOwnerId - Function to extract owner ID from request
 * @returns {function} Express middleware
 */
const requireOwnerOrRole = (getResourceOwnerId, ...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }

        const userRole = req.user.role?.name;

        // Admin or allowed roles can access any resource
        if (userRole === 'ADMIN' || allowedRoles.includes(userRole)) {
            return next();
        }

        try {
            // Get the owner ID of the resource
            const ownerId = await getResourceOwnerId(req);

            if (ownerId === req.user.id) {
                return next();
            }

            return next(new ApiError(403, 'Access denied. You can only access your own resources.'));
        } catch (error) {
            return next(error);
        }
    };
};

/**
 * Staff-only middleware (any staff role)
 */
const requireStaff = requireRole('SALES_STAFF', 'WAREHOUSE', 'SALES_MANAGER', 'ADMIN');

/**
 * Manager-only middleware
 */
const requireManager = requireRole('SALES_MANAGER', 'ADMIN');

/**
 * Admin-only middleware
 */
const requireAdmin = requireRole('ADMIN');

module.exports = {
    ROLE_HIERARCHY,
    ROLE_PERMISSIONS,
    requireRole,
    requireRoleLevel,
    requirePermission,
    requireOwnerOrRole,
    requireStaff,
    requireManager,
    requireAdmin,
};
