const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check header or cookies for token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this resource' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberpunk_secret_key_1337');

    // Attach user to request
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    // Lock admin access strictly to admin@gmail.com
    if (req.user.role === 'admin' && req.user.email !== 'admin@gmail.com') {
      return res.status(403).json({ success: false, message: 'Unauthorized admin account' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token verification failed' });
  }
};

// Role authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role '${req.user ? req.user.role : 'none'}' is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
