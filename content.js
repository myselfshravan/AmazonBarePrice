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
            0% {
                box-shadow: 0 0 5px 2px rgba(255, 107, 107, 0.6);
                background-color: rgba(255, 229, 229, 0.4);
            }
            50% {
                box-shadow: 0 0 25px 12px rgba(255, 107, 107, 0.8);
                background-color: rgba(255, 229, 229, 0.8);
            }
            100% {
                box-shadow: 0 0 5px 2px rgba(255, 107, 107, 0.6);
                background-color: rgba(255, 229, 229, 0.4);
            }
        }
        
        @keyframes magical-vanish {
            0% {
                opacity: 1;
                transform: perspective(1000px) rotateX(0) rotateY(0) scale(1);
                filter: blur(0);
            }
            50% {
                opacity: 0.8;
                transform: perspective(1000px) rotateX(-15deg) rotateY(15deg) scale(0.9) translateZ(100px);
                filter: blur(2px);
                box-shadow: 0 0 30px 15px rgba(255, 107, 107, 0.4);
            }
            100% {
                opacity: 0;
                transform: perspective(1000px) rotateX(-30deg) rotateY(45deg) scale(0.6) translateZ(-200px);
                filter: blur(10px);
                box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
            }
        }

        .emi-highlight {
            animation: highlight-pulse 1.2s ease-in-out;
            background-color: rgba(255, 229, 229, 0.6) !important;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .emi-remove {
            animation: magical-vanish 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            transform-origin: center;
            transform-style: preserve-3d;
            backface-visibility: hidden;
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
