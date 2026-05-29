const express = require('express');
const router = express.Router();
const { createOrder, getOrderDetails, getCustomerOrders, cancelOrder, estimatePrice, acceptOrder, rejectOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/estimate', estimatePrice);
router.post('/', createOrder);
router.get('/', getCustomerOrders);
router.get('/:id', getOrderDetails);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/accept', acceptOrder);
router.put('/:id/reject', rejectOrder);

module.exports = router;
