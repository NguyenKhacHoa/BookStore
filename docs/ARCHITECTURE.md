# Kiến Trúc Hệ Thống (System Architecture)

## 1. Mô hình kiến trúc tổng thể
Hệ thống tuân theo mô hình **Layered MVC (Model - View - Controller)** mở rộng thêm tầng **Service**, **Repository** và **Strategy Pattern** (cho thanh toán COD / VietQR) để đảm bảo nguyên lý Single Responsibility (SRP), Open/Closed (OCP) và Dependency Inversion (DIP).

### Luồng đi của một Request:
`Client (Browser) -> Route -> Middleware -> Controller -> Service (+ Payment Strategy) -> Repository -> Supabase (PostgreSQL) -> View (EJS) -> Response`

## 2. Cấu trúc thư mục chuẩn
```text
BookStoreMVC/
├── config/
│   └── database.js             # Kết nối Supabase PostgreSQL (pg Pool + Transaction)
├── middlewares/
│   ├── authMiddleware.js       # Kiểm tra đăng nhập (requireLogin) & quyền Admin (requireAdmin)
│   └── uploadMiddleware.js     # Cấu hình Multer lưu ảnh bìa sách vào public/uploads
├── repositories/               # Tầng truy xuất dữ liệu (SQL Queries thuần túy)
│   ├── userRepository.js
│   ├── categoryRepository.js
│   ├── bookRepository.js
│   └── orderRepository.js
├── services/                   # Tầng xử lý nghiệp vụ (Business Logic & Transactions)
│   ├── payment/                # Strategy Pattern cho thanh toán
│   │   ├── PaymentContext.js   # Context điều phối chiến lược thanh toán
│   │   ├── CodStrategy.js      # Chiến lược thanh toán tiền mặt khi nhận hàng (COD)
│   │   └── VietQrStrategy.js   # Chiến lược sinh mã giao dịch & ảnh VietQR động
│   ├── authService.js
│   ├── bookService.js
│   └── orderService.js
├── controllers/                # Điều phối Request/Response & gọi View
│   ├── client/
│   │   ├── homeController.js
│   │   ├── bookController.js
│   │   ├── cartController.js
│   │   ├── authController.js
│   │   └── orderController.js
│   └── admin/
│       ├── dashboardController.js
│       ├── adminBookController.js
│       ├── adminCategoryController.js
│       └── adminOrderController.js
├── routes/
│   ├── clientRoutes.js         # Đường dẫn khách hàng (/, /books, /cart, /orders, /api/payment/webhook)
│   └── adminRoutes.js          # Đường dẫn quản trị (/admin/*)
├── views/
│   ├── layouts/                # main.ejs (Client), admin.ejs (Admin)
│   ├── partials/               # header.ejs, footer.ejs, sidebar.ejs, flash-message.ejs
│   ├── client/                 # home, books, book-detail, cart, checkout, payment-qr, orders, order-detail, login, register
│   └── admin/                  # dashboard, books, book-form, categories, orders, order-detail
├── supabase/                   # Script SQL khởi tạo & migration cho Supabase
├── public/
│   ├── css/
│   ├── images/
│   └── uploads/
├── docs/                       # Tài liệu thiết kế hệ thống
├── app.js                      # Entry point khởi tạo Express app
└── package.json
```

## 3. Quy ước đặt tên (Naming Conventions)
- **File JS:** `camelCase.js` cho module thường (`orderService.js`), `PascalCase.js` cho class Strategy (`PaymentContext.js`, `VietQrStrategy.js`).
- **File View EJS:** `kebab-case.ejs` (`book-detail.ejs`, `order-detail.ejs`, `payment-qr.ejs`).
- **Bảng PostgreSQL:** `snake_case` số nhiều (`users`, `categories`, `books`, `orders`, `order_items`).
