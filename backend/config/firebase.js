/**
 * Firebase Admin SDK Configuration
 * 
 * This file initializes the Firebase Admin SDK for backend operations.
 * It provides access to Firebase Auth and Firestore.
 * 
 * Environment Variables Required:
 * - FIREBASE_PROJECT_ID: Your Firebase project ID
 * - FIREBASE_PRIVATE_KEY: Firebase service account private key
 * - FIREBASE_CLIENT_EMAIL: Firebase service account client email
 * - FIREBASE_DATABASE_URL: Firebase database URL (optional for Firestore)
 */

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

// Check if Firebase is already initialized
if (!admin.apps.length) {
  // Initialize Firebase Admin SDK
  try {
    // Try to initialize with environment variables
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // Validate required environment variables
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.warn('⚠️  Firebase credentials not fully configured. Please set environment variables:');
      console.warn('   - FIREBASE_PROJECT_ID');
      console.warn('   - FIREBASE_PRIVATE_KEY');
      console.warn('   - FIREBASE_CLIENT_EMAIL');
      console.warn('   Firebase services will not be available until properly configured.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });
      
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  }
}

// Export Firestore database instance
const db = admin.firestore();

// Export auth instance
const auth = admin.auth();

// Export admin for custom token generation and other Admin operations
const firebaseAdmin = admin;

// Helper function to convert Firestore timestamp to JavaScript Date
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return timestamp;
};

// Helper function to convert Firestore document to plain object
const docToObject = (doc) => {
  if (!doc || !doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    _id: doc.id, // Add _id field for frontend compatibility
    ...data,
    // Convert any timestamps to Date objects
    ...Object.keys(data).reduce((acc, key) => {
      if (data[key] && typeof data[key].toDate === 'function') {
        acc[key] = data[key].toDate();
      } else {
        acc[key] = data[key];
      }
      return acc;
    }, {}),
  };
};

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  BINS: 'bins',
  MESSAGES: 'messages',
  COUNTERS: 'counters',
};

module.exports = {
  db,
  auth,
  admin: firebaseAdmin,
  FieldValue,
  convertTimestamp,
  docToObject,
  COLLECTIONS,
};
