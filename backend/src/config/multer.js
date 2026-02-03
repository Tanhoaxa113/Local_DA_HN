/**
 * Multer Configuration
 * File upload handling for product images
 * Cấu hình Multer để upload ảnh
 */
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./index');
const ApiError = require('../utils/ApiError');

// Storage configuration
// Cấu hình nơi lưu trữ file (Disk Storage)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', config.upload.uploadDir));
    },
    filename: (req, file, cb) => {
        // Generate unique filename: uuid-timestamp.extension
        // Tạo tên file duy nhất: uuid-timestamp.extension
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${uuidv4()}-${Date.now()}${ext}`;
        cb(null, filename);
    },
});

// File filter for images only
// Bộ lọc file (Chỉ cho phép ảnh)
const imageFileFilter = (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, `Invalid file type. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`), false);
    }
};

// Single image upload
// Upload 1 ảnh
const uploadSingle = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: config.upload.maxFileSize,
    },
}).single('image');

// Multiple images upload (max 10)
// Upload nhiều ảnh (tối đa 10)
const uploadMultiple = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: config.upload.maxFileSize,
        files: 10,
    },
}).array('images', 10);

// Upload with multiple fields
// Upload nhiều trường (thumbnail, images, variantImages)
const uploadFields = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: config.upload.maxFileSize,
        files: 20,
    },
}).fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'variantImages', maxCount: 20 },
]);

/**
 * Middleware wrapper to handle multer errors
 * Wrapper đóng gói middleware của Multer để bắt và xử lý lỗi đồng nhất.
 * 
 * Mô tả luồng:
 * 1. Nhận vào middleware upload gốc của Multer (ví dụ: uploadSingle).
 * 2. Trả về một middleware mới của Express (req, res, next).
 * 3. Gọi middleware gốc và lắng nghe callback 'err'.
 * 4. Nếu có lỗi từ Multer (loại multer.MulterError):
 *    - LIMIT_FILE_SIZE: Lỗi file quá lớn -> Trả về lỗi 400 kèm thông báo max size.
 *    - LIMIT_FILE_COUNT: Lỗi quá nhiều file -> Trả về lỗi 400.
 *    - LIMIT_UNEXPECTED_FILE: Lỗi field name không đúng hoặc dư thừa -> Trả về lỗi 400.
 * 5. Nếu có lỗi khác (không phải từ Multer) -> Chuyển tiếp cho Global Error Handler (next(err)).
 * 6. Nếu không có lỗi -> Gọi next() để sang controller tiếp theo.
 * 
 * Trigger: Được sử dụng khi định nghĩa route upload file (ví dụ: router.post('/upload', uploadSingle, controller)).
 * 
 * @param {function} uploadMiddleware - Multer upload middleware
 * @returns {function} Express middleware
 */
const handleUpload = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new ApiError(400, `File too large. Maximum size: ${config.upload.maxFileSize / (1024 * 1024)}MB`));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new ApiError(400, 'Too many files uploaded'));
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return next(new ApiError(400, `Unexpected field: ${err.field}`));
                }
                return next(new ApiError(400, err.message));
            }
            if (err) {
                return next(err);
            }
            next();
        });
    };
};

/**
 * Get file URL from filename
 * Lấy URL công khai của file từ tên file
 * @param {string} filename - Uploaded filename
 * @returns {string} Public URL
 */
const getFileUrl = (filename) => {
    return `/uploads/${filename}`;
};

/**
 * Delete uploaded file
 * Xóa file đã upload
 * @param {string} filename - Filename to delete
 * @returns {Promise<void>}
 */
const deleteFile = async (filename) => {
    const fs = require('fs').promises;
    const filePath = path.join(__dirname, '..', '..', config.upload.uploadDir, filename);

    try {
        await fs.unlink(filePath);
    } catch (error) {
        // File doesn't exist or already deleted
        console.warn(`Failed to delete file: ${filename}`, error.message);
    }
};

module.exports = {
    storage,
    uploadSingle: handleUpload(uploadSingle),
    uploadMultiple: handleUpload(uploadMultiple),
    uploadFields: handleUpload(uploadFields),
    getFileUrl,
    deleteFile,
};
