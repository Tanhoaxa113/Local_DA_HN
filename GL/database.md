# Tài liệu Cơ sở dữ liệu (Database Schema)

Tài liệu này mô tả cấu trúc cơ sở dữ liệu MySQL được sử dụng trong dự án, quản lý bởi Prisma ORM.

## 1. Tổng quan
- **Database Engine**: MySQL
- **ORM**: Prisma
- **Các nhóm bảng chính**: Người dùng & Phân quyền, Sản phẩm, Đơn hàng, Thanh toán, Hệ thống Loyalty.

## 2. Chi tiết các Bảng (Models)

### 2.1. Người dùng & Phân quyền (User & Auth)

#### `Role` (Vai trò)
Định nghĩa các quyền hạn trong hệ thống.
- `id`: Int (PK)
- `name`: String (Unique) - Ví dụ: ADMIN, CUSTOMER, SALES_STAFF, WAREHOUSE.
- `description`: String? - Mô tả.
- `users`: Quan hệ 1-N với User.

#### `User` (Người dùng)
Lưu thông tin tài khoản và khách hàng.
- `id`: Int (PK)
- `email`: String (Unique) - Email đăng nhập.
- `password`: String - Mật khẩu đã mã hóa (bcrypt).
- `fullName`: String - Họ tên đầy đủ.
- `roleId`: Int (FK) - Liên kết với Role.
- `tierId`: Int (FK) - Hạng thành viên hiện tại (Default: 1 - Bronze).
- `loyaltyPoints`: Int - Điểm tích lũy hiện có.
- `isActive`: Boolean - Trạng thái hoạt động.
- Quan hệ: Role, MemberTier, Cart, Orders, Addresses, RefreshTokens.

#### `RefreshToken`
Quản lý token làm mới phiên đăng nhập (JWT).
- `token`: String (Unique)
- `userId`: Int (FK)
- `expiresAt`: DateTime

### 2.2. Hệ thống Sản phẩm (Product Management)

#### `Category` (Danh mục)
Phân loại sản phẩm đa cấp.
- `id`: Int (PK)
- `name`: String
- `slug`: String (Unique) - URL friendly.
- `parentId`: Int? (FK) - Danh mục cha (Self-relation).
- Quan hệ: Parent Category, Children Categories, Products.

#### `Brand` (Thương hiệu)
- `id`: Int (PK)
- `name`: String
- `slug`: String (Unique)

#### `Product` (Sản phẩm)
Thông tin chung của sản phẩm.
- `id`: Int (PK)
- `name`: String
- `slug`: String
- `categoryId`: Int (FK)
- `brandId`: Int? (FK)
- `minPrice`: Decimal - Giá thấp nhất trong các biến thể (Cache để sort).
- `totalSold`: Int - Tổng số lượng đã bán (Cache để sort).
- `isFeatured`: Boolean - Sản phẩm nổi bật.

#### `ProductVariant` (Biến thể sản phẩm)
Chi tiết SKU theo Màu/Size.
- `id`: Int (PK)
- `productId`: Int (FK)
- `sku`: String (Unique) - Mã kho.
- `size`: String - Kích thước (S, M, L...).
- `color`: String - Màu sắc.
- `price`: Decimal - Giá bán.
- `compareAtPrice`: Decimal? - Giá gốc (để hiển thị khuyến mãi).
- `stock`: Int - Tồn kho vật lý.
- `availableStock`: Int - Tồn kho khả dụng (trừ đi số lượng đang giữ trong các đơn chưa thanh toán).

#### `ProductImage`
- `url`: String
- `productId`: Int (FK)
- `variantId`: Int? (FK) - Có thể gắn ảnh theo biến thể màu cụ thể.

### 2.3. Đơn hàng & Giỏ hàng (Order & Cart)

#### `Cart` & `CartItem`
Giỏ hàng tạm thời của khách hàng.
- `Cart` liên kết 1-1 với `User`.
- `CartItem` lưu `variantId` và `quantity`.

#### `Order` (Đơn hàng)
Thông tin đơn đặt hàng.
- `id`: Int (PK)
- `orderNumber`: String (Unique) - Mã đơn hàng hiển thị (VD: ORD-12345).
- `userId`: Int (FK)
- `status`: Enum `OrderStatus` (PENDING_PAYMENT, PREPARING, DELIVERED, COMPLETED, CANCELLED...).
- `totalAmount`: Decimal - Tổng tiền phải thanh toán.
- `paymentStatus`: Enum `PaymentStatus`.
- `paymentMethod`: Enum `PaymentMethod`.

#### `OrderItem`
Chi tiết sản phẩm trong đơn hàng.
- Lưu lại snapshot của tên sản phẩm, giá bán tại thời điểm mua (đề phòng giá sản phẩm thay đổi sau này).

#### `OrderStatusHistory`
Lịch sử thay đổi trạng thái đơn hàng (Audit log).

### 2.4. Thanh toán & Vận chuyển (Payment & Shipping)

#### `Address`
Sổ địa chỉ của người dùng.
- `provinceId`, `wardId`: ID định danh địa chính.
- `streetAddress`: Địa chỉ cụ thể.

#### `Payment`
Giao dịch thanh toán.
- `method`: VNPAY, COD, BANK_TRANSFER.
- `transactionId`: Mã giao dịch từ cổng thanh toán.

### 2.5. Loyalty System (Khách hàng thân thiết)

#### `MemberTier` (Hạng thành viên)
- `name`: Bronze, Silver, Gold...
- `minPoints`: Điểm tối thiểu để đạt hạng.
- `discountPercent`: % giảm giá cho hạng này.

#### `MemberTierUsageLog`
Theo dõi việc sử dụng ưu đãi của hạng thành viên (giới hạn số lần giảm giá mỗi tháng).

## 3. Enums quan trọng

### `OrderStatus`
- `PENDING_PAYMENT`: Chờ thanh toán.
- `PENDING_CONFIRMATION`: Chờ xác nhận (COD).
- `PREPARING`: Đang chuẩn bị hàng.
- `READY_TO_SHIP`: Sẵn sàng giao cho ĐVVC.
- `IN_TRANSIT`: Đang giao hàng.
- `DELIVERED`: Giao thành công.
- `COMPLETED`: Đơn hàng hoàn tất (sau khi nhận hàng X ngày không đổi trả).
- `CANCELLED`: Đã hủy.
- `REFUND_REQUESTED` / `REFUNDED`: Quy trình hoàn tiền.
