# Bookstore MVC - Hệ Thống Quản Lý & Bán Sách Trực Tuyến

Dự án xây dựng website bán sách cơ bản phục vụ môn học **Software Architecture & Design**, áp dụng kiến trúc phân tầng **MVC kết hợp Repository, Service & Strategy Pattern** trên nền **Supabase (PostgreSQL)**.

## 1. Công nghệ & Design Patterns
- **Runtime & Framework:** Node.js, Express.js
- **View Engine:** EJS + Tailwind CSS
- **Database:** Supabase (PostgreSQL) kết nối qua `pg` Pool + ACID Transactions (`FOR UPDATE`)
- **Thanh toán:** Strategy Pattern (`PaymentContext`, `CodStrategy`, `VietQrStrategy`) hỗ trợ **COD** và **VietQR** động + webhook demo + auto-polling trạng thái
- **Theo dõi đơn hàng:** Stepper 4 bước (`PENDING` → `CONFIRMED` → `SHIPPING` → `COMPLETED` / `CANCELLED`) tự động đồng bộ với Admin
- **Xác thực & Upload:** `express-session`, `bcryptjs`, `multer`, `dotenv`

## 2. Hướng dẫn cài đặt và chạy dự án với Supabase
1. Cài đặt thư viện:
   ```bash
   npm install
   ```
2. Khởi tạo bảng & dữ liệu mẫu trên **Supabase**:
   - Nếu tạo mới từ đầu: chạy [`supabase/schema_and_seed.sql`](./supabase/schema_and_seed.sql) trong **Supabase Dashboard → SQL Editor**.
   - Nếu đã tạo bảng trước đó: chạy thêm [`supabase/migration_vietqr_tracking.sql`](./supabase/migration_vietqr_tracking.sql) để thêm `payment_status`, `transaction_code` và trạng thái `CONFIRMED`.
3. Cấu hình biến môi trường:
   - Sao chép `.env.example` thành `.env` và điền `DATABASE_URL` lấy từ **Supabase Dashboard → Connect → Session Pooler**.
4. Khởi chạy server:
   ```bash
   npm start
   ```
5. Truy cập trình duyệt tại: `http://localhost:3000`

## 3. Tài khoản mặc định (Seed Data)
- **Quản trị viên (Admin):** `admin@bookstore.local` / `123456` (Truy cập `/admin`)
- **Khách hàng (User):** `user@bookstore.local` / `123456`
