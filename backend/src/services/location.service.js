/**
 * Location Service
 * Handles province, district, and ward data
 * Dịch vụ cung cấp thông tin hành chính (Tỉnh/Thành, Quận/Huyện, Phường/Xã)
 */
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get all provinces
 * Lấy danh sách Tỉnh/Thành
 * @returns {Promise<object[]>} Danh sách tỉnh thành.
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
 * Lấy danh sách Quận/Huyện theo Tỉnh
 *
 * Chức năng: User chọn Tỉnh -> Load danh sách Quận của Tỉnh đó.
 * @param {number} provinceId - ID Tỉnh.
 * @returns {Promise<object[]>} Danh sách quận huyện.
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
 * Lấy danh sách Phường/Xã theo Quận
 *
 * Chức năng: User chọn Quận -> Load danh sách Phường.
 * @param {number} districtId - ID Quận.
 * @returns {Promise<object[]>} Danh sách phường xã.
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
 * Lấy chi tiết Tỉnh kèm danh sách Quận
 * @param {number} id - ID Tỉnh.
 * @returns {Promise<object>} Tỉnh và danh sách quận.
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
 * Lấy chi tiết Quận kèm danh sách Phường
 * @param {number} id - ID Quận.
 * @returns {Promise<object>} Quận và danh sách phường.
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
 * Tìm kiếm địa điểm
 *
 * Chức năng: Search box tìm tỉnh/huyện/xã.
 * Luồng xử lý: Tìm kiếm đồng thời trong 3 bảng Province, District, Ward.
 * @param {string} query - Từ khóa tìm kiếm.
 * @returns {Promise<object>} Kết quả tìm kiếm gộp.
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
