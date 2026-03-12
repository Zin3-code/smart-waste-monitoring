const http = require('http');
const fs = require('fs');
const path = require('path');

// Test login API
const loginData = JSON.stringify({
  email: 'admin@gmail.com',
  password: 'admin123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

console.log('Testing login API...');
const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Login response:', data);
    
    try {
      const loginResult = JSON.parse(data);
      
      if (loginResult.success) {
        console.log('✅ Login successful! Token received.');
        
        // Test bins API
        const binsOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/bins',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResult.token}`,
            'Content-Type': 'application/json'
          }
        };
        
        console.log('Testing bins API...');
        const binsReq = http.request(binsOptions, (res) => {
          let binsData = '';
          res.on('data', (chunk) => {
            binsData += chunk;
          });
          res.on('end', () => {
            console.log('Bins response:', binsData);
            
            try {
              const binsResult = JSON.parse(binsData);
              console.log(`✅ Received ${binsResult.bins?.length || 0} bins`);
              
              // Test tasks API
              const tasksOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/tasks',
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${loginResult.token}`,
                  'Content-Type': 'application/json'
                }
              };
              
              console.log('Testing tasks API...');
              const tasksReq = http.request(tasksOptions, (res) => {
                let tasksData = '';
                res.on('data', (chunk) => {
                  tasksData += chunk;
                });
                res.on('end', () => {
                  console.log('Tasks response:', tasksData);
                  
                  try {
                    const tasksResult = JSON.parse(tasksData);
                    console.log(`✅ Received ${tasksResult.tasks?.length || 0} tasks`);
                    
                    // Create a temporary HTML file that sets the login credentials
                    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-top: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
        }
        .success {
            color: #28a745;
            font-weight: bold;
        }
        .error {
            color: #dc3545;
            font-weight: bold;
        }
        .info {
            color: #17a2b8;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
        }
        button:hover {
            background: #0056b3;
        }
        pre {
            text-align: left;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Debug Login Result</h1>
        
        <div class="success">✅ Login API is working</div>
        <div class="info">Token received: ${loginResult.token.substring(0, 30)}...</div>
        
        <div class="success">✅ Bins API is working</div>
        <div class="info">Number of bins: ${binsResult.bins?.length || 0}</div>
        
        <div class="success">✅ Tasks API is working</div>
        <div class="info">Number of tasks: ${tasksResult.tasks?.length || 0}</div>
        
        <h3>Quick Login</h3>
        <p>Click the button to set login credentials in localStorage and go to dashboard</p>
        <button onclick="setLoginCredentials()">Set Login Credentials & Go to Dashboard</button>
        
        <h3>API Responses</h3>
        
        <h4>Login Response:</h4>
        <pre>${JSON.stringify(loginResult, null, 2)}</pre>
        
        <h4>Bins Response:</h4>
        <pre>${JSON.stringify(binsResult, null, 2)}</pre>
        
        <h4>Tasks Response:</h4>
        <pre>${JSON.stringify(tasksResult, null, 2)}</pre>
    </div>

    <script>
        function setLoginCredentials() {
            const token = '${loginResult.token}';
            const user = ${JSON.stringify(loginResult.user)};
            
            localStorage.setItem('adminAuthToken', token);
            localStorage.setItem('adminCurrentUser', JSON.stringify(user));
            
            alert('Login credentials set! Redirecting to dashboard...');
            window.location.href = 'index.html';
        }
    </script>
</body>
</html>
                `;
                
                    fs.writeFileSync(path.join(__dirname, 'frontend', 'admin', 'debug-login-result.html'), htmlContent);
                    console.log('✅ Created debug-login-result.html in frontend/admin/');
                    console.log('');
                    console.log('🔍 Debug information:');
                    console.log('');
                    console.log('1. Backend server is running on port 5000');
                    console.log('2. Login API is working correctly');
                    console.log('3. Bins API is returning data');
                    console.log('4. Tasks API is returning data');
                    console.log('');
                    console.log('📝 To debug the frontend:');
                    console.log('1. Open http://localhost:8080/debug-login-result.html');
                    console.log('2. Click the "Set Login Credentials & Go to Dashboard" button');
                    console.log('3. Check if the dashboard loads correctly');
                    
                  } catch (err) {
                    console.error('❌ Failed to parse tasks response:', err);
                  }
                });
              });
              
              tasksReq.on('error', (err) => {
                console.error('❌ Tasks API request failed:', err);
              });
              
              tasksReq.end();
              
            } catch (err) {
              console.error('❌ Failed to parse bins response:', err);
            }
          });
        });
        
        binsReq.on('error', (err) => {
          console.error('❌ Bins API request failed:', err);
        });
        
        binsReq.end();
        
      } else {
        console.error('❌ Login failed:', loginResult.message);
      }
      
    } catch (err) {
      console.error('❌ Failed to parse login response:', err);
    }
  });
});

loginReq.on('error', (err) => {
  console.error('❌ Login request failed:', err);
});

loginReq.write(loginData);
loginReq.end();