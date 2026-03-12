// API Configuration
const API_BASE_URL = "https://smart-waste-monitoring-api.onrender.com/api";

// Global State
let currentUser = null;
let authToken = null;
let socket = null;
let charts = {};
let binMap = null;
let binMarkersLayer = null;
let binMapBaseLayers = null;
let reportRange = 'week';
let reportDataCache = null;
let pendingProfilePhoto = null;

const CANTILAN_COORDS = [9.33, 125.97];

// Theme
const THEME_STORAGE_KEY = 'theme';

function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function updateThemeToggle(theme) {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    toggle.checked = theme === 'dark';
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeToggle(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return `${first}${last}`.toUpperCase();
}

function setProfileAvatar(avatarId, photoId, initialsId, photoUrl, initials) {
    const avatar = document.getElementById(avatarId);
    const photo = document.getElementById(photoId);
    const initialsEl = document.getElementById(initialsId);
    if (!avatar || !photo || !initialsEl) return;

    if (photoUrl) {
        photo.src = photoUrl;
        photo.alt = 'Profile photo';
        avatar.classList.add('has-photo');
    } else {
        photo.removeAttribute('src');
        avatar.classList.remove('has-photo');
    }

    initialsEl.textContent = initials;
}

function formatRoleLabel(role = '') {
    if (!role) return 'User';
    const roleMap = {
        admin: 'Administrator',
        collector: 'Collector',
    };
    if (roleMap[role]) return roleMap[role];
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function updateProfileMenu() {
    const name = currentUser?.name || 'User';
    const email = currentUser?.email || '';
    const role = formatRoleLabel(currentUser?.role);
    const initials = getInitials(name);
    const photo = currentUser?.profilePhoto || '';
    const about = currentUser?.about || '';

    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = name;

    const profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.textContent = role;

    const profileDropdownName = document.getElementById('profileDropdownName');
    if (profileDropdownName) profileDropdownName.textContent = name;

    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.textContent = email;

    const profileAbout = document.getElementById('profileAbout');
    if (profileAbout) profileAbout.textContent = about || 'No bio added';

    setProfileAvatar('profileAvatar', 'profilePhotoSmall', 'profileInitials', photo, initials);
    setProfileAvatar('profileAvatarLarge', 'profilePhotoLarge', 'profileInitialsLarge', photo, initials);
}

function setupProfileMenu() {
    const menu = document.getElementById('profileMenu');
    const toggle = document.getElementById('profileToggle');
    const dropdown = document.getElementById('profileDropdown');
    if (!menu || !toggle || !dropdown) return;

    const closeMenu = () => {
        dropdown.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        dropdown.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });

    const settingsBtn = document.getElementById('profileSettingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const settingsLink = document.querySelector('.nav-link[data-section="settings"]');
            if (settingsLink) settingsLink.click();
            closeMenu();
        });
    }

    const logoutBtn = document.getElementById('profileLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            closeMenu();
            handleLogout();
        });
    }
}

function setProfilePhotoPreview(photoUrl, initials) {
    const preview = document.getElementById('profilePhotoPreview');
    const img = document.getElementById('profilePhotoPreviewImg');
    const initialsEl = document.getElementById('profilePhotoPreviewInitials');
    if (!preview || !img || !initialsEl) return;

    if (photoUrl) {
        img.src = photoUrl;
        preview.classList.add('has-photo');
    } else {
        img.removeAttribute('src');
        preview.classList.remove('has-photo');
    }

    initialsEl.textContent = initials;
}

function openProfileEditModal() {
    if (!currentUser) return;
    pendingProfilePhoto = null;

    const name = currentUser.name || '';
    document.getElementById('profileEditName').value = name;
    document.getElementById('profileEditEmail').value = currentUser.email || '';
    document.getElementById('profileEditPhone').value = currentUser.phone || '';
    document.getElementById('profileEditGsmNumber').value = currentUser.gsmNumber || '';
    document.getElementById('profileEditAbout').value = currentUser.about || '';
    setProfilePhotoPreview(currentUser.profilePhoto || '', getInitials(name));

    const fileInput = document.getElementById('profilePhotoInput');
    if (fileInput) fileInput.value = '';

    openModal('profileEditModal');
}

function handleProfilePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        e.target.value = '';
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('Profile photo must be 2MB or less', 'error');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        pendingProfilePhoto = reader.result;
        setProfilePhotoPreview(reader.result, getInitials(currentUser?.name || ''));
    };
    reader.readAsDataURL(file);
}

function handleProfilePhotoRemove() {
    pendingProfilePhoto = '';
    setProfilePhotoPreview('', getInitials(currentUser?.name || ''));
    const fileInput = document.getElementById('profilePhotoInput');
    if (fileInput) fileInput.value = '';
}

async function handleProfileEditSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
    }

    const profileData = {
        name: document.getElementById('profileEditName').value.trim(),
        phone: document.getElementById('profileEditPhone').value.trim(),
        gsmNumber: document.getElementById('profileEditGsmNumber').value.trim(),
        about: document.getElementById('profileEditAbout').value.trim(),
    };

    if (pendingProfilePhoto !== null) {
        profileData.profilePhoto = pendingProfilePhoto;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(profileData),
        });

        const data = await response.json();
        if (data.success) {
            currentUser = {
                ...currentUser,
                ...data.data,
                id: currentUser.id || data.data._id,
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateProfileMenu();
            document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
            closeModal('profileEditModal');
            showToast('Profile updated successfully!', 'success');
        } else {
            showToast(data.message || 'Error updating profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

function renderNotifications(messages) {
    const list = document.getElementById('notificationList');
    if (!list) return;

    if (!messages || messages.length === 0) {
        list.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
        return;
    }

    list.innerHTML = messages.map(message => `
        <button class="notification-item ${!message.isRead ? 'unread' : ''}" data-message-id="${message._id}" type="button">
            <div class="notification-item-header">
                <span class="notification-type">${message.messageType || 'update'}</span>
                <span class="notification-time">${formatDate(message.timestamp)}</span>
            </div>
            <div class="notification-title">${message.senderName || 'System'}</div>
            <div class="notification-body">${message.content}</div>
        </button>
    `).join('');

    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const messageId = item.dataset.messageId;
            if (messageId) {
                await markMessageRead(messageId);
                updateMessageBadge();
            }
            const messagesLink = document.querySelector('.nav-link[data-section="messages"]');
            if (messagesLink) messagesLink.click();
            const dropdown = document.getElementById('notificationDropdown');
            const toggle = document.getElementById('notificationToggle');
            if (dropdown && toggle) {
                dropdown.classList.add('hidden');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

async function loadNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    list.innerHTML = '<div class="notification-loading">Loading notifications...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/messages?limit=6`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        if (data.success) {
            renderNotifications(data.data);
        } else {
            list.innerHTML = '<div class="notification-empty">Unable to load notifications.</div>';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        list.innerHTML = '<div class="notification-empty">Unable to load notifications.</div>';
    }
}

function setupNotificationMenu() {
    const menu = document.getElementById('notificationMenu');
    const toggle = document.getElementById('notificationToggle');
    const dropdown = document.getElementById('notificationDropdown');
    if (!menu || !toggle || !dropdown) return;

    const closeMenu = () => {
        dropdown.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        dropdown.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        loadNotifications();
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });

    const markAllBtn = document.getElementById('notificationMarkAll');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            await handleMarkAllRead();
            loadNotifications();
        });
    }

    const viewAllBtn = document.getElementById('notificationViewAll');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            const messagesLink = document.querySelector('.nav-link[data-section="messages"]');
            if (messagesLink) messagesLink.click();
            closeMenu();
        });
    }
}

// Modal Functions (defined early for inline onclick handlers)
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal(modalId = null, event = null) {
    // Prevent default if event is passed (e.g., button click)
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    } else {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
    document.getElementById('modalOverlay').classList.add('hidden');
}

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - starting initialization');
    applyTheme(getPreferredTheme());
    checkAuth();
    setupAuthInterceptors(); // Initialize auth gate interceptors
    setupEventListeners();
    updateTime();
    setInterval(updateTime, 1000);
    console.log('DOMContentLoaded - initialization complete');
});

// Authentication Gate - Store return URL before checking auth
function storeReturnUrl() {
    const currentPath = window.location.pathname + window.location.search;
    // Only store if not already on login page and has a meaningful path
    if (currentPath && currentPath !== '/' && !currentPath.includes('index.html')) {
        sessionStorage.setItem('authReturnUrl', currentPath);
    }
}

// Check Authentication
function checkAuth() {
    const token = localStorage.getItem('adminAuthToken');
    const user = localStorage.getItem('adminCurrentUser');
    
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

// Show Login Screen
function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
    
    // Check for return URL and display it (optional UI enhancement)
    const returnUrl = sessionStorage.getItem('authReturnUrl');
    if (returnUrl) {
        console.log('Intended destination:', returnUrl);
    }
}

// Show Dashboard
function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
    updateProfileMenu();
    initializeSocket();
    loadDashboardData();
}

// Setup Event Listeners
function setupEventListeners() {
    // Debug: Log event listener setup
    console.log('=== SETTING UP EVENT LISTENERS ===');
    // Login Form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked ? 'dark' : 'light');
        });
    }

    setupProfileMenu();
    setupNotificationMenu();

    const profileEditBtn = document.getElementById('profileEditBtn');
    if (profileEditBtn) {
        profileEditBtn.addEventListener('click', openProfileEditModal);
    }

    const profileEditForm = document.getElementById('profileEditForm');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', handleProfileEditSubmit);
    }

    const profilePhotoInput = document.getElementById('profilePhotoInput');
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', handleProfilePhotoChange);
    }

    const profilePhotoRemove = document.getElementById('profilePhotoRemove');
    if (profilePhotoRemove) {
        profilePhotoRemove.addEventListener('click', handleProfilePhotoRemove);
    }
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
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
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && localStorage.getItem('adminAuthToken')) {
            // Optionally re-verify session when tab becomes visible
            verifySession();
        }
    });
    
    // Modals
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    console.log('Found modal-close buttons:', modalCloseButtons.length);
    modalCloseButtons.forEach((btn, index) => {
        console.log(`Attaching close listener to button ${index}:`, btn.outerHTML);
        btn.addEventListener('click', (e) => {
            console.log('Close button clicked:', e.target);
            closeModal(null, e);
        });
    });
    
    const modalOverlay = document.getElementById('modalOverlay');
    console.log('Modal overlay found:', !!modalOverlay);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            console.log('Overlay clicked, closing all modals');
            closeModal(null, e);
        });
    }
    
    // Collector Selection
    const openCollectorModalBtn = document.getElementById('openCollectorModalBtn');
    console.log('openCollectorModalBtn found:', !!openCollectorModalBtn);
    if (openCollectorModalBtn) {
        openCollectorModalBtn.addEventListener('click', openCollectorSelectionModal);
    }
    
    const confirmCollectorSelectionBtn = document.getElementById('confirmCollectorSelection');
    console.log('confirmCollectorSelectionBtn found:', !!confirmCollectorSelectionBtn);
    if (confirmCollectorSelectionBtn) {
        confirmCollectorSelectionBtn.addEventListener('click', confirmCollectorSelection);
    }
    
    const collectorSearchInput = document.getElementById('collectorSearch');
    console.log('collectorSearchInput found:', !!collectorSearchInput);
    if (collectorSearchInput) {
        collectorSearchInput.addEventListener('input', filterCollectors);
    }
    
    // Add Bin
    const addBinBtn = document.getElementById('addBinBtn');
    console.log('addBinBtn found:', !!addBinBtn);
    if (addBinBtn) {
        addBinBtn.addEventListener('click', () => openModal('addBinModal'));
        console.log('addBinBtn click listener attached');
    }
    
    const addBinForm = document.getElementById('addBinForm');
    console.log('addBinForm found:', !!addBinForm);
    if (addBinForm) {
        addBinForm.addEventListener('submit', handleAddBin);
        console.log('addBinForm submit listener attached');
    }
    
    // Edit Bin
    const editBinForm = document.getElementById('editBinForm');
    console.log('editBinForm found:', !!editBinForm);
    if (editBinForm) {
        editBinForm.addEventListener('submit', handleEditBin);
        console.log('editBinForm submit listener attached');
    }
    
    // Create Task
    const createTaskBtn = document.getElementById('createTaskBtn');
    console.log('createTaskBtn found:', !!createTaskBtn);
    if (createTaskBtn) {
        createTaskBtn.addEventListener('click', () => {
            populateTaskForm();
            openModal('createTaskModal');
        });
        console.log('createTaskBtn click listener attached');
    }
    
    const createTaskForm = document.getElementById('createTaskForm');
    console.log('createTaskForm found:', !!createTaskForm);
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', handleCreateTask);
        console.log('createTaskForm submit listener attached');
    }
    
    // Add User
    const addUserBtn = document.getElementById('addUserBtn');
    console.log('addUserBtn found:', !!addUserBtn);
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => openModal('addUserModal'));
        console.log('addUserBtn click listener attached');
    }
    
    const addUserForm = document.getElementById('addUserForm');
    console.log('addUserForm found:', !!addUserForm);
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
        console.log('addUserForm submit listener attached');
    }
    
    const editUserForm = document.getElementById('editUserForm');
    console.log('editUserForm found:', !!editUserForm);
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
        console.log('editUserForm submit listener attached');
    }
    
    // Mark All Messages Read
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    console.log('markAllReadBtn found:', !!markAllReadBtn);
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', handleMarkAllRead);
        console.log('markAllReadBtn click listener attached');
    }
    
    // Save Thresholds
    const saveThresholdsBtn = document.getElementById('saveThresholdsBtn');
    console.log('saveThresholdsBtn found:', !!saveThresholdsBtn);
    if (saveThresholdsBtn) {
        saveThresholdsBtn.addEventListener('click', handleSaveThresholds);
        console.log('saveThresholdsBtn click listener attached');
    }
    
    // Filters
    const binStatusFilter = document.getElementById('binStatusFilter');
    console.log('binStatusFilter found:', !!binStatusFilter);
    if (binStatusFilter) {
        binStatusFilter.addEventListener('change', loadBins);
        console.log('binStatusFilter change listener attached');
    }
    
    const binAreaFilter = document.getElementById('binAreaFilter');
    console.log('binAreaFilter found:', !!binAreaFilter);
    if (binAreaFilter) {
        binAreaFilter.addEventListener('change', loadBins);
        console.log('binAreaFilter change listener attached');
    }
    
    const taskStatusFilter = document.getElementById('taskStatusFilter');
    console.log('taskStatusFilter found:', !!taskStatusFilter);
    if (taskStatusFilter) {
        taskStatusFilter.addEventListener('change', loadTasks);
        console.log('taskStatusFilter change listener attached');
    }
    
    const taskPriorityFilter = document.getElementById('taskPriorityFilter');
    console.log('taskPriorityFilter found:', !!taskPriorityFilter);
    if (taskPriorityFilter) {
        taskPriorityFilter.addEventListener('change', loadTasks);
        console.log('taskPriorityFilter change listener attached');
    }
    
    const messageTypeFilter = document.getElementById('messageTypeFilter');
    console.log('messageTypeFilter found:', !!messageTypeFilter);
    if (messageTypeFilter) {
        messageTypeFilter.addEventListener('change', loadMessages);
        console.log('messageTypeFilter change listener attached');
    }
    
    const messageSenderFilter = document.getElementById('messageSenderFilter');
    console.log('messageSenderFilter found:', !!messageSenderFilter);
    if (messageSenderFilter) {
        messageSenderFilter.addEventListener('change', loadMessages);
        console.log('messageSenderFilter change listener attached');
    }
    
    const userRoleFilter = document.getElementById('userRoleFilter');
    console.log('userRoleFilter found:', !!userRoleFilter);
    if (userRoleFilter) {
        userRoleFilter.addEventListener('change', loadUsers);
        console.log('userRoleFilter change listener attached');
    }

    const reportRangeFilter = document.getElementById('reportRangeFilter');
    if (reportRangeFilter) {
        reportRangeFilter.addEventListener('change', handleReportRangeChange);
    }
}

// Handle Login
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

// Handle Logout
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

// Handle Navigation
function handleNavigation(e) {
    e.preventDefault();
    
    const section = e.currentTarget.dataset.section;
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Show section
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}Section`).classList.add('active');
    
    // Update page title
    document.getElementById('pageTitle').textContent = e.currentTarget.textContent.trim();
    
    // Load section data
    loadSectionData(section);
}

// Load Section Data
function loadSectionData(section) {
    switch (section) {
        case 'overview':
            loadOverview();
            break;
        case 'bins':
            loadBins();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'messages':
            loadMessages();
            break;
        case 'users':
            loadUsers();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Initialize Socket
function initializeSocket() {
socket = io('https://smart-waste-monitoring-api.onrender.com');    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join', { role: currentUser.role, userId: currentUser.id });
    });
    
    socket.on('bin-update', (data) => {
        showToast('Bin update received', 'info');
        loadOverview();
        loadBins();
    });
    
    socket.on('task-update', (data) => {
        showToast('Task update received', 'info');
        loadOverview();
        loadTasks();
    });
    
    socket.on('new-message', (data) => {
        showToast('New message received', 'info');
        loadMessages();
        updateMessageBadge();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Load Dashboard Data
async function loadDashboardData() {
    loadOverview();
    loadBins();
    loadTasks();
    loadMessages();
    loadUsers();
}

// Load Overview
async function loadOverview() {
    try {
        // Load bin stats
        const binStatsResponse = await fetch(`${API_BASE_URL}/bins/stats/overview`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const binStats = await binStatsResponse.json();
        
        const binStatsData = binStats && binStats.success ? binStats.data : null;
        if (binStatsData) {
            document.getElementById('totalBins').textContent = binStatsData.total;
            document.getElementById('onlineBins').textContent = binStatsData.online;
            document.getElementById('fullBins').textContent = binStatsData.full;
        }
        
        // Load task stats
        const taskStatsResponse = await fetch(`${API_BASE_URL}/tasks/stats/overview`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const taskStats = await taskStatsResponse.json();
        
        const taskStatsData = taskStats && taskStats.success ? taskStats.data : null;
        if (taskStatsData) {
            document.getElementById('pendingTasks').textContent = taskStatsData.pending;
        }
        
        // Load charts only when both stats are available
        if (binStatsData && taskStatsData) {
            loadCharts(binStatsData, taskStatsData);
        } else {
            console.warn('Skipping charts due to missing stats data.', { binStats, taskStats });
        }
        
        // Load recent activity
        loadRecentActivity();

        // Load bin locations map
        loadBinMap();
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

function initializeBinMap() {
    const mapContainer = document.getElementById('binMap');
    if (!mapContainer || typeof L === 'undefined') {
        return;
    }

    if (!binMap) {
        binMap = L.map(mapContainer, {
            zoomControl: true,
            scrollWheelZoom: false,
        });

        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            detectRetina: true,
            attribution: '&copy; OpenStreetMap contributors',
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            detectRetina: true,
            attribution: 'Tiles &copy; Esri',
        });

        binMapBaseLayers = {
            Street: streetLayer,
            Satellite: satelliteLayer,
        };

        streetLayer.addTo(binMap);
        L.control.layers(binMapBaseLayers, null, { position: 'topright' }).addTo(binMap);

        binMarkersLayer = L.layerGroup().addTo(binMap);
        binMap.setView(CANTILAN_COORDS, 13);
    }

    setTimeout(() => {
        if (binMap) {
            binMap.invalidateSize();
        }
    }, 100);
}

function buildBinPopup(bin) {
    const container = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = bin.name || 'Bin';
    container.appendChild(title);

    const locationParts = [];
    if (bin.location?.address) locationParts.push(bin.location.address);
    if (bin.location?.area) locationParts.push(bin.location.area);

    if (locationParts.length) {
        const details = document.createElement('div');
        details.textContent = locationParts.join(' • ');
        container.appendChild(details);
    }

    return container;
}

async function loadBinMap() {
    initializeBinMap();
    if (!binMap || !binMarkersLayer) {
        return;
    }

    try {
        const emptyOverlay = document.getElementById('binMapEmpty');
        const response = await fetch(`${API_BASE_URL}/bins`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();

        if (!data.success) {
            return;
        }

        binMarkersLayer.clearLayers();
        const bounds = [];

        data.data.forEach(bin => {
            const lat = parseFloat(bin.location?.latitude);
            const lng = parseFloat(bin.location?.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
            }

            const marker = L.marker([lat, lng]).addTo(binMarkersLayer);
            marker.bindPopup(buildBinPopup(bin));
            bounds.push([lat, lng]);
        });

        if (bounds.length) {
            binMap.fitBounds(bounds, { padding: [20, 20] });
            if (emptyOverlay) {
                emptyOverlay.classList.add('hidden');
            }
        } else {
            L.marker(CANTILAN_COORDS)
                .addTo(binMarkersLayer)
                .bindPopup('Cantilan center (no bin locations yet)');
            binMap.setView(CANTILAN_COORDS, 13);
            if (emptyOverlay) {
                emptyOverlay.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading bin map:', error);
    }
}

// Load Charts
function loadCharts(binStats, taskStats) {
    // Bin Status Chart
    const binStatusCtx = document.getElementById('binStatusChart').getContext('2d');
    
    if (charts.binStatus) {
        charts.binStatus.destroy();
    }
    
    charts.binStatus = new Chart(binStatusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Empty', 'Medium', 'Full', 'Offline'],
            datasets: [{
                data: [binStats.empty, binStats.medium, binStats.full, binStats.offline],
                backgroundColor: ['#27ae60', '#f39c12', '#e74c3c', '#95a5a6'],
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        },
    });
    
    // Task Completion Chart
    const taskCompletionCtx = document.getElementById('taskCompletionChart').getContext('2d');
    
    if (charts.taskCompletion) {
        charts.taskCompletion.destroy();
    }
    
    charts.taskCompletion = new Chart(taskCompletionCtx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
            datasets: [{
                label: 'Tasks',
                data: [taskStats.pending, taskStats.inProgress, taskStats.completed, taskStats.cancelled],
                backgroundColor: ['#95a5a6', '#3498db', '#27ae60', '#e74c3c'],
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/messages?limit=10`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            const activityList = document.getElementById('recentActivityList');
            activityList.innerHTML = data.data.slice(0, 5).map(msg => `
                <div class="activity-item">
                    <div class="activity-icon">${msg.sender === 'bin' ? '🗑️' : '👤'}</div>
                    <div class="activity-content">
                        <p>${msg.content}</p>
                        <span class="activity-time">${formatDate(msg.timestamp)}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Load Bins
async function loadBins() {
    try {
        const binsGrid = document.getElementById('binsGrid');
        binsGrid.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>Loading bins...</p></div>';
        
        const statusFilter = document.getElementById('binStatusFilter').value;
        const areaFilter = document.getElementById('binAreaFilter').value;
        
        console.log('Loading bins with filters:', { status: statusFilter, area: areaFilter });
        
        let url = `${API_BASE_URL}/bins`;
        const params = [];
        if (statusFilter) params.push(`status=${statusFilter}`);
        if (areaFilter) params.push(`area=${areaFilter}`);
        if (params.length) url += '?' + params.join('&');
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            renderBins(data.data);
            populateAreaFilter(data.data);
        }
    } catch (error) {
        console.error('Error loading bins:', error);
        const binsGrid = document.getElementById('binsGrid');
        binsGrid.innerHTML = '<div class="error-container"><p class="error-message">Failed to load bins. Please try again.</p></div>';
    }
}

// Bin type configuration
const BIN_TYPE_CONFIG = {
    general: { icon: '🗑️', label: 'General', color: '#95a5a6' },
    recyclable: { icon: '♻️', label: 'Recyclable', color: '#27ae60' },
    organic: { icon: '🌿', label: 'Organic', color: '#8b4513' },
    hazardous: { icon: '☢️', label: 'Hazardous', color: '#e74c3c' },
    electronic: { icon: '📱', label: 'Electronic', color: '#9b59b6' },
};

// Render Bins
function renderBins(bins) {
    const binsGrid = document.getElementById('binsGrid');
    
    if (bins.length === 0) {
        binsGrid.innerHTML = `
            <div class="no-data-container">
                <div class="no-data-icon">🗑️</div>
                <h3>No Bins Found</h3>
                <p>There are currently no smart bins configured in the system.</p>
                <button class="btn btn-primary" onclick="openModal('addBinModal')">+ Add First Bin</button>
            </div>
        `;
        return;
    }
    
    binsGrid.innerHTML = bins.map((bin, index) => {
        const typeConfig = BIN_TYPE_CONFIG[bin.type] || BIN_TYPE_CONFIG.general;
        return `
        <div class="bin-card" onclick="showBinDetails('${bin._id}')" style="animation: fadeInUp 0.5s ease ${index * 0.1}s both;">
            <div class="bin-header">
                <div class="bin-type-container">
                    <span class="bin-name">${bin.name}</span>
                </div>
                <span class="bin-type-badge ${bin.type}" title="${typeConfig.label}">
                    ${typeConfig.icon}
                </span>
            </div>
            <div class="bin-body">
                <div class="bin-info">
                    <div class="info-row">
                        <span class="info-label">ID:</span>
                        <span class="info-value">${bin.binId}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Type:</span>
                        <span class="info-value"><span class="bin-type-badge ${bin.type}" style="font-size: 0.7rem; padding: 0.15rem 0.4rem;">${typeConfig.icon} ${typeConfig.label}</span></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Location:</span>
                        <span class="info-value">${bin.location.address}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Area:</span>
                        <span class="info-value">${bin.location.area}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="info-value status-indicator">
                            <span class="status-dot ${bin.isOnline ? 'online' : 'offline'}"></span>
                            <span>${bin.isOnline ? 'Online' : 'Offline'}</span>
                        </span>
                    </div>
                </div>
                <div class="fill-level-container">
                    <div class="fill-level-label">
                        <span>Fill Level</span>
                        <span class="fill-percentage">${bin.currentLevel}%</span>
                    </div>
                    <div class="fill-level-bar">
                        <div class="fill-level-progress ${bin.status}" style="width: 0%" data-progress="${bin.currentLevel}%"></div>
                    </div>
                </div>
                <div class="bin-footer">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); createTaskForBin('${bin._id}')">
                        <span class="btn-icon">📋</span>
                        Create Task
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editBin('${bin._id}')">
                        <span class="btn-icon">✏️</span>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); confirmDeleteBin('${bin._id}', '${bin.name}')">
                        <span class="btn-icon">🗑️</span>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
    
    // Animate fill level progress
    document.querySelectorAll('.fill-level-progress').forEach(progress => {
        const targetWidth = progress.dataset.progress;
        setTimeout(() => {
            progress.style.width = targetWidth;
        }, 100);
    });
}

// Populate Area Filter
function populateAreaFilter(bins) {
    const areas = [...new Set(bins.map(bin => bin.location.area))];
    const select = document.getElementById('binAreaFilter');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Areas</option>' + 
        areas.map(area => `<option value="${area}" ${area === currentValue ? 'selected' : ''}>${area}</option>`).join('');
}

// Load Tasks
async function loadTasks() {
    try {
        const statusFilter = document.getElementById('taskStatusFilter').value;
        const priorityFilter = document.getElementById('taskPriorityFilter').value;
        
        let url = `${API_BASE_URL}/tasks`;
        const params = [];
        if (statusFilter) params.push(`status=${statusFilter}`);
        if (priorityFilter) params.push(`priority=${priorityFilter}`);
        if (params.length) url += '?' + params.join('&');
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            renderTasks(data.data);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Render Tasks
function renderTasks(tasks) {
    const tasksTable = document.getElementById('tasksTable');
    
    if (tasks.length === 0) {
        tasksTable.innerHTML = '<p class="no-data">No tasks found</p>';
        return;
    }
    
    tasksTable.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Task ID</th>
                    <th>Bin</th>
                    <th>Collector</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Issue</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(task => {
                    const legacyIssue = (typeof task.notes === 'string' && task.notes.startsWith('ISSUE REPORT:'))
                        ? task.notes
                        : '';
                    const issueText = task.issueReported || legacyIssue;
                    const issueBadge = issueText
                        ? '<span class="issue-badge">Reported</span>'
                        : '<span class="issue-badge none">None</span>';
                    return `
                        <tr>
                            <td>${task.taskId}</td>
                            <td>${task.binName}</td>
                            <td>${task.assignedTo?.name || 'N/A'}</td>
                            <td><span class="priority-badge ${task.priority}">${task.priority}</span></td>
                            <td><span class="status-badge ${task.status}">${task.status}</span></td>
                            <td>${issueBadge}</td>
                            <td>${formatDate(task.createdAt)}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="viewTask('${task._id}')">View</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteTask('${task._id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Load Messages
async function loadMessages() {
    try {
        const typeFilter = document.getElementById('messageTypeFilter').value;
        const senderFilter = document.getElementById('messageSenderFilter').value;
        
        let url = `${API_BASE_URL}/messages`;
        const params = [];
        if (typeFilter) params.push(`messageType=${typeFilter}`);
        if (senderFilter) params.push(`sender=${senderFilter}`);
        if (params.length) url += '?' + params.join('&');
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            renderMessages(data.data);
            updateMessageBadge();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Render Messages
function renderMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    
    if (messages.length === 0) {
        messagesList.innerHTML = '<p class="no-data">No messages found</p>';
        return;
    }
    
    messagesList.innerHTML = messages.map(msg => `
        <div class="message-card ${!msg.isRead ? 'unread' : ''} ${msg.messageType}">
            <div class="message-header">
                <span class="message-sender">${msg.senderName}</span>
                <span class="message-type">${msg.messageType}</span>
            </div>
            <div class="message-content">${msg.content}</div>
            <div class="message-footer">
                <span>${formatDate(msg.timestamp)}</span>
                ${!msg.isRead ? `<button class="btn btn-sm btn-secondary" onclick="markMessageRead('${msg._id}')">Mark Read</button>` : ''}
            </div>
        </div>
    `).join('');
}

// Update Message Badge
async function updateMessageBadge() {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/stats/overview`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success && data.data.unread > 0) {
            document.getElementById('messageBadge').textContent = data.data.unread;
            document.getElementById('messageBadge').classList.remove('hidden');
            const notificationCount = document.getElementById('notificationCount');
            if (notificationCount) {
                notificationCount.textContent = data.data.unread;
                notificationCount.classList.remove('hidden');
            }
        } else {
            document.getElementById('messageBadge').classList.add('hidden');
            const notificationCount = document.getElementById('notificationCount');
            if (notificationCount) {
                notificationCount.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error updating message badge:', error);
    }
}

// Load Users
async function loadUsers() {
    try {
        const roleFilter = document.getElementById('userRoleFilter').value;
        
        let url = `${API_BASE_URL}/users`;
        if (roleFilter) url += `?role=${roleFilter}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            renderUsers(data.data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Render Users
function renderUsers(users) {
    const usersTable = document.getElementById('usersTable');
    
    if (users.length === 0) {
        usersTable.innerHTML = '<p class="no-data">No users found</p>';
        return;
    }
    
    usersTable.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>GSM</th>
                    <th>Tasks Completed</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>${user.phone}</td>
                        <td>${user.gsmNumber}</td>
                        <td>${user.tasksCompleted}</td>
                        <td>${user.isActive ? '🟢 Active' : '🔴 Inactive'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="editUser('${user._id}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Load Reports
function handleReportRangeChange(e) {
    reportRange = e.target.value;
    if (reportDataCache) {
        renderReportCharts(reportDataCache.bins, reportDataCache.tasks, reportDataCache.messages, reportRange);
        return;
    }
    loadReports();
}

async function loadReports() {
    try {
        const headers = { 'Authorization': `Bearer ${authToken}` };

        const [binsResponse, tasksResponse, messagesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/bins`, { credentials: 'include', headers }),
            fetch(`${API_BASE_URL}/tasks`, { credentials: 'include', headers }),
            fetch(`${API_BASE_URL}/messages`, { headers }),
        ]);

        const [binsData, tasksData, messagesData] = await Promise.all([
            binsResponse.json(),
            tasksResponse.json(),
            messagesResponse.json(),
        ]);

        if (binsData.success && tasksData.success && messagesData.success) {
            reportDataCache = {
                bins: binsData.data || [],
                tasks: tasksData.data || [],
                messages: messagesData.data || [],
            };

            const reportRangeFilter = document.getElementById('reportRangeFilter');
            if (reportRangeFilter) {
                reportRange = reportRangeFilter.value;
            }

            renderReportCharts(reportDataCache.bins, reportDataCache.tasks, reportDataCache.messages, reportRange);
            return;
        }

        console.error('Error loading report data:', { binsData, tasksData, messagesData });
        showToast('Unable to load report data', 'error');
    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Error loading reports', 'error');
    }
}

// Render Report Charts
function renderReportCharts(bins = [], tasks = [], messages = [], range = reportRange) {
    const pad = (value) => String(value).padStart(2, '0');

    const getBucketKey = (date, unit) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        if (unit === 'month') {
            return `${year}-${month}`;
        }
        const day = pad(d.getDate());
        if (unit === 'hour') {
            return `${year}-${month}-${day} ${pad(d.getHours())}`;
        }
        return `${year}-${month}-${day}`;
    };

    const getRangeConfig = (rangeValue) => {
        switch (rangeValue) {
            case 'day':
                return {
                    unit: 'hour',
                    count: 24,
                    label: (d) => d.toLocaleTimeString('en-US', { hour: 'numeric' }),
                };
            case 'month':
                return {
                    unit: 'day',
                    count: 30,
                    label: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                };
            case 'year':
                return {
                    unit: 'month',
                    count: 12,
                    label: (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                };
            case 'week':
            default:
                return {
                    unit: 'day',
                    count: 7,
                    label: (d) => d.toLocaleDateString('en-US', { weekday: 'short' }),
                };
        }
    };

    const buildBuckets = (rangeValue) => {
        const config = getRangeConfig(rangeValue);
        const now = new Date();
        const dates = [];

        if (config.unit === 'hour') {
            const end = new Date(now);
            end.setMinutes(0, 0, 0);
            for (let i = config.count - 1; i >= 0; i--) {
                const d = new Date(end);
                d.setHours(end.getHours() - i);
                dates.push(d);
            }
        } else if (config.unit === 'day') {
            const end = new Date(now);
            end.setHours(0, 0, 0, 0);
            for (let i = config.count - 1; i >= 0; i--) {
                const d = new Date(end);
                d.setDate(end.getDate() - i);
                dates.push(d);
            }
        } else {
            const end = new Date(now);
            end.setDate(1);
            end.setHours(0, 0, 0, 0);
            for (let i = config.count - 1; i >= 0; i--) {
                const d = new Date(end);
                d.setMonth(end.getMonth() - i);
                dates.push(d);
            }
        }

        return {
            labels: dates.map(config.label),
            keys: dates.map((d) => getBucketKey(d, config.unit)),
            unit: config.unit,
        };
    };

    const efficiencyCanvas = document.getElementById('collectionEfficiencyChart');
    const fillCanvas = document.getElementById('fillTrendsChart');
    const performanceCanvas = document.getElementById('collectorPerformanceChart');
    const alertCanvas = document.getElementById('alertStatsChart');
    if (!efficiencyCanvas || !fillCanvas || !performanceCanvas || !alertCanvas) {
        return;
    }

    const { labels, keys, unit } = buildBuckets(range);
    const bucketIndex = keys.reduce((acc, key, index) => {
        acc[key] = index;
        return acc;
    }, {});

    // Collection Efficiency Chart
    const efficiencyCtx = efficiencyCanvas.getContext('2d');
    
    if (charts.efficiency) {
        charts.efficiency.destroy();
    }

    const collectionData = new Array(keys.length).fill(0);
    tasks.forEach((task) => {
        if (task.status !== 'completed' || !task.completedAt) return;
        const key = getBucketKey(task.completedAt, unit);
        const index = bucketIndex[key];
        if (index === undefined) return;
        collectionData[index] += 1;
    });
    
    charts.efficiency = new Chart(efficiencyCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Completed Tasks',
                data: collectionData,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
            },
        },
    });
    
    // Fill Trends Chart
    const fillTrendsCtx = fillCanvas.getContext('2d');
    
    if (charts.fillTrends) {
        charts.fillTrends.destroy();
    }

    const fillSums = new Array(keys.length).fill(0);
    const fillCounts = new Array(keys.length).fill(0);
    let hasFillHistory = false;

    bins.forEach((bin) => {
        if (!Array.isArray(bin.fillHistory)) return;
        bin.fillHistory.forEach((entry) => {
            if (!entry || !entry.timestamp) return;
            const key = getBucketKey(entry.timestamp, unit);
            const index = bucketIndex[key];
            if (index === undefined) return;
            fillSums[index] += Number(entry.level) || 0;
            fillCounts[index] += 1;
            hasFillHistory = true;
        });
    });

    let fillData = fillSums.map((sum, index) => {
        if (fillCounts[index] === 0) return null;
        return Math.round(sum / fillCounts[index]);
    });

    if (!hasFillHistory) {
        const avgCurrent = bins.length > 0
            ? Math.round(bins.reduce((sum, b) => sum + (b.currentLevel || 0), 0) / bins.length)
            : 0;
        fillData = keys.map(() => avgCurrent);
    }
    
    charts.fillTrends = new Chart(fillTrendsCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Average Fill Level',
                data: fillData,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                fill: true,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                },
            },
        },
    });
    
    // Collector Performance Chart
    const performanceCtx = performanceCanvas.getContext('2d');
    
    if (charts.performance) {
        charts.performance.destroy();
    }

    const collectorCounts = {};
    tasks.forEach((task) => {
        if (task.status !== 'completed' || !task.completedAt) return;
        const key = getBucketKey(task.completedAt, unit);
        if (bucketIndex[key] === undefined) return;
        const name = task.assignedTo?.name || task.assignedTo?.fullName || task.assignedToName || task.assignedTo || 'Unknown';
        collectorCounts[name] = (collectorCounts[name] || 0) + 1;
    });

    const collectorEntries = Object.entries(collectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const performanceLabels = collectorEntries.length > 0
        ? collectorEntries.map(([name]) => name)
        : ['No data'];
    const performanceData = collectorEntries.length > 0
        ? collectorEntries.map(([, count]) => count)
        : [0];
    const palette = ['#3498db', '#27ae60', '#f39c12', '#9b59b6', '#e67e22'];
    const performanceColors = collectorEntries.length > 0
        ? palette.slice(0, performanceLabels.length)
        : ['#bdc3c7'];
    
    charts.performance = new Chart(performanceCtx, {
        type: 'bar',
        data: {
            labels: performanceLabels,
            datasets: [{
                label: 'Tasks Completed',
                data: performanceData,
                backgroundColor: performanceColors,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
    
    // Alert Statistics Chart
    const alertStatsCtx = alertCanvas.getContext('2d');
    
    if (charts.alertStats) {
        charts.alertStats.destroy();
    }
    
    const alertCounts = {
        alerts: 0,
        updates: 0,
        issues: 0,
        confirmations: 0,
    };

    messages.forEach((msg) => {
        if (!msg || !msg.messageType || !msg.timestamp) return;
        const key = getBucketKey(msg.timestamp, unit);
        if (bucketIndex[key] === undefined) return;
        switch (msg.messageType) {
            case 'alert':
                alertCounts.alerts += 1;
                break;
            case 'update':
                alertCounts.updates += 1;
                break;
            case 'issue':
                alertCounts.issues += 1;
                break;
            case 'confirmation':
                alertCounts.confirmations += 1;
                break;
            default:
                break;
        }
    });

    charts.alertStats = new Chart(alertStatsCtx, {
        type: 'pie',
        data: {
            labels: ['Alerts', 'Updates', 'Issues', 'Confirmations'],
            datasets: [{
                data: [alertCounts.alerts, alertCounts.updates, alertCounts.issues, alertCounts.confirmations],
                backgroundColor: ['#e74c3c', '#3498db', '#f39c12', '#27ae60'],
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        },
    });
}

// Populate Task Form
let allCollectors = [];
let selectedCollector = null;

async function populateTaskForm() {
    try {
        // Load bins
        const binsResponse = await fetch(`${API_BASE_URL}/bins`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const binsData = await binsResponse.json();
        
        const binSelect = document.getElementById('taskBin');
        binSelect.innerHTML = binsData.data.map(bin => 
            `<option value="${bin._id}">${bin.name} (${bin.location.address}) - ${bin.currentLevel}%</option>`
        ).join('');
        
        // Load collectors
        const collectorsResponse = await fetch(`${API_BASE_URL}/users/collectors`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const collectorsData = await collectorsResponse.json();
        allCollectors = collectorsData.data;
    } catch (error) {
        console.error('Error populating task form:', error);
    }
}

function openCollectorSelectionModal() {
    // Render collectors
    renderCollectorList(allCollectors);
    
    // Show modal
    const modal = document.getElementById('collectorSelectionModal');
    const overlay = document.getElementById('modalOverlay');
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function renderCollectorList(collectors) {
    const collectorList = document.getElementById('collectorList');
    collectorList.innerHTML = collectors.map(collector => `
        <div class="collector-item ${selectedCollector && selectedCollector._id === collector._id ? 'selected' : ''}" 
             data-collector-id="${collector._id}">
            <div class="collector-info">
                <div class="collector-name">${collector.name}</div>
                <span class="collector-id">ID: ${collector._id}</span>
                <div class="collector-status ${collector.isActive ? 'active' : 'inactive'}">
                    <span class="status-indicator ${collector.isActive ? 'active' : 'inactive'}"></span>
                    ${collector.isActive ? 'Active' : 'Inactive'}
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    collectorList.querySelectorAll('.collector-item').forEach(item => {
        item.addEventListener('click', function() {
            const collectorId = this.dataset.collectorId;
            selectedCollector = allCollectors.find(c => c._id === collectorId);
            renderCollectorList(allCollectors);
        });
    });
}

function filterCollectors() {
    const searchTerm = document.getElementById('collectorSearch').value.toLowerCase();
    const filtered = allCollectors.filter(collector => 
        collector.name.toLowerCase().includes(searchTerm) || 
        collector._id.toLowerCase().includes(searchTerm)
    );
    renderCollectorList(filtered);
}

function confirmCollectorSelection() {
    if (selectedCollector) {
        // Update display
        document.getElementById('selectedCollectorName').textContent = selectedCollector.name;
        document.getElementById('selectedCollectorId').textContent = `ID: ${selectedCollector._id}`;
        document.getElementById('taskCollector').value = selectedCollector._id;
        
        // Close modal
        closeCollectorSelectionModal();
    } else {
        alert('Please select a collector');
    }
}

function closeCollectorSelectionModal() {
    const modal = document.getElementById('collectorSelectionModal');
    const overlay = document.getElementById('modalOverlay');
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
}

// Handle Add Bin
async function handleAddBin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Clear previous errors
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('error'));
    
    const formData = new FormData(e.target);
    const binData = {
        name: formData.get('name').trim(),
        location: {
            address: formData.get('address').trim(),
            area: formData.get('area').trim(),
            latitude: parseFloat(formData.get('latitude')),
            longitude: parseFloat(formData.get('longitude')),
        },
        gsmNumber: formData.get('gsmNumber').trim(),
        deviceId: formData.get('deviceId').trim(),
        type: formData.get('type'),
    };
    
    // Validation
    let errors = [];
    
    // Name validation
    if (!binData.name) {
        showFieldError('binName', 'Bin name is required');
        errors.push('name');
    }
    
    // Address validation
    if (!binData.location.address) {
        showFieldError('binAddress', 'Address is required');
        errors.push('address');
    }
    
    // Area validation
    if (!binData.location.area) {
        showFieldError('binArea', 'Area is required');
        errors.push('area');
    }
    
    // Latitude validation (-90 to 90)
    if (isNaN(binData.location.latitude) || binData.location.latitude < -90 || binData.location.latitude > 90) {
        showFieldError('binLatitude', 'Latitude must be between -90 and 90');
        errors.push('latitude');
    }
    
    // Longitude validation (-180 to 180)
    if (isNaN(binData.location.longitude) || binData.location.longitude < -180 || binData.location.longitude > 180) {
        showFieldError('binLongitude', 'Longitude must be between -180 and 180');
        errors.push('longitude');
    }
    
    // GSM number validation (digits only, 10-15 characters)
    const gsmRegex = /^\d{10,15}$/;
    if (!gsmRegex.test(binData.gsmNumber)) {
        showFieldError('binGsmNumber', 'GSM number must be 10-15 digits only');
        errors.push('gsmNumber');
    }
    
    // Device ID validation (required)
    if (!binData.deviceId) {
        showFieldError('binDeviceId', 'Device ID is required');
        errors.push('deviceId');
    }
    
    if (errors.length > 0) {
        showToast('Please fix the validation errors', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = 'Adding...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/bins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(binData),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Bin added successfully!', 'success');
            closeModal('addBinModal');
            loadBins();
            loadOverview();
            e.target.reset();
        } else {
            // Handle duplicate errors
            if (data.message && data.message.includes('duplicate')) {
                if (data.message.includes('binId')) {
                    showToast('A bin with this ID already exists. Please try again.', 'error');
                } else if (data.message.includes('deviceId')) {
                    showToast('A bin with this Device ID already exists.', 'error');
                    showFieldError('binDeviceId', 'Device ID already in use');
                } else if (data.message.includes('gsmNumber')) {
                    showToast('A bin with this GSM number already exists.', 'error');
                    showFieldError('binGsmNumber', 'GSM number already in use');
                } else {
                    showToast('A bin with this information already exists.', 'error');
                }
            } else {
                showToast(data.message || 'Error adding bin', 'error');
            }
        }
    } catch (error) {
        console.error('Error adding bin:', error);
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showToast('Network error. Please check your connection and try again.', 'error');
        } else {
            showToast('Error adding bin. Please try again.', 'error');
        }
    } finally {
        // Remove loading state
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Show field error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('error');
            let errorEl = formGroup.querySelector('.form-error');
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                formGroup.appendChild(errorEl);
            }
            errorEl.textContent = message;
        }
    }
}

function clearFormErrors(formElement) {
    if (!formElement) return;
    formElement.querySelectorAll('.form-group.error').forEach((group) => {
        group.classList.remove('error');
        const errorEl = group.querySelector('.form-error');
        if (errorEl) {
            errorEl.textContent = '';
        }
    });
}

// Handle Create Task
async function handleCreateTask(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const taskData = {
        binId: formData.get('binId'),
        assignedTo: formData.get('assignedTo'),
        priority: formData.get('priority'),
        instructions: formData.get('instructions'),
        estimatedDuration: parseInt(formData.get('estimatedDuration')),
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(taskData),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task created successfully!', 'success');
            closeModal();
            loadTasks();
            loadOverview();
            e.target.reset();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error creating task', 'error');
    }
}

// Handle Add User
async function handleAddUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        phone: formData.get('phone'),
        gsmNumber: formData.get('gsmNumber'),
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(userData),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('User added successfully!', 'success');
            closeModal();
            loadUsers();
            e.target.reset();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error adding user', 'error');
    }
}

// Handle Mark All Read
async function handleMarkAllRead() {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('All messages marked as read', 'success');
            loadMessages();
        }
    } catch (error) {
        showToast('Error marking messages as read', 'error');
    }
}

// Handle Save Thresholds
function handleSaveThresholds() {
    const nearFullThreshold = document.getElementById('nearFullThreshold').value;
    const fullThreshold = document.getElementById('fullThreshold').value;
    
    // In a real implementation, this would save to the server
    showToast('Thresholds saved successfully!', 'success');
}

// Mark Message Read
async function markMessageRead(messageId) {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadMessages();
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Show Bin Details
async function showBinDetails(binId) {
    try {
        const response = await fetch(`${API_BASE_URL}/bins/${binId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            const bin = data.data;
            const content = document.getElementById('binDetailsContent');
            content.innerHTML = `
                <div class="bin-details">
                    <h4>${bin.name}</h4>
                    <p><strong>ID:</strong> ${bin.binId}</p>
                    <p><strong>Location:</strong> ${bin.location.address}</p>
                    <p><strong>Area:</strong> ${bin.location.area}</p>
                    <p><strong>Coordinates:</strong> ${bin.location.latitude}, ${bin.location.longitude}</p>
                    <p><strong>Status:</strong> ${bin.status}</p>
                    <p><strong>Fill Level:</strong> ${bin.currentLevel}%</p>
                    <p><strong>Online:</strong> <span class="status-indicator"><span class="status-dot ${bin.isOnline ? 'online' : 'offline'}"></span><span>${bin.isOnline ? 'Online' : 'Offline'}</span></span></p>
                    <p><strong>Last Update:</strong> ${formatDate(bin.lastUpdate)}</p>
                    <p><strong>GSM Number:</strong> ${bin.gsmNumber}</p>
                    <p><strong>Device ID:</strong> ${bin.deviceId}</p>
                </div>
            `;
            openModal('binDetailsModal');
        }
    } catch (error) {
        console.error('Error loading bin details:', error);
    }
}

// Create Task for Bin
function createTaskForBin(binId) {
    populateTaskForm();
    document.getElementById('taskBin').value = binId;
    openModal('createTaskModal');
}

// Edit Bin
async function editBin(binId) {
    try {
        const response = await fetch(`${API_BASE_URL}/bins/${binId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        const data = await response.json();
        
        if (data.success) {
            const bin = data.data;
            
            // Populate the edit form
            document.getElementById('editBinId').value = bin._id;
            document.getElementById('editBinName').value = bin.name;
            document.getElementById('editBinAddress').value = bin.location.address;
            document.getElementById('editBinArea').value = bin.location.area;
            document.getElementById('editBinLatitude').value = bin.location.latitude;
            document.getElementById('editBinLongitude').value = bin.location.longitude;
            document.getElementById('editBinGsmNumber').value = bin.gsmNumber;
            document.getElementById('editBinDeviceId').value = bin.deviceId;
            document.getElementById('editBinType').value = bin.type;
            
            openModal('editBinModal');
        }
    } catch (error) {
        console.error('Error fetching bin:', error);
        showToast('Error loading bin details', 'error');
    }
}

// Confirm Delete Bin - Open delete confirmation modal
let binToDelete = null;

function confirmDeleteBin(binId, binName) {
    binToDelete = binId;
    document.getElementById('deleteBinName').textContent = binName;
    
    // Set up the confirm delete button
    const confirmBtn = document.getElementById('confirmDeleteBinBtn');
    confirmBtn.onclick = function() {
        deleteBin(binId);
    };
    
    openModal('deleteBinModal');
}

// Delete Bin - Perform the actual deletion
async function deleteBin(binId) {
    try {
        const confirmBtn = document.getElementById('confirmDeleteBinBtn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';
        
        const response = await fetch(`${API_BASE_URL}/bins/${binId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Bin deleted successfully', 'success');
            closeModal('deleteBinModal');
            // Reload bins to update the UI
            try {
                loadBins();
                loadDashboardData();
            } catch (reloadError) {
                console.error('Error reloading data after bin deletion:', reloadError);
            }
        } else {
            showToast(data.message || 'Error deleting bin', 'error');
        }
    } catch (error) {
        console.error('Error deleting bin:', error);
        showToast('Error deleting bin', 'error');
    } finally {
        const confirmBtn = document.getElementById('confirmDeleteBinBtn');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete Bin';
        binToDelete = null;
    }
}

// Handle Edit Bin
async function handleEditBin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    const binId = document.getElementById('editBinId').value;
    
    const formData = new FormData(e.target);
    const binData = {
        name: formData.get('name').trim(),
        location: {
            address: formData.get('address').trim(),
            area: formData.get('area').trim(),
            latitude: parseFloat(formData.get('latitude')),
            longitude: parseFloat(formData.get('longitude')),
        },
        gsmNumber: formData.get('gsmNumber').trim(),
        deviceId: formData.get('deviceId').trim(),
        type: formData.get('type'),
    };
    
    // Validation
    let errors = [];
    
    if (!binData.name) {
        showFieldError('editBinName', 'Bin name is required');
        errors.push('name');
    }
    
    if (!binData.location.address) {
        showFieldError('editBinAddress', 'Address is required');
        errors.push('address');
    }
    
    if (!binData.location.area) {
        showFieldError('editBinArea', 'Area is required');
        errors.push('area');
    }
    
    if (isNaN(binData.location.latitude) || binData.location.latitude < -90 || binData.location.latitude > 90) {
        showFieldError('editBinLatitude', 'Latitude must be between -90 and 90');
        errors.push('latitude');
    }
    
    if (isNaN(binData.location.longitude) || binData.location.longitude < -180 || binData.location.longitude > 180) {
        showFieldError('editBinLongitude', 'Longitude must be between -180 and 180');
        errors.push('longitude');
    }
    
    const gsmRegex = /^\d{10,15}$/;
    if (!gsmRegex.test(binData.gsmNumber)) {
        showFieldError('editBinGsmNumber', 'GSM number must be 10-15 digits only');
        errors.push('gsmNumber');
    }
    
    if (!binData.deviceId) {
        showFieldError('editBinDeviceId', 'Device ID is required');
        errors.push('deviceId');
    }
    
    if (errors.length > 0) {
        showToast('Please fix the validation errors', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/bins/${binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(binData),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Bin updated successfully!', 'success');
            closeModal('editBinModal');
            loadBins();
            loadOverview();
        } else {
            showToast(data.message || 'Error updating bin', 'error');
        }
    } catch (error) {
        console.error('Error updating bin:', error);
        showToast('Error updating bin. Please try again.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// View Task
async function viewTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();

        if (!data.success) {
            showToast(data.message || 'Unable to load task details', 'error');
            return;
        }

        const task = data.data;
        const content = document.getElementById('taskDetailsContent');
        if (!content) {
            showToast('Task details view not available', 'error');
            return;
        }

        const assigned = task.assignedTo || {};
        const bin = task.binId || {};
        const location = bin.location || task.binLocation || {};

        const safeDate = (value) => {
            if (!value) return 'N/A';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return 'N/A';
            return formatDate(value);
        };

        const safeText = (value, fallback = 'N/A') => {
            if (value === null || value === undefined || value === '') return fallback;
            return value;
        };

        const coords = (location.latitude !== undefined && location.longitude !== undefined)
            ? `${location.latitude}, ${location.longitude}`
            : 'N/A';

        const fillLevel = typeof bin.currentLevel === 'number' ? `${bin.currentLevel}%` : 'N/A';

        const gsmUpdates = Array.isArray(task.gsmUpdates) ? task.gsmUpdates : [];
        const legacyIssue = (typeof task.notes === 'string' && task.notes.startsWith('ISSUE REPORT:'))
            ? task.notes
            : '';
        const issueText = task.issueReported || legacyIssue;
        const gsmUpdatesHtml = gsmUpdates.length
            ? `<ul class="task-updates">
                ${gsmUpdates.map(update => `
                    <li class="task-update-item">
                        <span class="task-update-type">${safeText(update.type, 'update')}</span>
                        <span class="task-update-message">${safeText(update.message, 'No message')}</span>
                        <span class="task-update-time">${safeDate(update.timestamp)}</span>
                    </li>
                `).join('')}
               </ul>`
            : `<p class="no-data">No GSM updates recorded.</p>`;

        content.innerHTML = `
            <div class="task-details">
                <div class="task-section">
                    <h4>Summary</h4>
                    <div class="info-row">
                        <span class="info-label">Task ID</span>
                        <span class="info-value">${safeText(task.taskId, safeText(task._id))}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status</span>
                        <span class="info-value"><span class="status-badge ${safeText(task.status, 'pending')}">${safeText(task.status)}</span></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Priority</span>
                        <span class="info-value"><span class="priority-badge ${safeText(task.priority, 'medium')}">${safeText(task.priority)}</span></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Assigned By</span>
                        <span class="info-value">${safeText(task.assignedByName)}</span>
                    </div>
                </div>
                <div class="task-section">
                    <h4>Bin</h4>
                    <div class="info-row">
                        <span class="info-label">Name</span>
                        <span class="info-value">${safeText(bin.name, safeText(task.binName))}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Bin ID</span>
                        <span class="info-value">${safeText(bin.binId)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Address</span>
                        <span class="info-value">${safeText(location.address)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Coords</span>
                        <span class="info-value">${coords}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Fill</span>
                        <span class="info-value">${fillLevel}</span>
                    </div>
                </div>
                <div class="task-section">
                    <h4>Collector</h4>
                    <div class="info-row">
                        <span class="info-label">Name</span>
                        <span class="info-value">${safeText(assigned.name)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email</span>
                        <span class="info-value">${safeText(assigned.email)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${safeText(assigned.phone)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">GSM</span>
                        <span class="info-value">${safeText(assigned.gsmNumber)}</span>
                    </div>
                </div>
                <div class="task-section">
                    <h4>Timeline</h4>
                    <div class="info-row">
                        <span class="info-label">Created</span>
                        <span class="info-value">${safeDate(task.createdAt)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Assigned</span>
                        <span class="info-value">${safeDate(task.assignedAt)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Started</span>
                        <span class="info-value">${safeDate(task.startedAt)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Completed</span>
                        <span class="info-value">${safeDate(task.completedAt)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Est. Min</span>
                        <span class="info-value">${safeText(task.estimatedDuration)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Actual Min</span>
                        <span class="info-value">${safeText(task.actualDuration)}</span>
                    </div>
                </div>
                <div class="task-section">
                    <h4>Notes</h4>
                    <div class="task-note">
                        <span class="task-note-label">Instructions</span>
                        <p>${safeText(task.instructions, 'None')}</p>
                    </div>
                    <div class="task-note">
                        <span class="task-note-label">Notes</span>
                        <p>${safeText(task.notes, 'None')}</p>
                    </div>
                    <div class="task-note">
                        <span class="task-note-label">Issue Reported</span>
                        <p>${safeText(issueText, 'None')}</p>
                    </div>
                </div>
                <div class="task-section">
                    <h4>GSM Updates</h4>
                    ${gsmUpdatesHtml}
                </div>
            </div>
        `;

        openModal('taskDetailsModal');
    } catch (error) {
        console.error('Error loading task details:', error);
        showToast('Error loading task details', 'error');
    }
}

// Delete Task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task deleted successfully', 'success');
            loadTasks();
            loadOverview();
        }
    } catch (error) {
        showToast('Error deleting task', 'error');
    }
}

// Edit User
function editUser(userId) {
    editUserDetails(userId);
}

async function editUserDetails(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();

        if (!data.success) {
            showToast(data.message || 'Error loading user details', 'error');
            return;
        }

        const user = data.data;
        const form = document.getElementById('editUserForm');
        clearFormErrors(form);
        if (form) form.reset();

        document.getElementById('editUserId').value = user._id;
        document.getElementById('editUserName').value = user.name || '';
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserRole').value = user.role || 'collector';
        document.getElementById('editUserPhone').value = user.phone || '';
        document.getElementById('editUserGsmNumber').value = user.gsmNumber || '';
        document.getElementById('editUserStatus').value = user.isActive ? 'true' : 'false';

        openModal('editUserModal');
    } catch (error) {
        console.error('Error fetching user:', error);
        showToast('Error loading user details', 'error');
    }
}

// Handle Edit User
async function handleEditUser(e) {
    e.preventDefault();

    const form = e.target;
    clearFormErrors(form);

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    const userId = document.getElementById('editUserId').value;
    const formData = new FormData(form);
    const userData = {
        name: formData.get('name').trim(),
        email: formData.get('email').trim().toLowerCase(),
        role: formData.get('role'),
        phone: formData.get('phone').trim(),
        gsmNumber: formData.get('gsmNumber').trim(),
        isActive: formData.get('isActive') === 'true',
    };

    // Validation
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const gsmRegex = /^\d{10,15}$/;

    if (!userData.name) {
        showFieldError('editUserName', 'Name is required');
        errors.push('name');
    }

    if (!emailRegex.test(userData.email)) {
        showFieldError('editUserEmail', 'Valid email is required');
        errors.push('email');
    }

    if (!userData.role) {
        showFieldError('editUserRole', 'Role is required');
        errors.push('role');
    }

    if (!userData.phone) {
        showFieldError('editUserPhone', 'Phone is required');
        errors.push('phone');
    }

    if (!gsmRegex.test(userData.gsmNumber)) {
        showFieldError('editUserGsmNumber', 'GSM number must be 10-15 digits only');
        errors.push('gsmNumber');
    }

    if (errors.length > 0) {
        showToast('Please fix the validation errors', 'error');
        return;
    }

    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = 'Saving...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (data.success) {
            showToast('User updated successfully!', 'success');
            closeModal('editUserModal');
            loadUsers();

            if (currentUser && data.data && data.data._id === currentUser.id) {
                currentUser = {
                    ...currentUser,
                    name: data.data.name,
                    email: data.data.email,
                    role: data.data.role,
                    phone: data.data.phone,
                    gsmNumber: data.data.gsmNumber,
                    about: data.data.about,
                    profilePhoto: data.data.profilePhoto,
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateProfileMenu();
                document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
            }
        } else {
            showToast(data.message || 'Error updating user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Error updating user. Please try again.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('User deleted successfully', 'success');
            loadUsers();
        }
    } catch (error) {
        showToast('Error deleting user', 'error');
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Update Time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('currentTime').textContent = `${dateString} ${timeString}`;
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
