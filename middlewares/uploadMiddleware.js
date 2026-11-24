const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.resolve(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `book-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

function fileFilter(req, file, cb) {
  if (allowedMimes.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error('Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP, GIF, SVG).'));
}

const uploadCover = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = {
  uploadCover,
};
