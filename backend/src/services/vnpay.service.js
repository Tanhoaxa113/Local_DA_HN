/**
 * VNPAY Service
 * Handles VNPAY payment gateway integration
 * Reference: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */
const crypto = require('crypto');
const querystring = require('querystring');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Sort object by keys alphabetically
 * @param {object} obj - Object to sort
 * @returns {object} Sorted object
 */
const sortObject = (obj) => {
    const sorted = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
        if (obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
            sorted[key] = obj[key];
        }
    }

    return sorted;
};

/**
 * Format date to VNPay format (yyyyMMddHHmmss)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');

    return (
        date.getFullYear().toString() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
};

/**
 * Create HMAC SHA512 signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} Signature
 */
const createSignature = (data, secret) => {
    return crypto
        .createHmac('sha512', secret)
        .update(Buffer.from(data, 'utf-8'))
        .digest('hex');
};

/**
 * Create VNPAY payment URL
 * @param {object} orderInfo - Order information
 * @param {string} clientIp - Client IP address
 * @returns {string} Payment URL
 */
const createPaymentUrl = (orderInfo, clientIp) => {
    const { orderNumber, amount, orderDescription, bankCode, language = 'vn' } = orderInfo;

    if (!config.vnpay.tmnCode || !config.vnpay.hashSecret) {
        throw new ApiError(500, 'VNPAY is not configured. Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET.');
    }

    const date = new Date();
    const createDate = formatDate(date);
    const expireDate = formatDate(new Date(date.getTime() + 15 * 60 * 1000)); // 15 minutes

    // Sanitize orderDescription - remove special characters that VNPAY doesn't accept
    const sanitizedDescription = (orderDescription || `Thanh toan don hang ${orderNumber}`)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .substring(0, 255);

    // Build params
    let vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: config.vnpay.tmnCode,
        vnp_Locale: language,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderNumber,
        vnp_OrderInfo: sanitizedDescription,
        vnp_OrderType: 'other',
        vnp_Amount: Math.round(amount * 100), // VNPay requires amount * 100
        vnp_ReturnUrl: config.vnpay.returnUrl,
        vnp_IpAddr: clientIp,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
    };

    if (bankCode) {
        vnpParams.vnp_BankCode = bankCode;
    }

    // Sort params alphabetically
    vnpParams = sortObject(vnpParams);

    // Create signature - VNPAY requires signing the raw query string (not URL encoded)
    const signData = new URLSearchParams(vnpParams).toString();
    const signature = createSignature(signData, config.vnpay.hashSecret);

    // Add signature to params
    vnpParams.vnp_SecureHash = signature;

    // Build payment URL with the same encoding
    const finalParams = new URLSearchParams(vnpParams).toString();
    const paymentUrl = `${config.vnpay.url}?${finalParams}`;

    return paymentUrl;
};

/**
 * Verify VNPAY return/IPN signature
 * @param {object} vnpParams - VNPay callback parameters
 * @returns {boolean} Whether signature is valid
 */
const verifySignature = (vnpParams) => {
    const secureHash = vnpParams.vnp_SecureHash;

    if (!secureHash) {
        return false;
    }

    // Remove signature fields
    const params = { ...vnpParams };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    // Sort and create signature - use URLSearchParams to match createPaymentUrl
    const sortedParams = sortObject(params);
    const signData = new URLSearchParams(sortedParams).toString();
    const expectedSignature = createSignature(signData, config.vnpay.hashSecret);

    return secureHash === expectedSignature;
};

/**
 * Parse VNPay response
 * @param {object} vnpParams - VNPay callback parameters
 * @returns {object} Parsed response
 */
const parseResponse = (vnpParams) => {
    return {
        orderNumber: vnpParams.vnp_TxnRef,
        amount: parseInt(vnpParams.vnp_Amount, 10) / 100,
        transactionId: vnpParams.vnp_TransactionNo,
        bankCode: vnpParams.vnp_BankCode,
        cardType: vnpParams.vnp_CardType,
        payDate: vnpParams.vnp_PayDate,
        responseCode: vnpParams.vnp_ResponseCode,
        transactionStatus: vnpParams.vnp_TransactionStatus,
        orderInfo: vnpParams.vnp_OrderInfo,
    };
};

/**
 * VNPay response codes
 */
const RESPONSE_CODES = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ.',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
    '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán.',
    '12': 'Thẻ/Tài khoản bị khóa.',
    '13': 'Sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Khách hàng hủy giao dịch',
    '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
    '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Lỗi không xác định',
};

/**
 * Check if payment is successful
 * @param {string} responseCode - VNPay response code
 * @returns {boolean} Whether payment is successful
 */
const isPaymentSuccessful = (responseCode) => {
    return responseCode === '00';
};

/**
 * Get response message
 * @param {string} responseCode - VNPay response code
 * @returns {string} Response message
 */
const getResponseMessage = (responseCode) => {
    return RESPONSE_CODES[responseCode] || 'Lỗi không xác định';
};

/**
 * Query transaction status
 * @param {string} orderNumber - Order number
 * @param {string} transactionDate - Transaction date (yyyyMMddHHmmss)
 * @returns {Promise<object>} Transaction status
 */
const queryTransaction = async (orderNumber, transactionDate) => {
    // This would make an API call to VNPay's query endpoint
    // For sandbox testing, we'll skip this
    throw new ApiError(501, 'Transaction query not implemented for sandbox');
};

/**
 * Request refund
 * @param {object} refundInfo - Refund information
 * @returns {Promise<object>} Refund result
 */
const requestRefund = async (refundInfo) => {
    // This would make an API call to VNPay's refund endpoint
    // For sandbox testing, we'll skip this
    throw new ApiError(501, 'Refund not implemented for sandbox');
};

module.exports = {
    createPaymentUrl,
    verifySignature,
    parseResponse,
    isPaymentSuccessful,
    getResponseMessage,
    queryTransaction,
    requestRefund,
    RESPONSE_CODES,
};
