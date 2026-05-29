const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, verifyOTP } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.post('/verify-otp', verifyOTP);

module.exports = router;
