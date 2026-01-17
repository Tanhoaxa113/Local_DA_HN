# Tính năng Hệ thống (System Features)

Tài liệu mô tả các tính năng chính của hệ thống và API tương ứng được sử dụng.

## 1. Quản lý Tài khoản (Account Management)

### Đăng ký / Đăng nhập
- **Mô tả**: Cho phép người dùng tạo tài khoản mới và đăng nhập vào hệ thống để mua hàng.
- **API sử dụng**: `/api/auth/register`, `/api/auth/login`.

### Quản lý Hồ sơ
- **Mô tả**: Người dùng có thể cập nhật thông tin cá nhân, avatar, đổi mật khẩu.
- **API sử dụng**: `/api/auth/profile`, `/api/auth/change-password`.

### Sổ địa chỉ (Address Book)
- **Mô tả**: Lưu nhiều địa chỉ giao hàng để chọn nhanh khi thanh toán.
- **API sử dụng**: `/api/addresses`.

## 2. Mua sắm (Shopping)

### Duyệt sản phẩm
- **Mô tả**: Xem danh sách sản phẩm, lọc theo danh mục, giá, thương hiệu và sắp xếp.
- **API sử dụng**: `/api/products` (kết hợp các query params lọc).

### Tìm kiếm sản phẩm
- **Mô tả**: Tìm kiếm sản phẩm theo tên.
- **API sử dụng**: `/api/products?search=keyword`.

### Giỏ hàng (Shopping Cart)
- **Mô tả**: Thêm sản phẩm vào giỏ, xem giỏ hàng, cập nhật số lượng hoặc xóa sản phẩm trước khi thanh toán.
- **Đặc điểm**: Giỏ hàng được lưu trong Database, đồng bộ giữa các thiết bị.
- **API sử dụng**: `/api/cart`.

## 3. Đặt hàng & Thanh toán (Checkout)

### Quy trình đặt hàng
- **Mô tả**: Chuyển đổi giỏ hàng thành đơn hàng. Người dùng chọn địa chỉ giao nhận, phương thức vận chuyển và phương thức thanh toán.
- **API sử dụng**: `/api/orders` (POST).

### Thanh toán Online (VNPAY)
- **Mô tả**: Tích hợp cổng thanh toán VNPAY.
- **Luồng**: Tạo đơn -> Nhận URL thanh toán -> Chuyển hướng sang VNPAY -> VNPAY trả về kết quả -> Cập nhật trạng thái đơn hàng.
- **API sử dụng**: `/api/payment/vnpay/create_url`, `/api/payment/vnpay/ipn`.

### Thanh toán khi nhận hàng (COD)
- **Mô tả**: Đặt hàng trước, trả tiền mặt khi nhận hàng. Đơn hàng sẽ ở trạng thái chờ xác nhận.

## 4. Quản lý Đơn hàng (Order Management)

### Theo dõi đơn hàng
- **Mô tả**: Người dùng xem lại lịch sử đơn hàng và trạng thái hiện tại (Đang xử lý, Đang giao, Đã giao...).
- **API sử dụng**: `/api/orders`, `/api/orders/:id`.

### Hủy đơn hàng
- **Mô tả**: Người dùng có thể tự hủy đơn hàng nếu đơn hàng chưa được chuyển sang trạng thái "Đang giao".
- **API sử dụng**: `/api/orders/:id/cancel`.

### Xác nhận hoàn tiền/đã nhận hàng
- **Mô tả**: Xác nhận đã nhận hàng để hoàn tất đơn hàng và nhận điểm thưởng.

## 5. Hệ thống Loyalty (Thành viên thân thiết)

### Tích điểm
- **Mô tả**: Mỗi đơn hàng thành công sẽ tích lũy điểm thưởng dựa trên giá trị đơn hàng.

### Hạng thành viên (Tier)
- **Mô tả**: Tự động nâng hạng (Bronze, Silver, Gold...) khi đủ điểm tích lũy.
- **Quyền lợi**: Hạng cao sẽ được giảm giá trực tiếp trên đơn hàng (theo % và giới hạn tối đa/tháng).

## 6. Phân quyền & Quản trị (Roles & Permissions)

Hệ thống phân quyền chi tiết cho các vai trò nhân viên để đảm bảo quy trình vận hành chính xác và an toàn.

### ADMIN (Quản trị viên)
- **Quyền hạn**: Toàn quyền truy cập hệ thống.
- **Chức năng**: Quản lý người dùng, phân quyền, cấu hình hệ thống, xem báo cáo doanh thu toàn diện.

### SALES_MANAGER (Quản lý Bán hàng)
- **Truy cập**: Dashboard, Sản phẩm, Đơn hàng, Danh mục, Thương hiệu, Khách hàng.
- **Chức năng đặc biệt**:
  - Phê duyệt yêu cầu hoàn tiền (`REFUND_REQUESTED` -> `REFUNDING`).
  - Xác nhận đã hoàn tiền (`REFUNDING` -> `REFUNDED`).
  - Hủy đơn hàng.
  - Quản lý kho hàng hóa (Sản phẩm, Danh mục, Thương hiệu).

### SALES_STAFF (Nhân viên Bán hàng)
- **Truy cập**: Dashboard, Đơn hàng, Khách hàng.
- **Nhiệm vụ chính**:
  - Xem danh sách đơn hàng mới.
  - Xác nhận đơn hàng (`PENDING_CONFIRMATION` -> `PREPARING`).
  - Hỗ trợ khách hàng.
  - **Lưu ý**: Không được phép chỉnh sửa sản phẩm hay cấu hình hệ thống. Dashboard bị giới hạn (không thấy nút "Thêm sản phẩm").

### WAREHOUSE (Nhân viên Kho)
- **Truy cập**: Dashboard, Đơn hàng, Sản phẩm (Xem & Quản lý tồn kho).
- **Nhiệm vụ chính**:
  - Nhận thông báo khi đơn hàng chuyển sang trạng thái `PREPARING`.
  - Đóng gói và xác nhận "Sẵn sàng giao" (`READY_TO_SHIP`).
  - Cập nhật quá trình giao hàng (`IN_TRANSIT`, `DELIVERED`).
  - **Thu COD**: Xác nhận đã thu tiền từ shipper cho đơn COD (`PAYMENT_CONFIRM_COD`). Trạng thái thanh toán sẽ chuyển thành `PAID`.
