# Tiến Độ Phát Triển Dự Án (Project Progress)

## Giai đoạn 1: Khởi tạo & Kiến trúc nền tảng
- [x] Khởi tạo dự án Node.js, cài đặt `express`, `ejs`, `pg`, `dotenv`, `express-session`, `bcryptjs`, `multer`.
- [x] Thiết lập cấu trúc thư mục chuẩn theo `docs/ARCHITECTURE.md`.
- [x] Thiết lập kết nối Supabase PostgreSQL (`config/database.js`) và viết script SQL khởi tạo 5 bảng + seed data (`supabase/schema_and_seed.sql`).

## Giai đoạn 2: Tầng Model, Service & Payment Strategy
- [x] Xây dựng `userModel.js` & `authService.js` (Đăng ký, đăng nhập, quên mật khẩu OTP, mã hóa mật khẩu).
- [x] Xây dựng `categoryModel.js`, `bookModel.js` & `bookService.js` (Tìm kiếm, lọc, CRUD sách).
- [x] Xây dựng `orderModel.js` & `orderService.js` (Transaction đặt hàng, trừ kho, hủy đơn hoàn tiền/hoàn kho, hoàn hàng, thống kê).
- [x] Áp dụng **Strategy Pattern** (`services/payment/PaymentContext.js`, `CodStrategy.js`, `VietQrStrategy.js`) cho thanh toán COD & VietQR.

## Giai đoạn 3: Giao diện UI/UX & Theo dõi đơn hàng
- [x] Dựng Layout chung (`layouts/main.ejs`, `layouts/admin.ejs`) với Tailwind CSS và nút **Đơn hàng của tôi** trên Header.
- [x] Dựng nhóm màn hình Khách hàng: Trang chủ, Danh sách/Tìm kiếm sách, Chi tiết sách, Giỏ hàng, Thanh toán (COD + VietQR), Quét mã VietQR (`payment-qr.ejs`), Lịch sử & Chi tiết theo dõi đơn hàng 4 bước (`orders.ejs`, `order-detail.ejs`), Đăng nhập/Đăng ký.
- [x] Dựng nhóm màn hình Admin: Dashboard thống kê, Quản lý sách (kèm upload ảnh), Quản lý danh mục, Quản lý đơn hàng (hiển thị trạng thái thanh toán + duyệt 4 bước đồng bộ User).

## Giai đoạn 4: Kiểm thử & Hoàn thiện tài liệu
- [x] Test luồng đặt hàng trừ tồn kho và hủy đơn hoàn tồn kho.
- [x] Test phân quyền chặn User thường truy cập `/admin`.
- [x] Cập nhật đầy đủ tài liệu (`README.md`, `docs/*`, `supabase/migration_vietqr_tracking.sql`).
