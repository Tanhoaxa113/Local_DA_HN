/**
 * Order Controller
 * Điều khiển các hoạt động liên quan đến đơn hàng
 */
const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');

/**
 * Create order from cart
 * Tạo đơn hàng
 *
 * Chức năng: Tạo một đơn hàng mới từ giỏ hàng hiện tại của người dùng.
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Lấy thông tin thanh toán (addressId, paymentMethod, note) từ `req.body`.
 * 3. Gọi `orderService.createFromCart` để xử lý logic tạo đơn (lấy item trong cart, tính tiền, tạo record Order...).
 * 4. Trả về thông tin đơn hàng vừa tạo.
 * Kích hoạt khi: Người dùng nhấn nút "Đặt hàng" ở trang thanh toán.
 * POST /api/orders
 */
const create = asyncHandler(async (req, res) => {
    const { addressId, paymentMethod, note } = req.body;

    const order = await orderService.createFromCart(req.user.id, {
        addressId: parseInt(addressId, 10),
        paymentMethod,
        note,
    });

    sendCreated(res, order, 'Order created successfully');
});

/**
 * Get my orders
 * Lấy đơn hàng của tôi
 *
 * Chức năng: Xem lịch sử mua hàng của người dùng đang đăng nhập.
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Gọi `orderService.getAll` với filter `userId`.
 * 3. Trả về danh sách đơn hàng.
 * Kích hoạt khi: Khách hàng vào trang "Đơn hàng của tôi".
 * GET /api/orders/my
 */
const getMyOrders = asyncHandler(async (req, res) => {
    const result = await orderService.getAll({
        ...req.query,
        userId: req.user.id,
    });

    sendSuccess(res, result, 'Orders retrieved successfully');
});

/**
 * Get all orders (staff)
 * Lấy tất cả đơn hàng (cho Nhân viên/Admin)
 *
 * Chức năng: Xem danh sách toàn bộ đơn hàng trong hệ thống.
 * Luồng xử lý:
 * 1. Nhận các tham số lọc từ query.
 * 2. Gọi `orderService.getAll` (không giới hạn userId).
 * 3. Trả về danh sách.
 * Kích hoạt khi: Nhân viên vào trang quản lý đơn hàng.
 * GET /api/orders
 */
const getAll = asyncHandler(async (req, res) => {
    const result = await orderService.getAll(req.query);

    sendSuccess(res, result, 'Orders retrieved successfully');
});

/**
 * Get order by ID
 * Lấy chi tiết đơn hàng
 *
 * Chức năng: Xem chi tiết một đơn hàng.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Kiểm tra quyền:
 *    - Nếu là Staff/Admin: Được xem mọi đơn.
 *    - Nếu là Customer: Chỉ được xem đơn của chính mình (truyền `userId` vào service để check).
 * 3. Gọi `orderService.getById`.
 * 4. Trả về chi tiết đơn hàng.
 * Kích hoạt khi: Người dùng bấm vào mã đơn hàng để xem chi tiết.
 * GET /api/orders/:id
 */
const getById = asyncHandler(async (req, res) => {
    const isStaff = ['SALES_STAFF', 'WAREHOUSE', 'SALES_MANAGER', 'ADMIN'].includes(req.user.role?.name);

    const order = await orderService.getById(
        parseInt(req.params.id, 10),
        isStaff ? null : req.user.id
    );

    sendSuccess(res, order, 'Order retrieved successfully');
});

/**
 * Get order by order number
 * Lấy đơn hàng theo mã đơn (Order Number)
 *
 * Chức năng: Tìm đơn hàng bằng mã code (VD: ORD123456) thay vì ID.
 * Luồng xử lý: Tương tự `getById` nhưng dùng `orderNumber`.
 * Kích hoạt khi: Tra cứu đơn hàng, hoặc quét mã vạch đơn hàng.
 * GET /api/orders/number/:orderNumber
 */
const getByOrderNumber = asyncHandler(async (req, res) => {
    const isStaff = ['SALES_STAFF', 'WAREHOUSE', 'SALES_MANAGER', 'ADMIN'].includes(req.user.role?.name);

    const order = await orderService.getByOrderNumber(
        req.params.orderNumber,
        isStaff ? null : req.user.id
    );

    sendSuccess(res, order, 'Order retrieved successfully');
});

/**
 * Update order status
 * Cập nhật trạng thái đơn (chung)
 *
 * Chức năng: Thay đổi trạng thái đơn hàng (Dành cho Staff/Admin).
 * Luồng xử lý:
 * 1. Lấy `id` đơn hàng.
 * 2. Lấy trạng thái mới từ body.
 * 3. Gọi `orderService.updateStatus` kèm role của người gọi để kiểm tra quyền hạn chuyển trạng thái.
 * Kích hoạt khi: Nhân viên xử lý đơn hàng (Xác nhận, Đóng gói...).
 * PATCH /api/orders/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;

    const order = await orderService.updateStatus(
        parseInt(req.params.id, 10),
        status,
        req.user.id,
        note || '',
        req.user.role?.name || 'CUSTOMER'
    );

    sendSuccess(res, order, 'Order status updated');
});

/**
 * Cancel order
 * Hủy đơn hàng
 *
 * Chức năng: Khách hàng hoặc nhân viên hủy đơn.
 * Luồng xử lý:
 * 1. Lấy `id` đơn hàng.
 * 2. Gọi `orderService.cancel`.
 *    - System sẽ check xem đơn hàng có đang ở trạng thái cho phép hủy không (VD: Chưa giao hàng).
 * 3. Cập nhật lý do hủy.
 * Kích hoạt khi: Khách hàng nhấn "Hủy đơn" trên web.
 * POST /api/orders/:id/cancel
 */
const cancel = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const order = await orderService.cancel(
        parseInt(req.params.id, 10),
        req.user.id,
        reason || '',
        req.user.role?.name || 'CUSTOMER'
    );

    sendSuccess(res, order, 'Order cancelled');
});

/**
 * Request refund
 * Yêu cầu hoàn tiền
 *
 * Chức năng: Khách hàng yêu cầu hoàn tiền cho đơn hàng đã thanh toán/nhận hàng.
 * Luồng xử lý:
 * 1. Lấy `id` đơn hàng.
 * 2. Gọi `orderService.requestRefund`.
 *    - Chuyển trạng thái sang "Yêu cầu hoàn tiền".
 * 3. Chờ Admin duyệt.
 * Kích hoạt khi: Khách hàng bấm "Yêu cầu hoàn tiền".
 * POST /api/orders/:id/refund
 */
const requestRefund = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const order = await orderService.requestRefund(
        parseInt(req.params.id, 10),
        req.user.id,
        reason || ''
    );

    sendSuccess(res, order, 'Refund requested');
});

/**
 * Get valid next statuses for order
 * Lấy các trạng thái tiếp theo hợp lệ
 *
 * Chức năng: Giúp Frontend hiển thị các nút thao tác đúng (VD: Đang ở "Chờ xác nhận" thì chỉ hiện nút "Xác nhận", không hiện nút "Giao hàng").
 * Luồng xử lý: Gọi `orderService.getNextStatuses` dựa trên trạng thái hiện tại và role người dùng.
 * Kích hoạt khi: Vào chi tiết đơn hàng.
 * GET /api/orders/:id/next-statuses
 */
const getNextStatuses = asyncHandler(async (req, res) => {
    const statuses = await orderService.getNextStatuses(
        parseInt(req.params.id, 10),
        req.user.role?.name || 'CUSTOMER'
    );

    sendSuccess(res, statuses, 'Valid next statuses retrieved');
});

/**
 * Confirm order received
 * Xác nhận đã nhận hàng
 *
 * Chức năng: Khách hàng xác nhận đã nhận được hàng (hoặc đã nhận tiền hoàn).
 * Luồng xử lý:
 * 1. Lấy `id` đơn hàng.
 * 2. Kiểm tra trạng thái hiện tại (Phải là 'DELIVERED' hoặc 'REFUNDED').
 * 3. Chuyển sang trạng thái cuối cùng ('COMPLETED' hoặc 'REFUND_CONFIRMED').
 * Kích hoạt khi: Khách hàng bấm "Đã nhận hàng".
 * POST /api/orders/:id/confirm
 */
const confirmOrder = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const order = await orderService.getById(orderId, req.user.id);

    let nextStatus;
    let note;

    if (order.status === 'DELIVERED') {
        nextStatus = 'COMPLETED';
        note = 'Khách hàng xác nhận đã nhận được hàng';
    } else if (order.status === 'REFUNDED') {
        nextStatus = 'REFUND_CONFIRMED';
        note = 'Khách hàng xác nhận đã nhận được tiền hoàn';
    } else {
        throw new ApiError(400, 'Không thể xác nhận ở trạng thái này');
    }

    const updatedOrder = await orderService.updateStatus(
        orderId,
        nextStatus,
        req.user.id,
        note,
        'CUSTOMER'
    );

    sendSuccess(res, updatedOrder, 'Order confirmed');
});

module.exports = {
    create,
    getMyOrders,
    getAll,
    getById,
    getByOrderNumber,
    updateStatus,
    cancel,
    requestRefund,
    getNextStatuses,
    confirmOrder,
};
