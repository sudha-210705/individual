const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 500, // Pre-fund new wallets with 500 units for demo testing
    min: [0, 'Balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Wallet', walletSchema);
