console.log('Testing login functionality');
console.log('Document loaded:', document.readyState);

// Check if login form exists
const loginForm = document.getElementById('loginForm');
console.log('Login form element:', loginForm);

// Check if email and password inputs exist
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.querySelector('button[type="submit"]');

console.log('Email input:', emailInput);
console.log('Password input:', passwordInput);
console.log('Login button:', loginButton);

// Fill in login credentials
if (emailInput) {
    emailInput.value = 'admin@gmail.com';
    console.log('Email filled');
}

if (passwordInput) {
    passwordInput.value = 'admin123';
    console.log('Password filled');
}

// Simulate login click
if (loginButton) {
    console.log('Clicking login button');
    loginButton.click();
} else {
    console.error('Login button not found');
}

// Check what's in localStorage
console.log('localStorage adminAuthToken:', localStorage.getItem('adminAuthToken'));
console.log('localStorage adminCurrentUser:', localStorage.getItem('adminCurrentUser'));
