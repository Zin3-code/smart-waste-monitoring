const fs = require('fs');

// Extract response from curl
const curlOutput = fs.readFileSync('login-response.txt', 'utf8');
const jsonStart = curlOutput.indexOf('{"success":true');
const response = JSON.parse(curlOutput.slice(jsonStart));

// Output the login commands for browser console
console.log('=== Browser Console Login Commands ===');
console.log('Paste these commands into your browser console (F12):');
console.log();
console.log(`localStorage.setItem("adminAuthToken", "${response.token}");`);
console.log(`localStorage.setItem("adminCurrentUser", JSON.stringify(${JSON.stringify(response.user)}));`);
console.log('window.location.reload();');
console.log();
console.log('This will log you in directly without entering credentials');
