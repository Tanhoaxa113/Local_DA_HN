/**
 * Order State Machine
 * Defines valid order status transitions and business rules
 * Máy trạng thái đơn hàng: Định nghĩa các trạng thái và quy tắc chuyển đổi
 */
const ApiError = require('./ApiError');

/**
 * Order status enum (matches Prisma OrderStatus)
 * Danh sách trạng thái đơn hàng (Khớp với Prisma Enum)
 */
const OrderStatus = {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PROCESSING_FAILED: 'PROCESSING_FAILED',
    PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
    PREPARING: 'PREPARING',
    READY_TO_SHIP: 'READY_TO_SHIP',
    IN_TRANSIT: 'IN_TRANSIT',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERY_FAILED: 'DELIVERY_FAILED',
    RETURNED_TO_WAREHOUSE: 'RETURNED_TO_WAREHOUSE',
    DELIVERED: 'DELIVERED',
    REFUND_REQUESTED: 'REFUND_REQUESTED',
    REFUNDING: 'REFUNDING',
    REFUNDED: 'REFUNDED',
    REFUND_CONFIRMED: 'REFUND_CONFIRMED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};

/**
 * Valid state transitions
 * Key: Current status (Trạng thái hiện tại)
 * Value: Array of valid next statuses (Các trạng thái tiếp theo hợp lệ)
 * Logic này ngăn chặn chuyển trạng thái sai quy trình (VD: Từ Chờ thanh toán -> Đã giao hàng ngay lập tức)
 */
const TRANSITIONS = {
    [OrderStatus.PENDING_PAYMENT]: [
        OrderStatus.PENDING_CONFIRMATION, // Payment successful or COD
        OrderStatus.PROCESSING_FAILED,    // Payment timeout or error
        OrderStatus.CANCELLED,            // User cancelled
    ],
    [OrderStatus.PROCESSING_FAILED]: [], // Terminal state
    [OrderStatus.PENDING_CONFIRMATION]: [
        OrderStatus.PREPARING,            // Order confirmed by staff
        OrderStatus.CANCELLED,            // Cancelled before preparation
    ],
    [OrderStatus.PREPARING]: [
        OrderStatus.READY_TO_SHIP,        // Packing complete
        OrderStatus.CANCELLED,            // Cancelled during preparation (rare)
    ],
    [OrderStatus.READY_TO_SHIP]: [
        OrderStatus.IN_TRANSIT,           // Handed to courier
    ],
    [OrderStatus.IN_TRANSIT]: [
        OrderStatus.OUT_FOR_DELIVERY,     // Out for delivery
        OrderStatus.DELIVERY_FAILED,      // Delivery attempt failed
    ],
    [OrderStatus.OUT_FOR_DELIVERY]: [
        OrderStatus.DELIVERED,            // Successfully delivered
        OrderStatus.DELIVERY_FAILED,      // Failed to deliver
    ],
    [OrderStatus.DELIVERY_FAILED]: [
        OrderStatus.IN_TRANSIT,           // Retry delivery
        OrderStatus.RETURNED_TO_WAREHOUSE, // Return to warehouse
    ],
    [OrderStatus.RETURNED_TO_WAREHOUSE]: [
        OrderStatus.PREPARING,            // Reship order
        OrderStatus.CANCELLED,            // Cancel and refund
    ],
    [OrderStatus.DELIVERED]: [
        OrderStatus.REFUND_REQUESTED,     // Customer requests refund
        OrderStatus.COMPLETED,            // Auto-complete after X days
    ],
    [OrderStatus.REFUND_REQUESTED]: [
        OrderStatus.REFUNDING,            // Refund approved
        OrderStatus.DELIVERED,            // Refund rejected, revert to delivered
    ],
    [OrderStatus.REFUNDING]: [
        OrderStatus.REFUNDED,             // Refund processed
    ],
    [OrderStatus.REFUNDED]: [
        OrderStatus.REFUND_CONFIRMED,     // Notification confirmed by customer
    ],
    [OrderStatus.REFUND_CONFIRMED]: [],   // Terminal state
    [OrderStatus.COMPLETED]: [],          // Terminal state
    [OrderStatus.CANCELLED]: [],          // Terminal state
};

/**
 * Status labels in Vietnamese
 * Nhãn hiển thị tiếng Việt
 */
const STATUS_LABELS = {
    [OrderStatus.PENDING_PAYMENT]: 'Chờ thanh toán',
    [OrderStatus.PROCESSING_FAILED]: 'Xử lý thất bại',
    [OrderStatus.PENDING_CONFIRMATION]: 'Chờ xác nhận',
    [OrderStatus.PREPARING]: 'Đang chuẩn bị',
    [OrderStatus.READY_TO_SHIP]: 'Sẵn sàng giao',
    [OrderStatus.IN_TRANSIT]: 'Đang vận chuyển',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Đang giao hàng',
    [OrderStatus.DELIVERY_FAILED]: 'Giao hàng thất bại',
    [OrderStatus.RETURNED_TO_WAREHOUSE]: 'Đã hoàn kho',
    [OrderStatus.DELIVERED]: 'Đã giao hàng',
    [OrderStatus.REFUND_REQUESTED]: 'Yêu cầu hoàn tiền',
    [OrderStatus.REFUNDING]: 'Đang hoàn tiền',
    [OrderStatus.REFUNDED]: 'Đã hoàn tiền',
    [OrderStatus.REFUND_CONFIRMED]: 'Đã nhận tiền hoàn',
    [OrderStatus.COMPLETED]: 'Hoàn thành',
    [OrderStatus.CANCELLED]: 'Đã hủy',
};

/**
 * Status colors for UI
 * Màu sắc hiển thị (UI)
 */
const STATUS_COLORS = {
    [OrderStatus.PENDING_PAYMENT]: 'yellow',
    [OrderStatus.PROCESSING_FAILED]: 'red',
    [OrderStatus.PENDING_CONFIRMATION]: 'blue',
    [OrderStatus.PREPARING]: 'indigo',
    [OrderStatus.READY_TO_SHIP]: 'purple',
    [OrderStatus.IN_TRANSIT]: 'cyan',
    [OrderStatus.OUT_FOR_DELIVERY]: 'teal',
    [OrderStatus.DELIVERY_FAILED]: 'orange',
    [OrderStatus.RETURNED_TO_WAREHOUSE]: 'gray',
    [OrderStatus.DELIVERED]: 'green',
    [OrderStatus.REFUND_REQUESTED]: 'pink',
    [OrderStatus.REFUNDING]: 'amber',
    [OrderStatus.REFUNDED]: 'slate',
    [OrderStatus.REFUND_CONFIRMED]: 'emerald',
    [OrderStatus.COMPLETED]: 'emerald',
    [OrderStatus.CANCELLED]: 'red',
};

/**
 * Roles allowed to set each status
 * Quyền hạn được phép chuyển sang trạng thái này
 */
const STATUS_PERMISSIONS = {
    [OrderStatus.PENDING_PAYMENT]: ['SYSTEM'],
    [OrderStatus.PROCESSING_FAILED]: ['SYSTEM'],
    [OrderStatus.PENDING_CONFIRMATION]: ['SYSTEM', 'ADMIN'],
    [OrderStatus.PREPARING]: ['SALES_STAFF', 'SALES_MANAGER', 'ADMIN'],
    [OrderStatus.READY_TO_SHIP]: ['WAREHOUSE', 'ADMIN'],
    [OrderStatus.IN_TRANSIT]: ['WAREHOUSE', 'ADMIN'],
    [OrderStatus.OUT_FOR_DELIVERY]: ['WAREHOUSE', 'ADMIN'],
    [OrderStatus.DELIVERY_FAILED]: ['WAREHOUSE', 'ADMIN'],
    [OrderStatus.RETURNED_TO_WAREHOUSE]: ['WAREHOUSE', 'ADMIN'],
    [OrderStatus.DELIVERED]: ['WAREHOUSE', 'ADMIN'],
    [OrderStatus.REFUND_REQUESTED]: ['CUSTOMER', 'ADMIN'],
    [OrderStatus.REFUNDING]: ['SALES_MANAGER', 'ADMIN'],
    [OrderStatus.REFUNDED]: ['SALES_MANAGER', 'ADMIN'],
    [OrderStatus.REFUND_CONFIRMED]: ['CUSTOMER', 'SYSTEM'],
    [OrderStatus.COMPLETED]: ['SYSTEM', 'CUSTOMER'],
    [OrderStatus.CANCELLED]: ['CUSTOMER', 'SALES_STAFF', 'SALES_MANAGER', 'ADMIN'],
};

/**
 * Check if a status transition is valid
 * Kiểm tra xem chuyển đổi trạng thái có hợp lệ không
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} Whether transition is valid
 */
const isValidTransition = (fromStatus, toStatus) => {
    const allowedTransitions = TRANSITIONS[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
};

/**
 * Validate status transition and throw if invalid
 * Thực hiện kiểm tra logic chuyển đổi trạng thái, nếu không hợp lệ sẽ ném lỗi (Exception).
 * 
 * Luồng kiểm tra:
 * 1. Kiểm tra tính hợp lệ của luồng trạng thái (State Flow):
 *    - Dựa vào map `TRANSITIONS`.
 *    - Ví dụ: Không thể chuyển từ 'PENDING_PAYMENT' sang 'DELIVERED'.
 *    - Nếu sai luồng -> Ném lỗi 400 Bad Request.
 * 
 * 2. Kiểm tra quyền hạn (Role Permission) - Nếu có truyền tham số role:
 *    - Dựa vào map `STATUS_PERMISSIONS`.
 *    - Ví dụ: 'CUSTOMER' không thể chuyển trạng thái sang 'DELIVERED'.
 *    - Nếu sai quyền -> Ném lỗi 403 Forbidden.
 * 
 * @param {string} fromStatus - Trạng thái hiện tại
 * @param {string} toStatus - Trạng thái muốn chuyển tới
 * @param {string} role - Vai trò của người thực hiện (Admin, Customer, etc.)
 */
const validateTransition = (fromStatus, toStatus, role = null) => {
    if (!isValidTransition(fromStatus, toStatus)) {
        throw new ApiError(400,
            `Invalid status transition from '${STATUS_LABELS[fromStatus]}' to '${STATUS_LABELS[toStatus]}'`
        );
    }

    if (role) {
        const allowedRoles = STATUS_PERMISSIONS[toStatus] || [];
        if (!allowedRoles.includes(role) && !allowedRoles.includes('SYSTEM')) {
            throw new ApiError(403,
                `Role '${role}' is not allowed to set status to '${STATUS_LABELS[toStatus]}'`
            );
        }
    }
};

/**
 * Get valid next statuses for a given status
 * Lấy danh sách các trạng thái tiếp theo hợp lệ (để hiển thị nút bấm)
 * @param {string} currentStatus - Current order status
 * @param {string} role - User role (optional, filters by permission)
 * @returns {object[]} Array of valid next statuses with labels
 */
const getValidNextStatuses = (currentStatus, role = null) => {
    const transitions = TRANSITIONS[currentStatus] || [];

    return transitions
        .filter((status) => {
            if (!role) return true;
            const allowedRoles = STATUS_PERMISSIONS[status] || [];
            return allowedRoles.includes(role) || allowedRoles.includes('SYSTEM');
        })
        .map((status) => ({
            value: status,
            label: STATUS_LABELS[status],
            color: STATUS_COLORS[status],
        }));
};

/**
 * Check if order is in a terminal state
 * Kiểm tra xem đơn hàng đã kết thúc chưa (Không thể thay đổi được nữa)
 * @param {string} status - Order status
 * @returns {boolean} Whether status is terminal
 */
const isTerminalStatus = (status) => {
    const transitions = TRANSITIONS[status] || [];
    return transitions.length === 0;
};

/**
 * Check if order can be cancelled
 * Kiểm tra xem đơn hàng có thể hủy không?
 * Quy tắc: Đơn hàng chỉ có thể hủy khi chưa đi vào quy trình vận chuyển (ví dụ: chưa giao cho shipper).
 * Các trạng thái được phép hủy thường là: Chờ thanh toán, Chờ xác nhận, Đang chuẩn bị.
 * 
 * @param {string} status - Order status
 * @returns {boolean} Whether order can be cancelled
 */
const isCancellable = (status) => {
    const transitions = TRANSITIONS[status] || [];
    return transitions.includes(OrderStatus.CANCELLED);
};

/**
 * Check if stock should be released for a status
 * Kiểm tra xem có nên HOÀN lại tồn kho (Release Stock Lock hoặc +Stock) không?
 * Trigger: Khi đơn hàng bị Hủy (CANCELLED) hoặc Xử lý thanh toán thất bại (PROCESSING_FAILED).
 * Mục đích: Đảm bảo số lượng hàng tồn được nhả ra để người khác có thể mua.
 * 
 * @param {string} status - Order status
 * @returns {boolean} Whether stock should be released
 */
const shouldReleaseStock = (status) => {
    return [
        OrderStatus.PROCESSING_FAILED,
        OrderStatus.CANCELLED,
    ].includes(status);
};

/**
 * Check if physical stock should be deducted for a status
 * Kiểm tra xem có nên trừ tồn kho thực tế không (Khi đang chuẩn bị hàng)
 * @param {string} status - Order status
 * @returns {boolean} Whether physical stock should be deducted
 */
const shouldConfirmStock = (status) => {
    return status === OrderStatus.PREPARING;
};

/**
 * Check if stock should be returned to warehouse
 * Kiểm tra xem có nên nhập lại kho không (Khi hoàn kho)
 * @param {string} status - Order status
 * @returns {boolean} Whether stock should be returned
 */
const shouldReturnStock = (status) => {
    return status === OrderStatus.RETURNED_TO_WAREHOUSE;
};

/**
 * Check if loyalty points should be awarded
 * Kiểm tra xem có nên cộng điểm thưởng không (Khi Hoàn thành)
 * @param {string} status - Order status
 * @returns {boolean} Whether points should be awarded
 */
const shouldAwardPoints = (status) => {
    return status === OrderStatus.COMPLETED;
};

module.exports = {
    OrderStatus,
    TRANSITIONS,
    STATUS_LABELS,
    STATUS_COLORS,
    STATUS_PERMISSIONS,
    isValidTransition,
    validateTransition,
    getValidNextStatuses,
    isTerminalStatus,
    isCancellable,
    shouldReleaseStock,
    shouldConfirmStock,
    shouldReturnStock,
    shouldAwardPoints,
};
