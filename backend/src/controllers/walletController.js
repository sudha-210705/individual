const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

exports.getWalletDetails = async (req, res, next) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: req.user.id, 
        balance: (req.user.role === 'rider' || req.user.role === 'admin') ? 0 : 500 
      });
    }

    const transactions = await Transaction.find({ wallet: wallet._id })
      .sort('-createdAt')
      .limit(20);

    res.status(200).json({
      success: true,
      wallet,
      transactions
    });
  } catch (err) {
    next(err);
  }
};

exports.loadWallet = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid deposit amount' });
    }

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: req.user.id, 
        balance: (req.user.role === 'rider' || req.user.role === 'admin') ? 0 : 500 
      });
    }

    wallet.balance += Number(amount);
    await wallet.save();

    const transaction = await Transaction.create({
      wallet: wallet._id,
      amount: Number(amount),
      type: 'credit',
      purpose: 'wallet_load',
      status: 'success'
    });

    res.status(200).json({
      success: true,
      balance: wallet.balance,
      transaction
    });
  } catch (err) {
    next(err);
  }
};
