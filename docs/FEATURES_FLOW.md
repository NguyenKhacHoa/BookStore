# Luồng Nghiệp Vụ & Quy Tắc Xử Lý (Business Rules)

## 1. Quản lý Giỏ hàng (Session Cart)
- Giỏ hàng lưu trong `req.session.cart` dưới dạng mảng các object: `{ bookId, title, price, cover_image, quantity }`.
- Khi thêm sách hoặc tăng số lượng, `cartController` gọi `bookService.validateBookStock()` kiểm tra: nếu `quantity > book.stock`, hệ thống chặn thao tác và báo lỗi *"Số lượng vượt quá tồn kho hiện có"*.

## 2. Quy trình Đặt hàng & Strategy Pattern Thanh toán (`COD` / `VIETQR`)
Khi khách bấm **"Xác nhận đặt hàng"** (`POST /checkout`):
1. `authMiddleware.requireLogin` kiểm tra đăng nhập.
2. `orderService.createOrder()` mở một **PostgreSQL Transaction** (`withTransaction`):
   - Khóa dòng sách bằng `SELECT ... FOR UPDATE` và kiểm tra lại tồn kho thực tế. Nếu không đủ hàng → Rollback và báo lỗi.
   - Tạo bản ghi `orders` với `status = 'PENDING'`.
   - Khởi tạo `PaymentContext.fromMethod(payment_method)`:
     - **`CodStrategy`**: gán `payment_status = 'UNPAID'`, `transaction_code = null`, điều hướng về `/orders/:id`.
     - **`VietQrStrategy`**: sinh mã giao dịch duy nhất `DH<orderId><4 số ngẫu nhiên>`, sinh URL ảnh QR động VietQR (`img.vietqr.io`), lưu `transaction_code` và điều hướng về `/orders/:id/payment`.
   - Lưu từng sản phẩm vào `order_items` kèm `unit_price` hiện tại và trừ `books.stock`.
3. Commit Transaction → Xóa `req.session.cart` → Điều hướng theo chiến lược thanh toán.

### Luồng xác nhận VietQR
- Trang `GET /orders/:id/payment` hiển thị ảnh QR động, thông tin ngân hàng MB Bank, số tiền, nút Copy nội dung chuyển khoản và tự động gọi `GET /orders/:id/payment-status` mỗi **3 giây**.
- Nút **"Giả lập ngân hàng báo đã nhận tiền (Demo)"** gọi `POST /api/payment/webhook` cập nhật `payment_status = 'PAID'` và chuyển thẳng sang trang theo dõi đơn hàng `/orders/:id`.

## 3. Theo dõi Đơn hàng 4 bước & Đồng bộ với Admin
- Vòng đời đơn hàng gồm 4 bước chính: `PENDING` (Chờ xác nhận) → `CONFIRMED` (Đã xác nhận) → `SHIPPING` (Đang giao hàng) → `COMPLETED` (Hoàn thành), hoặc `CANCELLED` (Đã hủy).
- Khách hàng truy cập **Đơn hàng của tôi** (`/orders`) và chi tiết theo dõi (`/orders/:id`) để xem Stepper 4 bước, badge trạng thái thanh toán (`Đã thanh toán` / `Chưa thanh toán`), nút **Quét QR thanh toán ngay** (nếu `VIETQR` + `UNPAID`) và nút **Hủy đơn hàng** (nếu `PENDING`).
- Trang `/orders/:id` tự động polling `GET /orders/:id/status` mỗi **5 giây** để đồng bộ ngay lập tức khi Admin duyệt hoặc chuyển trạng thái đơn.

## 4. Quy trình Hủy đơn & Hoàn tồn kho
- **Phía Khách hàng:** Chỉ được phép hủy đơn khi `status === 'PENDING'`.
- **Phía Admin:** Có thể hủy đơn khi `status` là `'PENDING'`, `'CONFIRMED'` hoặc `'SHIPPING'`.
- **Nghiệp vụ hoàn kho:** Khi đơn chuyển sang `'CANCELLED'`, `orderService.cancelOrder()` chạy Transaction để cộng trả lại `quantity` vào cột `stock` của từng cuốn sách trong `order_items`.

## 5. Phân quyền, Tách bạch Giao diện & Bảo vệ Route Admin
- Mọi route bắt đầu bằng `/admin` đều phải đi qua 2 lớp bảo vệ: `requireLogin` → `requireAdmin` (`req.session.user.role === 'admin'`).
- **Tách bạch giao diện Admin & Client:** Khi tài khoản đang đăng nhập có `role === 'admin'`, thanh Header tự động ẩn hoàn toàn icon **Giỏ hàng** và nút **"Đơn hàng của tôi"**, chỉ hiển thị nút **"Trang quản trị"** (`/admin`).
- Khu vực `/admin` tập trung vào **Dashboard thống kê bán hàng** (Doanh thu, Số lượng sách đã bán, Sách đang kinh doanh, Cảnh báo tồn kho thấp &le; 10) và **Quản lý Sách / Danh mục** (thêm, sửa, cập nhật tồn kho, ẩn/hiện sách) cùng quản lý đơn hàng đồng bộ.
- Không xóa cứng (`DELETE`) sách đã từng có trong `order_items` để bảo toàn lịch sử hóa đơn; chỉ cập nhật `is_active = 0` để ẩn khỏi trang bán hàng.

## 6. Luồng Quên mật khẩu & Xác thực OTP qua Email (`nodemailer`)
1. Tại trang Đăng nhập (`GET /login`), người dùng bấm **"Quên mật khẩu?"** để chuyển tới `GET /forgot-password`.
2. Người dùng nhập email đã đăng ký (`POST /forgot-password`):
   - `authService.requestPasswordReset()` kiểm tra email tồn tại trong bảng `users` trên Supabase.
   - Sinh mã **OTP gồm 6 chữ số** có hiệu lực **5 phút** và lưu `{ email, otp, expiresAt }` vào `req.session.passwordReset`.
   - Gửi email qua `nodemailer` sử dụng `SMTP_EMAIL` và `SMTP_PASS` trong `.env`. Nếu chưa cấu hình SMTP, hệ thống tự động in mã OTP ra **console server** (cơ chế dự phòng cho môi trường phát triển/demo).
3. Người dùng nhập mã OTP và mật khẩu mới tại `GET /reset-password` → gửi `POST /reset-password`:
   - `authService.resetPasswordWithOtp()` kiểm tra OTP khớp và chưa quá 5 phút.
   - Hash mật khẩu mới bằng `bcryptjs` (10 rounds), cập nhật `password_hash` vào bảng `users` trên Supabase, xóa `req.session.passwordReset` và chuyển về `/login`.
