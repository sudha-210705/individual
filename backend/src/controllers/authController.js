const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Rider = require('../models/Rider');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'cyberpunk_secret_key_1337', {
    expiresIn: '7d'
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.cookie('token', token, cookieOptions);

  // Return user without password
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    savedAddresses: user.savedAddresses
  };

  res.status(statusCode).json({
    success: true,
    token,
    user: userResponse
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, vehicleType } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required registration details'
      });
    }

    // 1. Email validation: must end with @gmail.com
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail.endsWith('@gmail.com')) {
      return res.status(400).json({
        success: false,
        message: 'Email must be a valid @gmail.com address'
      });
    }

    // 2. Name validation: only letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Name must contain only letters and spaces'
      });
    }

    // 3. Phone validation: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits'
      });
    }

    // Only admin@gmail.com can be an admin
    if (role === 'admin' && sanitizedEmail !== 'admin@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Only admin@gmail.com can be registered as admin'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      phone
    });

    // Create a wallet for the user and pre-fund it (riders and admins start at 0 balance)
    const wallet = await Wallet.create({
      user: user._id,
      balance: (role === 'rider' || role === 'admin') ? 0 : 500
    });
    user.wallet = wallet._id;
    await user.save();

    // If role is rider, create Rider entry
    if (role === 'rider') {
      await Rider.create({
        user: user._id,
        status: 'offline',
        vehicleType: vehicleType || 'bike',
        currentLocation: {
          type: 'Point',
          coordinates: [77.6056 + (Math.random() - 0.5) * 0.005, 12.9546 + (Math.random() - 0.5) * 0.005] // Random Bangalore coordinate near MG Road Hub
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful'
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }


    const sanitizedEmail = email.trim().toLowerCase();

    // Find User
    const user = await User.findOne({ email: sanitizedEmail }).select('+password');

    if (!user || !(await user.comparePassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    if (user.role === 'admin' && user.email !== 'admin@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized admin account'
      });
    }

    sendTokenResponse(user, 200, res);

  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('wallet');
    let riderProfile = null;

    if (user.role === 'rider') {
      riderProfile = await Rider.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      riderProfile
    });
  } catch (err) {
    next(err);
  }
};

// Simulated OTP verification endpoint
exports.verifyOTP = (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Please provide phone and OTP' });
  }

  // Accept any OTP ending in 99 for simulation
  if (otp.endsWith('99') || otp === '123456') {
    return res.status(200).json({ success: true, message: 'OTP verified successfully' });
  }

  return res.status(400).json({ success: false, message: 'Invalid OTP code' });
};
