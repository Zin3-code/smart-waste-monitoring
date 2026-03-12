const fetch = require('node-fetch');
const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  try {
    console.log('Testing login endpoint...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    
    if (loginData.success) {
      console.log('\nTesting bins endpoint with token...');
      const binsRes = await fetch(`${API_BASE}/bins`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      const binsData = await binsRes.json();
      console.log('Bins response:', binsData);
      
      console.log('\nTesting create bin endpoint...');
      const createRes = await fetch(`${API_BASE}/bins`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          binId: 'TEST_BIN_001',
          name: 'Test Bin',
          location: { latitude: 9.33, longitude: 125.97 },
          capacity: 100,
          currentLevel: 0,
          status: 'empty',
          isOnline: true,
          gsmNumber: '09171234567',
          deviceId: 'ESP32_TEST',
          type: 'general'
        })
      });
      
      const createData = await createRes.json();
      console.log('Create bin response:', createData);
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();
