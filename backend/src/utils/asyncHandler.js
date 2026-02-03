/**
 * Async handler wrapper to catch errors in async route handlers
 * Middleware bọc hàm Async để tự động bắt lỗi (Try-Catch).
 * 
 * Mô tả luồng:
 * 1. Nhận vào một hàm xử lý async (controller).
 * 2. Trả về một hàm middleware chuẩn Express (req, res, next).
 * 3. Khi middleware thực thi, nó gọi hàm async gốc và wrap kết quả vào Promise.resolve().
 * 4. Nếu hàm gốc chạy thành công -> Promise resolved -> Xử lý tiếp.
 * 5. Nếu hàm gốc ném lỗi (throw error) hoặc Promise rejected -> .catch(next) sẽ bắt lỗi và chuyển tới Global Error Handler.
 * 
 * Lợi ích: Giúp code gọn hơn, không cần viết try-catch ở từng Controller.
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
