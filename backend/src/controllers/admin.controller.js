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
// Dashboard Stats
// ==========================================

/**
 * Get dashboard stats
 * GET /api/admin/stats
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    sendSuccess(res, stats, 'Dashboard stats retrieved');
});

/**
 * Get revenue chart data
 * GET /api/admin/revenue
 */
const getRevenueChart = asyncHandler(async (req, res) => {
    const { period } = req.query; // week, month, year
    const data = await adminService.getRevenueChart(period);
    sendSuccess(res, data, 'Revenue chart data retrieved');
});

/**
 * Get top products
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
 * GET /api/admin/activity
 */
const getRecentActivity = asyncHandler(async (req, res) => {
    const activity = await adminService.getRecentActivity();
    sendSuccess(res, activity, 'Recent activity retrieved');
});

// ==========================================
// Product Management
// ==========================================

/**
 * Get all products (admin)
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
 * GET /api/admin/products/:id
 */
const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await productService.getById(parseInt(id, 10));
    sendSuccess(res, product, 'Product retrieved');
});

/**
 * Create product
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
 * DELETE /api/admin/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.remove(parseInt(id, 10));
    sendSuccess(res, null, 'Product deleted successfully');
});

/**
 * Upload product images
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
// Order Management
// ==========================================

/**
 * Get all orders (admin)
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
// Category Management
// ==========================================

/**
 * Create category
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
// Brand Management
// ==========================================

/**
 * Create brand
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
// User Management
// ==========================================

/**
 * Get all users
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
