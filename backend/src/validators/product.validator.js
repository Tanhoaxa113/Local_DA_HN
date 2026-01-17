/**
 * Product Validation Schemas
 * Validation schemas for product, category, and brand endpoints
 */

const createProductSchema = {
    body: {
        name: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 200,
        },
        description: {
            required: false,
            type: 'string',
            maxLength: 5000,
        },
        categoryId: {
            required: true,
            type: 'integer',
            min: 1,
        },
        brandId: {
            required: false,
            type: 'integer',
            min: 1,
        },
        isFeatured: {
            required: false,
            type: 'boolean',
        },
    },
};

const updateProductSchema = {
    params: {
        id: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        name: {
            required: false,
            type: 'string',
            minLength: 2,
            maxLength: 200,
        },
        description: {
            required: false,
            type: 'string',
            maxLength: 5000,
        },
        categoryId: {
            required: false,
            type: 'integer',
            min: 1,
        },
        brandId: {
            required: false,
            type: 'integer',
            min: 1,
        },
        isFeatured: {
            required: false,
            type: 'boolean',
        },
        isActive: {
            required: false,
            type: 'boolean',
        },
    },
};

const createVariantSchema = {
    params: {
        productId: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        size: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 20,
        },
        color: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 50,
        },
        colorCode: {
            required: false,
            type: 'string',
            maxLength: 10,
        },
        price: {
            required: true,
            type: 'number',
            min: 0,
        },
        compareAtPrice: {
            required: false,
            type: 'number',
            min: 0,
        },
        costPrice: {
            required: false,
            type: 'number',
            min: 0,
        },
        stock: {
            required: false,
            type: 'integer',
            min: 0,
        },
        lowStockThreshold: {
            required: false,
            type: 'integer',
            min: 0,
        },
    },
};

const updateVariantSchema = {
    params: {
        variantId: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        size: {
            required: false,
            type: 'string',
            minLength: 1,
            maxLength: 20,
        },
        color: {
            required: false,
            type: 'string',
            minLength: 1,
            maxLength: 50,
        },
        colorCode: {
            required: false,
            type: 'string',
            maxLength: 10,
        },
        price: {
            required: false,
            type: 'number',
            min: 0,
        },
        compareAtPrice: {
            required: false,
            type: 'number',
            min: 0,
        },
        costPrice: {
            required: false,
            type: 'number',
            min: 0,
        },
        lowStockThreshold: {
            required: false,
            type: 'integer',
            min: 0,
        },
        isActive: {
            required: false,
            type: 'boolean',
        },
    },
};

const createCategorySchema = {
    body: {
        name: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 100,
        },
        description: {
            required: false,
            type: 'string',
            maxLength: 1000,
        },
        parentId: {
            required: false,
            type: 'integer',
            min: 1,
        },
        sortOrder: {
            required: false,
            type: 'integer',
            min: 0,
        },
    },
};

const updateCategorySchema = {
    params: {
        id: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        name: {
            required: false,
            type: 'string',
            minLength: 1,
            maxLength: 100,
        },
        description: {
            required: false,
            type: 'string',
            maxLength: 1000,
        },
        parentId: {
            required: false,
            type: 'integer',
            min: 1,
        },
        sortOrder: {
            required: false,
            type: 'integer',
            min: 0,
        },
        isActive: {
            required: false,
            type: 'boolean',
        },
    },
};

const createBrandSchema = {
    body: {
        name: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 100,
        },
        description: {
            required: false,
            type: 'string',
            maxLength: 1000,
        },
    },
};

const updateBrandSchema = {
    params: {
        id: {
            required: true,
            type: 'integer',
        },
    },
    body: {
        name: {
            required: false,
            type: 'string',
            minLength: 1,
            maxLength: 100,
        },
        description: {
            required: false,
            type: 'string',
            maxLength: 1000,
        },
        isActive: {
            required: false,
            type: 'boolean',
        },
    },
};

const productQuerySchema = {
    query: {
        page: {
            required: false,
            type: 'integer',
            min: 1,
        },
        limit: {
            required: false,
            type: 'integer',
            min: 1,
            max: 100,
        },
        categoryId: {
            required: false,
            type: 'integer',
        },
        brandId: {
            required: false,
            type: 'integer',
        },
        minPrice: {
            required: false,
            type: 'number',
            min: 0,
        },
        maxPrice: {
            required: false,
            type: 'number',
            min: 0,
        },
        size: {
            required: false,
            type: 'string',
        },
        color: {
            required: false,
            type: 'string',
        },
        search: {
            required: false,
            type: 'string',
            maxLength: 100,
        },
        isFeatured: {
            required: false,
            type: 'boolean',
        },
        sortBy: {
            required: false,
            type: 'string',
            enum: ['createdAt', 'name', 'price', 'totalSold', 'bestselling'],
        },
        sortOrder: {
            required: false,
            type: 'string',
            enum: ['asc', 'desc'],
        },
    },
};

module.exports = {
    createProductSchema,
    updateProductSchema,
    createVariantSchema,
    updateVariantSchema,
    createCategorySchema,
    updateCategorySchema,
    createBrandSchema,
    updateBrandSchema,
    productQuerySchema,
};
