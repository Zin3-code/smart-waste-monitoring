const { db, COLLECTIONS } = require('./config/firebase');

async function checkAdmin() {
  try {
    console.log('Checking for admin user...');

    // Find admin user
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', 'admin@gmail.com')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('❌ Admin user not found');
      return;
    }

    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data();

    console.log('✅ Admin user found:');
    console.log('  - ID:', adminDoc.id);
    console.log('  - Email:', adminData.email);
    console.log('  - Name:', adminData.name);
    console.log('  - Role:', adminData.role);
    console.log('  - Has password:', !!adminData.password);
    console.log('  - Is active:', adminData.isActive !== false);

  } catch (error) {
    console.error('Error checking admin:', error);
  } finally {
    process.exit(0);
  }
}

checkAdmin();
