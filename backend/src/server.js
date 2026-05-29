require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const app = require('./app');
const socketManager = require('./services/socketManager');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Setup Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

socketManager.init(io);

// Database connection
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aether_dispatch';

mongoose.connect(DB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    
    // Clean up stale orders and busy riders on startup
    const Order = require('./models/Order');
    const Rider = require('./models/Rider');
    
    Promise.all([
      Order.updateMany({ status: 'assigned' }, { status: 'searching', rider: null }),
      Order.updateMany({ status: { $in: ['in_transit', 'pickup_arrived', 'picked_up'] } }, { status: 'delivered' }),
      Rider.updateMany({ status: 'busy' }, { status: 'online' }),
      Rider.updateMany({}, { 'currentLocation.coordinates': [77.6056, 12.9546] })
    ])
      .then(() => {
        console.log('Reset stale orders, busy riders, and aligned coordinates to MG Road Hub.');
        const { dispatchPendingOrders } = require('./controllers/orderController');
        dispatchPendingOrders();
      })
      .catch(err => console.error('Error during startup database cleanup:', err.message));

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.log('Starting server in sandbox mode...');
    server.listen(PORT, () => {
      console.log(`Server is running in sandbox mode on port ${PORT}`);
    });
  });
