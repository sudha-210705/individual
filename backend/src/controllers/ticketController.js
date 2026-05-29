const SupportTicket = require('../models/SupportTicket');
const aiEngine = require('../services/aiEngine');

exports.createTicket = async (req, res, next) => {
  try {
    const { subject, messageText, orderId } = req.body;
    if (!subject || !messageText) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const ticket = await SupportTicket.create({
      user: req.user.id,
      order: orderId || null,
      subject,
      messages: [{
        sender: req.user.id,
        text: messageText
      }]
    });

    // AI Chatbot Assistant automatic reply if message goes to AI support chatbot
    if (subject.toLowerCase().includes('ai') || subject.toLowerCase().includes('chatbot') || subject.toLowerCase().includes('bot')) {
      const aiReply = await aiEngine.getAIChatResponse(messageText, req.user.role);
      
      // We will create a dummy System User for AI
      // Or we can just omit sender name or use a virtual AI sender
      ticket.messages.push({
        sender: req.user.id, // Simulating response in ticket list
        text: `[AETHER AI CONTROLLER]: ${aiReply}`
      });
      await ticket.save();
    }

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

exports.getTickets = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }
    const tickets = await SupportTicket.find(query)
      .populate('user', 'name role')
      .populate('order')
      .sort('-createdAt');
    res.status(200).json({ success: true, tickets });
  } catch (err) {
    next(err);
  }
};

exports.addMessageToTicket = async (req, res, next) => {
  try {
    const { text } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.messages.push({
      sender: req.user.id,
      text
    });

    if (req.user.role === 'admin') {
      ticket.status = 'in_progress';
    }
    await ticket.save();

    // Trigger chatbot if user asks AI directly inside ticket (and not admin)
    const lastMsg = text.toLowerCase();
    if (req.user.role !== 'admin' && (lastMsg.includes('ai') || lastMsg.includes('help') || lastMsg.includes('bot') || ticket.subject.toLowerCase().includes('ai'))) {
      setTimeout(async () => {
        const aiReply = await aiEngine.getAIChatResponse(text, req.user.role);
        ticket.messages.push({
          sender: req.user.id, // simulated response
          text: `[AETHER AI]: ${aiReply}`
        });
        await ticket.save();
      }, 1000);
    }

    res.status(200).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};
