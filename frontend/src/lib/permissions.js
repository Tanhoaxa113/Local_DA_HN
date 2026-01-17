/**
 * Role-Based Access Control (RBAC) Permissions
 * Centralizes all permission checks for admin panel
 */

// Role names from database
export const ROLES = {
    ADMIN: "ADMIN",
    SALES_MANAGER: "SALES_MANAGER",
    SALES_STAFF: "SALES_STAFF",
    WAREHOUSE: "WAREHOUSE",
    CUSTOMER: "CUSTOMER",
};

// Pages that each role can access
export const PAGE_ACCESS = {
    [ROLES.ADMIN]: [
        "dashboard",
        "products",
        "orders",
        "categories",
        "brands",
        "users",
    ],
    [ROLES.SALES_MANAGER]: [
        "dashboard",
        "products",
        "orders",
        "categories",
        "brands",
        "users",
    ],
    [ROLES.SALES_STAFF]: [
        "dashboard",
        "orders",
        "users",
    ],
    [ROLES.WAREHOUSE]: [
        "dashboard",
        "orders",
        "products",
    ],
};

// Actions that each role can perform
export const ACTIONS = {
    // Product actions
    PRODUCT_CREATE: "product:create",
    PRODUCT_EDIT: "product:edit",
    PRODUCT_DELETE: "product:delete",

    // Category actions
    CATEGORY_CREATE: "category:create",
    CATEGORY_EDIT: "category:edit",
    CATEGORY_DELETE: "category:delete",

    // Brand actions
    BRAND_CREATE: "brand:create",
    BRAND_EDIT: "brand:edit",
    BRAND_DELETE: "brand:delete",

    // User actions
    USER_CREATE: "user:create",
    USER_EDIT: "user:edit",
    USER_DELETE: "user:delete",



    // Order status actions
    ORDER_CONFIRM: "order:confirm", // PENDING_CONFIRMATION → PREPARING
    ORDER_READY_SHIP: "order:ready_ship", // PREPARING → READY_TO_SHIP
    ORDER_START_SHIPPING: "order:start_shipping", // READY_TO_SHIP → IN_TRANSIT
    ORDER_OUT_DELIVERY: "order:out_delivery", // IN_TRANSIT → OUT_FOR_DELIVERY
    ORDER_DELIVERED: "order:delivered", // OUT_FOR_DELIVERY → DELIVERED
    ORDER_CANCEL: "order:cancel",
    ORDER_REFUND_APPROVE: "order:refund_approve", // REFUND_REQUESTED → REFUNDING
    ORDER_REFUND_PAID: "order:refund_paid",       // REFUNDING → REFUNDED
    PAYMENT_CONFIRM_COD: "payment:confirm_cod",   // Confirm COD payment
};

// Action permissions by role
export const ACTION_PERMISSIONS = {
    [ROLES.ADMIN]: Object.values(ACTIONS), // All actions

    [ROLES.SALES_MANAGER]: [
        // Can only cancel and approve refunds from order detail page
        ACTIONS.ORDER_CANCEL,
        ACTIONS.ORDER_REFUND_APPROVE,
        ACTIONS.ORDER_REFUND_PAID,
    ],

    [ROLES.SALES_STAFF]: [
        // Only confirm orders
        ACTIONS.ORDER_CONFIRM,
    ],

    [ROLES.WAREHOUSE]: [
        // Only shipping-related status changes
        ACTIONS.ORDER_READY_SHIP,
        ACTIONS.ORDER_START_SHIPPING,
        ACTIONS.ORDER_OUT_DELIVERY,
        ACTIONS.ORDER_OUT_DELIVERY,
        ACTIONS.ORDER_DELIVERED,
        ACTIONS.PAYMENT_CONFIRM_COD,
    ],
};

// Order status to action mapping
export const STATUS_TO_ACTION = {
    PENDING_CONFIRMATION: ACTIONS.ORDER_CONFIRM,
    PREPARING: ACTIONS.ORDER_READY_SHIP,
    READY_TO_SHIP: ACTIONS.ORDER_START_SHIPPING,
    IN_TRANSIT: ACTIONS.ORDER_OUT_DELIVERY,
    OUT_FOR_DELIVERY: ACTIONS.ORDER_DELIVERED,
    REFUND_REQUESTED: ACTIONS.ORDER_REFUND_APPROVE,
    REFUNDING: ACTIONS.ORDER_REFUND_PAID,
};

/**
 * Check if a role can access a specific page
 * @param {string} role - User role name
 * @param {string} page - Page identifier (dashboard, products, orders, etc.)
 * @returns {boolean}
 */
export function hasPageAccess(role, page) {
    if (!role || !page) return false;
    const pages = PAGE_ACCESS[role];
    return pages ? pages.includes(page) : false;
}

/**
 * Check if a role can perform a specific action
 * @param {string} role - User role name
 * @param {string} action - Action identifier from ACTIONS
 * @returns {boolean}
 */
export function canPerformAction(role, action) {
    if (!role || !action) return false;
    const actions = ACTION_PERMISSIONS[role];
    return actions ? actions.includes(action) : false;
}

/**
 * Check if a role can transition order to a specific status
 * @param {string} role - User role name
 * @param {string} currentStatus - Current order status
 * @param {string} targetStatus - Target order status
 * @returns {boolean}
 */
export function canTransitionOrderStatus(role, currentStatus, targetStatus) {
    if (!role) return false;

    // Map target status to required action
    // This maps what action is required to SET the order to targetStatus
    const statusActionMap = {
        PREPARING: ACTIONS.ORDER_CONFIRM,           // Confirm order (from PENDING_CONFIRMATION)
        READY_TO_SHIP: ACTIONS.ORDER_READY_SHIP,    // Mark ready to ship (from PREPARING)
        IN_TRANSIT: ACTIONS.ORDER_START_SHIPPING,   // Start shipping (from READY_TO_SHIP)
        OUT_FOR_DELIVERY: ACTIONS.ORDER_OUT_DELIVERY, // Out for delivery (from IN_TRANSIT)
        DELIVERED: ACTIONS.ORDER_DELIVERED,         // Mark delivered (from OUT_FOR_DELIVERY)
        CANCELLED: ACTIONS.ORDER_CANCEL,
        REFUNDING: ACTIONS.ORDER_REFUND_APPROVE,
        REFUNDED: ACTIONS.ORDER_REFUND_PAID,
    };

    const requiredAction = statusActionMap[targetStatus];
    if (!requiredAction) return false;

    return canPerformAction(role, requiredAction);
}

/**
 * Filter status options based on role permissions
 * @param {string} role - User role name
 * @param {Array} statusOptions - Array of {value, label} status options
 * @returns {Array} - Filtered status options
 */
export function filterStatusOptionsByRole(role, statusOptions) {
    if (!role || !statusOptions) return [];

    return statusOptions.filter((option) => {
        return canTransitionOrderStatus(role, null, option.value);
    });
}

/**
 * Get navigation items filtered by role
 * @param {string} role - User role name
 * @param {Array} navItems - Array of nav items with href
 * @returns {Array} - Filtered nav items
 */
export function getNavItemsByRole(role, navItems) {
    if (!role || !navItems) return [];

    const pageMap = {
        "/admin": "dashboard",
        "/admin/products": "products",
        "/admin/orders": "orders",
        "/admin/categories": "categories",
        "/admin/brands": "brands",
        "/admin/users": "users",

    };

    return navItems.filter((item) => {
        const page = pageMap[item.href];
        return page ? hasPageAccess(role, page) : true;
    });
}

/**
 * Check if role is admin-level (has access to admin panel)
 * @param {string} role - User role name
 * @returns {boolean}
 */
export function isAdminRole(role) {
    const adminRoles = [ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_STAFF, ROLES.WAREHOUSE];
    return adminRoles.includes(role);
}

/**
 * Check if role has read-only access to a page
 * @param {string} role - User role name
 * @param {string} page - Page identifier
 * @returns {boolean}
 */
export function isReadOnlyAccess(role, page) {
    if (role === ROLES.ADMIN) return false;

    const readOnlyMap = {
        [ROLES.SALES_STAFF]: ["users"],
    };

    const readOnlyPages = readOnlyMap[role] || [];
    return readOnlyPages.includes(page);
}
