// Get the toggle element
const animationToggle = document.getElementById('animationToggle');

// Load saved preference
chrome.storage.sync.get(['animationsEnabled'], (result) => {
    // Default to true if not set
    const enabled = result.animationsEnabled !== false;
    animationToggle.checked = enabled;
});

// Save preference when changed
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
