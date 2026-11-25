class CodStrategy {
  constructor() {
    this.method = 'COD';
  }

  processPayment(order) {
    return {
      paymentMethod: this.method,
      paymentStatus: 'UNPAID',
      transactionCode: null,
      qrUrl: null,
      redirectUrl: `/orders/${order.id}`,
    };
  }
}

module.exports = CodStrategy;
