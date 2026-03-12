/**
 * Firebase User Service
 * Handles CRUD operations for user profiles stored in Firestore
 */

const { db, auth, admin, docToObject, COLLECTIONS } = require('../config/firebase');

class FirebaseUserService {

  static async getUserByEmail(email) {
    try {
      const snapshot = await db.collection(COLLECTIONS.USERS)
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return docToObject(snapshot.docs[0]);
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  static async updateLastActive(uid) {
    try {
      if (!uid) {
        throw new Error("UID required");
      }

      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        lastActive: new Date(),
        updatedAt: new Date()
      });

      return await this.getUserById(uid);
    } catch (error) {
      console.error("Error updating last active:", error);
      throw error;
    }
  }

  static async incrementTasksCompleted(uid) {
    try {
      if (!uid) {
        throw new Error("UID required");
      }

      const user = await this.getUserById(uid);
      if (!user) {
        throw new Error("User not found");
      }

      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        tasksCompleted: (user.tasksCompleted || 0) + 1,
        updatedAt: new Date()
      });

      return await this.getUserById(uid);
    } catch (error) {
      console.error("Error incrementing tasks completed:", error);
      throw error;
    }
  }

  static async getCollectors() {
    try {
      const snapshot = await db.collection(COLLECTIONS.USERS)
        .where('role', '==', 'collector')
        .get();

      return snapshot.docs.map(doc => docToObject(doc));
    } catch (error) {
      console.error("Error getting collectors:", error);
      throw error;
    }
  }

  static async getUserById(uid) {
    try {

      // 🔴 Prevent Firestore crash
      if (!uid || typeof uid !== "string") {
        throw new Error("Invalid UID provided");
      }

      const docRef = db.collection(COLLECTIONS.USERS).doc(uid);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return docToObject(doc);

    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  static async getAllUsers() {
    try {

      const snapshot = await db.collection(COLLECTIONS.USERS).get();

      return snapshot.docs.map(doc => docToObject(doc));

    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  }

  static async createUser(userData) {

    const { email, password, name, role } = userData;

    try {

      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name
      });

      const profile = {
        uid: userRecord.uid,
        email: email.toLowerCase(),
        name,
        role: role || "collector",
        isActive: true,
        tasksCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(profile);

      await auth.setCustomUserClaims(userRecord.uid, { role: profile.role });

      return profile;

    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  static async updateUser(uid, data) {

    try {

      if (!uid) {
        throw new Error("UID required");
      }

      data.updatedAt = new Date();

      await db.collection(COLLECTIONS.USERS).doc(uid).update(data);

      return await this.getUserById(uid);

    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  static async deleteUser(uid) {

    try {

      if (!uid) {
        throw new Error("UID required");
      }

      await db.collection(COLLECTIONS.USERS).doc(uid).delete();

      await auth.deleteUser(uid);

      return { success: true };

    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

}

module.exports = FirebaseUserService;