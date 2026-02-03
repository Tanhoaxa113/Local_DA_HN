/**
 * Cart Controller
 * Điều khiển các hoạt động liên quan đến Giỏ hàng
 */
const cartService = require('../services/cart.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');

/**
 * Get current user's cart
 * Lấy giỏ hàng của người dùng hiện tại
 *
 * Chức năng: Xem danh sách sản phẩm đang có trong giỏ hàng.
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Gọi `cartService.getCart` để tìm giỏ hàng (nếu chưa có thì tạo mới).
 * 3. Trả về thông tin giỏ hàng và danh sách items.
 * Kích hoạt khi: Người dùng vào trang "Giỏ hàng" hoặc hiển thị icon giỏ hàng trên header.
 * GET /api/cart
 */
const getCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCart(req.user.id);

    sendSuccess(res, cart, 'Cart retrieved successfully');
});

/**
 * Add item to cart
 * Thêm sản phẩm vào giỏ hàng
 *
 * Chức năng: Thêm một sản phẩm (variant) vào giỏ.
 * Luồng xử lý:
 * 1. Lấy userId.
 * 2. Nhận `variantId` và `quantity` từ body.
 * 3. Gọi `cartService.addItem`:
 *    - Kiểm tra tồn kho.
 *    - Nếu item đã có trong giỏ -> Cộng dồn số lượng.
 *    - Nếu chưa có -> Tạo mới item trong giỏ.
 * 4. Trả về giỏ hàng đã cập nhật.
 * Kích hoạt khi: Người dùng bấm "Thêm vào giỏ" ở trang sản phẩm.
 * POST /api/cart/items
 */
const addItem = asyncHandler(async (req, res) => {
    const { variantId, quantity } = req.body;

    const cart = await cartService.addItem(
        req.user.id,
        parseInt(variantId, 10),
        quantity ? parseInt(quantity, 10) : 1
    );

    sendCreated(res, cart, 'Item added to cart');
});

/**
 * Update cart item quantity
 * Cập nhật số lượng sản phẩm trong giỏ
 *
 * Chức năng: Tăng hoặc giảm số lượng của một item trong giỏ.
 * Luồng xử lý:
 * 1. Lấy `itemId` (ID của dòng trong bảng CartItem) từ URL.
 * 2. Lấy số lượng mới `quantity` từ body.
 * 3. Gọi `cartService.updateItem`.
 * 4. Trả về giỏ hàng mới.
 * Kích hoạt khi: Người dùng thay đổi số lượng ở trang giỏ hàng.
 * PUT /api/cart/items/:itemId
 */
const updateItem = asyncHandler(async (req, res) => {
    const { quantity } = req.body;

    const cart = await cartService.updateItem(
        req.user.id,
        parseInt(req.params.itemId, 10),
        parseInt(quantity, 10)
    );

    sendSuccess(res, cart, 'Cart item updated');
});

/**
 * Remove item from cart
 * Xóa sản phẩm khỏi giỏ
 *
 * Chức năng: Xóa hẳn một item ra khỏi giỏ hàng.
 * Luồng xử lý:
 * 1. Lấy `itemId` từ URL.
 * 2. Gọi `cartService.removeItem`.
 * 3. Trả về giỏ hàng mới.
 * Kích hoạt khi: Người dùng bấm nút "Xóa" cạnh sản phẩm trong giỏ.
 * DELETE /api/cart/items/:itemId
 */
const removeItem = asyncHandler(async (req, res) => {
    const cart = await cartService.removeItem(
        req.user.id,
        parseInt(req.params.itemId, 10)
    );

    sendSuccess(res, cart, 'Item removed from cart');
});

/**
 * Clear cart
 * Làm trống giỏ hàng
 *
 * Chức năng: Xóa toàn bộ sản phẩm trong giỏ.
 * Luồng xử lý: Gọi `cartService.clearCart`.
 * Kích hoạt khi: Người dùng bấm "Xóa tất cả" hoặc sau khi đặt hàng thành công (thường logic đặt hàng sẽ tự xóa).
 * DELETE /api/cart
 */
const clearCart = asyncHandler(async (req, res) => {
    const cart = await cartService.clearCart(req.user.id);

    sendSuccess(res, cart, 'Cart cleared');
});

/**
 * Validate cart for checkout
 * Kiểm tra giỏ hàng trước khi thanh toán
 *
 * Chức năng: Kiểm tra xem các sản phẩm trong giỏ còn hàng không, có bị thay đổi giá không.
 * Luồng xử lý:
 * 1. Duyệt qua từng item trong giỏ.
 * 2. So sánh với tồn kho và giá hiện tại trong DB.
 * 3. Trả về kết quả (valid: true/false) và danh sách lỗi nếu có.
 * Kích hoạt khi: Người dùng nhấn nút "Thanh toán" ở trang giỏ hàng.
 * GET /api/cart/validate
 */
const validateForCheckout = asyncHandler(async (req, res) => {
    const result = await cartService.validateForCheckout(req.user.id);

    sendSuccess(res, result, result.valid ? 'Cart is valid for checkout' : 'Cart has issues');
});

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    validateForCheckout,
};
