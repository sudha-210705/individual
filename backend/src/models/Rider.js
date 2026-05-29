const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['offline', 'online', 'busy'],
    default: 'offline'
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'bicycle', 'drone', 'ev_scooter'],
    default: 'bike'
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: [77.6056, 12.9546] // Default Bangalore coords (MG Road Hub)
    }
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  networkStrength: {
    type: String,
    enum: ['poor', 'good', 'excellent'],
    default: 'excellent'
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 1,
    max: 5
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  todayEarnings: {
    type: Number,
    default: 0
  },
  badges: [{
    title: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    awardedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes for geospatial queries
riderSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Rider', riderSchema);
