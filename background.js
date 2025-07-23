// Minimal background script to keep extension alive
chrome.runtime.onInstalled.addListener(() => {
    console.log('AmazonBarePrice: Extension installed successfully');
});
