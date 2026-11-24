# Tiến Độ Phát Triển Dự Án (Project Progress)

## Giai đoạn 1: Khởi tạo & Kiến trúc nền tảng
- [x] Khởi tạo dự án Node.js, cài đặt `express`, `ejs`, `better-sqlite3`, `express-session`, `bcryptjs`, `multer`.
- [x] Thiết lập cấu trúc thư mục chuẩn theo `docs/ARCHITECTURE.md`.
- [x] Viết `config/database.js` tự động tạo 5 bảng SQLite và nạp dữ liệu mẫu (1 Admin, 1 User, 4 Danh mục, 12 Sách).

## Giai đoạn 2: Tầng Repository & Service
- [x] Xây dựng `userRepository.js` & `authService.js` (Đăng ký, đăng nhập, mã hóa mật khẩu).
- [x] Xây dựng `categoryRepository.js`, `bookRepository.js` & `bookService.js` (Tìm kiếm, lọc, CRUD sách).
- [x] Xây dựng `orderRepository.js` & `orderService.js` (Transaction đặt hàng, trừ kho, hủy đơn hoàn kho, thống kê).

## Giai đoạn 3: Giao diện UI/UX (Dùng skill `/ui-ux` của evondevKit)
- [x] Dựng Layout chung (`layouts/main.ejs`, `layouts/admin.ejs`) với Tailwind CSS.
- [x] Dựng nhóm màn hình Khách hàng: Trang chủ, Danh sách/Tìm kiếm sách, Chi tiết sách, Giỏ hàng, Thanh toán, Lịch sử đơn hàng, Đăng nhập/Đăng ký.
- [x] Dựng nhóm màn hình Admin: Dashboard thống kê, Quản lý sách (kèm upload ảnh), Quản lý danh mục, Quản lý đơn hàng.

## Giai đoạn 4: Kiểm thử & Hoàn thiện tài liệu
- [x] Test luồng đặt hàng trừ tồn kho và hủy đơn hoàn tồn kho.
- [x] Test phân quyền chặn User thường truy cập `/admin`.
- [ ] Cập nhật ảnh chụp màn hình và hướng dẫn chạy vào `README.md`.
