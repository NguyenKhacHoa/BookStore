# Luồng Nghiệp Vụ & Quy Tắc Xử Lý (Business Rules)

## 1. Quản lý Giỏ hàng (Session Cart)
- Giỏ hàng lưu trong `req.session.cart` dưới dạng mảng các object: `{ bookId, title, price, cover_image, quantity }`.
- Khi thêm sách hoặc tăng số lượng, `cartController` gọi `bookService` kiểm tra: nếu `quantity > book.stock`, hệ thống chặn thao tác và báo lỗi *"Số lượng vượt quá tồn kho hiện có"*.

## 2. Quy trình Đặt hàng (Checkout Transaction)
Khi khách bấm **"Xác nhận đặt hàng"** (`POST /checkout`):
1. `authMiddleware.requireLogin` kiểm tra đăng nhập.
2. `orderService.createOrder()` mở một **SQLite Transaction**:
   - Kiểm tra lại tồn kho thực tế của toàn bộ sách trong giỏ. Nếu có 1 cuốn không đủ hàng -> Rollback và báo lỗi.
   - Tạo bản ghi mới trong bảng `orders` với trạng thái `PENDING`.
   - Lưu từng sản phẩm vào `order_items` kèm `unit_price` hiện tại.
   - Trừ `stock` tương ứng trong bảng `books` (`stock = stock - quantity`).
3. Commit Transaction -> Xóa `req.session.cart` -> Chuyển hướng sang trang lịch sử đơn hàng.

## 3. Quy trình Hủy đơn & Hoàn tồn kho
- **Phía Khách hàng:** Chỉ được phép hủy đơn khi `status === 'PENDING'`.
- **Phía Admin:** Có thể hủy đơn khi `status` là `'PENDING'` hoặc `'SHIPPING'`.
- **Nghiệp vụ hoàn kho:** Khi đơn chuyển sang `'CANCELLED'`, `orderService.cancelOrder()` chạy Transaction để cộng trả lại `quantity` vào cột `stock` của từng cuốn sách trong `order_items`.

## 4. Phân quyền & Bảo vệ Route Admin
- Mọi route bắt đầu bằng `/admin` đều phải đi qua 2 lớp bảo vệ: `requireLogin` -> `requireAdmin` (`req.session.user.role === 'admin'`).
- Không xóa cứng (`DELETE`) sách đã từng có trong `order_items` để bảo toàn lịch sử hóa đơn; chỉ cập nhật `is_active = 0` để ẩn khỏi trang bán hàng.
