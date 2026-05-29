const express = require('express');
const router = express.Router();
const { toggleStatus, getRiderProfile, getRiderOrders, updateLocation } = require('../controllers/riderController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('rider'));

router.get('/profile', getRiderProfile);
router.put('/status', toggleStatus);
router.get('/orders', getRiderOrders);
router.put('/location', updateLocation);

module.exports = router;
