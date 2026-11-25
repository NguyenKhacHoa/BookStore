# Bookstore MVC - Hệ Thống Quản Lý & Bán Sách Trực Tuyến

Dự án xây dựng website bán sách cơ bản phục vụ môn học **Software Architecture & Design**, áp dụng kiến trúc phân tầng **MVC kết hợp Repository & Service Pattern** trên nền **Supabase (PostgreSQL)**.

## 1. Công nghệ sử dụng
- **Runtime & Framework:** Node.js, Express.js
- **View Engine:** EJS + Tailwind CSS
- **Database:** Supabase (PostgreSQL) kết nối qua `pg` Pool + ACID Transactions (`FOR UPDATE`)
- **Xác thực & Upload:** `express-session`, `bcryptjs`, `multer`, `dotenv`

## 2. Hướng dẫn cài đặt và chạy dự án với Supabase
1. Cài đặt thư viện:
   ```bash
   npm install
   ```
2. Khởi tạo bảng & dữ liệu mẫu trên **Supabase**:
   - Mở **Supabase Dashboard** → **SQL Editor** → **New query**.
   - Dán toàn bộ nội dung file [`supabase/schema_and_seed.sql`](./supabase/schema_and_seed.sql) và bấm **Run**.
3. Cấu hình biến môi trường:
   - Sao chép `.env.example` thành `.env`:
     ```bash
     cp .env.example .env
     ```
   - Lấy chuỗi kết nối tại **Supabase Dashboard** → **Connect** → **Session Pooler** (hoặc Direct Connection) và điền vào `DATABASE_URL` trong `.env`.
4. Khởi chạy server:
   ```bash
   npm start
   ```
5. Truy cập trình duyệt tại: `http://localhost:3000`

## 3. Tài khoản mặc định (Seed Data)
- **Quản trị viên (Admin):** `admin@bookstore.local` / `123456` (Truy cập `/admin`)
- **Khách hàng (User):** `user@bookstore.local` / `123456`
