/**
 * Location Controller
 * Handles HTTP requests for location data
 */
const locationService = require('../services/location.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');

/**
 * Get all provinces
 * GET /api/locations/provinces
 */
const getProvinces = asyncHandler(async (req, res) => {
    const provinces = await locationService.getProvinces();
    return successResponse(res, provinces, 'Provinces retrieved successfully');
});

/**
 * Get province by ID
 * GET /api/locations/provinces/:id
 */
const getProvinceById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const province = await locationService.getProvinceById(id);
    return successResponse(res, province, 'Province retrieved successfully');
});

/**
 * Get districts by province
 * GET /api/locations/provinces/:provinceId/districts
 */
const getDistrictsByProvince = asyncHandler(async (req, res) => {
    const { provinceId } = req.params;
    const districts = await locationService.getDistrictsByProvince(provinceId);
    return successResponse(res, districts, 'Districts retrieved successfully');
});

/**
 * Get district by ID
 * GET /api/locations/districts/:id
 */
const getDistrictById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const district = await locationService.getDistrictById(id);
    return successResponse(res, district, 'District retrieved successfully');
});

/**
 * Get wards by district
 * GET /api/locations/districts/:districtId/wards
 */
const getWardsByDistrict = asyncHandler(async (req, res) => {
    const { districtId } = req.params;
    const wards = await locationService.getWardsByDistrict(districtId);
    return successResponse(res, wards, 'Wards retrieved successfully');
});

/**
 * Search locations
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
