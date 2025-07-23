// Get the toggle elements
const animationToggle = document.getElementById('animationToggle');
const speedModeToggle = document.getElementById('speedModeToggle');

// Load saved preferences
chrome.storage.sync.get(['animationsEnabled', 'speedModeEnabled'], (result) => {
    // Default animations to true if not set
    const animEnabled = result.animationsEnabled !== false;
    animationToggle.checked = animEnabled;
    
    // Default speed mode to false if not set
    const speedEnabled = result.speedModeEnabled === true;
    speedModeToggle.checked = speedEnabled;
});

// Save animation preference when changed
animationToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    
    // Save to storage
    chrome.storage.sync.set({ animationsEnabled: enabled });
    
    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'toggleAnimations',
            enabled: enabled
        });
    });
});

// Save speed mode preference when changed
speedModeToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    
    // Save to storage
    chrome.storage.sync.set({ speedModeEnabled: enabled });
    
    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'toggleSpeedMode',
            enabled: enabled
        });
    });
});
