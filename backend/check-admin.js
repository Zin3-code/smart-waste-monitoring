require('dotenv').config();
const { db, auth } = require('./config/firebase');

async function checkAdminUser() {
  try {
    console.log('Checking admin user in Firebase...');
    
    // Check if admin user exists in Firestore
    const adminQuery = await db.collection('users')
      .where('email', '==', 'admin@gmail.com')
      .where('role', '==', 'admin')
      .get();
      
    if (adminQuery.empty) {
      console.log('❌ Admin user not found in Firestore');
    } else {
      const adminUser = adminQuery.docs[0].data();
      console.log('✅ Admin user found in Firestore:');
      console.log('   Email:', adminUser.email);
      console.log('   Role:', adminUser.role);
      console.log('   UID:', adminUser.uid);
      console.log('   Is Active:', adminUser.isActive);
    }
    
    // Check Firebase Auth users
    const userRecords = await auth.listUsers();
    console.log(`\n✅ Found ${userRecords.users.length} users in Firebase Auth:`);
    
    userRecords.users.forEach(user => {
      console.log(`\n  User: ${user.email}`);
      console.log(`  UID: ${user.uid}`);
      console.log(`  Display Name: ${user.displayName}`);
      console.log(`  Disabled: ${user.disabled}`);
      console.log(`  Custom Claims:`, user.customClaims);
    });
    
    // Check if admin user has custom claims
    const adminAuthUser = userRecords.users.find(user => user.email === 'admin@gmail.com');
    if (adminAuthUser) {
      console.log('\n✅ Admin user in Firebase Auth:');
      console.log('   Email:', adminAuthUser.email);
      console.log('   Custom Claims:', adminAuthUser.customClaims);
    } else {
      console.log('\n❌ Admin user not found in Firebase Auth');
    }
    
  } catch (error) {
    console.error('❌ Error checking admin user:', error.message);
  }
}

checkAdminUser();
