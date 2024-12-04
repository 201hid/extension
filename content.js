let isTampered = false; // Tracks if the DOM has been tampered with

// Observe DOM changes
const observer = new MutationObserver((mutations) => {
    if (mutations.length > 0) {
        console.log("MutationObserver: DOM mutations detected. Details:", mutations);
        isTampered = true;
    } else {
        console.log("MutationObserver: No mutations detected.");
    }
});

// Start observing the document's body for changes
try {
    observer.observe(document.body, {
        childList: true, // Monitor additions/removals of elements
        subtree: true,   // Monitor changes in child elements
        attributes: true // Monitor attribute changes
    });
    console.log("MutationObserver: Now observing DOM changes.");
} catch (error) {
    console.error("MutationObserver failed to start. Error:", error);
}

// Respond to messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in content.js:", message);
    if (message.action === "check_tampered") {
        if (isTampered) {
            console.log("Content has been tampered with. Returning tampered: true.");
        } else {
            console.log("No tampering detected. Returning tampered: false.");
        }
        sendResponse({ tampered: isTampered });
    }
});
