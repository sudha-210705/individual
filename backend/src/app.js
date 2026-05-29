const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const riderRoutes = require('./routes/riderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const walletRoutes = require('./routes/walletRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: true, // Allow all origins for dev testing
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📡 [API Log] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Base health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'Aether Core Online' });
});

// Apply rate limiting
app.use('/api', apiLimiter);

// Bind routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tickets', ticketRoutes);

// Error Handler Middleware
app.use(errorHandler);

module.exports = app;
