/**
 * Category Service
 * Handles category CRUD operations with hierarchy support
 * Quản lý danh mục sản phẩm (hỗ trợ phân cấp)
 */
const prisma = require('../config/database');
const slugify = require('slugify');
const ApiError = require('../utils/ApiError');
const { deleteFile } = require('../config/multer');

/**
 * Generate unique slug
 * Tạo slug duy nhất
 *
 * Chức năng: Tạo slug từ tên danh mục.
 * Luồng xử lý:
 * 1. Slugify tên danh mục.
 * 2. Kiểm tra trùng lặp trong DB.
 * 3. Nếu trùng -> Thêm số đếm vào sau cho đến khi duy nhất.
 * @param {string} name - Tên danh mục.
 * @param {number|null} excludeId - ID loại trừ (khi update).
 * @returns {Promise<string>} Slug duy nhất.
 */
const generateSlug = async (name, excludeId = null) => {
    let slug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    let counter = 0;
    let uniqueSlug = slug;

    while (true) {
        const existing = await prisma.category.findUnique({
            where: { slug: uniqueSlug },
        });

        if (!existing || existing.id === excludeId) {
            return uniqueSlug;
        }

        counter++;
        uniqueSlug = `${slug}-${counter}`;
    }
};

/**
 * Create a new category
 * Tạo danh mục mới
 *
 * Chức năng: Admin tạo danh mục mới.
 * Luồng xử lý:
 * 1. Nếu có `parentId` -> Kiểm tra xem danh mục cha có tồn tại không.
 * 2. Tạo slug.
 * 3. Thêm mới vào DB.
 * @param {object} data - Dữ liệu danh mục.
 * @returns {Promise<object>} Danh mục vừa tạo.
 */
const create = async (data) => {
    const { name, description, image, parentId, sortOrder } = data;

    // Check if parent exists (if provided)
    if (parentId) {
        const parent = await prisma.category.findUnique({
            where: { id: parentId },
        });

        if (!parent) {
            throw new ApiError(404, 'Parent category not found');
        }
    }

    const slug = await generateSlug(name);

    const category = await prisma.category.create({
        data: {
            name,
            slug,
            description,
            image,
            parentId,
            sortOrder: sortOrder || 0,
        },
        include: {
            parent: true,
            children: true,
            _count: { select: { products: true } },
        },
    });

    return category;
};

/**
 * Get all categories (with optional tree structure)
 * Lấy danh sách danh mục
 *
 * Chức năng: Lấy tất cả danh mục.
 * Luồng xử lý:
 * 1. `tree = true`: Trả về dạng cây phân cấp (chỉ lấy cha, include con).
 * 2. `tree = false`: Trả về danh sách phẳng.
 * 3. Hỗ trợ option `includeCount` để đếm số sản phẩm trong mỗi danh mục.
 * @param {object} options - Tùy chọn (tree, activeOnly, includeCount).
 * @returns {Promise<object[]>} Danh sách danh mục.
 */
const getAll = async (options = {}) => {
    const { tree = false, activeOnly = true, includeCount = false } = options;

    const where = activeOnly ? { isActive: true } : {};

    const categories = await prisma.category.findMany({
        where: tree ? { ...where, parentId: null } : where,
        include: {
            parent: true,
            children: tree ? {
                where: activeOnly ? { isActive: true } : {},
                orderBy: { sortOrder: 'asc' },
                include: {
                    children: {
                        where: activeOnly ? { isActive: true } : {},
                        orderBy: { sortOrder: 'asc' },
                    },
                    _count: includeCount ? { select: { products: true } } : undefined,
                },
            } : undefined,
            _count: includeCount ? { select: { products: true } } : undefined,
        },
        orderBy: { sortOrder: 'asc' },
    });

    return categories;
};

/**
 * Get category by ID or slug
 * Lấy chi tiết danh mục
 *
 * Chức năng: Tìm danh mục theo ID hoặc Slug.
 * @param {number|string} idOrSlug - ID hoặc Slug.
 * @returns {Promise<object>} Thông tin danh mục.
 */
const getByIdOrSlug = async (idOrSlug) => {
    const isId = !isNaN(parseInt(idOrSlug, 10));

    const category = await prisma.category.findFirst({
        where: isId
            ? { id: parseInt(idOrSlug, 10) }
            : { slug: idOrSlug },
        include: {
            parent: true,
            children: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
            },
            _count: { select: { products: true } },
        },
    });

    if (!category) {
        throw new ApiError(404, 'Category not found');
    }

    return category;
};

/**
 * Update category
 * Cập nhật danh mục
 *
 * Chức năng: Admin sửa danh mục.
 * Luồng xử lý:
 * 1. Kiểm tra tồn tại.
 * 2. Kiểm tra tham chiếu vòng (`Circular Reference`):
 *    - Danh mục không thể là cha của chính nó.
 *    - Danh mục không thể làm con của một danh mục đang là con cháu của nó (Logic đệ quy kiểm tra cha).
 * 3. Tạo lại slug nếu đổi tên.
 * 4. Xóa ảnh cũ nếu upload ảnh mới.
 * 5. Update DB.
 * @param {number} id - Category ID.
 * @param {object} data - Dữ liệu update.
 * @returns {Promise<object>} Danh mục đã sửa.
 */
const update = async (id, data) => {
    const { name, description, image, parentId, sortOrder, isActive } = data;

    const existing = await prisma.category.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new ApiError(404, 'Category not found');
    }

    // Check for circular reference
    if (parentId) {
        if (parentId === id) {
            throw new ApiError(400, 'Category cannot be its own parent');
        }

        const parent = await prisma.category.findUnique({
            where: { id: parentId },
        });

        if (!parent) {
            throw new ApiError(404, 'Parent category not found');
        }

        // Check if setting parent would create circular reference
        let currentParent = parent;
        while (currentParent) {
            if (currentParent.id === id) {
                throw new ApiError(400, 'Circular reference detected');
            }
            if (currentParent.parentId) {
                currentParent = await prisma.category.findUnique({
                    where: { id: currentParent.parentId },
                });
            } else {
                break;
            }
        }
    }

    // Generate new slug if name changed
    let slug = existing.slug;
    if (name && name !== existing.name) {
        slug = await generateSlug(name, id);
    }

    // Delete old image if new one is provided
    if (image && existing.image) {
        const oldFilename = existing.image.split('/').pop();
        await deleteFile(oldFilename);
    }

    const category = await prisma.category.update({
        where: { id },
        data: {
            ...(name && { name, slug }),
            ...(description !== undefined && { description }),
            ...(image && { image }),
            ...(parentId !== undefined && { parentId }),
            ...(sortOrder !== undefined && { sortOrder }),
            ...(isActive !== undefined && { isActive }),
        },
        include: {
            parent: true,
            children: true,
            _count: { select: { products: true } },
        },
    });

    return category;
};

/**
 * Delete category
 * Xóa danh mục
 *
 * Chức năng: Admin xóa danh mục.
 * Logic:
 * 1. Không thể xóa nếu có sản phẩm.
 * 2. Không thể xóa nếu có danh mục con (phải xóa con trước hoặc di chuyển con sang cha khác).
 * @param {number} id - Category ID.
 * @returns {Promise<void>}
 */
const remove = async (id) => {
    const category = await prisma.category.findUnique({
        where: { id },
        include: {
            _count: { select: { products: true, children: true } },
        },
    });

    if (!category) {
        throw new ApiError(404, 'Category not found');
    }

    if (category._count.products > 0) {
        throw new ApiError(400, 'Cannot delete category with products. Reassign products first.');
    }

    if (category._count.children > 0) {
        throw new ApiError(400, 'Cannot delete category with subcategories. Delete subcategories first.');
    }

    // Delete image if exists
    if (category.image) {
        const filename = category.image.split('/').pop();
        await deleteFile(filename);
    }

    await prisma.category.delete({ where: { id } });
};

module.exports = {
    create,
    getAll,
    getByIdOrSlug,
    update,
    remove,
};
