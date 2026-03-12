const firebaseMessageService = require('../services/firebaseMessageService');
const firebaseBinService = require('../services/firebaseBinService');
const firebaseUserService = require('../services/firebaseUserService');

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private/Admin
exports.getAllMessages = async (req, res) => {
  try {
    const { sender, recipient, messageType, isRead } = req.query;
    
    const options = {};
    if (sender) options.sender = sender;
    if (recipient) options.recipient = recipient;
    if (messageType) options.messageType = messageType;
    if (isRead !== undefined) options.isRead = isRead === 'true';

    const messages = await firebaseMessageService.getAllMessages(options);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single message
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = async (req, res) => {
  try {
    const message = await firebaseMessageService.getMessageById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new message
// @route   POST /api/messages
// @access  Private
exports.createMessage = async (req, res) => {
  try {
    const message = await firebaseMessageService.createMessage(req.body);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Receive GSM message (from bins/collectors)
// @route   POST /api/messages/gsm
// @access  Public
exports.receiveGsmMessage = async (req, res) => {
  try {
    const { senderGsm, content } = req.body;

    if (!senderGsm || !content) {
      return res.status(400).json({
        success: false,
        message: 'Please provide sender GSM number and content',
      });
    }

    const message = await firebaseMessageService.processIncomingGsm({
      senderGsm,
      content,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await firebaseMessageService.getMessageById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const updatedMessage = await firebaseMessageService.markAsRead(req.params.id);

    res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark all messages as read
// @route   PUT /api/messages/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const { recipientId } = req.body;
    
    const result = await firebaseMessageService.markAllAsRead({ recipientId });

    res.status(200).json({
      success: true,
      message: `Marked ${result.count} messages as read`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private/Admin
exports.deleteMessage = async (req, res) => {
  try {
    const message = await firebaseMessageService.getMessageById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    await firebaseMessageService.deleteMessage(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get message statistics
// @route   GET /api/messages/stats/overview
// @access  Private/Admin
exports.getMessageStats = async (req, res) => {
  try {
    const stats = await firebaseMessageService.getMessageStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get messages for current user
// @route   GET /api/messages/my-messages
// @access  Private
exports.getMyMessages = async (req, res) => {
  try {
    const messages = await firebaseMessageService.getMessagesByRecipient(req.user.id);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get unread count
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await firebaseMessageService.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
