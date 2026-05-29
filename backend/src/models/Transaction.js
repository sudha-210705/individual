const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  purpose: {
    type: String,
    enum: ['delivery_payment', 'wallet_load', 'refund', 'payout', 'admin_commission'],
    required: true
  },
  referenceId: {
    type: String, // e.g. orderId or transaction ref
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'success'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
