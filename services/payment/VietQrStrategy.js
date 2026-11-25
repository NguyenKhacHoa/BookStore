const BANK_ID = 'MB';
const ACCOUNT_NO = '0123456789';
const ACCOUNT_NAME = 'BOOKSTORE MVC';

class VietQrStrategy {
  constructor() {
    this.method = 'VIETQR';
  }

  generateTransactionCode(orderId) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `DH${orderId}${randomNum}`;
  }

  buildQrUrl(amount, transactionCode) {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    const encodedInfo = encodeURIComponent(transactionCode);
    const encodedName = encodeURIComponent(ACCOUNT_NAME);
    return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${safeAmount}&addInfo=${encodedInfo}&accountName=${encodedName}`;
  }

  getBankInfo() {
    return {
      bankId: BANK_ID,
      bankName: 'MB Bank (Ngân hàng Quân Đội)',
      accountNo: ACCOUNT_NO,
      accountName: ACCOUNT_NAME,
    };
  }

  processPayment(order) {
    const transactionCode =
      order.transaction_code || this.generateTransactionCode(order.id);
    const qrUrl = this.buildQrUrl(order.total_amount, transactionCode);

    return {
      paymentMethod: this.method,
      paymentStatus: order.payment_status || 'UNPAID',
      transactionCode,
      qrUrl,
      bankInfo: this.getBankInfo(),
      redirectUrl: `/orders/${order.id}/payment`,
    };
  }
}

module.exports = VietQrStrategy;
