const bookService = require('../../services/bookService');

function ensureCart(req) {
  if (!Array.isArray(req.session.cart)) {
    req.session.cart = [];
  }
  return req.session.cart;
}

const cartController = {
  viewCart(req, res, next) {
    try {
      const cart = ensureCart(req);
      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      return res.render('client/cart', {
        title: 'Giỏ hàng - Bookstore MVC',
        layout: 'layouts/main',
        cart,
        totalAmount,
      });
    } catch (err) {
      return next(err);
    }
  },

  addToCart(req, res) {
    try {
      const bookId = Number(req.body.bookId);
      const addQty = Math.max(1, parseInt(req.body.quantity, 10) || 1);

      const cart = ensureCart(req);
      const existingItem = cart.find((item) => item.bookId === bookId);
      const newQuantity = existingItem ? existingItem.quantity + addQty : addQty;

      // Kiểm tra tồn kho qua bookService
      const book = bookService.validateBookStock(bookId, newQuantity);

      if (existingItem) {
        existingItem.quantity = newQuantity;
        existingItem.price = book.price;
        existingItem.title = book.title;
        existingItem.cover_image = book.cover_image;
      } else {
        cart.push({
          bookId: book.id,
          title: book.title,
          price: book.price,
          cover_image: book.cover_image,
          quantity: newQuantity,
        });
      }

      req.session.flash = {
        type: 'success',
        message: `Đã thêm "${book.title}" vào giỏ hàng.`,
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }

    const backUrl = req.get('Referer') || '/cart';
    return res.redirect(backUrl);
  },

  updateCart(req, res) {
    try {
      const bookId = Number(req.body.bookId);
      const quantity = parseInt(req.body.quantity, 10);
      const cart = ensureCart(req);
      const idx = cart.findIndex((item) => item.bookId === bookId);

      if (idx === -1) {
        req.session.flash = {
          type: 'error',
          message: 'Sản phẩm không có trong giỏ hàng.',
        };
        return res.redirect('/cart');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        cart.splice(idx, 1);
        req.session.flash = {
          type: 'success',
          message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
        };
        return res.redirect('/cart');
      }

      const book = bookService.validateBookStock(bookId, quantity);
      cart[idx].quantity = quantity;
      cart[idx].price = book.price;
      cart[idx].title = book.title;
      cart[idx].cover_image = book.cover_image;

      req.session.flash = {
        type: 'success',
        message: 'Đã cập nhật số lượng trong giỏ hàng.',
      };
    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message,
      };
    }

    return res.redirect('/cart');
  },

  removeFromCart(req, res) {
    const bookId = Number(req.body.bookId);
    const cart = ensureCart(req);
    req.session.cart = cart.filter((item) => item.bookId !== bookId);

    req.session.flash = {
      type: 'success',
      message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
    };
    return res.redirect('/cart');
  },

  clearCart(req, res) {
    req.session.cart = [];
    req.session.flash = {
      type: 'success',
      message: 'Đã làm trống giỏ hàng.',
    };
    return res.redirect('/cart');
  },
};

module.exports = cartController;
