// Track if animations are enabled (default to true)
let animationsEnabled = true;

// Load animation preference
chrome.storage.sync.get(['animationsEnabled'], (result) => {
    animationsEnabled = result.animationsEnabled !== false;
});

// Listen for animation toggle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleAnimations') {
        animationsEnabled = request.enabled;
    }
});

// Function to create and inject CSS animations
const injectStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes highlight-pulse {
            0% { box-shadow: 0 0 5px 2px #ff6b6b; }
            50% { box-shadow: 0 0 20px 10px #ff6b6b; }
            100% { box-shadow: 0 0 5px 2px #ff6b6b; }
        }
        
        @keyframes fade-out-spin {
            0% { 
                opacity: 1;
                transform: scale(1) rotate(0deg);
            }
            100% { 
                opacity: 0;
                transform: scale(0.8) rotate(-10deg) translateY(-20px);
            }
        }

        .emi-highlight {
            animation: highlight-pulse 1s ease-in-out;
            background-color: #ffe5e5 !important;
            border-radius: 4px;
        }

        .emi-remove {
            animation: fade-out-spin 0.5s ease-out forwards;
            transform-origin: center;
        }
    `;
    document.head.appendChild(style);
};

// Inject our CSS animations
injectStyles();

// Function to instantly remove EMI section
const removeInstantly = (emiDiv) => {
    if (emiDiv && !emiDiv.classList.contains('emi-processed')) {
        emiDiv.classList.add('emi-processed');
        emiDiv.remove();
        console.log('%cAmazonBarePrice: EMI section removed ✅', 'color: #6bcb77; font-weight: bold; font-size: 12px');
    }
};

// Function to remove EMI section with animation
const removeWithAnimation = (emiDiv) => {
    if (emiDiv && !emiDiv.classList.contains('emi-processed')) {
        emiDiv.classList.add('emi-processed');
        
        console.log('%cAmazonBarePrice: EMI section found! 🎯', 'color: #ff6b6b; font-weight: bold; font-size: 12px');

        emiDiv.classList.add('emi-highlight');
        
        setTimeout(() => {
            console.log('%cAmazonBarePrice: Removing EMI section... ⌛', 'color: #ffd93d; font-weight: bold; font-size: 12px');
            
            emiDiv.classList.add('emi-remove');
            
            setTimeout(() => {
                emiDiv.remove();
                console.log('%cAmazonBarePrice: EMI section removed successfully! ✅', 'color: #6bcb77; font-weight: bold; font-size: 12px');
            }, 500);
        }, 1000);
    }
};

// Main removal function that checks animation preference
const removeEMISection = () => {
    const emiDiv = document.getElementById('inemi_feature_div');
    if (animationsEnabled) {
        removeWithAnimation(emiDiv);
    } else {
        removeInstantly(emiDiv);
    }
};

// Keep track of the last URL we processed
let lastProcessedURL = window.location.href;

// Function to handle page content updates
const checkForEMISection = () => {
    console.log('%cAmazonBarePrice: Checking for EMI section...', 'color: #4287f5; font-weight: bold; font-size: 12px');
    removeEMISection();
};

// Function to check if URL has meaningfully changed (ASIN change)
const hasURLChanged = () => {
    const currentURL = window.location.href;
    const changed = currentURL !== lastProcessedURL;
    if (changed) {
        console.log('%cAmazonBarePrice: URL changed from ' + lastProcessedURL + ' to ' + currentURL, 'color: #4287f5; font-weight: bold; font-size: 12px');
        lastProcessedURL = currentURL;
        return true;
    }
    return false;
};

// Function to repeatedly check for EMI section after URL change
const checkRepeatedly = () => {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
        checkForEMISection();
        attempts++;
        if (attempts >= maxAttempts) {
            clearInterval(interval);
        }
    }, 500); // Check every 500ms for 5 seconds total
};

// Monitor URL changes
const urlChangeCallback = () => {
    if (hasURLChanged()) {
        checkRepeatedly();
    }
};

// Set up URL change monitoring
window.history.pushState = new Proxy(window.history.pushState, {
    apply: (target, thisArg, argArray) => {
        const result = target.apply(thisArg, argArray);
        urlChangeCallback();
        return result;
    }
});

window.history.replaceState = new Proxy(window.history.replaceState, {
    apply: (target, thisArg, argArray) => {
        const result = target.apply(thisArg, argArray);
        urlChangeCallback();
        return result;
    }
});

window.addEventListener('popstate', urlChangeCallback);

// Also check periodically for any changes we might have missed
setInterval(urlChangeCallback, 1000);

// Set up MutationObserver to handle dynamic content changes
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            const addedEMIDiv = Array.from(mutation.addedNodes).find(
                node => node.id === 'inemi_feature_div'
            );
            if (addedEMIDiv) {
                removeEMISection();
                return;
            }
        }
    }
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
});

// Initial check
setTimeout(checkForEMISection, 100);
