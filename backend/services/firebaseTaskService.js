/**
 * Firebase Task Service
 * 
 * Provides CRUD operations for Task data in Firestore.
 * Tasks are linked to Bins and Users (collectors).
 */

const { db, docToObject, COLLECTIONS, FieldValue } = require('../config/firebase');

class FirebaseTaskService {
  /**
   * Get all tasks with optional filtering
   * @param {Object} options - Filter options
   * @param {string} options.status - Filter by status
   * @param {string} options.assignedTo - Filter by assigned user ID
   * @param {string} options.priority - Filter by priority
   * @returns {Promise<Array>} Array of task objects
   */
  static async getAllTasks(options = {}) {
    try {
      const snapshot = await db.collection(COLLECTIONS.TASKS).get();
      let tasks = snapshot.docs.map(doc => docToObject(doc));
      
      // Apply filters
      if (options.status) {
        tasks = tasks.filter(task => task.status === options.status);
      }
      if (options.assignedTo) {
        tasks = tasks.filter(task => task.assignedTo === options.assignedTo);
      }
      if (options.priority) {
        tasks = tasks.filter(task => task.priority === options.priority);
      }
      
      // Sort by createdAt descending
      tasks.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      return tasks;
    } catch (error) {
      console.error('Error getting all tasks:', error);
      throw error;
    }
  }

  /**
   * Get tasks assigned to a specific user (collector)
   * @param {string} userId - User's Firebase UID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of task objects
   */
  static async getTasksByUser(userId, status = null) {
    try {
      let tasks = [];
      
      if (status) {
        const query = db.collection(COLLECTIONS.TASKS)
          .where('assignedTo', '==', userId)
          .where('status', '==', status);
        const snapshot = await query.get();
        tasks = snapshot.docs.map(doc => docToObject(doc));
      } else {
        const query = db.collection(COLLECTIONS.TASKS)
          .where('assignedTo', '==', userId);
        const snapshot = await query.get();
        tasks = snapshot.docs.map(doc => docToObject(doc));
      }
      
      // Sort by createdAt descending
      tasks.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      return tasks;
    } catch (error) {
      console.error('Error getting tasks by user:', error);
      throw error;
    }
  }

  /**
   * Get tasks for a specific bin
   * @param {string} binId - Bin's document ID
   * @returns {Promise<Array>} Array of task objects
   */
  static async getTasksByBin(binId) {
    try {
      const query = db.collection(COLLECTIONS.TASKS)
        .where('binId', '==', binId);
      
      const snapshot = await query.get();
      const tasks = snapshot.docs.map(doc => docToObject(doc));
      
      // Sort by createdAt descending
      tasks.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      return tasks;
    } catch (error) {
      console.error('Error getting tasks by bin:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task's document ID
   * @returns {Promise<Object|null>} Task object or null
   */
  static async getTaskById(taskId) {
    try {
      const docRef = db.collection(COLLECTIONS.TASKS).doc(taskId);
      const doc = await docRef.get();
      return docToObject(doc);
    } catch (error) {
      console.error('Error getting task by ID:', error);
      throw error;
    }
  }

  /**
   * Get task by taskId (custom ID)
   * @param {string} taskId - Custom task ID
   * @returns {Promise<Object|null>} Task object or null
   */
  static async getTaskByTaskId(taskId) {
    try {
      const query = db.collection(COLLECTIONS.TASKS)
        .where('taskId', '==', taskId)
        .limit(1);
      
      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }
      
      return docToObject(snapshot.docs[0]);
    } catch (error) {
      console.error('Error getting task by taskId:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task object
   */
  static async createTask(taskData) {
    try {
      const { taskId, binId, binName, binLocation, assignedTo, assignedByName, 
        priority, status, instructions, estimatedDuration } = taskData;
      
      const task = {
        taskId,
        binId,
        binName,
        binLocation: binLocation || null,
        assignedTo,
        assignedByName,
        priority: priority || 'medium',
        status: status || 'pending',
        instructions: instructions || '',
        createdAt: new Date(),
        assignedAt: new Date(),
        startedAt: null,
        completedAt: null,
        estimatedDuration: estimatedDuration || 30,
        actualDuration: null,
        notes: '',
        issueReported: '',
        gsmUpdates: [],
      };
      
      const docRef = db.collection(COLLECTIONS.TASKS).doc();
      await docRef.set({ ...task, id: docRef.id });
      
      return { id: docRef.id, ...task };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update task
   * @param {string} taskId - Task's document ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated task object
   */
  static async updateTask(taskId, updateData) {
    try {
      // Remove id from update data if present
      const { id: _, ...safeUpdateData } = updateData;
      
      // Add updated timestamp
      safeUpdateData.updatedAt = new Date();
      
      await db.collection(COLLECTIONS.TASKS).doc(taskId).update(safeUpdateData);
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete task
   * @param {string} taskId - Task's document ID
   * @returns {Promise<void>}
   */
  static async deleteTask(taskId) {
    try {
      await db.collection(COLLECTIONS.TASKS).doc(taskId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Start a task (collector begins work)
   * @param {string} taskId - Task's document ID
   * @param {string} userName - Name of user starting the task
   * @returns {Promise<Object>} Updated task object
   */
  static async startTask(taskId, userName) {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      
      if (task.status !== 'pending') {
        throw new Error('Task cannot be started');
      }
      
      const gsmUpdate = {
        type: 'start',
        message: `Task started by ${userName}`,
        timestamp: new Date(),
      };
      
      await db.collection(COLLECTIONS.TASKS).doc(taskId).update({
        status: 'in-progress',
        startedAt: new Date(),
        gsmUpdates: [...(task.gsmUpdates || []), gsmUpdate],
        updatedAt: new Date(),
      });
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Error starting task:', error);
      throw error;
    }
  }

  /**
   * Complete a task
   * @param {string} taskId - Task's document ID
   * @param {Object} completionData - Completion data (notes, issueReported)
   * @returns {Promise<Object>} Updated task object
   */
  static async completeTask(taskId, completionData) {
    try {
      const { notes, issueReported, userName } = completionData;
      
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      
      if (task.status !== 'in-progress') {
        throw new Error('Task cannot be completed');
      }
      
      const completedAt = new Date();
      let actualDuration = null;
      
      if (task.startedAt) {
        actualDuration = Math.round((completedAt - new Date(task.startedAt)) / 60000);
      }
      
      const gsmUpdate = {
        type: 'complete',
        message: `Task completed by ${userName}`,
        timestamp: new Date(),
      };
      
      await db.collection(COLLECTIONS.TASKS).doc(taskId).update({
        status: 'completed',
        completedAt,
        actualDuration,
        notes: notes || '',
        issueReported: issueReported || '',
        gsmUpdates: [...(task.gsmUpdates || []), gsmUpdate],
        updatedAt: new Date(),
      });
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Get task statistics
   * @returns {Promise<Object>} Task statistics
   */
  static async getTaskStats() {
    try {
      const tasks = await this.getAllTasks();
      
      const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        highPriority: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
        averageDuration: 0,
      };
      
      const tasksWithDuration = tasks.filter(t => t.actualDuration);
      if (tasksWithDuration.length > 0) {
        stats.averageDuration = Math.round(
          tasksWithDuration.reduce((sum, t) => sum + t.actualDuration, 0) / tasksWithDuration.length
        );
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting task stats:', error);
      throw error;
    }
  }

  /**
   * Get collector performance statistics
   * @param {string} collectorId - Collector's Firebase UID
   * @returns {Promise<Object>} Performance statistics
   */
  static async getCollectorPerformance(collectorId) {
    try {
      const tasks = await this.getTasksByUser(collectorId);
      
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const averageDuration = completedTasks.length > 0
        ? Math.round(completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length)
        : 0;
      
      return {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        averageDuration,
        completionRate: tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100) 
          : 0,
      };
    } catch (error) {
      console.error('Error getting collector performance:', error);
      throw error;
    }
  }

  /**
   * Add GSM update to a task
   * @param {string} taskId - Task's document ID
   * @param {Object} gsmUpdate - GSM update data
   * @returns {Promise<Object>} Updated task object
   */
  static async addGsmUpdate(taskId, gsmUpdate) {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      
      const update = {
        type: gsmUpdate.type,
        message: gsmUpdate.message,
        timestamp: new Date(),
      };
      
      await db.collection(COLLECTIONS.TASKS).doc(taskId).update({
        gsmUpdates: [...(task.gsmUpdates || []), update],
        updatedAt: new Date(),
      });
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Error adding GSM update:', error);
      throw error;
    }
  }

  /**
   * Get next task number with atomic increment
   * Uses Firestore's FieldValue.increment() for atomic operations
   * @returns {Promise<number>} The next task number
   */
  static async getNextTaskNumber() {
    try {
      const counterRef = db.collection(COLLECTIONS.COUNTERS).doc('taskCounter');
      
      // Use atomic increment to get the next number
      // This ensures thread-safe auto-incrementing
      const counterDoc = await counterRef.get();
      
      if (!counterDoc.exists) {
        // Initialize counter if it doesn't exist
        await counterRef.set({
          count: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return 1;
      }
      
      // Atomically increment the counter and get the new value
      await counterRef.update({
        count: FieldValue.increment(1),
        updatedAt: new Date()
      });
      
      // Get the updated counter value
      const updatedDoc = await counterRef.get();
      return updatedDoc.data().count;
    } catch (error) {
      console.error('Error getting next task number:', error);
      throw error;
    }
  }

  /**
   * Generate auto-incrementing task ID (e.g., TASK-001, TASK-002)
   * @returns {Promise<string>} The generated task ID
   */
  static async generateTaskId() {
    try {
      const taskNumber = await this.getNextTaskNumber();
      // Format with leading zeros (3 digits for TASK-001 to TASK-999, 4 for TASK-1000+)
      const formattedNumber = String(taskNumber).padStart(3, '0');
      return `TASK-${formattedNumber}`;
    } catch (error) {
      console.error('Error generating task ID:', error);
      throw error;
    }
  }

  /**
   * Initialize task counter (for testing or reset purposes)
   * @param {number} startValue - The starting value for the counter
   */
  static async initializeCounter(startValue = 1) {
    try {
      const counterRef = db.collection(COLLECTIONS.COUNTERS).doc('taskCounter');
      await counterRef.set({
        count: startValue,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Task counter initialized to ${startValue}`);
    } catch (error) {
      console.error('Error initializing counter:', error);
      throw error;
    }
  }

  /**
   * Get current counter value (for testing purposes)
   * @returns {Promise<number>} Current counter value
   */
  static async getCurrentCounterValue() {
    try {
      const counterRef = db.collection(COLLECTIONS.COUNTERS).doc('taskCounter');
      const counterDoc = await counterRef.get();
      
      if (!counterDoc.exists) {
        return 0;
      }
      
      return counterDoc.data().count;
    } catch (error) {
      console.error('Error getting counter value:', error);
      throw error;
    }
  }
}

module.exports = FirebaseTaskService;
