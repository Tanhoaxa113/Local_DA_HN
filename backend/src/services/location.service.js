/**
 * Location Service
 * Handles province, district, and ward data
 */
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get all provinces
 * @returns {Promise<object[]>} List of provinces
 */
const getProvinces = async () => {
    const provinces = await prisma.province.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            code: true,
            name: true,
            fullName: true,
        },
    });

    return provinces;
};

/**
 * Get districts by province
 * @param {number} provinceId - Province ID
 * @returns {Promise<object[]>} List of districts
 */
const getDistrictsByProvince = async (provinceId) => {
    const province = await prisma.province.findUnique({
        where: { id: parseInt(provinceId, 10) },
    });

    if (!province) {
        throw new ApiError(404, 'Province not found');
    }

    const districts = await prisma.district.findMany({
        where: { provinceId: parseInt(provinceId, 10) },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            code: true,
            name: true,
            fullName: true,
        },
    });

    return districts;
};

/**
 * Get wards by district
 * @param {number} districtId - District ID
 * @returns {Promise<object[]>} List of wards
 */
const getWardsByDistrict = async (districtId) => {
    const district = await prisma.district.findUnique({
        where: { id: parseInt(districtId, 10) },
    });

    if (!district) {
        throw new ApiError(404, 'District not found');
    }

    const wards = await prisma.ward.findMany({
        where: { districtId: parseInt(districtId, 10) },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            code: true,
            name: true,
            fullName: true,
        },
    });

    return wards;
};

/**
 * Get province by ID with districts
 * @param {number} id - Province ID
 * @returns {Promise<object>} Province with districts
 */
const getProvinceById = async (id) => {
    const province = await prisma.province.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
            districts: {
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    fullName: true,
                },
            },
        },
    });

    if (!province) {
        throw new ApiError(404, 'Province not found');
    }

    return province;
};

/**
 * Get district by ID with wards
 * @param {number} id - District ID
 * @returns {Promise<object>} District with wards
 */
const getDistrictById = async (id) => {
    const district = await prisma.district.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
            province: {
                select: {
                    id: true,
                    name: true,
                },
            },
            wards: {
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    fullName: true,
                },
            },
        },
    });

    if (!district) {
        throw new ApiError(404, 'District not found');
    }

    return district;
};

/**
 * Search locations
 * @param {string} query - Search query
 * @returns {Promise<object>} Search results
 */
const searchLocations = async (query) => {
    if (!query || query.length < 2) {
        throw new ApiError(400, 'Search query must be at least 2 characters');
    }

    const [provinces, districts, wards] = await Promise.all([
        prisma.province.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { fullName: { contains: query } },
                ],
            },
            take: 5,
            select: {
                id: true,
                name: true,
                fullName: true,
            },
        }),
        prisma.district.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { fullName: { contains: query } },
                ],
            },
            take: 10,
            include: {
                province: {
                    select: { name: true },
                },
            },
        }),
        prisma.ward.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { fullName: { contains: query } },
                ],
            },
            take: 10,
            include: {
                district: {
                    select: {
                        name: true,
                        province: {
                            select: { name: true },
                        },
                    },
                },
            },
        }),
    ]);

    return {
        provinces,
        districts: districts.map((d) => ({
            ...d,
            provinceName: d.province?.name,
        })),
        wards: wards.map((w) => ({
            ...w,
            districtName: w.district?.name,
            provinceName: w.district?.province?.name,
        })),
    };
};

module.exports = {
    getProvinces,
    getDistrictsByProvince,
    getWardsByDistrict,
    getProvinceById,
    getDistrictById,
    searchLocations,
};
