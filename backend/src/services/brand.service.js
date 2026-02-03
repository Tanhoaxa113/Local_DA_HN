/**
 * Brand Service
 * Handles brand CRUD operations
 * Quản lý thương hiệu sản phẩm
 */
const prisma = require('../config/database');
const slugify = require('slugify');
const ApiError = require('../utils/ApiError');
const { deleteFile } = require('../config/multer');

/**
 * Generate unique slug
 * Tạo slug duy nhất
 *
 * Chức năng: Tạo đường dẫn thân thiện (slug) từ tên thương hiệu.
 * Luồng xử lý:
 * 1. Slugify tên (ví dụ: "Nike" -> "nike").
 * 2. Kiểm tra trong DB xem slug đã tồn tại chưa.
 * 3. Nếu trùng -> Thêm số đếm vào sau (ví dụ: "nike-1") và check lại đến khi duy nhất.
 * @param {string} name - Tên thương hiệu.
 * @param {number|null} excludeId - ID cần loại trừ (dùng khi update).
 * @returns {Promise<string>} Slug duy nhất.
 */
const generateSlug = async (name, excludeId = null) => {
    let slug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    let counter = 0;
    let uniqueSlug = slug;

    while (true) {
        const existing = await prisma.brand.findUnique({
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
 * Create a new brand
 * Tạo thương hiệu mới
 *
 * Chức năng: Admin tạo thương hiệu.
 * Luồng xử lý:
 * 1. Kiểm tra trùng tên.
 * 2. Tạo slug.
 * 3. Lưu vào DB.
 * @param {object} data - Dữ liệu thương hiệu.
 * @returns {Promise<object>} Thương hiệu vừa tạo.
 */
const create = async (data) => {
    const { name, description, logo } = data;

    // Check if name already exists
    const existing = await prisma.brand.findUnique({
        where: { name },
    });

    if (existing) {
        throw new ApiError(409, 'Brand with this name already exists');
    }

    const slug = await generateSlug(name);

    const brand = await prisma.brand.create({
        data: {
            name,
            slug,
            description,
            logo,
        },
        include: {
            _count: { select: { products: true } },
        },
    });

    return brand;
};

/**
 * Get all brands
 * Lấy danh sách thương hiệu
 *
 * Chức năng: Lấy tất cả thương hiệu (thường dùng cho Dropdown lọc).
 * @param {object} options - Tùy chọn (activeOnly, includeCount).
 * @returns {Promise<object[]>} Danh sách thương hiệu.
 */
const getAll = async (options = {}) => {
    const { activeOnly = true, includeCount = false } = options;

    const where = activeOnly ? { isActive: true } : {};

    const brands = await prisma.brand.findMany({
        where,
        include: {
            _count: includeCount ? { select: { products: true } } : undefined,
        },
        orderBy: { name: 'asc' },
    });

    return brands;
};

/**
 * Get brand by ID or slug
 * Lấy chi tiết thương hiệu
 *
 * Chức năng: Lấy thông tin thương hiệu theo ID hoặc Slug.
 * @param {number|string} idOrSlug - ID hoặc Slug.
 * @returns {Promise<object>} Thương hiệu.
 */
const getByIdOrSlug = async (idOrSlug) => {
    const isId = !isNaN(parseInt(idOrSlug, 10));

    const brand = await prisma.brand.findFirst({
        where: isId
            ? { id: parseInt(idOrSlug, 10) }
            : { slug: idOrSlug },
        include: {
            _count: { select: { products: true } },
        },
    });

    if (!brand) {
        throw new ApiError(404, 'Brand not found');
    }

    return brand;
};

/**
 * Update brand
 * Cập nhật thương hiệu
 *
 * Chức năng: Admin sửa thông tin thương hiệu.
 * Luồng xử lý:
 * 1. Kiểm tra tồn tại.
 * 2. Nếu đổi tên -> Kiểm tra trùng tên và tạo slug mới.
 * 3. Nếu đổi logo -> Xóa logo cũ.
 * 4. Update DB.
 * @param {number} id - Brand ID.
 * @param {object} data - Dữ liệu update.
 * @returns {Promise<object>} Thương hiệu đã sửa.
 */
const update = async (id, data) => {
    const { name, description, logo, isActive } = data;

    const existing = await prisma.brand.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new ApiError(404, 'Brand not found');
    }

    // Check if new name conflicts with another brand
    if (name && name !== existing.name) {
        const conflict = await prisma.brand.findUnique({
            where: { name },
        });

        if (conflict) {
            throw new ApiError(409, 'Brand with this name already exists');
        }
    }

    // Generate new slug if name changed
    let slug = existing.slug;
    if (name && name !== existing.name) {
        slug = await generateSlug(name, id);
    }

    // Delete old logo if new one is provided
    if (logo && existing.logo) {
        const oldFilename = existing.logo.split('/').pop();
        await deleteFile(oldFilename);
    }

    const brand = await prisma.brand.update({
        where: { id },
        data: {
            ...(name && { name, slug }),
            ...(description !== undefined && { description }),
            ...(logo && { logo }),
            ...(isActive !== undefined && { isActive }),
        },
        include: {
            _count: { select: { products: true } },
        },
    });

    return brand;
};

/**
 * Delete brand
 * Xóa thương hiệu
 *
 * Chức năng: Admin xóa thương hiệu.
 * Logic: Không cho xóa nếu thương hiệu này đang có sản phẩm (ràng buộc toàn vẹn dữ liệu).
 * @param {number} id - Brand ID.
 * @returns {Promise<void>}
 */
const remove = async (id) => {
    const brand = await prisma.brand.findUnique({
        where: { id },
        include: {
            _count: { select: { products: true } },
        },
    });

    if (!brand) {
        throw new ApiError(404, 'Brand not found');
    }

    if (brand._count.products > 0) {
        throw new ApiError(400, 'Cannot delete brand with products. Reassign products first.');
    }

    // Delete logo if exists
    if (brand.logo) {
        const filename = brand.logo.split('/').pop();
        await deleteFile(filename);
    }

    await prisma.brand.delete({ where: { id } });
};

module.exports = {
    create,
    getAll,
    getByIdOrSlug,
    update,
    remove,
};
