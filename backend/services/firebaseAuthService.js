/**
 * Firebase Auth Service
 * 
 * This service provides authentication functionality using Firebase Auth.
 * It replaces the previous bcrypt + JWT token authentication.
 * 
 * For client-side login, the frontend will use Firebase Client SDK.
 * This service handles server-side operations like:
 * - Verifying Firebase tokens
 * - Creating custom tokens for users
 * - Managing user sessions
 */

const { auth, db, COLLECTIONS } = require('../config/firebase');
const FirebaseUserService = require('./firebaseUserService');

class FirebaseAuthService {
  /**
   * Verify Firebase ID token from client
   * @param {string} idToken - Firebase ID token from client
   * @returns {Promise<Object>} Decoded token and user data
   */
  static async verifyIdToken(idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      // Get user data from Firestore
      const user = await FirebaseUserService.getUserById(uid);
      
      if (!user) {
        // User exists in Auth but not in Firestore - create basic profile
        const userData = {
          email: decodedToken.email || '',
          name: decodedToken.name || 'Unknown User',
          role: decodedToken.role || 'collector',
        };
        
        const newUser = await FirebaseUserService.createUserProfile(uid, userData);
        return {
          decodedToken,
          user: newUser,
        };
      }
      
      return {
        decodedToken,
        user,
      };
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw error;
    }
  }

  /**
   * Create custom token for user (for custom login flow)
   * @param {string} uid - User's Firebase UID
   * @param {Object} additionalClaims - Additional claims to add to token
   * @returns {Promise<string>} Custom JWT token
   */
  static async createCustomToken(uid, additionalClaims = {}) {
    try {
      const token = await auth.createCustomToken(uid, additionalClaims);
      return token;
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw error;
    }
  }

  /**
   * Verify custom token (for API authentication)
   * @param {string} customToken - Custom token from client
   * @returns {Promise<Object>} Verified token data
   */
  static async verifyCustomToken(customToken) {
    try {
      // For custom tokens, we need to exchange them for ID tokens
      // This is typically done on the client side
      // Here we just verify if it's a valid Firebase token
      const decodedToken = await auth.verifyIdToken(customToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying custom token:', error);
      throw error;
    }
  }

  /**
   * Get user by UID
   * @param {string} uid - User's Firebase UID
   * @returns {Promise<Object>} User record from Firebase Auth
   */
  static async getUser(uid) {
    try {
      const userRecord = await auth.getUser(uid);
      return userRecord;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Update user claims
   * @param {string} uid - User's Firebase UID
   * @param {Object} claims - Custom claims to set
   * @returns {Promise<void>}
   */
  static async setCustomUserClaims(uid, claims) {
    try {
      await auth.setCustomUserClaims(uid, claims);
      console.log(`✅ Custom claims updated for user ${uid}`);
    } catch (error) {
      console.error('Error setting custom claims:', error);
      throw error;
    }
  }

  /**
   * Get user custom claims
   * @param {string} uid - User's Firebase UID
   * @returns {Promise<Object>} Custom claims
   */
  static async getCustomUserClaims(uid) {
    try {
      const userRecord = await auth.getUser(uid);
      return userRecord.customClaims || {};
    } catch (error) {
      console.error('Error getting custom claims:', error);
      throw error;
    }
  }

  /**
   * Revoke all user tokens (force re-login)
   * @param {string} uid - User's Firebase UID
   * @returns {Promise<void>}
   */
  static async revokeAllTokens(uid) {
    try {
      await auth.revokeRefreshTokens(uid);
      console.log(`✅ Tokens revoked for user ${uid}`);
    } catch (error) {
      console.error('Error revoking tokens:', error);
      throw error;
    }
  }

  /**
   * List all users (with pagination)
   * @param {number} maxResults - Maximum number of users to return
   * @param {string} pageToken - Token for next page
   * @returns {Promise<Object>} List of users and next page token
   */
  static async listUsers(maxResults = 100, pageToken = null) {
    try {
      const result = await auth.listUsers(maxResults, pageToken);
      return {
        users: result.users.map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          disabled: user.disabled,
          metadata: user.metadata,
        })),
        pageToken: result.pageToken,
      };
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  }

  /**
   * Disable user account
   * @param {string} uid - User's Firebase UID
   * @returns {Promise<void>}
   */
  static async disableUser(uid) {
    try {
      await auth.updateUser(uid, { disabled: true });
      // Also update Firestore
      await FirebaseUserService.updateUser(uid, { isActive: false });
    } catch (error) {
      console.error('Error disabling user:', error);
      throw error;
    }
  }

  /**
   * Enable user account
   * @param {string} uid - User's Firebase UID
   * @returns {Promise<void>}
   */
  static async enableUser(uid) {
    try {
      await auth.updateUser(uid, { disabled: false });
      // Also update Firestore
      await FirebaseUserService.updateUser(uid, { isActive: true });
    } catch (error) {
      console.error('Error enabling user:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @param {string} uid - User's Firebase UID
   * @returns {Promise<void>}
   */
  static async deleteUser(uid) {
    try {
      // Delete from Firestore first
      await db.collection(COLLECTIONS.USERS).doc(uid).delete();
      // Then delete from Firebase Auth
      await auth.deleteUser(uid);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Generate email verification link
   * @param {string} email - User's email
   * @returns {Promise<string>} Verification link
   */
  static async generateEmailVerificationLink(email) {
    try {
      const link = await auth.generateEmailVerificationLink(email);
      return link;
    } catch (error) {
      console.error('Error generating verification link:', error);
      throw error;
    }
  }

  /**
   * Generate password reset link
   * @param {string} email - User's email
   * @returns {Promise<string>} Password reset link
   */
  static async generatePasswordResetLink(email) {
    try {
      const link = await auth.generatePasswordResetLink(email);
      return link;
    } catch (error) {
      console.error('Error generating password reset link:', error);
      throw error;
    }
  }

  /**
   * Middleware factory for Express - verifies Firebase token
   * @returns {Function} Express middleware function
   */
  static verifyTokenMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'No token provided',
          });
        }
        
        const token = authHeader.split('Bearer ')[1];
        
        const { decodedToken, user } = await this.verifyIdToken(token);
        
        // Attach user data to request
        req.user = {
          id: user.uid,
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role || decodedToken.role || 'collector',
          isActive: user.isActive !== false,
        };
        
        // Attach decoded token for additional claims
        req.decodedToken = decodedToken;
        
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.code === 'auth/id-token-expired') {
          return res.status(401).json({
            success: false,
            message: 'Token expired',
          });
        }
        
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }
    };
  }

  /**
   * Middleware factory for Express - requires admin role
   * @returns {Function} Express middleware function
   */
  static requireAdmin() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }
      
      next();
    };
  }

  /**
   * Middleware factory for Express - requires specific role
   * @param {string[]} roles - Array of allowed roles
   * @returns {Function} Express middleware function
   */
  static requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }
      
      next();
    };
  }
}

module.exports = FirebaseAuthService;
