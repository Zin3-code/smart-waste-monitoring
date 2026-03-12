/**
 * Firebase Bin Service
 * 
 * Provides CRUD operations for Bin data in Firestore.
 * Bins represent waste containers with IoT sensors.
 */

const { db, docToObject, COLLECTIONS } = require('../config/firebase');

class FirebaseBinService {
  /**
   * Get all bins with optional filtering
   * @param {Object} options - Filter options
   * @param {string} options.status - Filter by status
   * @param {string} options.area - Filter by area
   * @returns {Promise<Array>} Array of bin objects
   */
  static async getAllBins(options = {}) {
    try {
      const snapshot = await db.collection(COLLECTIONS.BINS).get();
      let bins = snapshot.docs.map(doc => docToObject(doc));
      
      // Apply filters
      if (options.status) {
        if (options.status === 'offline') {
          bins = bins.filter(bin => !bin.isOnline);
        } else {
          bins = bins.filter(bin => bin.status === options.status);
        }
      }
      if (options.area) {
        bins = bins.filter(bin => bin.location?.area === options.area);
      }
      
      // Sort by createdAt descending
      bins.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      return bins;
    } catch (error) {
      console.error('Error getting all bins:', error);
      throw error;
    }
  }

  /**
   * Get bin by ID
   * @param {string} binId - Bin's document ID
   * @returns {Promise<Object|null>} Bin object or null
   */
  static async getBinById(binId) {
    try {
      const docRef = db.collection(COLLECTIONS.BINS).doc(binId);
      const doc = await docRef.get();
      return docToObject(doc);
    } catch (error) {
      console.error('Error getting bin by ID:', error);
      throw error;
    }
  }

  /**
   * Get bin by custom binId
   * @param {string} binId - Custom bin ID
   * @returns {Promise<Object|null>} Bin object or null
   */
  static async getBinByBinId(binId) {
    try {
      const query = db.collection(COLLECTIONS.BINS)
        .where('binId', '==', binId)
        .limit(1);
      
      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }
      
      return docToObject(snapshot.docs[0]);
    } catch (error) {
      console.error('Error getting bin by binId:', error);
      throw error;
    }
  }

  /**
   * Get bin by device ID
   * @param {string} deviceId - ESP32 device ID
   * @returns {Promise<Object|null>} Bin object or null
   */
  static async getBinByDeviceId(deviceId) {
    try {
      const query = db.collection(COLLECTIONS.BINS)
        .where('deviceId', '==', deviceId)
        .limit(1);
      
      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }
      
      return docToObject(snapshot.docs[0]);
    } catch (error) {
      console.error('Error getting bin by deviceId:', error);
      throw error;
    }
  }

  /**
   * Get bin by GSM number
   * @param {string} gsmNumber - GSM number
   * @returns {Promise<Object|null>} Bin object or null
   */
  static async getBinByGsmNumber(gsmNumber) {
    try {
      const query = db.collection(COLLECTIONS.BINS)
        .where('gsmNumber', '==', gsmNumber)
        .limit(1);
      
      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }
      
      return docToObject(snapshot.docs[0]);
    } catch (error) {
      console.error('Error getting bin by GSM number:', error);
      throw error;
    }
  }

  /**
   * Create a new bin
   * @param {Object} binData - Bin data
   * @returns {Promise<Object>} Created bin object
   */
  static async createBin(binData) {
    try {
      const { binId, name, location, capacity, currentLevel, status, isOnline, 
        gsmNumber, deviceId, type } = binData;
      
      const bin = {
        binId,
        name,
        location,
        capacity: capacity || 100,
        currentLevel: currentLevel || 0,
        status: status || 'empty',
        isOnline: isOnline !== undefined ? isOnline : false,
        lastUpdate: new Date(),
        lastSeen: new Date(),
        gsmNumber,
        deviceId,
        type: type || 'general',
        fillHistory: [],
        alerts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = db.collection(COLLECTIONS.BINS).doc();
      await docRef.set({ ...bin, id: docRef.id });
      
      return { id: docRef.id, ...bin };
    } catch (error) {
      console.error('Error creating bin:', error);
      throw error;
    }
  }

  /**
   * Update bin
   * @param {string} binId - Bin's document ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated bin object
   */
  static async updateBin(binId, updateData) {
    try {
      // Remove id from update data if present
      const { id: _, ...safeUpdateData } = updateData;
      
      // Add updated timestamp
      safeUpdateData.updatedAt = new Date();
      
      await db.collection(COLLECTIONS.BINS).doc(binId).update(safeUpdateData);
      
      return await this.getBinById(binId);
    } catch (error) {
      console.error('Error updating bin:', error);
      throw error;
    }
  }

  /**
   * Delete bin
   * @param {string} binId - Bin's document ID
   * @returns {Promise<void>}
   */
  static async deleteBin(binId) {
    try {
      await db.collection(COLLECTIONS.BINS).doc(binId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting bin:', error);
      throw error;
    }
  }

  /**
   * Update bin fill level (from ESP32 device)
   * @param {string} binId - Bin's document ID
   * @param {Object} levelData - Level update data
   * @returns {Promise<Object>} Updated bin object
   */
  static async updateBinLevel(binId, levelData) {
    try {
      const { deviceId, level } = levelData;
      
      console.log('DEBUG: updateBinLevel called with level:', level);
      
      const bin = await this.getBinById(binId);
      if (!bin) {
        throw new Error('Bin not found');
      }
      
      // Verify device ID if provided
      if (deviceId && bin.deviceId !== deviceId) {
        throw new Error('Unauthorized device');
      }
      
      const previousStatus = bin.status;
      const previousLevel = bin.currentLevel;
      
      // Determine new status based on level (matches ESP32 thresholds)
      let newStatus = bin.status;
      if (level >= 85) {
        newStatus = 'full';
      } else if (level >= 65) {
        newStatus = 'near-full';
      } else if (level >= 50) {
        newStatus = 'medium';
      } else if (level >= 25) {
        newStatus = 'low';
      } else {
        newStatus = 'empty';
      }
      
      // Add to fill history
      const fillEntry = {
        level,
        timestamp: new Date(),
      };
      
      const fillHistory = [...(bin.fillHistory || []), fillEntry].slice(-100);
      
      // Check for alerts (matches ESP32 thresholds)
      const alerts = [...(bin.alerts || [])];
      const nearFullThreshold = parseInt(process.env.NEAR_FULL_THRESHOLD) || 65;
      const fullThreshold = parseInt(process.env.FULL_THRESHOLD) || 85;
      
      if (level >= fullThreshold && previousStatus !== 'full') {
        alerts.push({
          type: 'full',
          message: `Bin is at ${level}% capacity`,
          timestamp: new Date(),
          acknowledged: false,
        });
      } else if (level >= nearFullThreshold && previousStatus !== 'near-full' && previousStatus !== 'full' && previousLevel < nearFullThreshold) {
        alerts.push({
          type: 'near-full',
          message: `Bin is at ${level}% capacity`,
          timestamp: new Date(),
          acknowledged: false,
        });
      }
      
      await db.collection(COLLECTIONS.BINS).doc(binId).update({
        currentLevel: level,
        lastUpdate: new Date(),
        lastSeen: new Date(),
        isOnline: true,
        status: newStatus,
        fillHistory,
        alerts,
        updatedAt: new Date(),
      });
      
      // Return the updated bin with alert information
      const updatedBin = await this.getBinById(binId);
      return {
        ...updatedBin,
        newAlerts: alerts.slice(-(alerts.length - (bin.alerts?.length || 0))),
      };
    } catch (error) {
      console.error('Error updating bin level:', error);
      throw error;
    }
  }

  /**
   * Mark bin as collected (reset level)
   * @param {string} binId - Bin's document ID
   * @returns {Promise<Object>} Updated bin object
   */
  static async collectBin(binId) {
    try {
      const bin = await this.getBinById(binId);
      if (!bin) {
        throw new Error('Bin not found');
      }
      
      await db.collection(COLLECTIONS.BINS).doc(binId).update({
        currentLevel: 0,
        status: 'empty',
        lastUpdate: new Date(),
        updatedAt: new Date(),
      });
      
      return await this.getBinById(binId);
    } catch (error) {
      console.error('Error collecting bin:', error);
      throw error;
    }
  }

  /**
   * Update bin online status
   * @param {string} binId - Bin's document ID
   * @param {boolean} isOnline - Online status
   * @returns {Promise<Object>} Updated bin object
   */
  static async updateOnlineStatus(binId, isOnline) {
    try {
      const bin = await this.getBinById(binId);
      if (!bin) {
        throw new Error('Bin not found');
      }
      
      const updateData = {
        isOnline,
        lastSeen: new Date(),
        updatedAt: new Date(),
      };
      
      // Update status if going offline
      if (!isOnline) {
        updateData.status = 'offline';
      } else if (bin.status === 'offline') {
        // Restore status based on current level if coming back online
        if (bin.currentLevel >= 66) {
          updateData.status = 'full';
        } else if (bin.currentLevel >= 33) {
          updateData.status = 'medium';
        } else {
          updateData.status = 'empty';
        }
      }
      
      await db.collection(COLLECTIONS.BINS).doc(binId).update(updateData);
      
      return await this.getBinById(binId);
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  }

  /**
   * Get bin statistics
   * @returns {Promise<Object>} Bin statistics
   */
  static async getBinStats() {
    try {
      const bins = await this.getAllBins();
      
      const stats = {
        total: bins.length,
        online: bins.filter(b => b.isOnline).length,
        offline: bins.filter(b => !b.isOnline).length,
        empty: bins.filter(b => b.isOnline && b.status === 'empty').length,
        medium: bins.filter(b => b.isOnline && b.status === 'medium').length,
        full: bins.filter(b => b.isOnline && b.status === 'full').length,
        averageFillLevel: 0,
      };
      
      const onlineBins = bins.filter(b => b.isOnline);
      if (onlineBins.length > 0) {
        stats.averageFillLevel = Math.round(
          onlineBins.reduce((sum, b) => sum + b.currentLevel, 0) / onlineBins.length
        );
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting bin stats:', error);
      throw error;
    }
  }

  /**
   * Acknowledge bin alert
   * @param {string} binId - Bin's document ID
   * @param {string} alertIndex - Index of alert to acknowledge
   * @returns {Promise<Object>} Updated bin object
   */
  static async acknowledgeAlert(binId, alertIndex) {
    try {
      const bin = await this.getBinById(binId);
      if (!bin) {
        throw new Error('Bin not found');
      }
      
      const alerts = [...(bin.alerts || [])];
      if (alerts[alertIndex]) {
        alerts[alertIndex].acknowledged = true;
        
        await db.collection(COLLECTIONS.BINS).doc(binId).update({
          alerts,
          updatedAt: new Date(),
        });
      }
      
      return await this.getBinById(binId);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }
}

module.exports = FirebaseBinService;
