const bcrypt = require('bcryptjs');
const { db, COLLECTIONS } = require('./config/firebase');
const PORT = process.env.PORT || 5001;

async function addAdminPassword() {
  try {
    console.log('Adding password to admin user...');

    // Find admin user
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', 'admin@gmail.com')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('Admin user not found');
      return;
    }

    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data();

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Update the user document with password
    await adminDoc.ref.update({
      password: hashedPassword,
      updatedAt: new Date()
    });

    console.log('✅ Admin password added successfully');

  } catch (error) {
    console.error('Error adding admin password:', error);
  } finally {
    process.exit(0);
  }
}

addAdminPassword();