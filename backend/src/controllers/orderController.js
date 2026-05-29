const Order = require('../models/Order');
const Rider = require('../models/Rider');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Zone = require('../models/Zone');
const aiEngine = require('../services/aiEngine');
const socketManager = require('../services/socketManager');

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

exports.estimatePrice = async (req, res, next) => {
  try {
    const { pickup, stops, weather } = req.body;

    if (!pickup || !stops || stops.length === 0) {
      return res.status(400).json({ success: false, message: 'Pickup and at least one stop required' });
    }

    // Calculate sequential distance
    let totalDistance = 0;
    let prevPoint = pickup;

    for (const stop of stops) {
      totalDistance += calculateCoordinatesDistance(prevPoint.lat, prevPoint.lng, stop.lat, stop.lng);
      prevPoint = stop;
    }

    totalDistance = parseFloat(totalDistance.toFixed(2));

    // Dynamic price calculation
    const baseFare = 40; // 40 INR base
    const perKmRate = 12; // 12 INR per KM
    const baseStopFee = 15; // 15 INR per extra stop
    
    const distanceFare = totalDistance * perKmRate + (stops.length - 1) * baseStopFee;

    // Fetch active surge multiplier from AI engine based on online riders/orders ratio
    const activeOrdersCount = await Order.countDocuments({ status: { $in: ['placed', 'searching', 'assigned'] } });
    const onlineRidersCount = await Rider.countDocuments({ status: 'online' });
    const surgeMultiplier = aiEngine.calculateSurgePricing(activeOrdersCount, onlineRidersCount, weather || 'clear');
    
    const surgeFare = distanceFare * (surgeMultiplier - 1);
    const total = Math.round(baseFare + distanceFare + surgeFare);

    // Predict ETA
    const etaPred = aiEngine.predictETA(totalDistance, stops.length, weather || 'clear');

    res.status(200).json({
      success: true,
      estimation: {
        distanceKm: totalDistance,
        estimatedDurationMin: etaPred.totalDurationMin,
        fare: {
          base: baseFare,
          distanceFare: Math.round(distanceFare),
          surgeMultiplier,
          surgeFare: Math.round(surgeFare),
          total
        },
        weatherImpact: {
          condition: weather || 'clear',
          delayMinutes: etaPred.delayMinutes
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { pickup, stops, fare, paymentMethod, couponCode } = req.body;

    const resolvedPaymentMethod = req.user.role === 'customer' ? 'cash' : (paymentMethod || 'cash');

    // Validate wallet balance if paying by wallet
    if (resolvedPaymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ user: req.user.id });
      if (!wallet || wallet.balance < fare.total) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
    }

    // AI optimization: Optimize stops ordering to minimize travel distance
    const optimizedStops = aiEngine.optimizeRoute(pickup, stops);

    // Re-calculate distance based on optimized route
    let totalDistance = 0;
    let prevPoint = pickup;
    for (const stop of optimizedStops) {
      totalDistance += calculateCoordinatesDistance(prevPoint.lat, prevPoint.lng, stop.lat, stop.lng);
      prevPoint = stop;
    }
    totalDistance = parseFloat(totalDistance.toFixed(2));

    // Predict ETA
    const etaPred = aiEngine.predictETA(totalDistance, optimizedStops.length, 'clear');
    const etaTime = new Date(Date.now() + etaPred.totalDurationMin * 60000);

    // Create Order
    const order = await Order.create({
      customer: req.user.id,
      pickup,
      stops: optimizedStops,
      fare,
      paymentMethod: resolvedPaymentMethod,
      distanceKm: totalDistance,
      estimatedDurationMin: etaPred.totalDurationMin,
      eta: etaTime,
      status: 'placed',
      timeline: [{
        status: 'placed',
        description: 'Order placed by customer, dispatch matrix analyzing nearby riders.'
      }]
    });

    // Deduct wallet balance if paying by wallet
    if (resolvedPaymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ user: req.user.id });
      wallet.balance -= fare.total;
      await wallet.save();

      // Log Transaction
      await Transaction.create({
        wallet: wallet._id,
        amount: fare.total,
        type: 'debit',
        purpose: 'delivery_payment',
        referenceId: order._id
      });
      
      order.paymentStatus = 'paid';
      await order.save();
    }

    // Trigger AI Dispatch matching in background
    triggerAIDispatch(order._id);

    // Notify user & socket HUD
    socketManager.broadcast('order:new_placed', { orderId: order._id, pickup: order.pickup });

    res.status(201).json({
      success: true,
      order
    });
  } catch (err) {
    next(err);
  }
};

// Dispatch loop simulator matching best rider via AI ranking
const triggerAIDispatch = async (orderId) => {
  setTimeout(async () => {
    try {
      const order = await Order.findById(orderId);
      if (!order || !['placed', 'searching'].includes(order.status)) return;

      if (order.status === 'placed') {
        order.status = 'searching';
        order.timeline.push({
          status: 'searching',
          description: 'Aether AI core searching for optimal drone/rider nodes.'
        });
        await order.save();
        socketManager.broadcast(`order:${orderId}:update`, { status: 'searching' });
      }

      // Fetch all online riders, excluding those who rejected this order
      const onlineRiders = await Rider.find({
        status: 'online',
        _id: { $nin: order.rejectedRiders || [] }
      }).populate('user');
      
      console.log(`[AI Dispatch] Order ${orderId}: Found ${onlineRiders.length} online riders in database.`);

      if (onlineRiders.length === 0) {
        console.log(`[AI Dispatch] Order ${orderId}: No online riders available. Retrying matching loop in 5s...`);
        // No riders available fallback simulator
        order.status = 'searching';
        await order.save();
        socketManager.broadcast(`order:${orderId}:update`, { status: 'searching' });
        
        setTimeout(() => {
          triggerAIDispatch(orderId);
        }, 5000);
        return;
      }

      // Rank riders using AI matching algorithm
      const matchingPool = aiEngine.findOptimalRiders(
        [order.pickup.lng, order.pickup.lat],
        onlineRiders
      );

      // Filter riders to within 2km radius
      let validMatches = matchingPool.filter(match => {
        const riderLat = match.rider.currentLocation.coordinates[1];
        const riderLng = match.rider.currentLocation.coordinates[0];
        const pickupLat = order.pickup.lat;
        const pickupLng = order.pickup.lng;
        const distance = calculateCoordinatesDistance(pickupLat, pickupLng, riderLat, riderLng);
        match.distance = distance;
        return distance <= 2.0; // 2km radius
      });

      console.log(`[AI Dispatch] Order ${orderId}: Found ${validMatches.length} valid matches within 2.0 km radius.`);

      // FALLBACK: If no riders are within 2.0 km, fall back to matching all online riders!
      if (validMatches.length === 0 && matchingPool.length > 0) {
        console.log(`[AI Dispatch] Order ${orderId}: No riders within 2.0 km. Falling back to all online riders in pool.`);
        validMatches = matchingPool.map(match => {
          const riderLat = match.rider.currentLocation.coordinates[1];
          const riderLng = match.rider.currentLocation.coordinates[0];
          const pickupLat = order.pickup.lat;
          const pickupLng = order.pickup.lng;
          const distance = calculateCoordinatesDistance(pickupLat, pickupLng, riderLat, riderLng);
          match.distance = distance;
          return match;
        });
      }

      if (validMatches.length > 0) {
        // Multi-rider broadcast: alert every online rider within range
        validMatches.forEach(match => {
          console.log(`[AI Dispatch] Emitting order:assigned_dispatch socket event to Rider ID: ${match.rider._id} (${match.rider.user?.name || 'Unknown'}) at distance: ${match.distance.toFixed(2)} km`);
          socketManager.sendToRider(match.rider._id.toString(), 'order:assigned_dispatch', {
            orderId: order._id,
            pickup: order.pickup,
            stops: order.stops,
            distanceKm: order.distanceKm,
            fare: order.fare,
            distanceFromPickup: match.distance
          });
        });

        // Re-check order status periodically if no rider has accepted
        setTimeout(async () => {
          try {
            const currentOrder = await Order.findById(orderId);
            if (currentOrder && ['placed', 'searching'].includes(currentOrder.status)) {
              console.log(`[AI Dispatch] Order ${orderId}: Not accepted yet. Re-triggering matching loop...`);
              triggerAIDispatch(orderId);
            }
          } catch (err) {
            console.error('Error in re-triggering AI dispatch:', err.message);
          }
        }, 8000);
      } else {
        console.log(`[AI Dispatch] Order ${orderId}: Found online riders, but none are within 2.0 km radius. Retrying matching loop in 5s...`);
        // No riders within 2km radius, keep searching and retry
        order.status = 'searching';
        await order.save();

        socketManager.broadcast(`order:${orderId}:update`, { status: 'searching' });

        setTimeout(() => {
          triggerAIDispatch(orderId);
        }, 5000);
      }
    } catch (err) {
      console.error('Error in AI dispatch loop:', err.message);
    }
  }, 3000);
};

// Simulate coordinates driving from rider position -> pickup -> stops
const simulateRiderPath = async (orderId, riderId) => {
  const order = await Order.findById(orderId);
  const rider = await Rider.findById(riderId);
  if (!order || !rider) return;

  const startCoords = [...rider.currentLocation.coordinates];
  const pickupCoords = [order.pickup.lng, order.pickup.lat];
  
  // Interpolation helper
  const interpolatePoints = (start, end, steps = 8) => {
    const points = [];
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps;
      points.push([
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio
      ]);
    }
    return points;
  };

  // Compile entire trip waypoints
  let path = interpolatePoints(startCoords, pickupCoords, 8); // To pickup
  
  let currentPos = pickupCoords;
  order.stops.forEach(stop => {
    path = [...path, ...interpolatePoints(currentPos, [stop.lng, stop.lat], 8)];
    currentPos = [stop.lng, stop.lat];
  });

  let index = 0;
  const intervalId = setInterval(async () => {
    if (index >= path.length) {
      clearInterval(intervalId);
      
      // Mark order delivered
      const finishedOrder = await Order.findById(orderId);
      if (finishedOrder && finishedOrder.status !== 'cancelled') {
        finishedOrder.status = 'delivered';
        finishedOrder.paymentStatus = 'paid';
        finishedOrder.timeline.push({
          status: 'delivered',
          description: 'Package payload successfully dispatched & signed for.'
        });
        await finishedOrder.save();

        const finishedRider = await Rider.findById(riderId);
        if (finishedRider) {
          finishedRider.status = 'online';
          finishedRider.totalDeliveries += 1;
          const earningsShare = Math.round(finishedOrder.fare.total * 0.7);
          finishedRider.todayEarnings += earningsShare; // 70% share
          await finishedRider.save();

          // Find or create rider's wallet and credit it
          let riderWallet = await Wallet.findOne({ user: finishedRider.user });
          if (!riderWallet) {
            riderWallet = await Wallet.create({ user: finishedRider.user, balance: 0 });
          }
          riderWallet.balance += earningsShare;
          await riderWallet.save();

          // Log Transaction
          await Transaction.create({
            wallet: riderWallet._id,
            amount: earningsShare,
            type: 'credit',
            purpose: 'delivery_payment',
            referenceId: finishedOrder._id
          });

          // Notify rider of wallet update
          socketManager.sendToUser(finishedRider.user.toString(), 'rider:wallet_update', { balance: riderWallet.balance });

          // Admin 30% split
          const adminShare = Math.round(finishedOrder.fare.total * 0.3);
          const adminUser = await User.findOne({ email: 'admin@gmail.com' });
          if (adminUser) {
            let adminWallet = await Wallet.findOne({ user: adminUser._id });
            if (!adminWallet) {
              adminWallet = await Wallet.create({ user: adminUser._id, balance: 0 });
            }
            adminWallet.balance += adminShare;
            await adminWallet.save();

            // Log Transaction for admin commission
            await Transaction.create({
              wallet: adminWallet._id,
              amount: adminShare,
              type: 'credit',
              purpose: 'admin_commission',
              referenceId: finishedOrder._id
            });

            // Notify admins of stats update (revenue/earnings update)
            socketManager.sendToRoom('admins', 'admin:stats_update', { orderId: finishedOrder._id });
          }
        }

        socketManager.broadcast(`order:${orderId}:update`, { status: 'delivered' });
      }
      return;
    }

    const currentCoords = path[index];
    
    // Persist coordinates in database
    await Rider.findByIdAndUpdate(riderId, {
      'currentLocation.coordinates': currentCoords,
      batteryLevel: Math.max(10, Math.round(rider.batteryLevel - (index * 0.4)))
    });

    // Broadcast coordinate shift
    socketManager.broadcast(`rider:${riderId}:location`, {
      coordinates: currentCoords,
      batteryLevel: Math.max(10, Math.round(rider.batteryLevel - (index * 0.4)))
    });

    // Update status triggers
    if (index === 8) {
      const updatedOrder = await Order.findById(orderId);
      if (updatedOrder) {
        updatedOrder.status = 'pickup_arrived';
        updatedOrder.timeline.push({
          status: 'pickup_arrived',
          description: 'Rider arrived at pickup grid checkpoint.'
        });
        await updatedOrder.save();
        socketManager.broadcast(`order:${orderId}:update`, { status: 'pickup_arrived' });
      }
    } else if (index === 10) {
      const updatedOrder = await Order.findById(orderId);
      if (updatedOrder) {
        updatedOrder.status = 'picked_up';
        updatedOrder.timeline.push({
          status: 'picked_up',
          description: 'Package payloads secured. Transitioning to delivery stops.'
        });
        await updatedOrder.save();
        socketManager.broadcast(`order:${orderId}:update`, { status: 'picked_up' });
      }
    }

    index++;
  }, 3500); // Shift every 3.5s
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate({
        path: 'rider',
        populate: { path: 'user', select: 'name phone' }
      });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate({
        path: 'rider',
        populate: { path: 'user', select: 'name phone' }
      })
      .sort('-createdAt');
    res.status(200).json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'placed' && order.status !== 'searching') {
      return res.status(400).json({ success: false, message: 'Cannot cancel order once rider has been assigned' });
    }

    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      description: 'Order cancelled by customer.'
    });
    await order.save();

    // Refund wallet
    if (order.paymentStatus === 'paid' && order.paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ user: order.customer });
      wallet.balance += order.fare.total;
      await wallet.save();

      await Transaction.create({
        wallet: wallet._id,
        amount: order.fare.total,
        type: 'credit',
        purpose: 'refund',
        referenceId: order._id
      });
    }

    socketManager.broadcast(`order:${order._id}:update`, { status: 'cancelled' });

    res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.acceptOrder = async (req, res, next) => {
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ success: false, message: 'Access denied. You are authenticated as a customer.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'searching' || order.rider) {
      return res.status(400).json({ success: false, message: 'Order has already been accepted by another courier' });
    }

    const rider = await Rider.findOne({ user: req.user.id }).populate('user');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    // Assign order to this rider and lock them
    order.rider = rider._id;
    order.status = 'in_transit';
    order.timeline.push({
      status: 'in_transit',
      description: `Order accepted by courier ${rider.user.name}. Commencing delivery coordinates updates.`
    });
    await order.save();

    rider.status = 'busy';
    await rider.save();

    // Trigger coordinates path updates loop
    simulateRiderPath(order._id, rider._id);

    // Notify other riders to close their popup modal
    socketManager.broadcast('order:accepted_by_other', { orderId: order._id, riderId: rider._id });

    // Notify customer
    socketManager.broadcast(`order:${order._id}:update`, { 
      status: 'in_transit',
      rider: {
        name: rider.user.name,
        phone: rider.user.phone,
        vehicleType: rider.vehicleType,
        rating: rider.rating
      }
    });

    res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.rejectOrder = async (req, res, next) => {
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ success: false, message: 'Access denied. You are authenticated as a customer.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const rider = await Rider.findOne({ user: req.user.id });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    // Add rider to rejected list, status remains searching
    if (!order.rejectedRiders) {
      order.rejectedRiders = [];
    }
    if (!order.rejectedRiders.includes(rider._id)) {
      order.rejectedRiders.push(rider._id);
    }
    await order.save();

    res.status(200).json({ success: true, message: 'Order request declined' });
  } catch (err) {
    next(err);
  }
};

// Auto-dispatch for newly online riders
exports.dispatchPendingOrders = async () => {
  try {
    const pendingOrders = await Order.find({ status: { $in: ['placed', 'searching'] }, rider: null });
    for (const order of pendingOrders) {
      triggerAIDispatch(order._id);
    }
  } catch (err) {
    console.error('Error dispatching pending orders:', err.message);
  }
};

exports.triggerAIDispatch = triggerAIDispatch;
