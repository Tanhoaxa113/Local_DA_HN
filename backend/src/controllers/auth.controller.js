/**
 * Authentication Controller
 * Xử lý các yêu cầu HTTP liên quan đến xác thực (Đăng ký, Đăng nhập, ...)
 */
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');

/**
 * Register a new user
 * Đăng ký người dùng mới
 *
 * Chức năng: Tạo tài khoản mới cho người dùng (Khách hàng).
 * Luồng xử lý:
 * 1. Nhận email, password, fullName, phone từ yêu cầu (req.body).
 * 2. Gọi service `authService.register` để xử lý logic tạo user trong DB.
 * 3. Trả về thông tin user vừa tạo và token (nếu có) cho client.
 * Kích hoạt khi: Người dùng điền form đăng ký và nhấn nút "Đăng ký".
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
    const { email, password, fullName, phone } = req.body;

    const result = await authService.register({
        email,
        password,
        fullName,
        phone,
    });

    sendCreated(res, result, 'Registration successful');
});

/**
 * Login user
 * Đăng nhập người dùng
 *
 * Chức năng: Xác thực người dùng và cấp token truy cập.
 * Luồng xử lý:
 * 1. Nhận email và password từ yêu cầu.
 * 2. Gọi service `authService.login` để kiểm tra thông tin đăng nhập.
 * 3. Nếu đúng, trả về accessToken và refreshToken.
 * Kích hoạt khi: Người dùng điền email/pass và nhấn nút "Đăng nhập".
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    sendSuccess(res, result, 'Login successful');
});

/**
 * Refresh access token
 * Làm mới token truy cập
 *
 * Chức năng: Cấp lại accessToken mới khi token cũ hết hạn mà không cần đăng nhập lại.
 * Luồng xử lý:
 * 1. Nhận refreshToken từ client.
 * 2. Gọi service `authService.refresh` để kiểm tra tính hợp lệ của refreshToken.
 * 3. Nếu hợp lệ, trả về cặp token mới.
 * Kích hoạt khi: AccessToken hết hạn (thường do frontend tự động gọi interceptor).
 * POST /api/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await authService.refresh(refreshToken);

    sendSuccess(res, result, 'Token refreshed successfully');
});

/**
 * Logout user
 * Đăng xuất người dùng
 *
 * Chức năng: Hủy bỏ refreshToken hiện tại, ngăn người dùng tiếp tục sử dụng phiên làm việc này.
 * Luồng xử lý:
 * 1. Nhận refreshToken từ client.
 * 2. Gọi service `authService.logout` để xóa refreshToken khỏi DB (hoặc whitelist).
 * 3. Phản hồi thành công.
 * Kích hoạt khi: Người dùng nhấn nút "Đăng xuất".
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    sendSuccess(res, null, 'Logout successful');
});

/**
 * Logout from all devices
 * Đăng xuất khỏi mọi thiết bị
 *
 * Chức năng: Xóa toàn bộ refreshToken của user này, buộc mọi thiết bị phải đăng nhập lại.
 * Luồng xử lý:
 * 1. Lấy userId từ thông tin user đã xác thực (req.user.id).
 * 2. Gọi service `authService.logoutAll`.
 * 3. Phản hồi thành công.
 * Kích hoạt khi: Người dùng chọn "Đăng xuất khỏi mọi nơi" hoặc đổi mật khẩu.
 * POST /api/auth/logout-all
 */
const logoutAll = asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user.id);

    sendSuccess(res, null, 'Logged out from all devices successfully');
});

/**
 * Get current user profile
 * Lấy thông tin cá nhân
 *
 * Chức năng: Trả về thông tin chi tiết của user đang đăng nhập.
 * Luồng xử lý:
 * 1. Lấy userId từ token (req.user.id).
 * 2. Gọi service `authService.getProfile` để tìm user trong DB.
 * 3. Trả về object user (đã loại bỏ password).
 * Kích hoạt khi: Người dùng vào trang "Hồ sơ cá nhân" hoặc khi web tải lại để lấy thông tin user.
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    sendSuccess(res, user, 'Profile retrieved successfully');
});

/**
 * Update current user profile
 * Cập nhật thông tin cá nhân
 *
 * Chức năng: Cho phép user sửa tên, số điện thoại, avatar.
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Nhận dữ liệu cần sửa từ req.body.
 * 3. Gọi service `authService.updateProfile` để update DB.
 * 4. Trả về thông tin user mới nhất.
 * Kích hoạt khi: Người dùng sửa form hồ sơ và nhấn "Lưu".
 * PUT /api/auth/me
 */
const updateMe = asyncHandler(async (req, res) => {
    const { fullName, phone, avatar } = req.body;

    const user = await authService.updateProfile(req.user.id, {
        fullName,
        phone,
        avatar,
    });

    sendSuccess(res, user, 'Profile updated successfully');
});

/**
 * Change password
 * Đổi mật khẩu
 *
 * Chức năng: Cho phép user đổi mật khẩu cũ sang mật khẩu mới.
 * Luồng xử lý:
 * 1. Lấy userId từ token.
 * 2. Nhận mật khẩu cũ và mới từ req.body.
 * 3. Gọi service `authService.changePassword` để kiểm tra mk cũ và hash mk mới lưu vào DB.
 * 4. Phản hồi thành công, yêu cầu đăng nhập lại (tùy logic frontend).
 * Kích hoạt khi: Người dùng vào trang đổi mật khẩu và thực hiện.
 * POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    sendSuccess(res, null, 'Password changed successfully. Please login again.');
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    getMe,
    updateMe,
    changePassword,
};
