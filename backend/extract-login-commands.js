const fs = require('fs');
const data = fs.readFileSync('curl-response.txt', 'utf8');
const response = JSON.parse(data);

console.log('To login, open browser console (F12) and run:');
console.log(`localStorage.setItem("adminAuthToken", "${response.token}");`);
console.log(`localStorage.setItem("adminCurrentUser", JSON.stringify(${JSON.stringify(response.user)}));`);
console.log('window.location.reload();');
