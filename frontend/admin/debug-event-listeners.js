// Debug script to test event listeners
console.log('[debug-event-listeners.js] Loading debug-event-listeners.js...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DEBUG EVENT LISTENERS ===');

// List of elements to check
const elementsToCheck = [
    // Buttons
    '#addBinBtn',
    '#addBinForm', 
    '#editBinForm',
    '#createTaskBtn',
    '#createTaskForm',
    '#addUserBtn',
    '#addUserForm',
    '#editUserForm',
    '#markAllReadBtn',
    '#saveThresholdsBtn',
    
    // Filters
    '#binStatusFilter',
    '#binAreaFilter',
    '#taskStatusFilter',
    '#taskPriorityFilter',
    '#messageTypeFilter',
    '#messageSenderFilter',
    '#userRoleFilter',
    
    // Navigation
    '.nav-link'
];

console.log('Checking event listeners for elements:');
elementsToCheck.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`\n${selector}:`);
    
    if (elements.length === 0) {
        console.log('  ❌ No elements found');
        return;
    }
    
    elements.forEach((element, index) => {
        console.log(`  Element ${index}:`, element.tagName, element.id, element.className);
        
        // Get event listeners (Chrome specific)
        try {
            const eventListeners = getEventListeners(element);
            const listenerTypes = Object.keys(eventListeners);
            
            if (listenerTypes.length > 0) {
                console.log('  ✅ Event listeners found:');
                listenerTypes.forEach(type => {
                    console.log(`    - ${type}: ${eventListeners[type].length} listener(s)`);
                });
            } else {
                console.log('  ❌ No event listeners attached');
            }
        } catch (e) {
            console.log('  ❓ Could not retrieve event listeners (requires Chrome DevTools)');
        }
    });
});

// Test navigation functionality
console.log('\n=== TESTING NAVIGATION ===');
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    const section = link.dataset.section;
    console.log(`\nNav link for "${section}":`);
    
    // Test click simulation
    try {
        console.log('  Testing click...');
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        // Log current active section first
        const currentActive = document.querySelector('.nav-link.active');
        console.log('  Current active:', currentActive ? currentActive.dataset.section : 'none');
        
        link.dispatchEvent(event);
        
        // Check if active section changed
        const newActive = document.querySelector('.nav-link.active');
        console.log('  New active:', newActive ? newActive.dataset.section : 'none');
        
        if (newActive && newActive.dataset.section === section) {
            console.log('  ✅ Navigation working');
        } else {
            console.log('  ❌ Navigation failed');
        }
        
    } catch (e) {
        console.log('  ❌ Error:', e);
    }
});

    console.log('\n=== DEBUG COMPLETE ===');
});
