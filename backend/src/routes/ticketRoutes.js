const express = require('express');
const router = express.Router();
const { createTicket, getTickets, addMessageToTicket } = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createTicket);
router.get('/', getTickets);
router.post('/:id/messages', addMessageToTicket);

module.exports = router;
