# Luồng Hoạt động (System Flows)

Tài liệu mô tả các luồng nghiệp vụ chính trong hệ thống.

## 1. Luồng Đặt hàng (Order Placement Flow)

Quy trình từ lúc người dùng chọn mua sản phẩm đến khi đơn hàng được tạo thành công.

1. **Thêm vào giỏ (Add to Cart)**
   - **User**: Tại trang chi tiết sản phẩm, chọn Màu, Size và bấm "Thêm vào giỏ".
   - **FE**: Gọi API `POST /api/cart` với `variantId` và `quantity`.
   - **BE**: Kiểm tra tồn kho. Nếu còn hàng, thêm vào bảng `CartItem`. Trả về giỏ hàng mới nhất.

2. **Xem giỏ hàng (View Cart)**
   - **User**: Bấm vào icon giỏ hàng.
   - **FE**: Gọi API `GET /api/cart` để hiển thị danh sách sản phẩm và tổng tiền tạm tính.

3. **Tiến hành đặt hàng (Checkout Init)**
   - **User**: Bấm "Thanh toán".
   - **FE**: Chuyển đến trang Checkout. Gọi API `GET /api/addresses` để lấy danh sách địa chỉ.

4. **Chọn thông tin & Đặt hàng (Place Order)**
   - **User**: Chọn Địa chỉ giao hàng, Phương thức vận chuyển (Tiêu chuẩn/Nhanh), Phương thức thanh toán (VD: COD) và bấm "Đặt hàng".
   - **FE**: Gọi API `POST /api/orders` với `addressId`, `shippingMethod` và `paymentMethod`.
   - **BE**:
     - Validate tồn kho lần cuối.
     - Tạo bản ghi `Order` với trạng thái `PENDING_PAYMENT` (hoặc `PENDING_CONFIRMATION` nếu COD).
     - Chuyển `CartItem` sang `OrderItem`.
     - Xóa items trong `Cart`.
     - Trừ tồn kho tạm thời (giữ hàng).
   - **FE**: Nhận `orderNumber`. Chuyển người dùng đến trang "Cảm ơn/Chi tiết đơn hàng".

## 2. Luồng Thanh toán Online (VNPAY Flow)

Nếu người dùng chọn thanh toán VNPAY ở bước 4 trên:

1. **Khởi tạo thanh toán**
   - **BE**: Sau khi tạo đơn hàng (trạng thái `PENDING_PAYMENT`), tạo URL thanh toán VNPAY với số tiền và mã đơn hàng.
   - **Response**: Trả về `{ paymentUrl: "https://sandbox.vnpayment.vn/..." }`.

2. **Người dùng thanh toán**
   - **FE**: Chuyển hướng trình duyệt sang `paymentUrl`.
   - **User**: Nhập thông tin thẻ/ngân hàng trên giao diện VNPAY.

3. **Xử lý kết quả (Callback/IPN)**
   - **VNPAY**: Gọi API `GET /api/payment/vnpay/ipn` (Server-to-Server) để báo kết quả.
   - **BE**:
     - Kiểm tra chữ ký bảo mật (Checksum).
     - Nếu thành công: Cập nhật `Order` sang `PREPARING` (hoặc trạng thái tiếp theo), `PaymentStatus` sang `PAID`.
     - Nếu thất bại: Cập nhật `PaymentStatus` sang `FAILED`.

## 3. Luồng Xử lý Đơn hàng (Order Fulfillment Flow)

Quy trình xử lý đơn hàng từ phía Admin/Kho, phân chia trách nhiệm rõ ràng.

1. **Xác nhận đơn hàng (Order Confirmation)**
   - **User**: Khách đặt hàng (COD) -> Trạng thái `PENDING_CONFIRMATION`.
   - **SALES_STAFF / ADMIN**:
     - Kiểm tra đơn hàng.
     - Bấm "Xác nhận" -> Trạng thái chuyển sang `PREPARING` (Đang chuẩn bị).
     - Hệ thống thông báo cho bộ phận Kho (`WAREHOUSE`).

2. **Đóng gói & Xuất kho (Packing & Shipping)**
   - **WAREHOUSE**:
     - Nhận thông báo đơn hàng mới cần chuẩn bị.
     - Đóng gói sản phẩm.
     - Bấm "Sẵn sàng giao" -> Trạng thái chuyển sang `READY_TO_SHIP`.
     - Giao cho đơn vị vận chuyển -> Cập nhật `IN_TRANSIT`.

3. **Giao hàng thành công (Delivery)**
   - **Shipper/WAREHOUSE**: Xác nhận giao hàng thành công -> Trạng thái `DELIVERED`.

4. **Thu tiền COD (COD Collection Flow)**
   - **Áp dụng**: Đơn hàng thanh toán khi nhận hàng.
   - **WAREHOUSE**:
     - Sau khi Shipper nộp lại tiền mặt.
     - Vào chi tiết đơn hàng, bấm "Xác nhận thu COD".
     - **BE**: Cập nhật `PaymentStatus` thành `PAID` (Đã thanh toán).

5. **Hoàn tất (Completion)**
   - **System**: Sau khi giao thành công X ngày (hoặc User bấm "Đã nhận hàng"), cập nhật trạng thái `COMPLETED`.
   - **Loyalty**: Cộng điểm thưởng cho User.

## 4. Luồng Hoàn tiền & Hủy đơn (Refund & Cancel Flow)

### Hủy đơn hàng
- **User**: Tự hủy khi đơn chưa giao (`PENDING` -> `CANCELLED`).
- **SALES_MANAGER / ADMIN**: Có quyền hủy đơn ở bất kỳ bước nào trước khi thành công.

### Quy trình Hoàn tiền (Refund Process)
1. **Yêu cầu hoàn tiền**
   - **User**: Yêu cầu trả hàng/hoàn tiền trên đơn `DELIVERED` hoặc `COMPLETED`.
   - Trạng thái đơn: `REFUND_REQUESTED`.
   - **System**: Thông báo cho `SALES_MANAGER`.

2. **Phê duyệt**
   - **SALES_MANAGER**: Xem xét yêu cầu.
   - Bấm "Phê duyệt hoàn tiền" -> Trạng thái `REFUNDING`.

3. **Thực hiện hoàn tiền**
   - **Accounting/Admin**: Thực hiện chuyển khoản lại cho khách.
   - **SALES_MANAGER**: Bấm "Xác nhận đã hoàn tiền" -> Trạng thái `REFUNDED`.
   - `PaymentStatus` chuyển sang `REFUNDED`.

## 4. Luồng Nâng hạng (Tier Upgrade Flow)

1. **Tích lũy**
   - Mỗi khi đơn hàng chuyển sang `COMPLETED`, tính điểm thưởng (Ví dụ: 10.000đ = 1 điểm).
   - Cộng điểm vào `User.loyaltyPoints`.

2. **Kiểm tra nâng hạng**
   - **BE**: So sánh tổng điểm với `minPoints` của các hạng (Bronze, Silver, Gold...).
   - Nếu đủ điểm hạng cao hơn -> Cập nhật `User.tierId`.

3. **Sử dụng ưu đãi**
   - Khi User tạo đơn hàng mới, BE kiểm tra Tier hiện tại để áp dụng `discountPercent` (nếu còn lượt sử dụng trong tháng).
