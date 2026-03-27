// Authentication Gate - Store return URL before checking auth
console.log('[auth-gate.js] Loading auth-gate.js...');

// Fix: Clear URL parameters that might be injected by password managers
// This prevents "Illegal return statement" errors from extensions
if (window.location.search && window.location.search.includes('password')) {
    // Clear the search params from URL without reloading if possible
    try {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('[auth-gate.js] Cleared password parameters from URL');
    } catch (e) {
        console.log('[auth-gate.js] Could not clear URL params:', e);
    }
}

function storeReturnUrl() {
    console.log('[auth-gate.js] storeReturnUrl called');
    const currentPath = window.location.pathname + window.location.search;
    // Only store if not already on login page and has a meaningful path
    if (currentPath && currentPath !== '/' && !currentPath.includes('index.html')) {
        sessionStorage.setItem('authReturnUrl', currentPath);
    }
}

// Check Authentication
function checkAuth() {
    console.log('Checking authentication...');
    const token = localStorage.getItem('adminAuthToken');
    const user = localStorage.getItem('adminCurrentUser');
    console.log('Token:', token ? 'exists' : 'null');
    console.log('User:', user ? 'exists' : 'null');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        
        // Check if there's a return URL to redirect to
        const returnUrl = sessionStorage.getItem('authReturnUrl');
        if (returnUrl) {
            sessionStorage.removeItem('authReturnUrl');
            window.location.href = returnUrl;
            return;
        }
        
        showDashboard();
    } else {
        // Store intended destination before redirect to login
        storeReturnUrl();
        showLogin();
    }
}

// Verify Session with Backend
async function verifySession() {
    try {
        const token = localStorage.getItem('adminAuthToken');
        if (!token) {
            handleLogout();
            return false;
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        
        if (response.status === 401) {
            // Token expired or invalid
            handleLogout();
            return false;
        }
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Update current user data
                currentUser = data.user;
                localStorage.setItem('adminCurrentUser', JSON.stringify(currentUser));
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Session verification failed:', error);
        return false;
    }
}

// Handle Login with Return URL Support
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('adminAuthToken', authToken);
            localStorage.setItem('adminCurrentUser', JSON.stringify(currentUser));
            
            // Check for return URL and redirect after successful login
            const returnUrl = sessionStorage.getItem('authReturnUrl');
            if (returnUrl) {
                sessionStorage.removeItem('authReturnUrl');
                window.location.href = returnUrl;
            } else {
                showDashboard();
            }
            
            showToast('Login successful!', 'success');
        } else {
            loginError.textContent = data.message;
        }
    } catch (error) {
        loginError.textContent = 'Login failed. Please try again.';
    }
}

// Handle Logout with Return URL Cleanup
function handleLogout() {
    localStorage.removeItem('adminAuthToken');
    localStorage.removeItem('adminCurrentUser');
    sessionStorage.removeItem('authReturnUrl'); // Clear return URL on logout
    authToken = null;
    currentUser = null;
    if (socket) {
        socket.disconnect();
    }
    showLogin();
    showToast('Logged out successfully', 'info');
}

// Setup Navigation Interceptors
function setupAuthInterceptors() {
    // Intercept navigation attempts to protected routes
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href) {
            const isInternal = link.href.startsWith(window.location.origin);
            
            if (isInternal) {
                const path = new URL(link.href).pathname;
                const isProtected = path.includes('/dashboard') || 
                                   path.includes('/bins') || 
                                   path.includes('/tasks') ||
                                   path.includes('/messages') ||
                                   path.includes('/users') ||
                                   path.includes('/reports') ||
                                   path.includes('/settings');
                
                if (isProtected && !localStorage.getItem('adminAuthToken')) {
                    e.preventDefault();
                    sessionStorage.setItem('authReturnUrl', link.href);
                    showLogin();
                }
            }
        }
    });
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
        checkAuth();
    });
    
    // Handle page visibility changes (tab switch)
    // Removed automatic session verification to prevent unexpected logouts
    /* document.addEventListener('visibilitychange', () => {
        if (!document.hidden && localStorage.getItem('adminAuthToken')) {
            // Optionally re-verify session when tab becomes visible
            verifySession();
        }
    }); */
}
