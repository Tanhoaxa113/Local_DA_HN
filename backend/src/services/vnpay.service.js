/**
 * VNPAY Service
 * Handles VNPAY payment gateway integration
 * Reference: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * Tích hợp cổng thanh toán VNPAY
 */
const crypto = require('crypto');
const querystring = require('querystring');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Sort object by keys alphabetically
 * Sắp xếp object theo key
 *
 * Chức năng: VNPAY yêu cầu các tham số phải được sắp xếp theo bảng chữ cái trước khi tạo chữ ký.
 * @param {object} obj - Object cần submit.
 * @returns {object} Object đã sắp xếp.
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
 * Format date to VNPay format (yyyyMMddHHmmss) in GMT+7
 * Format ngày giờ theo chuẩn VNPAY
 * @param {Date} date - Ngày giờ.
 * @returns {string} Chuỗi format (VD: 20231025143000).
 */
const formatDate = (date) => {
    // Ensure we use GMT+7 (Asia/Ho_Chi_Minh)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type) => parts.find(p => p.type === type).value;

    return (
        getPart('year') +
        getPart('month') +
        getPart('day') +
        getPart('hour') +
        getPart('minute') +
        getPart('second')
    );
};

/**
 * Create HMAC SHA512 signature
 * Tạo chữ ký bảo mật
 * @param {string} data - Chuỗi dữ liệu.
 * @param {string} secret - Khóa bí mật (Hash Secret).
 * @returns {string} Chữ ký (Checksum).
 */
const createSignature = (data, secret) => {
    return crypto
        .createHmac('sha512', secret)
        .update(Buffer.from(data, 'utf-8'))
        .digest('hex');
};


/**
 * Create VNPAY payment URL
 * Tạo URL thanh toán
 *
 * Chức năng: Tạo URL để redirect user sang trang thanh toán của VNPAY.
 * Luồng xử lý:
 * 1. Lấy thông tin đơn hàng, IP.
 * 2. Tạo các tham số chuẩn (`vnp_Version`, `vnp_Command`, `vnp_Amount`...).
 * 3. Sắp xếp tham số.
 * 4. Tạo chữ ký bảo mật (Secure Hash).
 * 5. Ghép thành URL hoàn chỉnh.
 * @param {object} orderInfo - Thông tin đơn (số tiền, mã đơn...).
 * @param {string} clientIp - IP khách hàng.
 * @returns {string} URL thanh toán.
 */
const createPaymentUrl = (orderInfo, clientIp) => {
    const { orderNumber, amount, orderDescription, bankCode, language = 'vn' } = orderInfo;

    if (!config.vnpay.tmnCode || !config.vnpay.hashSecret) {
        throw new ApiError(500, 'VNPAY is not configured. Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET.');
    }

    const date = new Date();
    const createDate = formatDate(date);

    // Add 15 minutes for expiration
    const expireDateRaw = new Date(date.getTime() + 15 * 60 * 1000);
    const expireDate = formatDate(expireDateRaw);

    // Sanitize orderDescription - remove special characters that VNPAY doesn't accept
    const sanitizedDescription = (orderDescription || `Thanh toan don hang ${orderNumber}`)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .substring(0, 255);

    // Sanitize IP
    const sanitizedIp = (!clientIp || clientIp === '::1') ? '127.0.0.1' : clientIp;

    // Build params
    let vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: config.vnpay.tmnCode,
        vnp_Locale: language,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: `${orderNumber}_${date.getTime()}`, // Make unique
        vnp_OrderInfo: sanitizedDescription,
        vnp_OrderType: 'other',
        vnp_Amount: Math.round(amount * 100), // VNPay requires amount * 100
        vnp_ReturnUrl: config.vnpay.returnUrl,
        vnp_IpAddr: sanitizedIp,
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
 * Kiểm tra chữ ký trả về
 *
 * Chức năng: Xác thực dữ liệu trả về từ VNPAY có đúng là từ họ gửi không (chống giả mạo).
 * Luồng xử lý:
 * 1. Lấy `vnp_SecureHash` từ dữ liệu trả về.
 * 2. Xóa `vnp_SecureHash` khỏi params.
 * 3. Sắp xếp params còn lại và hash lại theo key bí mật.
 * 4. So sánh hash mới tạo với `vnp_SecureHash`.
 * @param {object} vnpParams - Tham số VNPAY trả về.
 * @returns {boolean} True nếu chữ ký đúng.
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
    // VNPAY 2.1.0 requires sorting and then using URLSearchParams to create query string for signing
    // This must match exactly how the query string was created for the request
    const signData = new URLSearchParams(sortedParams).toString();
    const expectedSignature = createSignature(signData, config.vnpay.hashSecret);

    return secureHash === expectedSignature;
};

/**
 * Parse VNPay response
 * Phân tích dữ liệu trả về
 * @param {object} vnpParams - Dữ liệu thô.
 * @returns {object} Dữ liệu đã chuẩn hóa (Amount / 100, lấy OrderNumber gốc...).
 */
const parseResponse = (vnpParams) => {
    // Strip suffix from orderNumber (TxnRef)
    let orderNumber = vnpParams.vnp_TxnRef;
    if (orderNumber && orderNumber.includes('_')) {
        orderNumber = orderNumber.split('_')[0];
    }

    return {
        orderNumber: orderNumber,
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
 * Mã lỗi trả về từ VNPAY
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
 * Kiểm tra giao dịch thành công
 * @param {string} responseCode - Mã trả về.
 * @returns {boolean} True nếu thành công (00).
 */
const isPaymentSuccessful = (responseCode) => {
    return responseCode === '00';
};

/**
 * Get response message
 * Lấy thông báo lỗi tiếng Việt
 * @param {string} responseCode - Mã trả về.
 * @returns {string} Thông báo lỗi.
 */
const getResponseMessage = (responseCode) => {
    return RESPONSE_CODES[responseCode] || 'Lỗi không xác định';
};

/**
 * Query transaction status
 * Truy vấn trạng thái giao dịch (Query DR)
 *
 * Chức năng: Kiểm tra trạng thái đơn bên VNPAY (dùng khi không nhận được IPN).
 * @param {string} orderNumber - Mã đơn hàng.
 * @param {string} transactionDate - Ngày giao dịch.
 * @returns {Promise<object>} Trạng thái.
 */
const queryTransaction = async (orderNumber, transactionDate) => {
    // This would make an API call to VNPay's query endpoint
    // For sandbox testing, we'll skip this
    throw new ApiError(501, 'Transaction query not implemented for sandbox');
};

/**
 * Request refund
 * Yêu cầu hoàn tiền
 *
 * Chức năng: Hoàn tiền một phần hoặc toàn phần cho giao dịch VNPAY.
 * @param {object} refundInfo - Thông tin hoàn tiền.
 * @returns {Promise<object>} Kết quả hoàn tiền.
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
