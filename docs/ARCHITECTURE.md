# Kiến Trúc Hệ Thống (System Architecture)

## 1. Mô hình kiến trúc tổng thể
Hệ thống tuân theo mô hình **MVC (Model – View – Controller)** chuẩn mở rộng thêm tầng **Service** và **Strategy Pattern** (cho thanh toán COD / VietQR) để đảm bảo nguyên lý Single Responsibility (SRP), Open/Closed (OCP) và Dependency Inversion (DIP).

### Luồng đi của một Request:
`Client (Browser) -> Route -> Middleware -> Controller (C) -> Service (+ Payment Strategy) -> Model (M) -> Supabase (PostgreSQL) -> View (V - EJS) -> Response`

## 2. Cấu trúc thư mục chuẩn MVC
```text
BookStoreMVC/
├── models/                     # [M] Model — Tầng truy xuất dữ liệu (SQL Queries thuần túy)
│   ├── userModel.js
│   ├── categoryModel.js
│   ├── bookModel.js
│   └── orderModel.js
├── views/                      # [V] View — Giao diện EJS + Tailwind CSS
│   ├── layouts/                # main.ejs (Client), admin.ejs (Admin)
│   ├── partials/               # header.ejs, footer.ejs, sidebar.ejs, flash-message.ejs
│   ├── client/                 # home, books, book-detail, cart, checkout, payment-qr, orders, order-detail, login, register, forgot-password, reset-password
│   └── admin/                  # dashboard, books, book-form, categories, orders, order-detail
├── controllers/                # [C] Controller — Điều phối Request/Response & gọi View
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
├── services/                   # Tầng xử lý nghiệp vụ (Business Logic & ACID Transactions)
│   ├── payment/                # Strategy Pattern cho thanh toán
│   │   ├── PaymentContext.js   # Context điều phối chiến lược thanh toán
│   │   ├── CodStrategy.js      # Chiến lược thanh toán tiền mặt khi nhận hàng (COD)
│   │   └── VietQrStrategy.js   # Chiến lược sinh mã giao dịch & ảnh VietQR động
│   ├── authService.js
│   ├── bookService.js
│   └── orderService.js
├── routes/
│   ├── clientRoutes.js         # Đường dẫn khách hàng (/, /books, /cart, /orders, /api/payment/webhook)
│   └── adminRoutes.js          # Đường dẫn quản trị (/admin/*)
├── middlewares/
│   ├── authMiddleware.js       # Kiểm tra đăng nhập (requireLogin) & quyền Admin (requireAdmin)
│   └── uploadMiddleware.js     # Cấu hình Multer lưu ảnh bìa sách vào public/uploads
├── config/
│   └── database.js             # Kết nối Supabase PostgreSQL (pg Pool + Transaction)
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
- **Model (`models/`):** `camelCase` + hậu tố `Model.js` (`bookModel.js`, `orderModel.js`).
- **Controller (`controllers/`):** `camelCase` + hậu tố `Controller.js` (`bookController.js`, `adminBookController.js`).
- **Service (`services/`):** `camelCase` + hậu tố `Service.js`; class Strategy dùng `PascalCase.js` (`PaymentContext.js`, `VietQrStrategy.js`).
- **View (`views/`):** `kebab-case.ejs` (`book-detail.ejs`, `order-detail.ejs`, `payment-qr.ejs`).
- **Bảng PostgreSQL:** `snake_case` số nhiều (`users`, `categories`, `books`, `orders`, `order_items`).
