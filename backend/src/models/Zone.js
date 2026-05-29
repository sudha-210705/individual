const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  coordinates: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }],
  surgeMultiplier: {
    type: Number,
    default: 1.0
  },
  demandLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Zone', zoneSchema);
