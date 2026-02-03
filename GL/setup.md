# Hướng Dẫn Cài Đặt Chi Tiết (Dành Cho Người Mới Bắt Đầu)

Tài liệu này được thiết kế riêng cho người chưa từng lập trình, chưa cài đặt môi trường bao giờ. Hãy làm theo từng bước chính xác như miêu tả.

---

## Phần 1: Cài Đặt Các Phần Mềm Cần Thiết

Bạn cần tải và cài đặt các phần mềm sau vào máy tính của mình trước khi làm bất cứ điều gì khác.

### 1. VS Code (Phần mềm để sửa code)
- **Tải về**: [https://code.visualstudio.com/download](https://code.visualstudio.com/download)
- **Cài đặt**: Tải file về, chạy lên và cứ nhấn **Next** (hoặc **Check Yes** "I accept") cho đến khi xong.

### 2. Node.js (Môi trường chạy ứng dụng)
- **Tải về**: [https://nodejs.org/en](https://nodejs.org/en) (Chọn phiên bản **LTS** - Bên trái).
- **Cài đặt**: Chạy file tải về, cứ nhấn **Next** liên tục cho đến khi xong. Không cần chỉnh sửa gì cả.

### 3. Git (Công cụ quản lý mã nguồn - Tùy chọn nhưng nên có)
- **Tải về**: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- **Cài đặt**: Chọn "Windows", tải về và cài đặt. Khi cài đặt cứ nhấn **Next** liên tục (có rất nhiều bước, cứ để mặc định).

### 4. MySQL (Cơ sở dữ liệu - Nơi lưu trữ thông tin)
- **Tải về**: [https://dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/)
- **Cài đặt**:
    1. Chọn "Windows (x86, 32-bit), MSI Installer".
    2. Khi cài, chọn chế độ **"Server only"** hoặc **"Developer Default"**.
    3. **QUAN TRỌNG**: Đến bước đặt mật khẩu cho `root`, hãy đặt là `123456` (hoặc mật khẩu nào bạn dễ nhớ nhất). **Hãy ghi nhớ mật khẩu này**.
    4. Nhấn Next cho đến khi hoàn tất.

---

## Phần 2: Mở Dự Án ("Source Code")

1. Mở phần mềm **VS Code** vừa cài đặt.
2. Trên thanh menu trên cùng, chọn **File** -> **Open Folder...**.
3. Tìm đến thư mục chứa dự án này, chọn nó và nhấn **Select Folder**.
4. Nếu VS Code hỏi "Do you trust the authors...?", hãy bấm **Yes, I trust the authors**.

---

## Phần 3: Cài Đặt Backend (Phần xử lý trung tâm)

Backend nằm trong thư mục tên là `backend`. Chúng ta cần cài đặt nó trước.

### Bước 1: Tạo file cấu hình (.env)
1. Nhìn vào cột bên trái (File Explorer) của VS Code.
2. Tìm thư mục có tên `backend`.
3. Nhấp **chuột phải** vào thư mục `backend` -> Chọn **New File**.
4. Đặt tên file chính xác là: `.env` (có dấu chấm ở đầu, viết thường). Nhấn Enter.
5. Bây giờ, hãy mở file có tên `.env.example` (cũng nằm trong thư mục `backend`, ngay gần đó).
6. Copy **toàn bộ nội dung** bên trong file `.env.example`.
7. Quay lại file `.env` bạn vừa tạo, **dán (Paste)** nội dung vào đó.
8. **Chỉnh sửa**: Tìm dòng có chữ `DATABASE_URL`.
   - Nó thường trông như thế này: `mysql://root:password@localhost:3306/clothing_shop`
   - Hãy đổi chữ `password` thành mật khẩu MySQL bạn cài ở **Phần 1** (ví dụ `123456`).
   - Nếu bạn chưa cài MySQL mà muốn chạy thử, hãy liên hệ người hướng dẫn để biết cách khác, nhưng mặc định phải cài MySQL.
9. Nhấn **Ctrl + S** để lưu file lại.

### Bước 2: Chạy lệnh cài đặt thư viện
1. Trên thanh menu trên cùng của VS Code, chọn **Terminal** -> **New Terminal**.
2. Một cửa sổ đen (hoặc xanh) sẽ hiện ra ở dưới đáy màn hình.
3. Gõ lệnh sau và nhấn Enter để vào thư mục backend:
   ```bash
   cd backend
   ```
4. Gõ tiếp lệnh sau và nhấn Enter (lệnh này sẽ tự động tải các thư viện cần thiết, mất khoảng 1-3 phút):
   ```bash
   npm install
   ```

### Bước 3: Khởi tạo Cơ sở dữ liệu
Vẫn ở trong Terminal đó, gõ các lệnh sau (nhấn Enter sau mỗi dòng):

1. Tạo bảng trong cơ sở dữ liệu:
   ```bash
   npx prisma migrate dev --name init
   ```
2. Đổ dữ liệu mẫu (để có sẵn admin/user dùng thử):
   ```bash
   npm run db:seed
   ```


---

## Phần 4: Cài Đặt Frontend (Giao diện web)

Bây giờ tới phần giao diện (thư mục `frontend`).

### Bước 1: Tạo file cấu hình (.env.local)
1. Nhìn vào cột bên trái, tìm thư mục `frontend` (bấm mũi tên thu gọn thư mục `backend` lại cho đỡ rối nếu cần).
2. Nhấp **chuột phải** vào thư mục `frontend` -> Chọn **New File**.
3. Đặt tên file chính xác là: `.env.local` (có dấu chấm đầu, đuôi là local).
4. Mở file `.env.example` (trong thư mục `frontend`), copy toàn bộ nội dung.
5. Dán vào file `.env.local` vừa tạo.
6. Nhấn **Ctrl + S** để lưu.

### Bước 2: Chạy lệnh cài đặt thư viện cho Frontend
1. Bạn cần mở thêm một Terminal mới (để không làm mất Terminal cũ của backend). Nhìn vào góc phải khung Terminal, bấm dấu **+** (hoặc menu **Terminal -> New Terminal**).
2. Gõ lệnh vào thư mục frontend:
   ```bash
   cd frontend
   ```
3. Cài đặt thư viện:
   ```bash
   npm install
   ```

---

## Phần 5: Chạy Dự Án (Khởi động lên)

Sau khi cài đặt xong hết, mỗi lần muốn dùng web, bạn làm như sau:

### 1. Chạy Backend
- Nếu đang ở Terminal `backend` (kiểm tra đường dẫn `...\HuuNghi\backend>`), gõ:
  ```bash
  npm run dev
  ```
- Nếu thấy hiện dòng chữ `Server is running on port 3001` (hoặc tương tự) là thành công. Đừng tắt bảng này!

### 2. Chạy Frontend
- Chuyển sang Terminal `frontend` (hoặc mở mới, `cd frontend`), gõ:
  ```bash
  npm run dev
  ```
- Nếu thấy hiện `Ready in ...` hoặc `Url: http://localhost:3000`.

### 3. Sử dụng
- Mở trình duyệt (Chrome, Cốc Cốc).
- Truy cập vào địa chỉ: [http://localhost:3000](http://localhost:3000)
- Màn hình đăng nhập sẽ hiện ra.

**Tài khoản dùng thử (nếu bước db:seed thành công):**
- **Admin**: Email `admin@clothingshop.com`, Mật khẩu `password123` (hoặc `123456`).
- **Khách hàng**: Email `user@clothingshop.com`, Mật khẩu `password123`.

---

## Tóm tắt nhanh cho lần sau (Khi đã cài xong hết)
Mỗi ngày mở máy lên làm việc:
1. Mở VS Code.
2. Mở Terminal 1: `cd backend` -> `npm run dev`.
3. Mở Terminal 2: `cd frontend` -> `npm run dev`.
4. Vào web `localhost:3000`.
