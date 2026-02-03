/**
 * Admin Controller
 * Handles HTTP requests for admin dashboard and entity management
 */
const prisma = require('../config/database');
const adminService = require('../services/admin.service');
const productService = require('../services/product.service');
const orderService = require('../services/order.service');
const categoryService = require('../services/category.service');
const brandService = require('../services/brand.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const { getFileUrl, deleteFile } = require('../config/multer');
const fs = require('fs').promises;
const path = require('path');

// ==========================================
// Dashboard Stats (Thống Kê Bảng Điều Khiển)
// ==========================================

/**
 * Get dashboard stats
 * Lấy số liệu thống kê tổng quan
 *
 * Chức năng: Lấy các chỉ số quan trọng cho trang chủ admin (Tổng doanh thu, Đơn hàng, Khách hàng, Sản phẩm...).
 * Luồng xử lý:
 * 1. Gọi service `adminService.getDashboardStats` để tổng hợp dữ liệu từ DB.
 * 2. Tính toán các chỉ số tăng trưởng so với kỳ trước (nếu có logic này).
 * 3. Trả về object chứa các số liệu.
 * Kích hoạt khi: Admin truy cập vào Dashboard (Trang chủ Admin).
 * GET /api/admin/stats
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    sendSuccess(res, stats, 'Dashboard stats retrieved');
});

/**
 * Get revenue chart data
 * Lấy dữ liệu biểu đồ doanh thu
 *
 * Chức năng: Cung cấp dữ liệu để vẽ biểu đồ doanh thu theo thời gian.
 * Luồng xử lý:
 * 1. Nhận tham số `period` (week, month, year) từ query string.
 * 2. Gọi logic tính toán doanh thu theo từng mốc thời gian trong `adminService`.
 * 3. Trả về mảng dữ liệu [ngày, doanh thu].
 * Kích hoạt khi: Admin chọn xem biểu đồ doanh thu hoặc thay đổi mốc thời gian lọc.
 * GET /api/admin/revenue
 */
const getRevenueChart = asyncHandler(async (req, res) => {
    const { period } = req.query; // week, month, year
    const data = await adminService.getRevenueChart(period);
    sendSuccess(res, data, 'Revenue chart data retrieved');
});

/**
 * Get top products
 * Lấy danh sách sản phẩm bán chạy
 *
 * Chức năng: Hiển thị top các sản phẩm có doanh số cao nhất.
 * Luồng xử lý:
 * 1. Nhận tham số `limit` để giới hạn số lượng (mặc định 5).
 * 2. Gọi service truy vấn DB sắp xếp theo số lượng đã bán.
 * 3. Trả về danh sách sản phẩm.
 * Kích hoạt khi: Admin xem widget "Top sản phẩm" trên dashboard.
 * GET /api/admin/top-products
 */
const getTopProducts = asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const products = await adminService.getTopProducts(
        limit ? parseInt(limit, 10) : 5
    );
    sendSuccess(res, products, 'Top products retrieved');
});

/**
 * Get recent activity
 * Lấy hoạt động gần đây
 *
 * Chức năng: Liệt kê các sự kiện mới nhất (Đơn hàng mới, Khách hàng mới đăng ký...).
 * Luồng xử lý:
 * 1. Truy vấn các bảng liên quan (Orders, Users) lấy các bản ghi mới nhất.
 * 2. Gộp và sắp xếp theo thời gian giảm dần.
 * 3. Trả về danh sách hoạt động.
 * Kích hoạt khi: Admin xem widget "Hoạt động gần đây".
 * GET /api/admin/activity
 */
const getRecentActivity = asyncHandler(async (req, res) => {
    const activity = await adminService.getRecentActivity();
    sendSuccess(res, activity, 'Recent activity retrieved');
});

// ==========================================
// Product Management (Quản Lý Sản Phẩm)
// ==========================================

/**
 * Get all products (admin)
 * Lấy danh sách sản phẩm (Admin)
 *
 * Chức năng: Lấy danh sách sản phẩm với các bộ lọc dành riêng cho admin (bao gồm cả sản phẩm ẩn).
 * Luồng xử lý:
 * 1. Nhận các tham số lọc: page, limit, search, category, brand, status.
 * 2. Xây dựng object `filters` để truyền vào service.
 *    - `includeInactive: true`: Cho phép admin thấy sản phẩm đã bị ẩn/xoá mềm.
 *    - Xử lý filter `status` (sắp hết hàng, hết hàng).
 * 3. Gọi `productService.getAll` để lấy dữ liệu.
 * 4. Trả về danh sách sản phẩm cùng thông tin phân trang.
 * Kích hoạt khi: Admin vào trang "Danh sách sản phẩm".
 * GET /api/admin/products
 */
const getProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, category, brand, status } = req.query;

    const filters = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search,
        category,
        brand,
        includeInactive: true, // Admin can see inactive products
    };

    // Handle status filter
    if (status === 'outOfStock') {
        filters.outOfStock = true;
    } else if (status === 'lowStock') {
        filters.lowStock = true;
    }

    const result = await productService.getAll(filters);
    sendSuccess(res, result, 'Products retrieved');
});

/**
 * Get product by ID (admin)
 * Lấy chi tiết sản phẩm
 *
 * Chức năng: Xem chi tiết một sản phẩm cụ thể để chỉnh sửa.
 * Luồng xử lý:
 * 1. Lấy `id` sản phẩm từ URL.
 * 2. Gọi `productService.getById` để lấy thông tin đầy đủ.
 * 3. Trả về object sản phẩm.
 * Kích hoạt khi: Admin nhấn vào một sản phẩm để xem hoặc sửa.
 * GET /api/admin/products/:id
 */
const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await productService.getById(parseInt(id, 10));
    sendSuccess(res, product, 'Product retrieved');
});

/**
 * Create product
 * Tạo sản phẩm mới
 *
 * Chức năng: Thêm một sản phẩm mới vào hệ thống cùng với ảnh và biến thể.
 * Luồng xử lý:
 * 1. Nhận dữ liệu text từ `req.body.data` (được gửi dưới dạng JSON string do có upload file).
 * 2. Nhận các file ảnh từ `req.files`.
 * 3. Tách thông tin biến thể (`variants`) và thông tin cơ bản (`baseData`).
 * 4. Xử lý logic upload ảnh, tạo mảng object `images`.
 * 5. Gọi `productService.create` để lưu vào DB (dùng transaction).
 * 6. Trả về sản phẩm vừa tạo.
 * Kích hoạt khi: Admin điền form "Thêm sản phẩm" và nhấn Lưu.
 * POST /api/admin/products
 */
const createProduct = asyncHandler(async (req, res) => {
    const productData = JSON.parse(req.body.data || '{}');
    const files = req.files || [];

    // Extract variants from productData
    const { variants = [], ...baseData } = productData;

    // Handle file uploads
    const images = files.map((file, index) => ({
        url: getFileUrl(file.filename),
        isPrimary: index === 0,
        sortOrder: index,
    }));

    // Call service with correct parameters: (data, variants, images)
    const product = await productService.create(baseData, variants, images);

    sendSuccess(res, product, 'Product created successfully', 201);
});

/**
 * Update product
 * Cập nhật sản phẩm
 *
 * Chức năng: Chỉnh sửa thông tin sản phẩm (tên, giá, mô tả, ảnh, biến thể, ...).
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Nhận dữ liệu cập nhật từ `req.body` và file ảnh mới (nếu có).
 * 3. Nếu có ảnh mới upload, định dạng lại thành object `newImages`.
 * 4. Gọi `productService.update` để thực hiện cập nhật DB.
 * 5. Trả về thông tin sau cập nhật.
 * Kích hoạt khi: Admin sửa đổi thông tin sản phẩm và nhấn Lưu.
 * PUT /api/admin/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const productData = JSON.parse(req.body.data || '{}');
    const files = req.files || [];

    // Handle new file uploads
    if (files.length > 0) {
        const newImages = files.map((file, index) => ({
            url: getFileUrl(file.filename),
            isPrimary: false,
            sortOrder: 100 + index, // Add to end
        }));
        productData.newImages = newImages;
    }

    const product = await productService.update(parseInt(id, 10), productData);
    sendSuccess(res, product, 'Product updated successfully');
});

/**
 * Delete product
 * Xóa sản phẩm
 *
 * Chức năng: Xóa (hoặc ẩn) một sản phẩm khỏi hệ thống.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Gọi `productService.remove`.
 *    - Logic thực tế có thể là xoá mềm (`isActive = false`) hoặc xoá cứng tuỳ business.
 * 3. Trả về thông báo thành công.
 * Kích hoạt khi: Admin nhấn nút "Xóa" trên dòng sản phẩm.
 * DELETE /api/admin/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.remove(parseInt(id, 10));
    sendSuccess(res, null, 'Product deleted successfully');
});

/**
 * Upload product images
 * Tải lên ảnh sản phẩm
 *
 * Chức năng: Upload thêm ảnh cho một sản phẩm đã có.
 * Luồng xử lý:
 * 1. Lấy `id` sản phẩm từ URL.
 * 2. Lấy danh sách file từ `req.files`.
 * 3. Duyệt qua từng file, tạo bản ghi `productImage` trong DB.
 * 4. Trả về danh sách ảnh đã upload.
 * Kích hoạt khi: Admin upload thêm ảnh trong trang sửa sản phẩm.
 * POST /api/admin/products/:id/images
 */
const uploadProductImages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const files = req.files || [];

    if (files.length === 0) {
        throw new ApiError(400, 'No images provided');
    }

    const images = await Promise.all(files.map(async (file, index) => {
        return prisma.productImage.create({
            data: {
                productId: parseInt(id, 10),
                url: getFileUrl(file.filename),
                isPrimary: false,
                sortOrder: 100 + index,
            },
        });
    }));

    sendSuccess(res, images, 'Images uploaded successfully', 201);
});

/**
 * Delete product image
 * Xóa ảnh sản phẩm
 *
 * Chức năng: Xóa một ảnh cụ thể của sản phẩm.
 * Luồng xử lý:
 * 1. Lấy `productId` và `imageId` từ URL.
 * 2. Kiểm tra ảnh có tồn tại và thuộc sản phẩm đó không.
 * 3. Xóa file vật lý trên ổ cứng (`deleteFile`).
 * 4. Xóa bản ghi trong DB.
 * Kích hoạt khi: Admin nhấn nút "Xóa" trên một ảnh trong thư viện ảnh sản phẩm.
 * DELETE /api/admin/products/:productId/images/:imageId
 */
const deleteProductImage = asyncHandler(async (req, res) => {
    const { productId, imageId } = req.params;

    const image = await prisma.productImage.findFirst({
        where: {
            id: parseInt(imageId, 10),
            productId: parseInt(productId, 10),
        },
    });

    if (!image) {
        throw new ApiError(404, 'Image not found');
    }

    // Delete file from disk
    const filename = image.url.split('/').pop();
    await deleteFile(filename);

    // Delete from database
    await prisma.productImage.delete({
        where: { id: parseInt(imageId, 10) },
    });

    sendSuccess(res, null, 'Image deleted successfully');
});

// ==========================================
// Order Management (Quản Lý Đơn Hàng)
// ==========================================

/**
 * Get all orders (admin)
 * Lấy danh sách đơn hàng
 *
 * Chức năng: Xem danh sách đơn hàng với các bộ lọc năng cao.
 * Luồng xử lý:
 * 1. Nhận các tham số lọc: page, limit, status, search, startDate, endDate.
 * 2. Xây dựng object `filters`.
 *    - Chuyển `startDate`, `endDate` sang kiểu Date.
 * 3. Gọi `orderService.getAll` lấy dữ liệu.
 * 4. Trả về danh sách đơn hàng.
 * Kích hoạt khi: Admin vào màn hình "Quản lý đơn hàng".
 * GET /api/admin/orders
 */
const getOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;

    const filters = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    if (status) {
        filters.status = status.split(',');
    }
    if (search) {
        filters.search = search;
    }
    if (startDate) {
        filters.startDate = new Date(startDate);
    }
    if (endDate) {
        filters.endDate = new Date(endDate);
    }

    const result = await orderService.getAll(filters);
    sendSuccess(res, result, 'Orders retrieved');
});

/**
 * Get order by ID (admin)
 * Lấy chi tiết đơn hàng
 *
 * Chức năng: Xem thông tin chi tiết một đơn hàng và các trạng thái tiếp theo có thể chuyển.
 * Luồng xử lý:
 * 1. Lấy `id` đơn hàng từ URL.
 * 2. Gọi `orderService.getById` lấy thông tin chi tiết (sản phẩm, khách hàng, thanh toán...).
 * 3. Gọi `orderService.getNextStatuses` để biết đơn này có thể chuyển sang trạng thái nào tiếp theo dựa trên role của người dùng.
 * 4. Trả về order kèm `nextStatuses`.
 * Kích hoạt khi: Admin bấm vào xem chi tiết một đơn hàng.
 * GET /api/admin/orders/:id
 */
const getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await orderService.getById(parseInt(id, 10));

    // Get next valid statuses for this order
    const userRole = req.user.role?.name || 'CUSTOMER';
    const nextStatuses = await orderService.getNextStatuses(parseInt(id, 10), userRole);

    sendSuccess(res, { ...order, nextStatuses }, 'Order retrieved');
});

/**
 * Update order status
 * Cập nhật trạng thái đơn hàng
 *
 * Chức năng: Chuyển trạng thái đơn hàng (VD: Chờ xác nhận -> Đang giao).
 * Luồng xử lý:
 * 1. Lấy `id` đơn hàng, trạng thái mới (`status`) và ghi chú (`note`).
 * 2. Gọi `orderService.updateStatus`.
 *    - Logic này thường sẽ kiểm tra xem việc chuyển trạng thái có hợp lệ không.
 *    - Có thể gửi email thông báo cho khách hàng.
 * 3. Trả về đơn hàng sau khi update.
 * Kích hoạt khi: Admin chọn trạng thái mới và bấm "Cập nhật".
 * PUT /api/admin/orders/:id/status
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, note } = req.body;
    const userRole = req.user.role?.name || 'STAFF';

    const order = await orderService.updateStatus(
        parseInt(id, 10),
        status,
        req.user.id,
        note,
        userRole
    );

    sendSuccess(res, order, 'Order status updated');
});

/**
 * Approve refund request
 * Duyệt yêu cầu hoàn tiền
 *
 * Chức năng: Chấp nhận yêu cầu hoàn tiền từ khách hàng.
 * Luồng xử lý:
 * 1. Chuyển trạng thái đơn hàng sang `REFUNDING`.
 * 2. Gọi logic hoàn tiền (nếu có tích hợp cổng thanh toán tự động) hoặc chỉ ghi nhận thủ công.
 * Kích hoạt khi: Admin bấm "Duyệt hoàn tiền" cho đơn hàng có yêu cầu.
 * POST /api/admin/orders/:id/refund/approve
 */
const approveRefund = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;
    const userRole = req.user.role?.name;

    const order = await orderService.updateStatus(
        parseInt(id, 10),
        'REFUNDING',
        req.user.id,
        note || 'Refund approved by manager',
        userRole
    );

    sendSuccess(res, order, 'Refund approved');
});

// ==========================================
// Category Management (Quản Lý Danh Mục)
// ==========================================

/**
 * Create category
 * Tạo danh mục mới
 *
 * Chức năng: Thêm một danh mục sản phẩm mới.
 * Luồng xử lý:
 * 1. Nhận tên, slug, mô tả, ảnh, parentId từ `req.body`.
 * 2. Tự động tạo slug nếu không có.
 * 3. Gọi prisma để tạo bản ghi mới.
 * 4. Trả về danh mục vừa tạo.
 * Kích hoạt khi: Admin nhấn "Thêm danh mục" và điền form.
 * POST /api/admin/categories
 */
const createCategory = asyncHandler(async (req, res) => {
    const { name, slug, description, parentId, image, sortOrder } = req.body;

    const category = await prisma.category.create({
        data: {
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description,
            parentId: parentId ? parseInt(parentId, 10) : null,
            image,
            sortOrder: sortOrder || 0,
        },
    });

    sendSuccess(res, category, 'Category created successfully', 201);
});

/**
 * Update category
 * Cập nhật danh mục
 *
 * Chức năng: Sửa thông tin danh mục (tên, cha/con, ảnh, ẩn/hiện...).
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Cập nhật các trường thông tin trong DB.
 * 3. Trả về danh mục sau cập nhật.
 * Kích hoạt khi: Admin sửa danh mục.
 * PUT /api/admin/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, description, parentId, image, sortOrder, isActive } = req.body;

    const category = await prisma.category.update({
        where: { id: parseInt(id, 10) },
        data: {
            name,
            slug,
            description,
            parentId: parentId !== undefined ? (parentId ? parseInt(parentId, 10) : null) : undefined,
            image,
            sortOrder,
            isActive,
        },
    });

    sendSuccess(res, category, 'Category updated successfully');
});

/**
 * Delete category
 * Xóa danh mục
 *
 * Chức năng: Xóa danh mục khỏi hệ thống.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Kiểm tra danh mục có chứa sản phẩm nào không.
 *    - Nếu có: Báo lỗi (không cho xóa để bảo toàn dữ liệu).
 *    - Nếu không: Thực hiện xóa.
 * 3. Trả về thông báo thành công.
 * Kích hoạt khi: Admin nhấn "Xóa" danh mục.
 * DELETE /api/admin/categories/:id
 */
const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if category has products
    const productsCount = await prisma.product.count({
        where: { categoryId: parseInt(id, 10) },
    });

    if (productsCount > 0) {
        throw new ApiError(400, `Cannot delete category with ${productsCount} products`);
    }

    await prisma.category.delete({
        where: { id: parseInt(id, 10) },
    });

    sendSuccess(res, null, 'Category deleted successfully');
});

// ==========================================
// Brand Management (Quản Lý Thương Hiệu)
// ==========================================

/**
 * Create brand
 * Tạo thương hiệu mới
 *
 * Chức năng: Thêm thương hiệu (hãng sản xuất).
 * Luồng xử lý:
 * 1. Nhận thông tin từ body.
 * 2. Tạo bản ghi trong DB.
 * 3. Trả về kết quả.
 * Kích hoạt khi: Admin thêm thương hiệu.
 * POST /api/admin/brands
 */
const createBrand = asyncHandler(async (req, res) => {
    const { name, slug, description, logo } = req.body;

    const brand = await prisma.brand.create({
        data: {
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description,
            logo,
        },
    });

    sendSuccess(res, brand, 'Brand created successfully', 201);
});

/**
 * Update brand
 * Cập nhật thương hiệu
 *
 * Chức năng: Sửa thông tin thương hiệu.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Cập nhật DB.
 * Kích hoạt khi: Admin sửa thương hiệu.
 * PUT /api/admin/brands/:id
 */
const updateBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, description, logo, isActive } = req.body;

    const brand = await prisma.brand.update({
        where: { id: parseInt(id, 10) },
        data: { name, slug, description, logo, isActive },
    });

    sendSuccess(res, brand, 'Brand updated successfully');
});

/**
 * Delete brand
 * Xóa thương hiệu
 *
 * Chức năng: Xóa thương hiệu.
 * Luồng xử lý:
 * 1. Kiểm tra xem có sản phẩm thuộc thương hiệu này không.
 * 2. Nếu không, tiến hành xóa.
 * Kích hoạt khi: Admin xóa thương hiệu.
 * DELETE /api/admin/brands/:id
 */
const deleteBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if brand has products
    const productsCount = await prisma.product.count({
        where: { brandId: parseInt(id, 10) },
    });

    if (productsCount > 0) {
        throw new ApiError(400, `Cannot delete brand with ${productsCount} products`);
    }

    await prisma.brand.delete({
        where: { id: parseInt(id, 10) },
    });

    sendSuccess(res, null, 'Brand deleted successfully');
});

// ==========================================
// User Management (Quản Lý Người Dùng)
// ==========================================

/**
 * Get all users
 * Lấy danh sách người dùng
 *
 * Chức năng: Xem danh sách user (khách hàng, nhân viên) với phân trang và lọc.
 * Luồng xử lý:
 * 1. Nhận tham số page, limit, role, search.
 * 2. Xây dựng câu truy vấn Prisma (`findMany`).
 * 3. Đếm tổng số user để tính phân trang (`count`).
 * 4. Transform dữ liệu (loại bỏ password, format lại nếu cần).
 * 5. Trả về danh sách.
 * Kích hoạt khi: Admin vào trang "Quản lý người dùng".
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, search } = req.query;

    const where = {};

    if (role) {
        where.role = { name: role };
    }

    if (search) {
        where.OR = [
            { fullName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                role: true,
                tier: true,
                _count: { select: { orders: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            take: parseInt(limit, 10),
        }),
        prisma.user.count({ where }),
    ]);

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        role: user.role?.name,
        loyaltyPoints: user.loyaltyPoints,
        memberTier: user.tier,
        ordersCount: user._count.orders,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
    }));

    sendSuccess(res, {
        items: transformedUsers,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
    }, 'Users retrieved');
});

/**
 * Get user by ID
 * Lấy chi tiết người dùng
 *
 * Chức năng: Xem thông tin chi tiết một user kèm lịch sử đơn hàng.
 * Luồng xử lý:
 * 1. Lấy DB bao gồm: role, tier, địa chỉ, 10 đơn hàng gần nhất.
 * 2. Tính tổng tiền đã chi tiêu (để Admin xem sét hạng thành viên).
 * 3. Trả về kết quả.
 * Kích hoạt khi: Admin bấm xem chi tiết một khách hàng.
 * GET /api/admin/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
            role: true,
            tier: true,
            addresses: true,
            orders: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                },
            },
            _count: { select: { orders: true } },
        },
    });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Calculate total spent
    const totalSpent = await prisma.order.aggregate({
        where: { userId: parseInt(id, 10), paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
    });

    const result = {
        ...user,
        password: undefined,
        totalSpent: totalSpent._sum.totalAmount || 0,
        role: user.role?.name,
    };

    sendSuccess(res, result, 'User retrieved');
});

/**
 * Update user
 * Cập nhật người dùng
 *
 * Chức năng: Admin sửa thông tin user (VD: đổi quyền, đổi hạng, cộng điểm...).
 * Luồng xử lý:
 * 1. Nhận thông tin update.
 * 2. Gọi Prisma update.
 * Kích hoạt khi: Admin sửa user.
 * PUT /api/admin/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fullName, phone, roleId, tierId, loyaltyPoints, isActive } = req.body;

    const user = await prisma.user.update({
        where: { id: parseInt(id, 10) },
        data: {
            fullName,
            phone,
            roleId: roleId ? parseInt(roleId, 10) : undefined,
            tierId: tierId ? parseInt(tierId, 10) : undefined,
            loyaltyPoints,
            isActive,
        },
        include: { role: true, tier: true },
    });

    sendSuccess(res, user, 'User updated successfully');
});

/**
 * Toggle user status
 * Khóa/Mở khóa tài khoản
 *
 * Chức năng: Chặn tài khoản đăng nhập (Khóa) hoặc mở lại.
 * Luồng xử lý:
 * 1. Nhận `isActive` (true/false).
 * 2. Cập nhật field `isActive` trong DB.
 * Kích hoạt khi: Admin bấm nút Kích hoạt/Vô hiệu hóa user.
 * PUT /api/admin/users/:id/status
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
        where: { id: parseInt(id, 10) },
        data: { isActive },
    });

    sendSuccess(res, user, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
});

module.exports = {
    // Dashboard
    getDashboardStats,
    getRevenueChart,
    getTopProducts,
    getRecentActivity,
    // Products
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    deleteProductImage,
    // Orders
    getOrders,
    getOrderById,
    updateOrderStatus,
    approveRefund,
    // Categories
    createCategory,
    updateCategory,
    deleteCategory,
    // Brands
    createBrand,
    updateBrand,
    deleteBrand,
    // Users
    getUsers,
    getUserById,
    updateUser,
    toggleUserStatus,
};
