const express = require('express');
const router = express.Router();
const { getDashboardStats, updateZoneSurge, getFraudLogs } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.post('/surge', updateZoneSurge);
router.get('/fraud', getFraudLogs);

module.exports = router;
