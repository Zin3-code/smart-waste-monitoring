/**
 * Firebase Message Service
 * 
 * Provides CRUD operations for Message data in Firestore.
 * Messages represent communications between bins, collectors, and admins.
 */

const { db, docToObject, COLLECTIONS } = require('../config/firebase');

class FirebaseMessageService {
  /**
   * Get all messages with optional filtering
   * @param {Object} options - Filter options
   * @param {string} options.sender - Filter by sender type
   * @param {string} options.recipient - Filter by recipient type
   * @param {string} options.messageType - Filter by message type
   * @param {boolean} options.isRead - Filter by read status
   * @returns {Promise<Array>} Array of message objects
   */
  static async getAllMessages(options = {}) {
    try {
      const snapshot = await db.collection(COLLECTIONS.MESSAGES).get();
      let messages = snapshot.docs.map(doc => docToObject(doc));
      
      // Apply filters
      if (options.sender) {
        messages = messages.filter(msg => msg.sender === options.sender);
      }
      if (options.recipient) {
        messages = messages.filter(msg => msg.recipient === options.recipient);
      }
      if (options.messageType) {
        messages = messages.filter(msg => msg.messageType === options.messageType);
      }
      if (options.isRead !== undefined) {
        messages = messages.filter(msg => msg.isRead === options.isRead);
      }
      
      // Sort by timestamp descending (newest first)
      messages.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting all messages:', error);
      throw error;
    }
  }

  /**
   * Get message by ID
   * @param {string} messageId - Message's document ID
   * @returns {Promise<Object|null>} Message object or null
   */
  static async getMessageById(messageId) {
    try {
      const docRef = db.collection(COLLECTIONS.MESSAGES).doc(messageId);
      const doc = await docRef.get();
      return docToObject(doc);
    } catch (error) {
      console.error('Error getting message by ID:', error);
      throw error;
    }
  }

  /**
   * Get messages by sender
   * @param {string} senderId - Sender's ID
   * @returns {Promise<Array>} Array of message objects
   */
  static async getMessagesBySender(senderId) {
    try {
      const query = db.collection(COLLECTIONS.MESSAGES)
        .where('senderId', '==', senderId);
      
      const snapshot = await query.get();
      const messages = snapshot.docs.map(doc => docToObject(doc));
      
      messages.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting messages by sender:', error);
      throw error;
    }
  }

  /**
   * Get messages by recipient
   * @param {string} recipientId - Recipient's ID
   * @returns {Promise<Array>} Array of message objects
   */
  static async getMessagesByRecipient(recipientId) {
    try {
      const query = db.collection(COLLECTIONS.MESSAGES)
        .where('recipientId', '==', recipientId);
      
      const snapshot = await query.get();
      const messages = snapshot.docs.map(doc => docToObject(doc));
      
      messages.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting messages by recipient:', error);
      throw error;
    }
  }

  /**
   * Get messages related to a specific bin
   * @param {string} binId - Bin's document ID
   * @returns {Promise<Array>} Array of message objects
   */
  static async getMessagesByBin(binId) {
    try {
      const query = db.collection(COLLECTIONS.MESSAGES)
        .where('relatedBinId', '==', binId);
      
      const snapshot = await query.get();
      const messages = snapshot.docs.map(doc => docToObject(doc));
      
      messages.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting messages by bin:', error);
      throw error;
    }
  }

  /**
   * Get messages related to a specific task
   * @param {string} taskId - Task's document ID
   * @returns {Promise<Array>} Array of message objects
   */
  static async getMessagesByTask(taskId) {
    try {
      const query = db.collection(COLLECTIONS.MESSAGES)
        .where('relatedTaskId', '==', taskId);
      
      const snapshot = await query.get();
      const messages = snapshot.docs.map(doc => docToObject(doc));
      
      messages.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting messages by task:', error);
      throw error;
    }
  }

  /**
   * Create a new message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message object
   */
  static async createMessage(messageData) {
    try {
      const { messageId, sender, senderId, senderName, senderGsm, recipient, 
        recipientId, recipientName, recipientGsm, messageType, content, 
        relatedBinId, relatedTaskId } = messageData;
      
      const message = {
        messageId,
        sender,
        senderId,
        senderName,
        senderGsm,
        recipient,
        recipientId: recipientId || null,
        recipientName: recipientName || null,
        recipientGsm: recipientGsm || null,
        messageType: messageType || 'notification',
        content,
        relatedBinId: relatedBinId || null,
        relatedTaskId: relatedTaskId || null,
        isRead: false,
        readAt: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = db.collection(COLLECTIONS.MESSAGES).doc();
      await docRef.set({ ...message, id: docRef.id });
      
      return { id: docRef.id, ...message };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message's document ID
   * @returns {Promise<Object>} Updated message object
   */
  static async markAsRead(messageId) {
    try {
      const message = await this.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      await db.collection(COLLECTIONS.MESSAGES).doc(messageId).update({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      });
      
      return await this.getMessageById(messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Mark all messages as read
   * @param {Object} filter - Filter for messages to mark as read
   * @returns {Promise<Object>} Result of operation
   */
  static async markAllAsRead(filter = {}) {
    try {
      const messages = await this.getAllMessages({ 
        isRead: false,
        ...filter 
      });
      
      const batch = db.batch();
      
      messages.forEach(message => {
        const docRef = db.collection(COLLECTIONS.MESSAGES).doc(message.id);
        batch.update(docRef, {
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        });
      });
      
      await batch.commit();
      
      return {
        success: true,
        count: messages.length,
      };
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      throw error;
    }
  }

  /**
   * Delete message
   * @param {string} messageId - Message's document ID
   * @returns {Promise<void>}
   */
  static async deleteMessage(messageId) {
    try {
      await db.collection(COLLECTIONS.MESSAGES).doc(messageId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Get unread message count
   * @param {string} recipientId - Optional recipient filter
   * @returns {Promise<number>} Count of unread messages
   */
  static async getUnreadCount(recipientId = null) {
    try {
      let messages;
      
      if (recipientId) {
        const query = db.collection(COLLECTIONS.MESSAGES)
          .where('isRead', '==', false)
          .where('recipientId', '==', recipientId);
        
        const snapshot = await query.get();
        messages = snapshot.docs.map(doc => docToObject(doc));
      } else {
        messages = await this.getAllMessages({ isRead: false });
      }
      
      return messages.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Get message statistics
   * @returns {Promise<Object>} Message statistics
   */
  static async getMessageStats() {
    try {
      const messages = await this.getAllMessages();
      
      const stats = {
        total: messages.length,
        unread: messages.filter(m => !m.isRead).length,
        fromBins: messages.filter(m => m.sender === 'bin').length,
        fromCollectors: messages.filter(m => m.sender === 'collector').length,
        alerts: messages.filter(m => m.messageType === 'alert').length,
        updates: messages.filter(m => m.messageType === 'update').length,
        issues: messages.filter(m => m.messageType === 'issue').length,
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting message stats:', error);
      throw error;
    }
  }

  /**
   * Process incoming GSM message (from bins/collectors)
   * @param {Object} gsmData - GSM message data
   * @returns {Promise<Object>} Created message object
   */
  static async processIncomingGsm(gsmData) {
    try {
      const { senderGsm, content } = gsmData;
      
      if (!senderGsm || !content) {
        throw new Error('Sender GSM and content are required');
      }
      
      // Determine sender type based on GSM number
      // This is a simplified version - in production, you'd check against your database
      let senderType = 'collector';
      let senderId = null;
      let senderName = 'Unknown';
      
      // Try to find bin by GSM
      const { FirebaseBinService } = require('./firebaseBinService');
      const bin = await FirebaseBinService.getBinByGsmNumber(senderGsm);
      
      if (bin) {
        senderType = 'bin';
        senderId = bin.id;
        senderName = bin.name;
      }
      
      // Try to find user by GSM
      const { FirebaseUserService } = require('./firebaseUserService');
      const user = await FirebaseUserService.getUserByEmail(senderGsm); // This won't work for GSM
      // For now, we'll create a message without sender lookup
      
      // Parse message content to determine message type
      let messageType = 'notification';
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes('alert') || lowerContent.includes('full') || lowerContent.includes('overflow')) {
        messageType = 'alert';
      } else if (lowerContent.includes('issue') || lowerContent.includes('problem') || lowerContent.includes('error')) {
        messageType = 'issue';
      } else if (lowerContent.includes('update') || lowerContent.includes('level')) {
        messageType = 'update';
      } else if (lowerContent.includes('confirm') || lowerContent.includes('done') || lowerContent.includes('complete')) {
        messageType = 'confirmation';
      }
      
      // Generate a simple message ID
      const messageId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message = await this.createMessage({
        messageId,
        sender: senderType,
        senderId,
        senderName,
        senderGsm,
        recipient: 'admin',
        recipientId: 'admin',
        recipientName: 'Administrator',
        messageType,
        content,
      });
      
      return message;
    } catch (error) {
      console.error('Error processing incoming GSM:', error);
      throw error;
    }
  }
}

module.exports = FirebaseMessageService;
