const Rider = require('../models/Rider');
const Order = require('../models/Order');
const orderController = require('./orderController');

// Calculate straight line distance helper for coordinates
const calculateCoordinatesDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['online', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status mode' });
    }

    const rider = await Rider.findOne({ user: req.user.id });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    rider.status = status;
    await rider.save();

    // If rider goes offline, release any assigned order that is pending acceptance
    if (status === 'offline') {
      const socketManager = require('../services/socketManager');
      const pendingOrder = await Order.findOne({ rider: rider._id, status: 'assigned' });
      if (pendingOrder) {
        pendingOrder.rider = null;
        pendingOrder.status = 'searching';
        pendingOrder.timeline.push({
          status: 'searching',
          description: `Courier went offline. Order returned to matching pool.`
        });
        await pendingOrder.save();
        socketManager.broadcast(`order:${pendingOrder._id}:update`, { status: 'searching', rider: null });
      }
    }

    // If rider went online, trigger matching for any pending/searching orders
    if (status === 'online') {
      orderController.dispatchPendingOrders();
    }

    res.status(200).json({
      success: true,
      status: rider.status,
      rider
    });
  } catch (err) {
    next(err);
  }
};

exports.getRiderProfile = async (req, res, next) => {
  try {
    const rider = await Rider.findOne({ user: req.user.id }).populate('user', 'name email phone');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }
    res.status(200).json({ success: true, rider });
  } catch (err) {
    next(err);
  }
};

exports.getRiderOrders = async (req, res, next) => {
  try {
    const rider = await Rider.findOne({ user: req.user.id });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    // 1. Get explicitly assigned orders (active or past)
    const assignedOrders = await Order.find({ rider: rider._id })
      .populate('customer', 'name phone')
      .sort('-createdAt');

    // 2. If rider is online and not busy, also fetch searching orders within 2.0 km
    let combinedOrders = [...assignedOrders];

    if (rider.status === 'online') {
      const searchingOrders = await Order.find({
        status: { $in: ['placed', 'searching'] },
        rider: null,
        rejectedRiders: { $ne: rider._id }
      }).populate('customer', 'name phone');

      const riderLat = rider.currentLocation.coordinates[1];
      const riderLng = rider.currentLocation.coordinates[0];

      let nearbyOrders = searchingOrders.filter(order => {
        const distance = calculateCoordinatesDistance(
          order.pickup.lat,
          order.pickup.lng,
          riderLat,
          riderLng
        );
        order._doc.distanceFromPickup = distance;
        return distance <= 2.0;
      });

      // FALLBACK: If there are no searching orders within 2.0 km, include all available searching orders!
      if (nearbyOrders.length === 0 && searchingOrders.length > 0) {
        nearbyOrders = searchingOrders.map(order => {
          const distance = calculateCoordinatesDistance(
            order.pickup.lat,
            order.pickup.lng,
            riderLat,
            riderLng
          );
          order._doc.distanceFromPickup = distance;
          return order;
        });
      }

      combinedOrders = [...combinedOrders, ...nearbyOrders];
    }

    res.status(200).json({ success: true, orders: combinedOrders });
  } catch (err) {
    next(err);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const { coordinates } = req.body; // [lng, lat]
    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ success: false, message: 'Please provide valid [lng, lat] coordinates' });
    }

    const rider = await Rider.findOne({ user: req.user.id });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    rider.currentLocation.coordinates = coordinates;
    await rider.save();

    res.status(200).json({ success: true, coordinates: rider.currentLocation.coordinates });
  } catch (err) {
    next(err);
  }
};
