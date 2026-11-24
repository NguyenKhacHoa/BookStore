# Bookstore MVC - Hệ Thống Quản Lý & Bán Sách Trực Tuyến

Dự án xây dựng website bán sách cơ bản phục vụ môn học **Software Architecture & Design**, áp dụng kiến trúc phân tầng **MVC kết hợp Repository & Service Pattern**.

## 1. Công nghệ sử dụng
- **Runtime & Framework:** Node.js, Express.js
- **View Engine:** EJS + Tailwind CSS
- **Database:** SQLite (`better-sqlite3`) - Tự động khởi tạo schema & seed data khi chạy
- **Xác thực & Upload:** `express-session`, `bcryptjs`, `multer`

## 2. Hướng dẫn cài đặt và chạy dự án
1. Cài đặt thư viện:
   ```bash
   npm install
   ```
2. Khởi chạy server (tự động tạo file `database.sqlite` và dữ liệu mẫu):
   ```bash
   npm start
   ```
3. Truy cập trình duyệt tại: `http://localhost:3000`

## 3. Tài khoản mặc định (Seed Data)
- **Quản trị viên (Admin):** `admin@bookstore.local` / `123456` (Truy cập `/admin`)
- **Khách hàng (User):** `user@bookstore.local` / `123456`
