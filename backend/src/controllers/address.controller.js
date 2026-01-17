/**
 * Address Controller
 * Handles HTTP requests for address endpoints
 */
const addressService = require('../services/address.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');

/**
 * Get current user's addresses
 * GET /api/addresses
 */
const getMyAddresses = asyncHandler(async (req, res) => {
    const addresses = await addressService.getUserAddresses(req.user.id);
    sendSuccess(res, addresses, 'Addresses retrieved');
});

/**
 * Get address by ID
 * GET /api/addresses/:id
 */
const getById = asyncHandler(async (req, res) => {
    const address = await addressService.getById(
        parseInt(req.params.id, 10),
        req.user.id
    );
    sendSuccess(res, address, 'Address retrieved');
});

/**
 * Create new address
 * POST /api/addresses
 */
const create = asyncHandler(async (req, res) => {
    const address = await addressService.create(req.user.id, req.body);
    sendCreated(res, address, 'Address created');
});

/**
 * Update address
 * PUT /api/addresses/:id
 */
const update = asyncHandler(async (req, res) => {
    const address = await addressService.update(
        parseInt(req.params.id, 10),
        req.user.id,
        req.body
    );
    sendSuccess(res, address, 'Address updated');
});

/**
 * Delete address
 * DELETE /api/addresses/:id
 */
const remove = asyncHandler(async (req, res) => {
    await addressService.remove(
        parseInt(req.params.id, 10),
        req.user.id
    );
    sendNoContent(res);
});

/**
 * Set address as default
 * POST /api/addresses/:id/default
 */
const setDefault = asyncHandler(async (req, res) => {
    const address = await addressService.setDefault(
        parseInt(req.params.id, 10),
        req.user.id
    );
    sendSuccess(res, address, 'Default address set');
});

module.exports = {
    getMyAddresses,
    getById,
    create,
    update,
    remove,
    setDefault,
};
