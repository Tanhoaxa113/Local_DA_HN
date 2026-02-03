/**
 * Location Controller
 * Điều khiển các request về dữ liệu địa lý (Tỉnh/Thành, Quận/Huyện, Phường/Xã).
 */
const locationService = require('../services/location.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');

/**
 * Get all provinces
 * Lấy danh sách Tỉnh/Thành phố
 * 
 * Chức năng: Trả về danh sách toàn bộ các tỉnh thành tại Việt Nam.
 * Luồng xử lý: Gọi `locationService.getProvinces` để lấy dữ liệu từ JSON/DB.
 * Kích hoạt khi: Người dùng mở dropdown chọn Tỉnh/Thành lúc nhập địa chỉ.
 * GET /api/locations/provinces
 */
const getProvinces = asyncHandler(async (req, res) => {
    const provinces = await locationService.getProvinces();
    return successResponse(res, provinces, 'Provinces retrieved successfully');
});

/**
 * Get province by ID
 * Lấy chi tiết Tỉnh/Thành
 * 
 * Chức năng: Lấy thông tin cụ thể của một tỉnh dựa trên ID (code).
 * Luồng xử lý:
 * 1. Lấy ID từ URL.
 * 2. Gọi `locationService.getProvinceById`.
 * 3. Trả về object tỉnh đó.
 * Kích hoạt khi: Cần hiển thị chi tiết tên/code của tỉnh (ít dùng trực tiếp).
 * GET /api/locations/provinces/:id
 */
const getProvinceById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const province = await locationService.getProvinceById(id);
    return successResponse(res, province, 'Province retrieved successfully');
});

/**
 * Get districts by province
 * Lấy danh sách Quận/Huyện theo Tỉnh
 * 
 * Chức năng: Lấy các quận huyện thuộc một tỉnh cụ thể.
 * Luồng xử lý:
 * 1. Lấy `provinceId` từ URL.
 * 2. Gọi `locationService.getDistrictsByProvince`.
 * 3. Trả về danh sách quận huyện.
 * Kích hoạt khi: Người dùng đã chọn Tỉnh, hệ thống load danh sách Quận tương ứng.
 * GET /api/locations/provinces/:provinceId/districts
 */
const getDistrictsByProvince = asyncHandler(async (req, res) => {
    const { provinceId } = req.params;
    const districts = await locationService.getDistrictsByProvince(provinceId);
    return successResponse(res, districts, 'Districts retrieved successfully');
});

/**
 * Get district by ID
 * Lấy chi tiết Quận/Huyện
 * 
 * Chức năng: Xem thông tin chi tiết một quận huyện.
 * Luồng xử lý:
 * 1. Lấy `id` từ URL.
 * 2. Gọi `locationService.getDistrictById`.
 * 3. Trả về object quận huyện.
 * GET /api/locations/districts/:id
 */
const getDistrictById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const district = await locationService.getDistrictById(id);
    return successResponse(res, district, 'District retrieved successfully');
});

/**
 * Get wards by district
 * Lấy danh sách Phường/Xã theo Quận
 * 
 * Chức năng: Lấy các phường xã thuộc một quận huyện cụ thể.
 * Luồng xử lý:
 * 1. Lấy `districtId` từ URL.
 * 2. Gọi `locationService.getWardsByDistrict`.
 * 3. Trả về danh sách phường xã.
 * Kích hoạt khi: Người dùng đã chọn Quận, hệ thống load danh sách Phường tương ứng.
 * GET /api/locations/districts/:districtId/wards
 */
const getWardsByDistrict = asyncHandler(async (req, res) => {
    const { districtId } = req.params;
    const wards = await locationService.getWardsByDistrict(districtId);
    return successResponse(res, wards, 'Wards retrieved successfully');
});

/**
 * Search locations
 * Tìm kiếm địa điểm
 * 
 * Chức năng: Tìm kiếm tỉnh/huyện/xã theo từ khóa.
 * Luồng xử lý:
 * 1. Lấy từ khóa `q` từ query string.
 * 2. Gọi `locationService.searchLocations`.
 * 3. Trả về kết quả khớp.
 * Kích hoạt khi: Người dùng gõ vào ô tìm kiếm địa chỉ nhanh.
 * GET /api/locations/search?q=query
 */
const searchLocations = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const results = await locationService.searchLocations(q);
    return successResponse(res, results, 'Search completed');
});

module.exports = {
    getProvinces,
    getProvinceById,
    getDistrictsByProvince,
    getDistrictById,
    getWardsByDistrict,
    searchLocations,
};
