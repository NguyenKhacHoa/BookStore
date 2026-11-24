const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Bắt buộc bật ràng buộc khóa ngoại và WAL mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id),
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      stock INTEGER NOT NULL CHECK (stock >= 0),
      cover_image TEXT DEFAULT '/images/default-book.png',
      description TEXT,
      is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
      shipping_address TEXT NOT NULL,
      phone TEXT NOT NULL,
      payment_method TEXT DEFAULT 'COD',
      status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SHIPPING', 'COMPLETED', 'CANCELLED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES books(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
    CREATE INDEX IF NOT EXISTS idx_books_is_active ON books(is_active);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_book_id ON order_items(book_id);
  `);
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const adminHash = bcrypt.hashSync('123456', 10);
    const userHash = bcrypt.hashSync('123456', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone, address, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    insertUser.run(
      'admin@bookstore.local',
      adminHash,
      'Quản Trị Viên',
      '0901000001',
      '01 Đường Sách, Quận 1, TP.HCM',
      'admin'
    );
    insertUser.run(
      'user@bookstore.local',
      userHash,
      'Nguyễn Văn A',
      '0902000002',
      '123 Nguyễn Huệ, Quận 1, TP.HCM',
      'user'
    );
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
    const categories = [
      ['Văn học', 'van-hoc'],
      ['Kinh tế', 'kinh-te'],
      ['Kỹ năng sống', 'ky-nang-song'],
      ['Công nghệ thông tin', 'cong-nghe-thong-tin'],
    ];

    const seedCategoriesTx = db.transaction((items) => {
      for (const [name, slug] of items) {
        insertCategory.run(name, slug);
      }
    });
    seedCategoriesTx(categories);
  }

  const bookCount = db.prepare('SELECT COUNT(*) AS count FROM books').get().count;
  if (bookCount === 0) {
    const catMap = {};
    for (const row of db.prepare('SELECT id, slug FROM categories').all()) {
      catMap[row.slug] = row.id;
    }

    const insertBook = db.prepare(`
      INSERT INTO books (category_id, title, author, price, stock, cover_image, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const books = [
      // Văn học (3)
      {
        category_id: catMap['van-hoc'],
        title: 'Nhà Giả Kim',
        author: 'Paulo Coelho',
        price: 79000,
        stock: 35,
        cover_image: '/images/covers/nha-gia-kim.svg',
        description:
          'Câu chuyện đầy cảm hứng về chàng chăn cừu Santiago trên hành trình đi tìm kho báu và lắng nghe tiếng gọi của trái tim mình.',
      },
      {
        category_id: catMap['van-hoc'],
        title: 'Mắt Biếc',
        author: 'Nguyễn Nhật Ánh',
        price: 110000,
        stock: 28,
        cover_image: '/images/covers/mat-biec.svg',
        description:
          'Tác phẩm nổi tiếng khắc họa tình yêu đơn phương trong sáng, day dứt của Ngạn dành cho Hà Lan qua những năm tháng tuổi thơ và trưởng thành.',
      },
      {
        category_id: catMap['van-hoc'],
        title: 'Rừng Na Uy',
        author: 'Haruki Murakami',
        price: 145000,
        stock: 20,
        cover_image: '/images/covers/rung-na-uy.svg',
        description:
          'Tiểu thuyết kinh điển của văn học Nhật Bản hiện đại về tuổi trẻ, mất mát, nỗi cô đơn và khát khao chữa lành.',
      },

      // Kinh tế (3)
      {
        category_id: catMap['kinh-te'],
        title: 'Tư Duy Nhanh Và Chậm',
        author: 'Daniel Kahneman',
        price: 215000,
        stock: 24,
        cover_image: '/images/covers/tu-duy-nhanh-va-cham.svg',
        description:
          'Công trình đoạt giải Nobel Kinh tế giải mã hai hệ thống tư duy chi phối mọi phán đoán, hành vi tài chính và quyết định của con người.',
      },
      {
        category_id: catMap['kinh-te'],
        title: 'Cha Giàu Cha Nghèo',
        author: 'Robert T. Kiyosaki',
        price: 135000,
        stock: 40,
        cover_image: '/images/covers/cha-giau-cha-ngheo.svg',
        description:
          'Cuốn sách kinh điển về tư duy tài chính cá nhân, giúp bạn phân biệt tài sản và tiêu sản để xây dựng tự do tài chính.',
      },
      {
        category_id: catMap['kinh-te'],
        title: 'Từ Tốt Đến Vĩ Đại',
        author: 'Jim Collins',
        price: 185000,
        stock: 18,
        cover_image: '/images/covers/tu-tot-den-vi-dai.svg',
        description:
          'Nghiên cứu chuyên sâu về những nguyên tắc quản trị giúp các doanh nghiệp bình thường bứt phá trở thành những tổ chức vĩ đại bền vững.',
      },

      // Kỹ năng sống (3)
      {
        category_id: catMap['ky-nang-song'],
        title: 'Đắc Nhân Tâm',
        author: 'Dale Carnegie',
        price: 86000,
        stock: 50,
        cover_image: '/images/covers/dac-nhan-tam.svg',
        description:
          'Nghệ thuật thu phục lòng người, giao tiếp tinh tế và xây dựng các mối quan hệ bền chặt trong cuộc sống lẫn công việc.',
      },
      {
        category_id: catMap['ky-nang-song'],
        title: 'Thói Quen Nguyên Tử',
        author: 'James Clear',
        price: 165000,
        stock: 32,
        cover_image: '/images/covers/thoi-quen-nguyen-tu.svg',
        description:
          'Phương pháp khoa học giúp xây dựng thói quen tốt và loại bỏ thói quen xấu thông qua những cải tiến nhỏ 1% mỗi ngày.',
      },
      {
        category_id: catMap['ky-nang-song'],
        title: '7 Thói Quen Hiệu Quả',
        author: 'Stephen R. Covey',
        price: 175000,
        stock: 22,
        cover_image: '/images/covers/7-thoi-quen-hieu-qua.svg',
        description:
          'Hệ thống nguyên tắc phát triển bản thân toàn diện giúp nâng cao hiệu suất cá nhân và khả năng lãnh đạo.',
      },

      // Công nghệ thông tin (3)
      {
        category_id: catMap['cong-nghe-thong-tin'],
        title: 'Clean Code',
        author: 'Robert C. Martin',
        price: 320000,
        stock: 15,
        cover_image: '/images/covers/clean-code.svg',
        description:
          'Cẩm nang thực hành viết mã nguồn sạch, dễ đọc, dễ kiểm thử và dễ bảo trì dành cho mọi kỹ sư phần mềm.',
      },
      {
        category_id: catMap['cong-nghe-thong-tin'],
        title: 'Clean Architecture',
        author: 'Robert C. Martin',
        price: 340000,
        stock: 14,
        cover_image: '/images/covers/clean-architecture.svg',
        description:
          'Hướng dẫn thiết kế kiến trúc phần mềm phân tầng bền vững, áp dụng nguyên lý SOLID và tách biệt nghiệp vụ khỏi chi tiết hạ tầng.',
      },
      {
        category_id: catMap['cong-nghe-thong-tin'],
        title: 'Node.js Design Patterns',
        author: 'Mario Casciaro',
        price: 385000,
        stock: 12,
        cover_image: '/images/covers/nodejs-design-patterns.svg',
        description:
          'Khám phá các mẫu thiết kế chuyên sâu, xử lý bất đồng bộ, kiến trúc module và xây dựng ứng dụng Node.js có khả năng mở rộng cao.',
      },
    ];

    const seedBooksTx = db.transaction((items) => {
      for (const b of items) {
        insertBook.run(
          b.category_id,
          b.title,
          b.author,
          b.price,
          b.stock,
          b.cover_image,
          b.description
        );
      }
    });
    seedBooksTx(books);
  }
}

initSchema();
seedData();

module.exports = db;
