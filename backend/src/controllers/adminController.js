const Order = require('../models/Order');
const Rider = require('../models/Rider');
const User = require('../models/User');
const Zone = require('../models/Zone');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({ status: { $in: ['placed', 'searching', 'assigned', 'pickup_arrived', 'picked_up', 'in_transit'] } });
    const completedOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    const totalRiders = await Rider.countDocuments();
    const activeRiders = await Rider.countDocuments({ status: 'busy' });
    const onlineRiders = await Rider.countDocuments({ status: 'online' });
    const offlineRiders = await Rider.countDocuments({ status: 'offline' });

    const totalUsers = await User.countDocuments({ role: 'customer' });

    // Aggregate revenue
    const revenueStats = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$fare.total' }, totalSurge: { $sum: '$fare.surgeFare' } } }
    ]);

    const adminUser = await User.findOne({ email: 'admin@gmail.com' });
    let adminWalletBalance = 0;
    if (adminUser) {
      let adminWallet = await Wallet.findOne({ user: adminUser._id });
      if (!adminWallet) {
        adminWallet = await Wallet.create({ user: adminUser._id, balance: 0 });
      }
      adminWalletBalance = adminWallet.balance;
    }

    const revenue = adminWalletBalance;
    const surgeRevenue = revenueStats.length > 0 ? revenueStats[0].totalSurge : 0;

    // Recent orders
    const recentOrders = await Order.find()
      .populate('customer', 'name email')
      .populate({ path: 'rider', populate: { path: 'user', select: 'name' } })
      .sort('-createdAt')
      .limit(10);

    // Active riders coordinates for maps tracking
    const liveRiders = await Rider.find({ status: { $in: ['online', 'busy'] } })
      .populate('user', 'name phone');

    // Get actual hourly distribution for the last 12 hours
    const now = new Date();
    const chartData = [];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = `${String(d.getHours()).padStart(2, '0')}:00`;
      chartData.push({
        hour: hourStr,
        orders: 0,
        dateObj: d
      });
    }

    // Query orders in the last 12 hours
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const ordersInWindow = await Order.find({
      createdAt: { $gte: twelveHoursAgo }
    });

    // Populate counts
    ordersInWindow.forEach(order => {
      const orderHour = order.createdAt.getHours();
      const entry = chartData.find(item => item.dateObj.getHours() === orderHour);
      if (entry) {
        entry.orders += 1;
      }
    });

    // Calculate heights for CSS/SVG rendering in frontend
    const maxOrders = Math.max(...chartData.map(d => d.orders), 1);
    chartData.forEach(item => {
      item.height = `${(item.orders / maxOrders) * 100}%`;
      delete item.dateObj; // Clean up before sending to client
    });

    res.status(200).json({
      success: true,
      stats: {
        orders: { total: totalOrders, active: activeOrders, completed: completedOrders, cancelled: cancelledOrders },
        riders: { total: totalRiders, busy: activeRiders, online: onlineRiders, offline: offlineRiders },
        customers: totalUsers,
        revenue,
        surgeRevenue
      },
      recentOrders,
      liveRiders,
      chartData
    });
  } catch (err) {
    next(err);
  }
};

exports.updateZoneSurge = async (req, res, next) => {
  try {
    const { name, surgeMultiplier, demandLevel } = req.body;
    
    let zone = await Zone.findOne({ name });
    if (!zone) {
      zone = await Zone.create({
        name,
        surgeMultiplier,
        demandLevel,
        coordinates: [
          { lat: 12.9716, lng: 77.5946 } // center point default
        ]
      });
    } else {
      zone.surgeMultiplier = surgeMultiplier;
      zone.demandLevel = demandLevel;
      await zone.save();
    }

    res.status(200).json({
      success: true,
      message: `Zone surge for '${name}' updated successfully`,
      zone
    });
  } catch (err) {
    next(err);
  }
};

exports.getFraudLogs = async (req, res, next) => {
  try {
    // Return mock security fraud alerts based on high frequency clicks or fake GPS signals
    const fraudLogs = [
      {
        id: 'F-8812',
        type: 'Mock GPS Spoofing Detection',
        user: 'Rider: Alex Chen (drone_x_1)',
        severity: 'high',
        message: 'Telemetry signal hops over 450m in 1s. Automated matching quarantined.',
        timestamp: new Date(Date.now() - 34 * 60000)
      },
      {
        id: 'F-7421',
        type: 'Wallet Abuse System Alert',
        user: 'Customer: Sarah Connor',
        severity: 'medium',
        message: 'Multiple voucher applications with dynamic IPs within 3 minutes.',
        timestamp: new Date(Date.now() - 120 * 60000)
      }
    ];

    res.status(200).json({
      success: true,
      logs: fraudLogs
    });
  } catch (err) {
    next(err);
  }
};
