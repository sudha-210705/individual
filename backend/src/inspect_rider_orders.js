const mongoose = require('mongoose');
require('dotenv').config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aether_dispatch';

const run = async () => {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    role: String
  }));

  const Rider = mongoose.model('Rider', new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    status: String
  }));

  const Order = mongoose.model('Order', new mongoose.Schema({
    status: String,
    rider: mongoose.Schema.Types.ObjectId,
    fare: { total: Number }
  }));

  const Wallet = mongoose.model('Wallet', new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    balance: Number
  }));

  const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    wallet: mongoose.Schema.Types.ObjectId,
    amount: Number,
    type: String,
    purpose: String
  }));

  const riders = await Rider.find();
  for (const r of riders) {
    const user = await User.findById(r.user);
    const wallet = await Wallet.findOne({ user: r.user });
    const orders = await Order.find({ rider: r._id });
    const txs = wallet ? await Transaction.find({ wallet: wallet._id }) : [];
    
    console.log(`\nRider ID: ${r._id} | User: ${user?.email} | Wallet Balance: ${wallet?.balance}`);
    console.log(`- Assigned Orders Count: ${orders.length}`);
    for (const o of orders) {
      console.log(`  * Order: ${o._id} | Status: ${o.status} | Fare: ${o.fare?.total}`);
    }
    console.log(`- Transactions Count: ${txs.length}`);
    for (const t of txs) {
      console.log(`  * Tx: ${t._id} | Amount: ${t.amount} | Type: ${t.type} | Purpose: ${t.purpose}`);
    }
  }

  await mongoose.disconnect();
};

run().catch(console.error);
