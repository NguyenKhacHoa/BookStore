# Kiến Trúc Hệ Thống (System Architecture)

## 1. Mô hình kiến trúc tổng thể
Hệ thống tuân theo mô hình **Layered MVC (Model - View - Controller)** mở rộng thêm tầng **Service** và **Repository** để đảm bảo nguyên lý Single Responsibility (SRP) và Dependency Inversion (DIP).

### Luồng đi của một Request:
`Client (Browser) -> Route -> Middleware -> Controller -> Service -> Repository -> SQLite DB -> View (EJS) -> Response`

## 2. Cấu trúc thư mục chuẩn
```text
bookstore-mvc/
├── config/
│   └── database.js             # Kết nối SQLite, khởi tạo bảng & nạp dữ liệu mẫu
├── middlewares/
│   ├── authMiddleware.js       # Kiểm tra đăng nhập (requireLogin) & quyền Admin (requireAdmin)
│   └── uploadMiddleware.js     # Cấu hình Multer lưu ảnh bìa sách vào public/uploads
├── repositories/               # Tầng truy xuất dữ liệu (SQL Queries thuần túy)
│   ├── userRepository.js
│   ├── categoryRepository.js
│   ├── bookRepository.js
│   └── orderRepository.js
├── services/                   # Tầng xử lý nghiệp vụ (Business Logic & Transactions)
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
│   ├── clientRoutes.js         # Các đường dẫn phía khách hàng (/, /books, /cart, /orders)
│   └── adminRoutes.js          # Các đường dẫn quản trị (/admin/*)
├── views/
│   ├── layouts/                # main.ejs (Client), admin.ejs (Admin)
│   ├── partials/               # header.ejs, footer.ejs, sidebar.ejs, flash-message.ejs
│   ├── client/                 # home.ejs, books.ejs, book-detail.ejs, cart.ejs, checkout.ejs, orders.ejs, login.ejs, register.ejs
│   └── admin/                  # dashboard.ejs, books.ejs, book-form.ejs, categories.ejs, orders.ejs, order-detail.ejs
├── public/
│   ├── css/
│   └── uploads/                # Chứa ảnh bìa sách được upload
├── docs/                       # Tài liệu thiết kế hệ thống
├── app.js                      # Entry point khởi tạo Express app
└── package.json
```

## 3. Quy ước đặt tên (Naming Conventions)
- **File JS:** `camelCase.js` (ví dụ: `orderService.js`, `adminBookController.js`).
- **File View EJS:** `kebab-case.ejs` (ví dụ: `book-detail.ejs`, `order-detail.ejs`).
- **Bảng SQLite:** `snake_case` số nhiều (`users`, `categories`, `books`, `orders`, `order_items`).
