// Track feature states
let animationsEnabled = true;
let speedModeEnabled = false;

// Load preferences
chrome.storage.sync.get(['animationsEnabled', 'speedModeEnabled'], (result) => {
    animationsEnabled = result.animationsEnabled !== false;
    speedModeEnabled = result.speedModeEnabled === true;
});

// Listen for toggle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleAnimations') {
        animationsEnabled = request.enabled;
    } else if (request.action === 'toggleSpeedMode') {
        speedModeEnabled = request.enabled;
    }
});

// Speed mode selector for EMI elements
const EMI_SELECTORS = [
    '.a-size-extra-large.inemi-amount',
    '.a-size-medium.inemi-tenure',
    '#inemi_feature_div'
];

// Function to create and inject CSS animations
const injectStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes soft-fade {
            0% {
                opacity: 1;
                filter: blur(0);
            }
            100% {
                opacity: 0;
                filter: blur(3px);
            }
        }

        .emi-highlight {
            background-color: rgba(255, 229, 229, 0.15) !important;
            border-radius: 2px;
            transition: opacity 0.2s ease;
        }

        .emi-remove {
            animation: soft-fade 0.3s ease-out forwards;
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

// Main removal function that checks modes
const removeEMISection = () => {
    if (speedModeEnabled) {
        // Remove EMI elements immediately using all selectors
        EMI_SELECTORS.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!element.classList.contains('emi-processed')) {
                    element.classList.add('emi-processed');
                    element.remove();
                    console.log(`%cAmazonBarePrice: Removed EMI element (${selector}) ⚡`, 'color: #ff6b6b; font-weight: bold; font-size: 12px');
                }
            });
        });
    } else {
        // Original behavior for main EMI section
        const emiDiv = document.getElementById('inemi_feature_div');
        if (animationsEnabled) {
            removeWithAnimation(emiDiv);
        } else {
            removeInstantly(emiDiv);
        }
    }
};

// Keep track of the last URL we processed
let lastProcessedURL = window.location.href;

// Function to handle page content updates
const checkForEMISection = () => {
    console.log('%cAmazonBarePrice: Checking for EMI sections...', 'color: #4287f5; font-weight: bold; font-size: 12px');
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
    if (speedModeEnabled) {
        // Check all mutations for EMI elements using selectors
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                for (const node of addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself matches any selector
                        if (EMI_SELECTORS.some(selector => node.matches?.(selector))) {
                            removeEMISection();
                            return;
                        }
                        // Check child elements
                        const emiElements = node.querySelectorAll(EMI_SELECTORS.join(','));
                        if (emiElements.length > 0) {
                            removeEMISection();
                            return;
                        }
                    }
                }
            }
        }
    } else {
        // Original behavior
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
    }
});

// Start observing with more complete monitoring in speed mode
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: speedModeEnabled, // Monitor attributes in speed mode
    attributeFilter: speedModeEnabled ? ['class'] : undefined // Watch for class changes in speed mode
});

// Initial check
setTimeout(checkForEMISection, 100);
