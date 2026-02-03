/**
 * Location Routes
 * Public endpoints for province, district, and ward data
 * Routes cung cấp dữ liệu hành chính (Tỉnh/Thành, Quận/Huyện, Phường/Xã)
 */
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');

/**
 * @route   GET /api/locations/provinces
 * @desc    Get all provinces
 * @access  Public
 * Lấy danh sách tất cả Tỉnh/Thành phố
 */
router.get('/provinces', locationController.getProvinces);

/**
 * @route   GET /api/locations/provinces/:id
 * @desc    Get province by ID with districts
 * @access  Public
 * Lấy chi tiết Tỉnh/Thành kèm danh sách Quận/Huyện trực thuộc
 */
router.get('/provinces/:id', locationController.getProvinceById);

/**
 * @route   GET /api/locations/provinces/:provinceId/districts
 * @desc    Get districts by province
 * @access  Public
 * Lấy danh sách Quận/Huyện của một Tỉnh/Thành
 */
router.get('/provinces/:provinceId/districts', locationController.getDistrictsByProvince);

/**
 * @route   GET /api/locations/districts/:id
 * @desc    Get district by ID with wards
 * @access  Public
 * Lấy chi tiết Quận/Huyện kèm danh sách Phường/Xã trực thuộc
 */
router.get('/districts/:id', locationController.getDistrictById);

/**
 * @route   GET /api/locations/districts/:districtId/wards
 * @desc    Get wards by district
 * @access  Public
 * Lấy danh sách Phường/Xã của một Quận/Huyện
 */
router.get('/districts/:districtId/wards', locationController.getWardsByDistrict);

/**
 * @route   GET /api/locations/search
 * @desc    Search locations by query
 * @access  Public
 * Tìm kiếm địa điểm (Query parameters: q=...)
 */
router.get('/search', locationController.searchLocations);

module.exports = router;
