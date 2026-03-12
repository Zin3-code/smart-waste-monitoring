/**
 * MongoDB to Firebase Migration Script
 *
 * This script migrates data from MongoDB to Firebase Firestore.
 * It exports all data from MongoDB collections and imports them into Firestore.
 *
 * Usage: node scripts/migrateToFirebase.js
 *
 * Environment Variables Required:
 * - MONGODB_URI: MongoDB connection string
 * - FIREBASE_PROJECT_ID: Firebase project ID
 * - FIREBASE_PRIVATE_KEY: Firebase service account private key
 * - FIREBASE_CLIENT_EMAIL: Firebase service account client email
 * - (optional) FIREBASE_DATABASE_URL: Realtime Database URL (not required for Firestore)
 */

require("dotenv").config();

const mongoose = require("mongoose");
const admin = require("firebase-admin");

// MongoDB Models
const User = require("../models/User");
const Task = require("../models/Task");
const Bin = require("../models/Bin");
const Message = require("../models/Message");

// Migration state
const migrationState = {
  users: { mongo: 0, firebase: 0, errors: [] },
  tasks: { mongo: 0, firebase: 0, errors: [] },
  bins: { mongo: 0, firebase: 0, errors: [] },
  messages: { mongo: 0, firebase: 0, errors: [] },
};

// ID mappings for relationship references
const idMappings = {
  users: new Map(), // MongoDB ObjectId -> Firebase UID
  bins: new Map(), // MongoDB ObjectId -> Firebase document ID
  tasks: new Map(), // MongoDB ObjectId -> Firebase document ID
  messages: new Map(), // MongoDB ObjectId -> Firebase document ID
};

// Helpers
function safeString(val, fallback = "") {
  return typeof val === "string" ? val : fallback;
}

/**
 * Firestore has a 1MB document limit (and strings can easily exceed it when base64 images are stored).
 * This helper removes huge strings (commonly base64 images) to avoid INVALID_ARGUMENT errors.
 */
function safePhoto(val) {
  if (typeof val !== "string") return "";
  // keep only if reasonably small; adjust threshold if needed
  // 500k chars is a safer limit than 1MB since document also has other fields
  return val.length < 500_000 ? val : "";
}

// Initialize Firebase
async function initializeFirebase() {
  if (!admin.apps.length) {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (
      !serviceAccount.project_id ||
      !serviceAccount.private_key ||
      !serviceAccount.client_email
    ) {
      throw new Error(
        "Firebase credentials not configured. Please set environment variables."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });

    // ✅ IMPORTANT: prevents Firestore from crashing on undefined values
    admin.firestore().settings({ ignoreUndefinedProperties: true });

    console.log("✅ Firebase Admin SDK initialized");
  }

  return {
    db: admin.firestore(),
    auth: admin.auth(),
  };
}

// Connect to MongoDB
async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
}

// Migrate Users
async function migrateUsers(db, auth) {
  console.log("\n📦 Migrating Users...");

  try {
    const users = await User.find({}).lean();
    migrationState.users.mongo = users.length;

    console.log(`   Found ${users.length} users in MongoDB`);

    for (const user of users) {
      try {
        const uid = user._id.toString();

        // Store mapping
        idMappings.users.set(uid, uid);

        // Prepare user document (Firestore)
        const userDoc = {
          uid,
          _mongoId: uid,
          email: safeString(user.email),
          name: safeString(user.name),
          role: safeString(user.role, "collector"),
          phone: safeString(user.phone),
          gsmNumber: safeString(user.gsmNumber),
          // ✅ FIX: prevent huge/base64 photos from breaking Firestore
          profilePhoto: safePhoto(user.profilePhoto),
          about: safeString(user.about),
          isActive: user.isActive !== false,
          tasksCompleted: Number.isFinite(user.tasksCompleted)
            ? user.tasksCompleted
            : 0,
          lastActive: user.lastActive ? new Date(user.lastActive) : new Date(),
          // ✅ DON'T migrate password (Firebase Auth won't use it)
          // password: user.password || '',

          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        };

        // Write to Firestore
        await db.collection("users").doc(uid).set(userDoc);

        // Try to create Firebase Auth user
        try {
          await auth.createUser({
            uid,
            email: user.email,
            displayName: user.name,
            // ✅ DO NOT set photoURL here if your data might be huge/base64
            // photoURL: safePhoto(user.profilePhoto)  <-- DON'T DO THIS
          });

          // Set custom claims for role
          await auth.setCustomUserClaims(uid, {
            role: user.role || "collector",
          });

          console.log(`   ✅ Created Firebase Auth user: ${user.email}`);
        } catch (authError) {
          if (authError.code === "auth/email-already-exists") {
            console.log(`   ⚠️  Auth user already exists: ${user.email}`);
          } else {
            console.log(
              `   ⚠️  Could not create Auth user: ${authError.message}`
            );
          }
        }

        migrationState.users.firebase++;
      } catch (error) {
        migrationState.users.errors.push({
          user: user?._id?.toString?.() || "unknown",
          error: error.message,
        });
        console.error(
          `   ❌ Error migrating user ${user?._id}:`,
          error.message
        );
      }
    }

    console.log(
      `   ✅ Migrated ${migrationState.users.firebase}/${migrationState.users.mongo} users`
    );
  } catch (error) {
    console.error("❌ Error migrating users:", error.message);
  }
}

// Migrate Bins
async function migrateBins(db) {
  console.log("\n📦 Migrating Bins...");

  try {
    const bins = await Bin.find({}).lean();
    migrationState.bins.mongo = bins.length;

    console.log(`   Found ${bins.length} bins in MongoDB`);

    for (const bin of bins) {
      try {
        const mongoId = bin._id.toString();

        // Use binId as the document ID for cleaner references
        const docId = bin.binId || mongoId;

        // Store mapping
        idMappings.bins.set(mongoId, docId);

        const binDoc = {
          _mongoId: mongoId,
          binId: bin.binId,
          name: bin.name,
          location: bin.location,
          capacity: bin.capacity || 100,
          currentLevel: bin.currentLevel || 0,
          status: bin.status || "empty",
          isOnline: bin.isOnline || false,
          lastUpdate: bin.lastUpdate ? new Date(bin.lastUpdate) : new Date(),
          lastSeen: bin.lastSeen ? new Date(bin.lastSeen) : new Date(),
          gsmNumber: bin.gsmNumber || "",
          deviceId: bin.deviceId || "",
          type: bin.type || "general",
          fillHistory: (bin.fillHistory || []).map((entry) => ({
            level: entry.level,
            timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
          })),
          alerts: (bin.alerts || []).map((alert) => ({
            type: alert.type,
            message: alert.message,
            timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
            acknowledged: alert.acknowledged || false,
          })),
          createdAt: bin.createdAt ? new Date(bin.createdAt) : new Date(),
          updatedAt: bin.updatedAt ? new Date(bin.updatedAt) : new Date(),
        };

        await db.collection("bins").doc(docId).set(binDoc);

        migrationState.bins.firebase++;
      } catch (error) {
        migrationState.bins.errors.push({ bin: bin._id, error: error.message });
        console.error(`   ❌ Error migrating bin ${bin._id}:`, error.message);
      }
    }

    console.log(
      `   ✅ Migrated ${migrationState.bins.firebase}/${migrationState.bins.mongo} bins`
    );
  } catch (error) {
    console.error("❌ Error migrating bins:", error.message);
  }
}

// Migrate Tasks
async function migrateTasks(db) {
  console.log("\n📦 Migrating Tasks...");

  try {
    const tasks = await Task.find({}).lean();
    migrationState.tasks.mongo = tasks.length;

    console.log(`   Found ${tasks.length} tasks in MongoDB`);

    for (const task of tasks) {
      try {
        const mongoId = task._id.toString();

        // Use taskId as the document ID for cleaner references
        const docId = task.taskId || mongoId;

        // Store mapping
        idMappings.tasks.set(mongoId, docId);

        const binId = task.binId
          ? idMappings.bins.get(task.binId.toString()) ||
            task.binId.toString()
          : null;

        const assignedTo = task.assignedTo
          ? idMappings.users.get(task.assignedTo.toString()) ||
            task.assignedTo.toString()
          : null;

        const taskDoc = {
          _mongoId: mongoId,
          taskId: task.taskId,
          binId,
          binName: task.binName || "",
          binLocation: task.binLocation,
          assignedTo,
          assignedByName: task.assignedByName || "",
          priority: task.priority || "medium",
          status: task.status || "pending",
          instructions: task.instructions || "",
          assignedAt: task.assignedAt ? new Date(task.assignedAt) : new Date(),
          startedAt: task.startedAt ? new Date(task.startedAt) : null,
          completedAt: task.completedAt ? new Date(task.completedAt) : null,
          estimatedDuration: task.estimatedDuration || 30,
          actualDuration: task.actualDuration || null,
          notes: task.notes || "",
          issueReported: task.issueReported || "",
          gsmUpdates: (task.gsmUpdates || []).map((update) => ({
            type: update.type,
            message: update.message,
            timestamp: update.timestamp ? new Date(update.timestamp) : new Date(),
          })),
          createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
          updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date(),
        };

        await db.collection("tasks").doc(docId).set(taskDoc);

        migrationState.tasks.firebase++;
      } catch (error) {
        migrationState.tasks.errors.push({
          task: task._id,
          error: error.message,
        });
        console.error(`   ❌ Error migrating task ${task._id}:`, error.message);
      }
    }

    console.log(
      `   ✅ Migrated ${migrationState.tasks.firebase}/${migrationState.tasks.mongo} tasks`
    );
  } catch (error) {
    console.error("❌ Error migrating tasks:", error.message);
  }
}

// Migrate Messages
async function migrateMessages(db) {
  console.log("\n📦 Migrating Messages...");

  try {
    const messages = await Message.find({}).lean();
    migrationState.messages.mongo = messages.length;

    console.log(`   Found ${messages.length} messages in MongoDB`);

    for (const message of messages) {
      try {
        const mongoId = message._id.toString();

        // Use messageId as the document ID
        const docId = message.messageId || mongoId;

        // Store mapping
        idMappings.messages.set(mongoId, docId);

        const relatedBinId = message.relatedBinId
          ? idMappings.bins.get(message.relatedBinId.toString()) ||
            message.relatedBinId.toString()
          : null;

        const relatedTaskId = message.relatedTaskId
          ? idMappings.tasks.get(message.relatedTaskId.toString()) ||
            message.relatedTaskId.toString()
          : null;

        const messageDoc = {
          _mongoId: mongoId,
          messageId: message.messageId,
          sender: message.sender,
          senderId: message.senderId || "",
          senderName: message.senderName || "",
          senderGsm: message.senderGsm || "",
          recipient: message.recipient,
          recipientId: message.recipientId || null,
          recipientName: message.recipientName || null,
          recipientGsm: message.recipientGsm || null,
          messageType: message.messageType || "notification",
          content: message.content || "",
          relatedBinId,
          relatedTaskId,
          isRead: message.isRead || false,
          readAt: message.readAt ? new Date(message.readAt) : null,
          timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
          createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
        };

        await db.collection("messages").doc(docId).set(messageDoc);

        migrationState.messages.firebase++;
      } catch (error) {
        migrationState.messages.errors.push({
          message: message._id,
          error: error.message,
        });
        console.error(
          `   ❌ Error migrating message ${message._id}:`,
          error.message
        );
      }
    }

    console.log(
      `   ✅ Migrated ${migrationState.messages.firebase}/${migrationState.messages.mongo} messages`
    );
  } catch (error) {
    console.error("❌ Error migrating messages:", error.message);
  }
}

// Print migration summary
function printSummary() {
  console.log("\n" + "=".repeat(50));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(50));

  const collections = ["users", "tasks", "bins", "messages"];

  for (const collection of collections) {
    const state = migrationState[collection];
    const successRate =
      state.mongo > 0 ? ((state.firebase / state.mongo) * 100).toFixed(1) : 0;

    console.log(`\n${collection.charAt(0).toUpperCase() + collection.slice(1)}:`);
    console.log(`   MongoDB: ${state.mongo}`);
    console.log(`   Firebase: ${state.firebase}`);
    console.log(`   Success: ${successRate}%`);

    if (state.errors.length > 0) {
      console.log(`   Errors: ${state.errors.length}`);
      state.errors.slice(0, 3).forEach((err) => {
        console.log(`      - ${err.error}`);
      });
      if (state.errors.length > 3) {
        console.log(`      ... and ${state.errors.length - 3} more`);
      }
    }
  }

  console.log("\n" + "=".repeat(50));
}

// Main migration function
async function runMigration() {
  console.log("🚀 Starting MongoDB to Firebase Migration");
  console.log("=".repeat(50));

  try {
    const { db, auth } = await initializeFirebase();
    await connectMongoDB();

    // Run migrations in order (respecting dependencies)
    await migrateUsers(db, auth);
    await migrateBins(db);
    await migrateTasks(db);
    await migrateMessages(db);

    printSummary();

    console.log("\n✅ Migration completed!");
    console.log("\n📝 Note:");
    console.log("   - User passwords were not migrated (Firebase Auth)");
    console.log("   - Users will need to reset their passwords");
    console.log("   - Custom claims have been set for user roles");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    printSummary();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, migrationState, idMappings };