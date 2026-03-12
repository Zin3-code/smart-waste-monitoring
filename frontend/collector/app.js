// API Configuration
// API Configuration
const API_BASE_URL = "https://smart-waste-monitoring-api.onrender.com/api";
// Global State
let currentUser = null;
let authToken = null;
let socket = null;
let currentTasks = [];
let pendingProfilePhoto = null;

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

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Returns the initials of a given name.
 * If the name is empty, returns 'U'.
 * Otherwise, returns the first letter of the first word and the first letter of the last word, concatenated and uppercased.
 * @param {string} [name] - The name to get the initials of.
 * @returns {string} The initials of the given name, or 'U' if the name is empty.
 */
/*******  277f5b54-792a-4f62-b822-cb6e0516f6e8  *******/function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return `${first}${last}`.toUpperCase();
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

function updateProfileMenu() {
    const name = currentUser?.name || 'User';
    const email = currentUser?.email || '';
    const role = formatRoleLabel(currentUser?.role);
    const initials = getInitials(name);
    const photo = currentUser?.profilePhoto || '';
    const about = currentUser?.about || '';

    const profileName = document.getElementById('profileMenuName');
    if (profileName) profileName.textContent = name;

    const profileRole = document.getElementById('profileMenuRole');
    if (profileRole) profileRole.textContent = role;

    const profileDropdownName = document.getElementById('profileMenuDropdownName');
    if (profileDropdownName) profileDropdownName.textContent = name;

    const profileEmail = document.getElementById('profileMenuEmail');
    if (profileEmail) profileEmail.textContent = email;

    const profileAbout = document.getElementById('profileMenuAbout');
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

    const viewBtn = document.getElementById('profileViewBtn');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            switchTab('profile');
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

function updateNotificationBadgeFromTasks(tasks) {
    const badge = document.getElementById('notificationCount');
    if (!badge) return;
    const count = tasks.filter(task => task.status === 'pending' || task.status === 'in-progress').length;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderCollectorNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    if (!currentTasks || currentTasks.length === 0) {
        list.innerHTML = '<div class="notification-empty">No task updates yet.</div>';
        return;
    }

    const notifications = [...currentTasks]
        .filter(task => task.status !== 'completed')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 6);

    if (notifications.length === 0) {
        list.innerHTML = '<div class="notification-empty">All tasks are completed.</div>';
        return;
    }

    list.innerHTML = notifications.map(task => `
        <button class="notification-item" data-task-id="${task._id}" type="button">
            <div class="notification-item-header">
                <span class="notification-status">${task.status}</span>
                <span class="notification-time">${formatDate(task.updatedAt || task.createdAt)}</span>
            </div>
            <div class="notification-title">${task.binName || 'Task'}</div>
            <div class="notification-body">${task.instructions || 'No instructions provided.'}</div>
        </button>
    `).join('');

    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const taskId = item.dataset.taskId;
            if (taskId) {
                viewTaskDetails(taskId);
            }
            const dropdown = document.getElementById('notificationDropdown');
            const toggle = document.getElementById('notificationToggle');
            if (dropdown && toggle) {
                dropdown.classList.add('hidden');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
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
        renderCollectorNotifications();
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

    const viewTasksBtn = document.getElementById('notificationViewTasks');
    if (viewTasksBtn) {
        viewTasksBtn.addEventListener('click', () => {
            const tasksTab = document.querySelector('.tab-btn[data-tab="tasks"]');
            if (tasksTab) tasksTab.click();
            closeMenu();
        });
    }
}

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());
    checkAuth();
    setupAuthInterceptors(); // Initialize auth gate interceptors
    setupEventListeners();
});

// Check Authentication
function checkAuth() {
    const token = localStorage.getItem('collectorAuthToken');
    const user = localStorage.getItem('collectorCurrentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showDashboard();
    } else {
        showLogin();
    }
}

// Show Login Screen
function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
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

    setupNotificationMenu();
    setupProfileMenu();
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabClick);
    });
    
    // Bottom Navigation (Mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavClick);
    });
    
    // Task Status Filter
    document.getElementById('taskStatusFilter').addEventListener('change', loadTasks);
    
    // Profile Form
    document.getElementById('profileForm').addEventListener('submit', handleUpdateProfile);

    const profilePhotoInput = document.getElementById('profilePhotoInput');
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', handleProfilePhotoChange);
    }

    const profilePhotoRemove = document.getElementById('profilePhotoRemove');
    if (profilePhotoRemove) {
        profilePhotoRemove.addEventListener('click', handleProfilePhotoRemove);
    }
    
    // Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    document.getElementById('modalOverlay').addEventListener('click', closeModal);
    
    // Complete Task Form
    document.getElementById('completeTaskForm').addEventListener('submit', handleCompleteTask);
    
    // Report Issue Form
    document.getElementById('reportIssueForm').addEventListener('submit', handleReportIssue);
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
            localStorage.setItem('collectorAuthToken', authToken);
            localStorage.setItem('collectorCurrentUser', JSON.stringify(currentUser));
            showDashboard();
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
    localStorage.removeItem('collectorAuthToken');
    localStorage.removeItem('collectorCurrentUser');
    authToken = null;
    currentUser = null;
    if (socket) {
        socket.disconnect();
    }
    showLogin();
    showToast('Logged out successfully', 'info');
}

// Handle Tab Click
function handleTabClick(e) {
    const tab = e.currentTarget.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Show tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });
    
    // Load tab data
    loadTabData(tab);
}

// Handle Nav Click (Mobile)
function handleNavClick(e) {
    e.preventDefault();
    const tab = e.currentTarget.dataset.tab;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Show tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    // Load tab data
    loadTabData(tab);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const target = document.getElementById(`${tab}Tab`);
    if (target) {
        target.classList.add('active');
    }

    loadTabData(tab);
}

// Load Tab Data
function loadTabData(tab) {
    switch (tab) {
        case 'tasks':
            loadTasks();
            break;
        case 'history':
            loadHistory();
            break;
        case 'profile':
            loadProfile();
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
    
    socket.on('task-update', (data) => {
        showToast('Task update received', 'info');
        loadTasks();
        loadStats();
    });
    
    socket.on('new-message', (data) => {
        showToast('New message received', 'info');
        updateNotificationBadge();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Load Dashboard Data
async function loadDashboardData() {
    loadStats();
    loadTasks();
    loadProfile();
}

// Load Stats
async function loadStats() {
    try {
        // Load my tasks
        const response = await fetch(`${API_BASE_URL}/tasks/my-tasks`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            const tasks = data.data;
            const pending = tasks.filter(t => t.status === 'pending').length;
            const inProgress = tasks.filter(t => t.status === 'in-progress').length;
            
            // Get today's completed tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const completedToday = tasks.filter(t => 
                t.status === 'completed' && new Date(t.completedAt) >= today
            ).length;
            
            document.getElementById('pendingTasks').textContent = pending;
            document.getElementById('inProgressTasks').textContent = inProgress;
            document.getElementById('completedTasks').textContent = completedToday;
            document.getElementById('totalCompleted').textContent = currentUser.tasksCompleted || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Tasks
async function loadTasks() {
    try {
        const statusFilter = document.getElementById('taskStatusFilter').value;
        
        let url = `${API_BASE_URL}/tasks/my-tasks`;
        if (statusFilter) url += `?status=${statusFilter}`;
        
        console.log('[DEBUG] Loading tasks from:', url);
        const response = await fetch(url, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        console.log('[DEBUG] Tasks API response:', data);
        
        if (data.success) {
            console.log('[DEBUG] Number of tasks loaded:', data.data.length);
            console.log('[DEBUG] Task statuses:', data.data.map(t => ({ id: t.taskId, status: t.status })));
            renderTasks(data.data);
            currentTasks = data.data;
            updateNotificationBadgeFromTasks(currentTasks);
        } else {
            console.warn('[DEBUG] Failed to load tasks:', data.message);
        }
    } catch (error) {
        console.error('[DEBUG] Error loading tasks:', error);
    }
}

// Render Tasks
function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    console.log('[DEBUG] renderTasks called with', tasks.length, 'tasks');
    
    if (tasks.length === 0) {
        console.log('[DEBUG] No tasks found - showing empty state');
        tasksList.innerHTML = '<p class="no-data">No tasks found</p>';
        return;
    }
    
    let buttonSummary = { pending: 0, inProgress: 0, completed: 0 };
    
    tasksList.innerHTML = tasks.map(task => {
        const bin = task.binId || {};
        const statusClass = bin.currentLevel >= 90 ? 'full' : 
                           bin.currentLevel >= 75 ? 'near-full' :
                           bin.currentLevel >= 50 ? 'medium' : 'low';
        
        // Track button visibility
        const hasCompleteButton = task.status === 'in-progress';
        const hasReportButton = task.status === 'in-progress';
        
        if (task.status === 'pending') buttonSummary.pending++;
        else if (task.status === 'in-progress') buttonSummary.inProgress++;
        else buttonSummary.completed++;
        
        console.log(`[DEBUG] Task ${task.taskId} (${task._id}): status="${task.status}", completeButton=${hasCompleteButton}, reportButton=${hasReportButton}`);
        
        return `
            <div class="task-card" data-task-id="${task._id}" data-status="${task.status}">
                <div class="task-header">
                    <span class="task-id">${task.taskId}</span>
                    <span class="priority-badge ${task.priority}">${task.priority}</span>
                </div>
                <div class="task-body">
                    <div class="task-info">
                        <p><span>Bin:</span> ${task.binName}</p>
                        <p><span>Location:</span> ${task.binLocation?.address || 'N/A'}</p>
                        <p><span>Instructions:</span> ${task.instructions || 'None'}</p>
                        <p><span>Created:</span> ${formatDate(task.createdAt)}</p>
                    </div>
                    <div class="bin-status">
                        <span class="bin-status-icon">${bin.isOnline ? '🟢' : '🔴'}</span>
                        <span>${bin.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <div class="fill-level-container">
                        <div class="fill-level-label">
                            <span>Fill Level</span>
                            <span>${bin.currentLevel || 0}%</span>
                        </div>
                        <div class="fill-level-bar">
                            <div class="fill-level-progress ${statusClass}" style="width: ${bin.currentLevel || 0}%"></div>
                        </div>
                    </div>
                     <div class="task-footer">
                         ${task.status === 'pending' ? `
                             <button class="btn btn-primary start-task-btn">Start Task</button>
                             <button class="btn btn-secondary view-details-btn">View Details</button>
                         ` : task.status === 'in-progress' ? `
                             <button class="btn btn-success complete-task-btn">Complete Task</button>
                             <button class="btn btn-warning report-issue-btn">Report Issue</button>
                         ` : `
                             <button class="btn btn-secondary view-details-btn">View Details</button>
                         `}
                     </div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('[DEBUG] Button summary:', buttonSummary);
    console.log('[DEBUG] Total in-progress tasks (should show action buttons):', buttonSummary.inProgress);
    
    // Attach event listeners to buttons
    attachTaskButtonListeners();
    
    // Log button states for debugging
    setTimeout(() => {
        logButtonStates();
    }, 100);
}

// Log button states for debugging
function logButtonStates() {
    const completeButtons = document.querySelectorAll('.btn-success');
    const reportButtons = document.querySelectorAll('.btn-warning');
    
    console.log('[DEBUG] === Button State Check ===');
    
    completeButtons.forEach((btn, i) => {
        const parent = btn.closest('.task-card');
        const taskId = parent?.dataset.taskId || 'unknown';
        const taskStatus = parent?.dataset.status || 'unknown';
        const isVisible = window.getComputedStyle(btn).display !== 'none';
        const opacity = window.getComputedStyle(btn).opacity;
        const pointerEvents = window.getComputedStyle(btn).pointerEvents;
        console.log(`[DEBUG] Complete Task button ${i+1}: taskId=${taskId}, status=${taskStatus}, visible=${isVisible}, opacity=${opacity}, pointerEvents=${pointerEvents}`);
    });
    
    reportButtons.forEach((btn, i) => {
        const parent = btn.closest('.task-card');
        const taskId = parent?.dataset.taskId || 'unknown';
        const taskStatus = parent?.dataset.status || 'unknown';
        const isVisible = window.getComputedStyle(btn).display !== 'none';
        const opacity = window.getComputedStyle(btn).opacity;
        const pointerEvents = window.getComputedStyle(btn).pointerEvents;
        console.log(`[DEBUG] Report Issue button ${i+1}: taskId=${taskId}, status=${taskStatus}, visible=${isVisible}, opacity=${opacity}, pointerEvents=${pointerEvents}`);
    });
    
    console.log('[DEBUG] === End Button State Check ===');
}

// Attach event listeners to task buttons
function attachTaskButtonListeners() {
    console.log('[DEBUG] Attaching button event listeners...');
    
    // Find all task action buttons
    const completeButtons = document.querySelectorAll('.complete-task-btn');
    const reportButtons = document.querySelectorAll('.report-issue-btn');
    const startButtons = document.querySelectorAll('.start-task-btn');
    const viewDetailsButtons = document.querySelectorAll('.view-details-btn');
    
    console.log(`[DEBUG] Found ${completeButtons.length} Complete Task buttons, ${reportButtons.length} Report Issue buttons, ${startButtons.length} Start Task buttons, ${viewDetailsButtons.length} View Details buttons`);
    
    // Attach click listeners to Complete Task buttons
    completeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('[DEBUG] Complete Task button clicked');
            const taskCard = btn.closest('.task-card');
            const taskId = taskCard?.dataset.taskId;
            console.log('[DEBUG] Task ID:', taskId);
            if (taskId) {
                openCompleteTaskModal(taskId);
            } else {
                console.warn('[DEBUG] Could not find task ID for clicked button');
            }
        });
    });
    
    // Attach click listeners to Report Issue buttons
    reportButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('[DEBUG] Report Issue button clicked');
            const taskCard = btn.closest('.task-card');
            const taskId = taskCard?.dataset.taskId;
            console.log('[DEBUG] Task ID:', taskId);
            if (taskId) {
                openReportIssueModal(taskId);
            } else {
                console.warn('[DEBUG] Could not find task ID for clicked button');
            }
        });
    });
    
    // Attach click listeners to Start Task buttons
    startButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('[DEBUG] Start Task button clicked');
            const taskCard = btn.closest('.task-card');
            const taskId = taskCard?.dataset.taskId;
            console.log('[DEBUG] Task ID:', taskId);
            if (taskId) {
                startTask(taskId);
            } else {
                console.warn('[DEBUG] Could not find task ID for clicked button');
            }
        });
    });
    
    // Attach click listeners to View Details buttons
    viewDetailsButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('[DEBUG] View Details button clicked');
            const taskCard = btn.closest('.task-card');
            const taskId = taskCard?.dataset.taskId;
            console.log('[DEBUG] Task ID:', taskId);
            if (taskId) {
                viewTaskDetails(taskId);
            } else {
                console.warn('[DEBUG] Could not find task ID for clicked button');
            }
        });
    });
    
    console.log('[DEBUG] All button event listeners attached successfully');
}

// Load History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/my-tasks?status=completed`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            renderHistory(data.data);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Render History
function renderHistory(tasks) {
    const historyList = document.getElementById('historyList');
    
    if (tasks.length === 0) {
        historyList.innerHTML = '<p class="no-data">No completed tasks found</p>';
        return;
    }
    
    historyList.innerHTML = tasks.map(task => `
        <div class="history-item">
            <div class="history-header">
                <span class="history-task-id">${task.taskId}</span>
                <span class="history-date">${formatDate(task.completedAt)}</span>
            </div>
            <div class="history-info">
                <p><span>Bin:</span> ${task.binName}</p>
                <p><span>Location:</span> ${task.binLocation?.address || 'N/A'}</p>
                <p><span>Duration:</span> ${task.actualDuration ? task.actualDuration + ' min' : 'N/A'}</p>
                ${task.notes ? `<p><span>Notes:</span> ${task.notes}</p>` : ''}
                ${task.issueReported ? `<p><span>Issue:</span> ${task.issueReported}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// Load Profile
async function loadProfile() {
    try {
        // Load user profile
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            document.getElementById('profileName').value = user.name;
            document.getElementById('profileEmail').value = user.email;
            document.getElementById('profilePhone').value = user.phone;
            document.getElementById('profileGsmNumber').value = user.gsmNumber;
            document.getElementById('profileAbout').value = user.about || '';
            setProfilePhotoPreview(user.profilePhoto || '', getInitials(user.name || ''));
            pendingProfilePhoto = null;

            currentUser = { ...currentUser, ...user, id: user.id || currentUser.id };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateProfileMenu();
            
            // Load performance stats
            loadPerformanceStats(user.id || currentUser.id);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load Performance Stats
async function loadPerformanceStats(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/my-tasks`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            const tasks = data.data;
            const completedTasks = tasks.filter(t => t.status === 'completed');
            const totalTasks = tasks.length;
            
            const averageDuration = completedTasks.length > 0
                ? Math.round(completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length)
                : 0;
            
            const completionRate = totalTasks > 0 
                ? Math.round((completedTasks.length / totalTasks) * 100) 
                : 0;
            
            document.getElementById('perfTotalTasks').textContent = completedTasks.length;
            document.getElementById('perfAvgDuration').textContent = averageDuration + ' min';
            document.getElementById('perfCompletionRate').textContent = completionRate + '%';
        }
    } catch (error) {
        console.error('Error loading performance stats:', error);
    }
}

// Handle Update Profile
async function handleUpdateProfile(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        gsmNumber: formData.get('gsmNumber'),
        about: (formData.get('about') || '').trim(),
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
            const updatedUser = data.data || {};
            currentUser = {
                ...currentUser,
                ...updatedUser,
                id: currentUser.id || updatedUser._id,
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateProfileMenu();
            document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
            setProfilePhotoPreview(currentUser.profilePhoto || '', getInitials(currentUser.name || ''));
            pendingProfilePhoto = null;
            showToast('Profile updated successfully!', 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error updating profile', 'error');
    }
}

// Start Task
async function startTask(taskId) {
    if (!confirm('Are you sure you want to start this task?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/start`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task started successfully!', 'success');
            loadTasks();
            loadStats();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error starting task', 'error');
    }
}

// Open Complete Task Modal
function openCompleteTaskModal(taskId) {
    document.getElementById('completeTaskId').value = taskId;
    document.getElementById('completionNotes').value = '';
    document.getElementById('issueReported').value = '';
    openModal('completeTaskModal');
}

// Handle Complete Task
async function handleCompleteTask(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('completeTaskId').value;
    const formData = new FormData(e.target);
    const completionData = {
        notes: formData.get('notes'),
        issueReported: formData.get('issueReported'),
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(completionData),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task completed successfully!', 'success');
            closeModal();
            loadTasks();
            loadStats();
            currentUser.tasksCompleted = (currentUser.tasksCompleted || 0) + 1;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error completing task', 'error');
    }
}

// Open Report Issue Modal
function openReportIssueModal(taskId) {
    document.getElementById('issueTaskId').value = taskId;
    document.getElementById('issueType').value = '';
    document.getElementById('issueDescription').value = '';
    openModal('reportIssueModal');
}

// Handle Report Issue
async function handleReportIssue(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('issueTaskId').value;
    const formData = new FormData(e.target);
    const issueDetails = `${formData.get('issueType')} - ${formData.get('description')}`;
    const issueData = {
        issueReported: `ISSUE REPORT: ${issueDetails}`,
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(issueData),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Issue reported successfully!', 'success');
            closeModal();
            loadTasks();
            loadStats();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error reporting issue', 'error');
    }
}

// View Task Details
async function viewTaskDetails(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await response.json();
        
        if (data.success) {
            const task = data.data;
            const bin = task.binId || {};
            const content = document.getElementById('taskDetailsContent');
            content.innerHTML = `
                <div class="task-details">
                    <h4>Task Information</h4>
                    <p><span>Task ID:</span> ${task.taskId}</p>
                    <p><span>Status:</span> ${task.status}</p>
                    <p><span>Priority:</span> ${task.priority}</p>
                    <p><span>Created:</span> ${formatDate(task.createdAt)}</p>
                    ${task.startedAt ? `<p><span>Started:</span> ${formatDate(task.startedAt)}</p>` : ''}
                    ${task.completedAt ? `<p><span>Completed:</span> ${formatDate(task.completedAt)}</p>` : ''}
                    
                    <h4>Bin Information</h4>
                    <p><span>Bin:</span> ${task.binName}</p>
                    <p><span>Location:</span> ${task.binLocation?.address || 'N/A'}</p>
                    <p><span>Fill Level:</span> ${bin.currentLevel || 0}%</p>
                    <p><span>Status:</span> ${bin.isOnline ? '🟢 Online' : '🔴 Offline'}</p>
                    
                    <h4>Instructions</h4>
                    <p>${task.instructions || 'No specific instructions'}</p>
                    
                    ${task.notes ? `<h4>Notes</h4><p>${task.notes}</p>` : ''}
                    ${task.issueReported ? `<h4>Issue Reported</h4><p>${task.issueReported}</p>` : ''}
                </div>
            `;
            openModal('taskDetailsModal');
        }
    } catch (error) {
        console.error('Error loading task details:', error);
    }
}

// Update Notification Badge
function updateNotificationBadge() {
    updateNotificationBadgeFromTasks(currentTasks);
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    document.getElementById('modalOverlay').classList.add('hidden');
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
