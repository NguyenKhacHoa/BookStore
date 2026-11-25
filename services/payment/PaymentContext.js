const CodStrategy = require('./CodStrategy');
const VietQrStrategy = require('./VietQrStrategy');

class PaymentContext {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  execute(order) {
    if (!this.strategy) {
      throw new Error('Chưa cấu hình chiến lược thanh toán (Payment Strategy).');
    }
    return this.strategy.processPayment(order);
  }

  static fromMethod(paymentMethod) {
    const normalized = String(paymentMethod || 'COD').trim().toUpperCase();
    if (normalized === 'VIETQR') {
      return new PaymentContext(new VietQrStrategy());
    }
    return new PaymentContext(new CodStrategy());
  }
}

module.exports = PaymentContext;
