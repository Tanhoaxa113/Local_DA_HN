/**
 * Location Routes
 * Public endpoints for province, district, and ward data
 */
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');

/**
 * @route   GET /api/locations/provinces
 * @desc    Get all provinces
 * @access  Public
 */
router.get('/provinces', locationController.getProvinces);

/**
 * @route   GET /api/locations/provinces/:id
 * @desc    Get province by ID with districts
 * @access  Public
 */
router.get('/provinces/:id', locationController.getProvinceById);

/**
 * @route   GET /api/locations/provinces/:provinceId/districts
 * @desc    Get districts by province
 * @access  Public
 */
router.get('/provinces/:provinceId/districts', locationController.getDistrictsByProvince);

/**
 * @route   GET /api/locations/districts/:id
 * @desc    Get district by ID with wards
 * @access  Public
 */
router.get('/districts/:id', locationController.getDistrictById);

/**
 * @route   GET /api/locations/districts/:districtId/wards
 * @desc    Get wards by district
 * @access  Public
 */
router.get('/districts/:districtId/wards', locationController.getWardsByDistrict);

/**
 * @route   GET /api/locations/search
 * @desc    Search locations by query
 * @access  Public
 */
router.get('/search', locationController.searchLocations);

module.exports = router;
