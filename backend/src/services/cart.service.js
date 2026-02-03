/**
 * Cart Service
 * Handles shopping cart operations
 * Xử lý các nghiệp vụ giỏ hàng
 */
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get or create cart for user
 * Lấy hoặc tạo giỏ hàng cho user
 *
 * Chức năng: Tìm giỏ hàng hiện tại của user, nếu chưa có thì tạo mới.
 * Luồng xử lý:
 * 1. Query DB tìm Cart theo userId.
 * 2. Include các bảng liên quan: CartItem -> Variant -> Product -> Image.
 * 3. Nếu không tìm thấy, tạo Cart mới rỗng.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object>} Đối tượng Cart.
 */
const getOrCreateCart = async (userId) => {
    let cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: {
                    variant: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        orderBy: [
                                            { isPrimary: 'desc' },
                                            { sortOrder: 'asc' }
                                        ],
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!cart) {
        cart = await prisma.cart.create({
            data: { userId },
            include: {
                items: [],
            },
        });
    }

    return cart;
};

/**
 * Get cart with calculated totals
 * Lấy giỏ hàng chi tiết
 *
 * Chức năng: Lấy thông tin giỏ hàng và tính toán tổng tiền tạm tính.
 * Luồng xử lý:
 * 1. Gọi `getOrCreateCart`.
 * 2. Duyệt qua từng item để:
 *    - Tính thành tiền (price * quantity).
 *    - Gom thông tin hiển thị (tên, hình ảnh, size, màu).
 *    - Kiểm tra tính sẵn sàng (có active k, còn hàng k).
 * 3. Cộng dồn Subtotal và ItemCount.
 * 4. Trả về cấu trúc dữ liệu chuẩn cho Frontend.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object>} Cart kèm tổng tiền và danh sách item chi tiết.
 */
const getCart = async (userId) => {
    const cart = await getOrCreateCart(userId);

    // Calculate totals
    let subtotal = 0;
    let itemCount = 0;
    const items = cart.items.map((item) => {
        const lineTotal = Number(item.variant.price) * item.quantity;
        subtotal += lineTotal;
        itemCount += item.quantity;

        return {
            id: item.id,
            quantity: item.quantity,
            variant: {
                id: item.variant.id,
                sku: item.variant.sku,
                size: item.variant.size,
                color: item.variant.color,
                colorCode: item.variant.colorCode,
                price: item.variant.price,
                compareAtPrice: item.variant.compareAtPrice,
                availableStock: item.variant.availableStock,
                isActive: item.variant.isActive,
            },
            product: {
                id: item.variant.product.id,
                name: item.variant.product.name,
                slug: item.variant.product.slug,
                image: item.variant.product.images[0]?.url || null,
            },
            lineTotal,
            isAvailable: item.variant.isActive && item.variant.availableStock >= item.quantity,
        };
    });

    return {
        id: cart.id,
        items,
        itemCount,
        subtotal,
    };
};

/**
 * Add item to cart
 * Thêm sản phẩm vào giỏ
 *
 * Chức năng: Thêm một sản phẩm (biến thể) vào giỏ hàng.
 * Luồng xử lý:
 * 1. Validate Variant: Có tồn tại và còn Active không?
 * 2. Check Stock: Số lượng còn trong kho có đủ không?
 * 3. Lấy Cart của user.
 * 4. Kiểm tra xem Variant này đã có trong Cart chưa:
 *    - Nếu có: Cộng dồn số lượng.
 *    - Nếu chưa: Tạo CartItem mới.
 * 5. Trả về Cart mới nhất.
 * @param {number} userId - ID người dùng.
 * @param {number} variantId - ID biến thể sản phẩm.
 * @param {number} quantity - Số lượng thêm.
 * @returns {Promise<object>} Cart sau khi update.
 */
const addItem = async (userId, variantId, quantity = 1) => {
    // Validate variant exists and is active
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
    });

    if (!variant) {
        throw new ApiError(404, 'Product variant not found');
    }

    if (!variant.isActive || !variant.product.isActive) {
        throw new ApiError(400, 'Product is not available');
    }

    if (variant.availableStock < quantity) {
        throw new ApiError(400, `Insufficient stock. Available: ${variant.availableStock}`);
    }

    // Get or create cart
    const cart = await getOrCreateCart(userId);

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findUnique({
        where: {
            cartId_variantId: {
                cartId: cart.id,
                variantId,
            },
        },
    });

    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        if (variant.availableStock < newQuantity) {
            throw new ApiError(400, `Cannot add more. Maximum available: ${variant.availableStock}`);
        }

        await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQuantity },
        });
    } else {
        await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                variantId,
                quantity,
            },
        });
    }

    return getCart(userId);
};

/**
 * Update cart item quantity
 * Cập nhật số lượng item
 *
 * Chức năng: Thay đổi số lượng mua của một sản phẩm trong giỏ.
 * Luồng xử lý:
 * 1. Tìm CartItem trong giỏ của user.
 * 2. Nếu quantity <= 0 -> Xóa item.
 * 3. Nếu quantity > 0:
 *    - Check Stock.
 *    - Update quantity mới.
 * 4. Trả về Cart mới nhất.
 * @param {number} userId - ID người dùng.
 * @param {number} itemId - ID item trong giỏ.
 * @param {number} quantity - Số lượng mới.
 * @returns {Promise<object>} Cart sau khi update.
 */
const updateItem = async (userId, itemId, quantity) => {
    const cart = await getOrCreateCart(userId);

    const item = await prisma.cartItem.findFirst({
        where: {
            id: itemId,
            cartId: cart.id,
        },
        include: { variant: true },
    });

    if (!item) {
        throw new ApiError(404, 'Cart item not found');
    }

    if (quantity <= 0) {
        // Remove item
        await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
        // Check stock
        if (item.variant.availableStock < quantity) {
            throw new ApiError(400, `Insufficient stock. Available: ${item.variant.availableStock}`);
        }

        await prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
        });
    }

    return getCart(userId);
};

/**
 * Remove item from cart
 * Xóa sản phẩm khỏi giỏ
 *
 * Chức năng: Xóa một sản phẩm ra khỏi giỏ hàng.
 * @param {number} userId - ID người dùng.
 * @param {number} itemId - ID item trong giỏ.
 * @returns {Promise<object>} Cart sau khi xóa.
 */
const removeItem = async (userId, itemId) => {
    const cart = await getOrCreateCart(userId);

    const item = await prisma.cartItem.findFirst({
        where: {
            id: itemId,
            cartId: cart.id,
        },
    });

    if (!item) {
        throw new ApiError(404, 'Cart item not found');
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    return getCart(userId);
};

/**
 * Clear all items from cart
 * Xóa sạch giỏ hàng
 *
 * Chức năng: Empty giỏ hàng (thường dùng sau khi đặt hàng thành công).
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object>} Cart rỗng.
 */
const clearCart = async (userId) => {
    const cart = await getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
    });

    return getCart(userId);
};

/**
 * Validate cart items for checkout
 * Kiểm tra giỏ hàng trước khi thanh toán
 *
 * Chức năng: Đảm bảo mọi sản phẩm trong giỏ đều còn hàng và còn bán.
 * Luồng xử lý:
 * 1. Duyệt qua từng item trong giỏ.
 * 2. Check Active và Stock.
 * 3. Nếu có lỗi (hết hàng, ngừng bán) -> Đẩy vào mảng `issues`.
 * 4. Trả về kết quả `valid: true/false` và danh sách lỗi nếu có.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object>} Kết quả validation.
 */
const validateForCheckout = async (userId) => {
    const cart = await getCart(userId);

    if (cart.items.length === 0) {
        throw new ApiError(400, 'Cart is empty');
    }

    const issues = [];

    for (const item of cart.items) {
        if (!item.isAvailable) {
            if (!item.variant.isActive) {
                issues.push({
                    itemId: item.id,
                    variantId: item.variant.id,
                    issue: 'Product is no longer available',
                });
            } else if (item.variant.availableStock < item.quantity) {
                issues.push({
                    itemId: item.id,
                    variantId: item.variant.id,
                    issue: `Insufficient stock. Available: ${item.variant.availableStock}`,
                    availableStock: item.variant.availableStock,
                });
            }
        }
    }

    return {
        valid: issues.length === 0,
        cart,
        issues,
    };
};

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    validateForCheckout,
    getOrCreateCart,
};
