const mongoose = require('mongoose');
require('dotenv').config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aether_dispatch';

const run = async () => {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({ email: String }));
  const Wallet = mongoose.model('Wallet', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, balance: Number }));
  const Transaction = mongoose.model('Transaction', new mongoose.Schema({ wallet: mongoose.Schema.Types.ObjectId, amount: Number, type: String, purpose: String, createdAt: Date }));

  const admin = await User.findOne({ email: 'admin@gmail.com' });
  if (!admin) {
    console.log('No admin user found!');
    await mongoose.disconnect();
    return;
  }

  const wallet = await Wallet.findOne({ user: admin._id });
  if (!wallet) {
    console.log('No admin wallet found!');
    await mongoose.disconnect();
    return;
  }

  console.log('Admin Wallet:', wallet);

  const txs = await Transaction.find({ wallet: wallet._id }).sort('-createdAt').limit(10);
  console.log('Recent 10 transactions:', txs);

  await mongoose.disconnect();
};

run().catch(console.error);
