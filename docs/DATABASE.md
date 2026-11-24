# Thiết Kế Cơ Sở Dữ Liệu (SQLite Schema)

Hệ thống sử dụng **SQLite** với 5 bảng quan hệ cốt lõi. Ràng buộc khóa ngoại (`PRAGMA foreign_keys = ON;`) luôn được bật khi kết nối.

## 1. Chi tiết các bảng

### 1.1. Bảng `users` (Người dùng & Phân quyền)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Mã người dùng |
| `email` | TEXT | UNIQUE NOT NULL | Email đăng nhập |
| `password_hash` | TEXT | NOT NULL | Mật khẩu đã mã hóa bằng bcrypt |
| `full_name` | TEXT | NOT NULL | Họ và tên |
| `phone` | TEXT | | Số điện thoại liên hệ |
| `address` | TEXT | | Địa chỉ giao hàng mặc định |
| `role` | TEXT | DEFAULT 'user' | Phân quyền: `'user'` hoặc `'admin'` |
| `is_active` | INTEGER | DEFAULT 1 | `1`: Hoạt động, `0`: Bị khóa |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo tài khoản |

### 1.2. Bảng `categories` (Danh mục sách)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Mã danh mục |
| `name` | TEXT | UNIQUE NOT NULL | Tên thể loại (Văn học, Kinh tế, Kỹ năng...) |
| `slug` | TEXT | UNIQUE NOT NULL | Đường dẫn thân thiện URL |

### 1.3. Bảng `books` (Thông tin sách & Tồn kho)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Mã sách |
| `category_id` | INTEGER | REFERENCES `categories(id)` | Khóa ngoại danh mục |
| `title` | TEXT | NOT NULL | Tên cuốn sách |
| `author` | TEXT | NOT NULL | Tên tác giả |
| `price` | INTEGER | NOT NULL CHECK (`price >= 0`) | Giá bán (VNĐ) |
| `stock` | INTEGER | NOT NULL CHECK (`stock >= 0`) | Số lượng tồn kho |
| `cover_image` | TEXT | DEFAULT '/images/default-book.png' | Đường dẫn ảnh bìa |
| `description` | TEXT | | Mô tả tóm tắt nội dung |
| `is_active` | INTEGER | DEFAULT 1 | `1`: Đang bán, `0`: Ngừng kinh doanh (ẩn) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày thêm sách |

### 1.4. Bảng `orders` (Đơn hàng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Mã đơn hàng |
| `user_id` | INTEGER | REFERENCES `users(id)` | Khách hàng đặt mua |
| `total_amount` | INTEGER | NOT NULL | Tổng giá trị đơn hàng (VNĐ) |
| `shipping_address` | TEXT | NOT NULL | Địa chỉ nhận hàng tại thời điểm đặt |
| `phone` | TEXT | NOT NULL | SĐT người nhận |
| `payment_method` | TEXT | DEFAULT 'COD' | Phương thức thanh toán (`COD`) |
| `status` | TEXT | DEFAULT 'PENDING' | `PENDING`, `SHIPPING`, `COMPLETED`, `CANCELLED` |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Thời điểm đặt hàng |

### 1.5. Bảng `order_items` (Chi tiết từng sách trong đơn)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Mã chi tiết |
| `order_id` | INTEGER | REFERENCES `orders(id)` ON DELETE CASCADE | Thuộc đơn hàng nào |
| `book_id` | INTEGER | REFERENCES `books(id)` | Cuốn sách được mua |
| `quantity` | INTEGER | NOT NULL CHECK (`quantity > 0`) | Số lượng mua |
| `unit_price` | INTEGER | NOT NULL | Đơn giá lưu cố định tại thời điểm mua |
