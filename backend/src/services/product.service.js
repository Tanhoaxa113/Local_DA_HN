/**
 * Product Service
 * Xử lý logic sản phẩm, biến thể và quản lý ảnh
 */
const prisma = require('../config/database');
const slugify = require('slugify');
const { ApiError } = require('../utils/ApiError');
const { deleteFile, getFileUrl } = require('../config/multer');
const { redisUtils } = require('../config/redis');

/**
 * Generate unique slug
 * Tạo slug duy nhất
 *
 * Chức năng: Tạo URL thân thiện (slug) từ tên sản phẩm.
 * Luồng xử lý:
 * 1. Dùng `slugify` để tạo slug cơ bản.
 * 2. Kiểm tra trong DB xem slug đã tồn tại chưa.
 * 3. Nếu trùng, thêm số đếm (-1, -2...) vào sau cho đến khi duy nhất.
 * @param {string} name - Tên sản phẩm.
 * @param {number|null} excludeId - ID sản phẩm cần loại trừ (khi update).
 * @returns {Promise<string>} Slug duy nhất.
 */
const generateSlug = async (name, excludeId = null) => {
    let slug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    let counter = 0;
    let uniqueSlug = slug;

    while (true) {
        const existing = await prisma.product.findUnique({
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
 * Generate SKU for variant
 * Tạo mã SKU
 *
 * Chức năng: Tạo mã kho (SKU) tự động cho biến thể.
 * Luồng xử lý: Kết hợp Slug + Size + Color + Random string.
 * @param {string} productSlug - Slug sản phẩm.
 * @param {string} size - Kích thước.
 * @param {string} color - Màu sắc.
 * @returns {string} Mã SKU.
 */
const generateSku = (productSlug, size, color) => {
    const slugPart = productSlug.toUpperCase().substring(0, 10).replace(/-/g, '');
    const sizePart = size.toUpperCase().substring(0, 3);
    const colorPart = color.toUpperCase().substring(0, 3);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${slugPart}-${sizePart}-${colorPart}-${randomPart}`;
};

/**
 * Create a new product with variants
 * Tạo sản phẩm mới
 *
 * Chức năng: Thêm sản phẩm cùng biến thể và ảnh vào DB.
 * Luồng xử lý: dùng Transaction (`prisma.$transaction`) để đảm bảo toàn vẹn dữ liệu.
 * 1. Validate Category và Brand có tồn tại k.
 * 2. Tạo Product.
 * 3. Tạo Variants (nếu có).
 * 4. Tạo Images (nếu có).
 * 5. Cập nhật `minPrice` cho Product dựa trên giá nhỏ nhất của variants.
 * @param {object} data - Dữ liệu sản phẩm.
 * @param {object[]} variants - Danh sách biến thể.
 * @param {object[]} images - Danh sách ảnh.
 * @returns {Promise<object>} Sản phẩm đã tạo.
 */
const create = async (data, variants = [], images = []) => {
    const { name, description, categoryId, brandId, isFeatured } = data;

    // Validate category exists
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
    });

    if (!category) {
        throw new ApiError(404, 'Category not found');
    }

    // Validate brand exists (if provided)
    if (brandId) {
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
        });

        if (!brand) {
            throw new ApiError(404, 'Brand not found');
        }
    }

    const slug = await generateSlug(name);

    // Create product with variants and images in transaction
    const product = await prisma.$transaction(async (tx) => {
        // Create product
        const newProduct = await tx.product.create({
            data: {
                name,
                slug,
                description,
                categoryId,
                brandId,
                isFeatured: isFeatured || false,
            },
        });

        // Create variants
        if (variants.length > 0) {
            const variantData = variants.map((v) => ({
                productId: newProduct.id,
                sku: generateSku(slug, v.size, v.color),
                size: v.size,
                color: v.color,
                colorCode: v.colorCode,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
                costPrice: v.costPrice,
                stock: v.stock || 0,
                availableStock: v.stock || 0,
                lowStockThreshold: v.lowStockThreshold || 5,
            }));

            await tx.productVariant.createMany({ data: variantData });
        }

        // Create images
        if (images.length > 0) {
            const imageData = images.map((img, index) => ({
                productId: newProduct.id,
                variantId: img.variantId || null,
                url: img.url,
                altText: img.altText || name,
                sortOrder: img.sortOrder ?? index,
                isPrimary: img.isPrimary || index === 0,
            }));

            await tx.productImage.createMany({ data: imageData });
        }

        // Update minPrice if variants were added
        if (variants.length > 0) {
            const minPrice = Math.min(...variants.map(v => Number(v.price)));
            await tx.product.update({
                where: { id: newProduct.id },
                data: { minPrice }
            });
        }

        return newProduct;
    });

    // Return full product with relations
    return getById(product.id);
};

/**
 * Get all products with filtering and pagination
 * Lấy danh sách sản phẩm (có lọc vè phân trang)
 *
 * Chức năng: API search chính của trang web.
 * Luồng xử lý:
 * 1. Xây dựng điều kiện lọc (`where` clause) từ params: category, brand, price, size, color, search...
 * 2. Xây dựng điều kiện sắp xếp (`orderBy`).
 * 3. Phân trang (`skip`, `take`).
 * 4. Query DB lấy data và count total.
 * 5. Trả về kết quả kèm thông tin phân trang.
 * @param {object} options - Các tham số query.
 * @returns {Promise<object>} Danh sách sản phẩm và phân trang.
 */
const getAll = async (options = {}) => {
    const {
        page = 1,
        limit = 10,
        categoryId,
        categorySlug,
        brandId,
        brandSlug,
        minPrice,
        maxPrice,
        size,
        color,
        search,
        isFeatured,
        isActive = true,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = options;

    // Build where clause
    const where = {};

    if (isActive !== undefined) {
        where.isActive = isActive === 'true' || isActive === true;
    }

    if (categoryId) {
        where.categoryId = parseInt(categoryId, 10);
    } else if (categorySlug) {
        const category = await prisma.category.findUnique({
            where: { slug: categorySlug },
        });
        if (category) {
            where.categoryId = category.id;
        }
    }

    if (brandId) {
        where.brandId = parseInt(brandId, 10);
    } else if (brandSlug) {
        const brand = await prisma.brand.findUnique({
            where: { slug: brandSlug },
        });
        if (brand) {
            where.brandId = brand.id;
        }
    }

    if (isFeatured !== undefined) {
        where.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    if (search) {
        where.OR = [
            { name: { contains: search } },
            { description: { contains: search } },
        ];
    }

    // Variant filters
    const variantWhere = {};
    if (minPrice || maxPrice) {
        variantWhere.price = {};
        if (minPrice) variantWhere.price.gte = parseFloat(minPrice);
        if (maxPrice) variantWhere.price.lte = parseFloat(maxPrice);
    }
    if (size) {
        variantWhere.size = size;
    }
    if (color) {
        variantWhere.color = { contains: color };
    }

    if (Object.keys(variantWhere).length > 0) {
        where.variants = { some: variantWhere };
    }

    // Build orderBy
    const orderBy = {};
    if (sortBy === 'price') {
        orderBy.minPrice = sortOrder;
    } else if (sortBy === 'totalSold' || sortBy === 'bestselling') {
        orderBy.totalSold = sortOrder;
    } else {
        orderBy[sortBy] = sortOrder;
    }

    // Parse pagination params
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Count total
    const total = await prisma.product.count({ where });

    // Get products
    const products = await prisma.product.findMany({
        where,
        include: {
            category: true,
            brand: true,
            variants: {
                where: { isActive: true },
                orderBy: { price: 'asc' },
            },
            images: {
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 3,
            },
        },
        orderBy,
        skip: offset,
        take: limitNum,
    });

    return {
        data: products,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasMore: pageNum * limitNum < total,
        },
    };
};

/**
 * Get product by ID or slug
 * Lấy chi tiết sản phẩm
 *
 * Chức năng: Lấy thông tin đầy đủ của một sản phẩm.
 * @param {number|string} idOrSlug - ID hoặc Slug.
 * @returns {Promise<object>} Sản phẩm kèm quan hệ (Variants, Images).
 */
const getById = async (idOrSlug) => {
    const isId = !isNaN(parseInt(idOrSlug, 10));

    const product = await prisma.product.findFirst({
        where: isId
            ? { id: parseInt(idOrSlug, 10) }
            : { slug: idOrSlug },
        include: {
            category: true,
            brand: true,
            variants: {
                where: { isActive: true },
                orderBy: [{ color: 'asc' }, { size: 'asc' }],
            },
            images: {
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            },
        },
    });

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    return product;
};

/**
 * Update product
 * Cập nhật sản phẩm
 *
 * Chức năng: Chỉnh sửa thông tin sản phẩm, xử lý logic ảnh (xóa cũ/thêm mới) và variants.
 * Luồng xử lý: Dùng Transaction.
 * 1. Validate dữ liệu đầu vào.
 * 2. Cập nhật bảng Product.
 * 3. Xử lý ảnh:
 *    - Xóa các ảnh có ID trong `deletedImageIds` (xóa DB và file).
 *    - Thêm ảnh mới từ `newImages`.
 *    - Update thông tin ảnh cũ (primary, sortOrder).
 * 4. Xử lý variants (thêm/sửa/xóa).
 * 5. Tính lại `minPrice`.
 * 6. Xóa cache Redis.
 * @param {number} id - ID sản phẩm.
 * @param {object} data - Dữ liệu cập nhật.
 * @returns {Promise<object>} Sản phẩm sau update.
 */
const update = async (id, data) => {
    const {
        name, description, categoryId, brandId, isFeatured, isActive,
        deletedImageIds, newImages, existingImages, variants
    } = data;

    const existing = await prisma.product.findUnique({
        where: { id },
        include: { images: true },
    });

    if (!existing) {
        throw new ApiError(404, 'Product not found');
    }

    // Validate category if provided
    if (categoryId) {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            throw new ApiError(404, 'Category not found');
        }
    }

    // Validate brand if provided
    if (brandId) {
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
        });

        if (!brand) {
            throw new ApiError(404, 'Brand not found');
        }
    }

    // Generate new slug if name changed
    let slug = existing.slug;
    if (name && name !== existing.name) {
        slug = await generateSlug(name, id);
    }

    // Execute updates in transaction
    await prisma.$transaction(async (tx) => {
        // 1. Update basic fields
        await tx.product.update({
            where: { id },
            data: {
                ...(name && { name, slug }),
                ...(description !== undefined && { description }),
                ...(categoryId && { categoryId }),
                ...(brandId !== undefined && { brandId }),
                ...(isFeatured !== undefined && { isFeatured }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        // 2. Handle Deleted Images
        if (deletedImageIds && deletedImageIds.length > 0) {
            // Find images to get filenames for FS deletion
            const imagesToDelete = existing.images.filter(img => deletedImageIds.includes(img.id));

            // Delete from DB
            await tx.productImage.deleteMany({
                where: { id: { in: deletedImageIds } },
            });

            // Delete from Filesystem (async, but after DB delete to ensure consistency)
            for (const img of imagesToDelete) {
                const filename = img.url.split('/').pop();
                await deleteFile(filename);
            }
        }

        // 3. Handle New Images
        if (newImages && newImages.length > 0) {
            await tx.productImage.createMany({
                data: newImages.map(img => ({
                    productId: id,
                    url: img.url,
                    altText: name || existing.name,
                    isPrimary: img.isPrimary || false,
                    sortOrder: img.sortOrder || 0,
                })),
            });
        }

        // 4. Handle Existing Images (Update Primary/Sort)
        if (existingImages && existingImages.length > 0) {
            for (const img of existingImages) {
                await tx.productImage.update({
                    where: { id: img.id },
                    data: { isPrimary: img.isPrimary },
                });
            }
        }

        // 5. Handle variants if provided (for completeness, though controller might handle variants purely via add/update logic, 
        // the AdminEditProductPage sends full variants list. But typically we rely on specific variant endpoints or this big update.
        // Based on AdminEditProductPage, it sends `variants` array.
        // The Service `update` function previously didn't handle variants. 
        // AdminController extracts variants but doesn't pass them to update? 
        // Wait, AdminController `createProduct` passes variants. `updateProduct` does NOT pass variants explicitly to `update`. 
        // `updateProduct` calls `productService.update(id, productData)`. `productData` has variants.
        // So we should handle variants here too for full updates.

        if (variants) {
            // Logic to update variants is complex (match by ID, create new, delete missing?).
            // Admin Edit Page sends `deletedVariantIds`.
            // It sends full list of `variants` (some with ID, some new).
            // Let's implement basic variant update support if contained in `data`.

            // Handle deleted variants (passed in data.deletedVariantIds or implied?)
            // Admin Page sends `deletedVariantIds` in `submitData`.
            if (data.deletedVariantIds && data.deletedVariantIds.length > 0) {
                await tx.productVariant.deleteMany({
                    where: { id: { in: data.deletedVariantIds } }
                });
            }

            // Handle update/create variants
            for (const v of variants) {
                if (v.id) {
                    // Update existing
                    await tx.productVariant.update({
                        where: { id: v.id },
                        data: {
                            sku: v.sku,
                            size: v.size,
                            color: v.color,
                            colorCode: v.colorCode,
                            price: v.price,
                            compareAtPrice: v.compareAtPrice,
                            costPrice: v.costPrice,
                            stock: v.stock,
                            availableStock: v.availableStock,
                            lowStockThreshold: v.lowStockThreshold,
                            isActive: v.isActive,
                        }
                    });
                } else {
                    // Create new
                    await tx.productVariant.create({
                        data: {
                            productId: id,
                            sku: generateSku(slug, v.size, v.color),
                            size: v.size,
                            color: v.color,
                            colorCode: v.colorCode,
                            price: v.price,
                            compareAtPrice: v.compareAtPrice,
                            costPrice: v.costPrice,
                            stock: v.stock || 0,
                            availableStock: v.stock || 0, // Default to stock
                            lowStockThreshold: v.lowStockThreshold || 5,
                            isActive: v.isActive !== undefined ? v.isActive : true,
                        }
                    });
                }
            }
        }

        // Final recalculation of minPrice if variants were touched
        if (variants && variants.length > 0) {
            const allVariants = await tx.productVariant.findMany({
                where: { productId: id }
            });

            if (allVariants.length > 0) {
                const minPrice = Math.min(...allVariants.map(v => Number(v.price)));
                await tx.product.update({
                    where: { id },
                    data: { minPrice }
                });
            }
        }
    });

    // Invalidate cache
    await redisUtils.invalidateCacheByPattern(`product_${id}`);

    return getById(id);
};

/**
 * Delete product
 * Xóa sản phẩm
 *
 * Chức năng: Xóa hoàn toàn sản phẩm khỏi hệ thống.
 * Luồng xử lý:
 * 1. Kiểm tra sản phẩm có tồn tại k.
 * 2. Kiểm tra ràng buộc: Nếu đã có đơn hàng thì KHÔNG cho xóa (yêu cầu ẩn thay vì xóa để giữ lịch sử).
 * 3. Nếu được xóa: Xóa hết ảnh trên disk.
 * 4. Xóa record Product trong DB (Cascade xóa Variants, Images trong DB).
 * 5. Xóa Cache.
 * @param {number} id - Product ID.
 */
const remove = async (id) => {
    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            variants: {
                include: {
                    _count: { select: { orderItems: true } },
                },
            },
            images: true,
        },
    });

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Check if any variant has orders
    const hasOrders = product.variants.some((v) => v._count.orderItems > 0);
    if (hasOrders) {
        throw new ApiError(400, 'Cannot delete product with order history. Deactivate instead.');
    }

    // Delete all images from filesystem
    for (const image of product.images) {
        const filename = image.url.split('/').pop();
        await deleteFile(filename);
    }

    // Delete product (cascade deletes variants and images)
    await prisma.product.delete({ where: { id } });

    // Invalidate cache
    await redisUtils.invalidateCacheByPattern(`product_${id}`);
};

/**
 * Add variant to product
 * Thêm biến thể
 *
 * Chức năng: Thêm một biến thể mới cho sản phẩm.
 * Luồng xử lý:
 * 1. Validate: Kiểm tra trùng Size + Color.
 * 2. Tạo Variant mới.
 * 3. Cập nhật lại `minPrice` của sản phẩm cha.
 * @param {number} productId - Product ID.
 * @param {object} data - Dữ liệu variant.
 * @returns {Promise<object>} Variant mới.
 */
const addVariant = async (productId, data) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    const { size, color, colorCode, price, compareAtPrice, costPrice, stock, lowStockThreshold } = data;

    // Check for duplicate size/color combination
    const existing = await prisma.productVariant.findFirst({
        where: {
            productId,
            size,
            color,
        },
    });

    if (existing) {
        throw new ApiError(409, 'Variant with this size and color already exists');
    }

    const variant = await prisma.productVariant.create({
        data: {
            productId,
            sku: generateSku(product.slug, size, color),
            size,
            color,
            colorCode,
            price,
            compareAtPrice,
            costPrice,
            stock: stock || 0,
            availableStock: stock || 0,
            lowStockThreshold: lowStockThreshold || 5,
        },
    });


    // Update product minPrice
    const allVariants = await prisma.productVariant.findMany({
        where: { productId }
    });
    const minPrice = Math.min(...allVariants.map(v => Number(v.price)));
    await prisma.product.update({
        where: { id: productId },
        data: { minPrice }
    });

    return variant;
};

/**
 * Update variant
 * Cập nhật biến thể
 *
 * Chức năng: Sửa thông tin biến thể.
 * Luồng xử lý:
 * 1. Validate trùng lặp nếu sửa Size/Color.
 * 2. Update DB.
 * 3. Update `minPrice` sản phẩm cha.
 * @param {number} variantId - ID biến thể.
 * @param {object} data - Dữ liệu sửa.
 * @returns {Promise<object>} Variant đã sửa.
 */
const updateVariant = async (variantId, data) => {
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
    });

    if (!variant) {
        throw new ApiError(404, 'Variant not found');
    }

    const { size, color, colorCode, price, compareAtPrice, costPrice, lowStockThreshold, isActive } = data;

    // Check for duplicate size/color if changing
    if ((size || color) && (size !== variant.size || color !== variant.color)) {
        const existing = await prisma.productVariant.findFirst({
            where: {
                productId: variant.productId,
                size: size || variant.size,
                color: color || variant.color,
                NOT: { id: variantId },
            },
        });

        if (existing) {
            throw new ApiError(409, 'Variant with this size and color already exists');
        }
    }

    const updated = await prisma.productVariant.update({
        where: { id: variantId },
        data: {
            ...(size && { size }),
            ...(color && { color }),
            ...(colorCode !== undefined && { colorCode }),
            ...(price !== undefined && { price }),
            ...(compareAtPrice !== undefined && { compareAtPrice }),
            ...(costPrice !== undefined && { costPrice }),
            ...(lowStockThreshold !== undefined && { lowStockThreshold }),
            ...(isActive !== undefined && { isActive }),
        },
    });

    // Update product minPrice
    const allVariants = await prisma.productVariant.findMany({
        where: { productId: variant.productId }
    });
    const minPrice = Math.min(...allVariants.map(v => Number(v.price)));
    await prisma.product.update({
        where: { id: variant.productId },
        data: { minPrice }
    });

    return updated;
};

/**
 * Delete variant
 * Xóa biến thể
 *
 * Chức năng: Xóa một biến thể.
 * Luồng xử lý:
 * 1. Kiểm tra nếu biến thể đã có đơn hàng -> Không cho xóa.
 * 2. Xóa khỏi giỏ hàng người dùng (nếu đang nằm trong giỏ).
 * 3. Xóa record DB.
 * 4. Cập nhật `minPrice` sản phẩm cha.
 * @param {number} variantId - ID biến thể.
 */
const removeVariant = async (variantId) => {
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
            _count: { select: { orderItems: true, cartItems: true } },
        },
    });

    if (!variant) {
        throw new ApiError(404, 'Variant not found');
    }

    if (variant._count.orderItems > 0) {
        throw new ApiError(400, 'Cannot delete variant with order history. Deactivate instead.');
    }

    // Remove from carts
    if (variant._count.cartItems > 0) {
        await prisma.cartItem.deleteMany({ where: { variantId } });
    }

    await prisma.productVariant.delete({ where: { id: variantId } });

    // Update product minPrice
    const remainingVariants = await prisma.productVariant.findMany({
        where: { productId: variant.productId }
    });

    let minPrice = 0;
    if (remainingVariants.length > 0) {
        minPrice = Math.min(...remainingVariants.map(v => Number(v.price)));
    }

    await prisma.product.update({
        where: { id: variant.productId },
        data: { minPrice }
    });
};

/**
 * Add image to product
 * Thêm ảnh cho sản phẩm
 *
 * Chức năng: Thêm record ảnh vào DB.
 * @param {number} productId - Product ID.
 * @param {object} data - Dữ liệu ảnh.
 * @returns {Promise<object>} Image object.
 */
const addImage = async (productId, data) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    const { url, altText, variantId, isPrimary, sortOrder } = data;

    // If setting as primary, unset other primaries
    if (isPrimary) {
        await prisma.productImage.updateMany({
            where: { productId },
            data: { isPrimary: false },
        });
    }

    const image = await prisma.productImage.create({
        data: {
            productId,
            variantId,
            url,
            altText: altText || product.name,
            isPrimary: isPrimary || false,
            sortOrder: sortOrder || 0,
        },
    });

    return image;
};

/**
 * Delete image
 * Xóa ảnh
 *
 * Chức năng: Xóa ảnh khỏi DB và ổ cứng.
 * @param {number} imageId - Image ID.
 */
const removeImage = async (imageId) => {
    const image = await prisma.productImage.findUnique({
        where: { id: imageId },
    });

    if (!image) {
        throw new ApiError(404, 'Image not found');
    }

    // Delete file
    const filename = image.url.split('/').pop();
    await deleteFile(filename);

    await prisma.productImage.delete({ where: { id: imageId } });
};

/**
 * Update stock for variant
 * Cập nhật tồn kho
 *
 * Chức năng: Cộng/trừ số lượng tồn kho.
 * @param {number} variantId - ID biến thể.
 * @param {number} quantity - Số lượng thay đổi (dương để cộng, âm để trừ).
 * @param {string} type - 'stock' (tồn thực tế) hoặc 'availableStock' (có thể bán).
 * @returns {Promise<object>} Variant đã update.
 */
const updateStock = async (variantId, quantity, type = 'stock') => {
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
    });

    if (!variant) {
        throw new ApiError(404, 'Variant not found');
    }

    const field = type === 'availableStock' ? 'availableStock' : 'stock';
    const newValue = variant[field] + quantity;

    if (newValue < 0) {
        throw new ApiError(400, `Insufficient ${type}. Current: ${variant[field]}, Requested: ${Math.abs(quantity)}`);
    }

    const updated = await prisma.productVariant.update({
        where: { id: variantId },
        data: { [field]: newValue },
    });

    return updated;
};

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
    updateStock,
    generateSlug,
    generateSku,
};
