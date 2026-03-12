/**
 * Database Configuration
 * 
 * DEPRECATED: MongoDB is no longer used. The application now uses Firebase (Firestore).
 * This file is kept for backward compatibility but does nothing.
 */

const connectDB = async () => {
  console.log('MongoDB connection disabled - using Firebase only');
};

module.exports = connectDB;
