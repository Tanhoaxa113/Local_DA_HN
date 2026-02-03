/**
 * Product Controller
 * Điều khiển các hoạt động liên quan đến sản phẩm
 */
const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { getFileUrl } = require('../config/multer');

/**
 * Create a new product
 * Tạo sản phẩm mới
 *
 * Chức năng: Tạo một sản phẩm mới (thường dùng cho API public hoặc mobile app nếu có tính năng đăng bán).
 * Luồng xử lý:
 * 1. Nhận thông tin sản phẩm từ `req.body` (name, description, categoryId, ...).
 * 2. Xử lý file ảnh upload: Lấy filename, tạo URL, đánh dấu ảnh chính (ảnh đầu tiên).
 * 3. Xử lý biến thể (variants): Nếu gửi dạng string JSON thì parse ra object.
 * 4. Gọi `productService.create` để lưu vào DB.
 * 5. Trả về sản phẩm vừa tạo.
 * Kích hoạt khi: Người dùng thực hiện tạo sản phẩm (thường là Admin/Staff).
 * POST /api/products
 */
const create = asyncHandler(async (req, res) => {
    const { name, description, categoryId, brandId, isFeatured, variants } = req.body;

    // Handle uploaded images
    const images = [];
    if (req.files) {
        if (req.files.images) {
            req.files.images.forEach((file, index) => {
                images.push({
                    url: getFileUrl(file.filename),
                    isPrimary: index === 0,
                    sortOrder: index,
                });
            });
        }
    }

    // Parse variants if sent as JSON string
    let parsedVariants = variants;
    if (typeof variants === 'string') {
        try {
            parsedVariants = JSON.parse(variants);
        } catch (e) {
            parsedVariants = [];
        }
    }

    const product = await productService.create(
        { name, description, categoryId: parseInt(categoryId, 10), brandId: brandId ? parseInt(brandId, 10) : null, isFeatured },
        parsedVariants || [],
        images
    );

    sendCreated(res, product, 'Product created successfully');
});

/**
 * Get all products with filtering
 * Lấy danh sách sản phẩm với bộ lọc
 *
 * Chức năng: Lấy danh sách sản phẩm cho trang chủ/trang danh sách (public).
 * Luồng xử lý:
 * 1. Nhận các query params (page, limit, category, search, price range...).
 * 2. Gọi `productService.getAll` để query DB.
 * 3. Trả về danh sách sản phẩm.
 * Kích hoạt khi: Người dùng lướt xem danh sách sản phẩm.
 * GET /api/products
 */
const getAll = asyncHandler(async (req, res) => {
    const result = await productService.getAll(req.query);

    sendSuccess(res, result, 'Products retrieved successfully');
});

/**
 * Get product by ID or slug
 * Lấy chi tiết sản phẩm
 *
 * Chức năng: Xem chi tiết một sản phẩm.
 * Luồng xử lý:
 * 1. Lấy `idOrSlug` từ URL.
 * 2. Gọi `productService.getById` để tìm sản phẩm theo ID hoặc Slug.
 * 3. Trả về thông tin chi tiết (gồm cả biến thể, ảnh).
 * Kích hoạt khi: Người dùng bấm vào xem một sản phẩm.
 * GET /api/products/:idOrSlug
 */
const getById = asyncHandler(async (req, res) => {
    const product = await productService.getById(req.params.idOrSlug);

    sendSuccess(res, product, 'Product retrieved successfully');
});

/**
 * Update product
 * Cập nhật sản phẩm
 *
 * Chức năng: Sửa thông tin cơ bản của sản phẩm.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Nhận dữ liệu cần sửa từ `req.body`.
 * 3. Gọi `productService.update` để cập nhật DB.
 * Kích hoạt khi: Admin/Staff sửa sản phẩm.
 * PUT /api/products/:id
 */
const update = asyncHandler(async (req, res) => {
    const { name, description, categoryId, brandId, isFeatured, isActive } = req.body;

    const product = await productService.update(parseInt(req.params.id, 10), {
        name,
        description,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        brandId: brandId !== undefined ? (brandId ? parseInt(brandId, 10) : null) : undefined,
        isFeatured,
        isActive,
    });

    sendSuccess(res, product, 'Product updated successfully');
});

/**
 * Delete product
 * Xóa sản phẩm
 *
 * Chức năng: Xóa sản phẩm.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Gọi `productService.remove` để xóa.
 * Kích hoạt khi: Admin xóa sản phẩm.
 * DELETE /api/products/:id
 */
const remove = asyncHandler(async (req, res) => {
    await productService.remove(parseInt(req.params.id, 10));

    sendNoContent(res);
});

/**
 * Add variant to product
 * Thêm biến thể sản phẩm
 *
 * Chức năng: Thêm một biến thể mới (VD: Màu đỏ, Size XL) cho sản phẩm.
 * Luồng xử lý:
 * 1. Lấy `productId` từ URL.
 * 2. Nhận thông tin biến thể từ `req.body` (sku, price, attributes...).
 * 3. Gọi `productService.addVariant`.
 * Kích hoạt khi: Admin thêm biến thể trong trang chi tiết sản phẩm.
 * POST /api/products/:productId/variants
 */
const addVariant = asyncHandler(async (req, res) => {
    const variant = await productService.addVariant(
        parseInt(req.params.productId, 10),
        req.body
    );

    sendCreated(res, variant, 'Variant added successfully');
});

/**
 * Update variant
 * Cập nhật biến thể
 *
 * Chức năng: Sửa thông tin biến thể (giá, tồn kho...).
 * Luồng xử lý:
 * 1. Lấy `variantId` từ URL.
 * 2. Nhận thông tin update từ `req.body`.
 * 3. Gọi `productService.updateVariant`.
 * Kích hoạt khi: Admin sửa biến thể.
 * PUT /api/products/variants/:variantId
 */
const updateVariant = asyncHandler(async (req, res) => {
    const variant = await productService.updateVariant(
        parseInt(req.params.variantId, 10),
        req.body
    );

    sendSuccess(res, variant, 'Variant updated successfully');
});

/**
 * Delete variant
 * Xóa biến thể
 *
 * Chức năng: Xóa một biến thể.
 * Luồng xử lý:
 * 1. Gọi `productService.removeVariant`.
 * Kích hoạt khi: Admin xóa biến thể.
 * DELETE /api/products/variants/:variantId
 */
const removeVariant = asyncHandler(async (req, res) => {
    await productService.removeVariant(parseInt(req.params.variantId, 10));

    sendNoContent(res);
});

/**
 * Add image to product
 * Thêm ảnh cho sản phẩm
 *
 * Chức năng: Upload và thêm một ảnh vào danh sách ảnh của sản phẩm.
 * Luồng xử lý:
 * 1. Lấy file từ `req.file`.
 * 2. Lấy thông tin phụ (altText, variantId...) từ `req.body`.
 * 3. Gọi `productService.addImage`.
 * Kích hoạt khi: Admin upload ảnh lẻ.
 * POST /api/products/:productId/images
 */
const addImage = asyncHandler(async (req, res) => {
    const { isPrimary, sortOrder, variantId, altText } = req.body;

    if (!req.file) {
        throw new Error('Image file is required');
    }

    const image = await productService.addImage(
        parseInt(req.params.productId, 10),
        {
            url: getFileUrl(req.file.filename),
            altText,
            variantId: variantId ? parseInt(variantId, 10) : null,
            isPrimary: isPrimary === 'true' || isPrimary === true,
            sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
        }
    );

    sendCreated(res, image, 'Image added successfully');
});

/**
 * Delete image
 * Xóa ảnh
 *
 * Chức năng: Xóa ảnh khỏi sản phẩm.
 * DELETE /api/products/images/:imageId
 */
const removeImage = asyncHandler(async (req, res) => {
    await productService.removeImage(parseInt(req.params.imageId, 10));

    sendNoContent(res);
});

module.exports = {
    create,
    getAll,
    getById,
    update,
    remove,
    addVariant,
    updateVariant,
    removeVariant,
    addImage,
    removeImage,
};
