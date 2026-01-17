# Hướng dẫn Cài đặt Dự án (Setup Guide)

Tài liệu này hướng dẫn chi tiết cách cài đặt và chạy dự án Clothing Shop System từ con số 0.

## 1. Yêu cầu Tiên quyết (Prerequisites)

Trước khi bắt đầu, đảm bảo máy tính của bạn đã cài đặt các phần mềm sau:

- **Node.js**: Phiên bản 18.x trở lên. (Kiểm tra bằng lệnh `node -v`)
- **MySQL**: Cơ sở dữ liệu chính. (Khuyến nghị phiên bản 8.0)
- **Redis**: Dùng để caching và quản lý hàng đợi (hoặc session).
- **Git**: Để quản lý mã nguồn.

## 2. Cấu trúc Dự án

Dự án này là một monorepo (hoặc chứa cả 2 phần) bao gồm:
- `backend/`: Chứa mã nguồn API (Express, Prisma).
- `frontend/`: Chứa mã nguồn giao diện (Next.js).

## 3. Cài đặt Backend

### Bước 3.1: Di chuyển vào thư mục backend
Mở terminal và chạy:
```bash
cd backend
```

### Bước 3.2: Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

### Bước 3.3: Cấu hình biến môi trường
Sao chép file mẫu `.env.example` thành `.env`:
```bash
cp .env.example .env
# Hoặc trên Windows
copy .env.example .env
```

Mở file `.env` và cập nhật các thông tin sau:
- `DATABASE_URL`: Chuỗi kết nối đến MySQL của bạn.
  - Ví dụ: `mysql://root:password@localhost:3306/clothing_shop`
  - Trong đó: `root` là user, `password` là mật khẩu, `clothing_shop` là tên DB.
- `REDIS_HOST`, `REDIS_PORT`: Thông tin Redis (mặc định localhost:6379).
- `JWT_SECRET`: Chuỗi bí mật bất kỳ để mã hóa token.

### Bước 3.4: Khởi tạo Cơ sở dữ liệu
Chạy các lệnh Prisma để tạo bảng và dữ liệu mẫu:

1. **Tạo bảng (Migration):**
```bash
npx prisma migrate dev --name init
```
2. **Đổ dữ liệu mẫu (Seed):**
```bash
npm run db:seed
```
*Lưu ý: Lệnh seed sẽ tạo các Role, User admin mặc định, Danh mục và Sản phẩm mẫu nếu muốn tự tạo, không cần chạy.*

### Bước 3.5: Chạy Backend
- **Chế độ phát triển (Dev):**
```bash
npm run dev
```
Server sẽ chạy tại `http://localhost:3001` (hoặc PORT bạn cấu hình).

## 4. Cài đặt Frontend

### Bước 4.1: Di chuyển vào thư mục frontend
Mở một terminal **mới** (giữ terminal backend đang chạy) và chạy:
```bash
cd frontend
```

### Bước 4.2: Cài đặt các gói phụ thuộc
```bash
npm install
```

### Bước 4.3: Cấu hình biến môi trường
Sao chép file mẫu `.env.example` thành `.env.local`:
```bash
cp .env.example .env.local
# Hoặc trên Windows
copy .env.example .env.local
```
Kiểm tra biến `NEXT_PUBLIC_API_URL` trong file này xem đã trỏ đúng về backend chưa (thường là `http://localhost:3001/api`).

### Bước 4.4: Chạy Frontend
```bash
npm run dev
```
Ứng dụng sẽ chạy tại `http://localhost:3000`.

## 5. Tài khoản Đăng nhập Mẫu (Nếu có từ Seed)
Thường dữ liệu seed sẽ tạo ra các tài khoản sau (tham khảo `backend/prisma/seed.js` để chính xác hơn):
- **Admin**: `admin@clothingshop.com` / `password123` (hoặc `123456`)
- **User**: `user@clothingshop.com` / `password123`

## 6. Các lệnh thường dùng

**Backend:**
- `npx prisma studio`: Mở giao diện web để xem dữ liệu trong DB.
- `npx prisma db push`: Cập nhật schema DB mà không tạo file migration (dùng khi dev nhanh).

**Frontend:**
- `npm run build`: Build dự án cho production.
- `npm run start`: Chạy bản build production.
