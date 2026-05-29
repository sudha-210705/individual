const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  recipientName: { type: String },
  recipientPhone: { type: String },
  instructions: { type: String },
  status: {
    type: String,
    enum: ['pending', 'arrived', 'completed', 'failed'],
    default: 'pending'
  }
});

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    default: null
  },
  pickup: {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    senderName: { type: String },
    senderPhone: { type: String },
    instructions: { type: String }
  },
  stops: [stopSchema], // Supports multi-stop delivery
  status: {
    type: String,
    enum: ['placed', 'searching', 'assigned', 'pickup_arrived', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'placed'
  },
  fare: {
    base: { type: Number, required: true },
    distanceFare: { type: Number, default: 0 },
    surgeFare: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'card', 'cash'],
    default: 'wallet'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  distanceKm: {
    type: Number,
    required: true
  },
  estimatedDurationMin: {
    type: Number,
    required: true
  },
  eta: {
    type: Date
  },
  routeOptimizedWaypoints: [{
    lat: { type: Number },
    lng: { type: Number }
  }],
  timeline: [{
    status: { type: String },
    timestamp: { type: Date, default: Date.now },
    description: { type: String }
  }],
  rejectedRiders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  }],
  weatherImpact: {
    condition: { type: String, default: 'clear' },
    delayMinutes: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
