/**
 * Brand Service
 * Handles brand CRUD operations
 */
const prisma = require('../config/database');
const slugify = require('slugify');
const ApiError = require('../utils/ApiError');
const { deleteFile } = require('../config/multer');

/**
 * Generate unique slug
 * @param {string} name - Brand name
 * @param {number|null} excludeId - ID to exclude from uniqueness check
 * @returns {Promise<string>} Unique slug
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
 * @param {object} data - Brand data
 * @returns {Promise<object>} Created brand
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
 * @param {object} options - Query options
 * @returns {Promise<object[]>} Brands list
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
 * @param {number|string} idOrSlug - Brand ID or slug
 * @returns {Promise<object>} Brand
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
 * @param {number} id - Brand ID
 * @param {object} data - Update data
 * @returns {Promise<object>} Updated brand
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
 * @param {number} id - Brand ID
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
