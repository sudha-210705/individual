const express = require('express');
const router = express.Router();
const { getWalletDetails, loadWallet } = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getWalletDetails);
router.post('/load', loadWallet);

module.exports = router;
