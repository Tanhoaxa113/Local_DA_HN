# Tài liệu API (API Documentation)

Mô tả các Endpoint API chính của hệ thống Backend.

## 1. Authentication (Xác thực)

### Đăng ký
- **Endpoint**: `POST /api/auth/register`
- **Body**: `{ email, password, fullName, phone }`
- **Mô tả**: Tạo tài khoản khách hàng mới.

### Đăng nhập
- **Endpoint**: `POST /api/auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ user, accessToken, refreshToken }`

### Refresh Token
- **Endpoint**: `POST /api/auth/refresh-token`
- **Body**: `{ refreshToken }`
- **Mô tả**: Cấp lại Access Token mới khi token cũ hết hạn.

## 2. Sản phẩm (Products)

### Lấy danh sách sản phẩm
- **Endpoint**: `GET /api/products`
- **Query Params**:
  - `page`, `limit`: Phân trang.
  - `category`: Slug danh mục để lọc.
  - `minPrice`, `maxPrice`: Lọc theo khoảng giá.
  - `sort`: Sắp xếp (`price_asc`, `price_desc`, `newest`, `sold`).
- **Response**: Danh sách sản phẩm rút gọn (tên, giá min, ảnh đại diện).

### Chi tiết sản phẩm
- **Endpoint**: `GET /api/products/:slug`
- **Mô tả**: Lấy thông tin chi tiết sản phẩm, bao gồm tất cả biến thể (Màu/Size) và hình ảnh.

## 3. Giỏ hàng (Cart)

### Lấy giỏ hàng
- **Endpoint**: `GET /api/cart`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Danh sách item trong giỏ, tổng tiền dự tính.

### Thêm vào giỏ
- **Endpoint**: `POST /api/cart`
- **Body**: `{ variantId, quantity }`

### Cập nhật số lượng
- **Endpoint**: `PUT /api/cart`
- **Body**: `{ variantId, quantity }`

### Xóa khỏi giỏ
- **Endpoint**: `DELETE /api/cart/:variantId`

## 4. Đơn hàng (Orders)

### Tạo đơn hàng (Checkout)
- **Endpoint**: `POST /api/orders`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "addressId": 123,
    "paymentMethod": "COD" | "VNPAY",
    "note": "Giao giờ hành chính"
  }
  ```
- **Mô tả**: Tạo đơn hàng từ các sản phẩm trong giỏ hàng hiện tại. Nếu thanh toán VNPAY, trả về URL thanh toán.

### Danh sách đơn hàng
- **Endpoint**: `GET /api/orders`
- **Response**: Lịch sử đơn hàng của người dùng.

### Chi tiết đơn hàng
- **Endpoint**: `GET /api/orders/:orderNumber`
- **Mô tả**: Xem chi tiết trạng thái, items của một đơn hàng cụ thể.

## 5. Danh mục & Thương hiệu

- `GET /api/categories`: Lấy cây danh mục sản phẩm.
- `GET /api/brands`: Lấy danh sách thương hiệu.

## 6. Địa chỉ (Address)

- `GET /api/addresses`: Lấy danh sách địa chỉ.
- `POST /api/addresses`: Thêm địa chỉ mới `{ provinceId, wardId, streetAddress, ... }`.
- `PUT /api/addresses/:id`: Sửa địa chỉ.
- `DELETE /api/addresses/:id`: Xóa địa chỉ.

## 7. Thanh toán (Payment)

- `GET /api/payment/vnpay/ipn`: Endpoint nhận callback từ VNPAY (Server-to-Server) để cập nhật trạng thái thanh toán.
