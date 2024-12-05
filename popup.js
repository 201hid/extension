document.getElementById("capture").addEventListener("click", captureScreenshots);
document.getElementById("finalize").addEventListener("click", finalizeScreenshot);
document.getElementById("retake").addEventListener("click", resetUI);
document.getElementById("share").addEventListener("click", shareScreenshots);

let screenshotUrls = []; // Store the screenshot URLs and filenames
let countdownInterval; // Reference to the countdown interval
let finalizeTimeout; // Reference to the finalize timeout function

function captureScreenshots() {
    const messageDiv = document.getElementById("message");
    const captureButton = document.getElementById("capture");
    const finalizeButton = document.getElementById("finalize");
    const retakeButton = document.getElementById("retake");
    const shareButton = document.getElementById("share");

    // Reset UI
    messageDiv.style.display = "none";
    finalizeButton.style.display = "none";
    retakeButton.style.display = "none";
    shareButton.style.display = "none";
    captureButton.style.display = "none"; // Hide capture button during process

    console.log("Capture button clicked. Taking first screenshot...");

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("No active tab found.");
            return;
        }

        const tab = tabs[0];
        const fullUrl = tab.url;
        console.log("Capturing first screenshot for URL:", fullUrl);

        // Capture the first screenshot
        chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
            if (response && response.screenshotUrl) {
                console.log("First screenshot captured successfully.");
                // Save the screenshot URL
                screenshotUrls.push({ url: response.screenshotUrl, filename: sanitizeFilename(fullUrl) + '-before.png' });

                // Now perform a hard refresh
                messageDiv.textContent = "Reloading page...";
                messageDiv.style.display = "block";

                console.log("Reloading tab for hard refresh...");

                // Perform a hard refresh
                chrome.tabs.reload(tab.id, { bypassCache: true }, () => {
                    console.log("Tab reloaded. Prompting user to finalize content...");

                    // Start the 10-second countdown
                    let countdown = 10;
                    finalizeButton.style.display = "inline-block";
                    messageDiv.textContent = `You have ${countdown} seconds to finalize the content.`;

                    countdownInterval = setInterval(() => {
                        countdown--;
                        messageDiv.textContent = `You have ${countdown} seconds to finalize the content.`;

                        if (countdown <= 0) {
                            clearInterval(countdownInterval);
                            finalizeButton.style.display = "none";
                            messageDiv.textContent = "Time's up! You can no longer take the final screenshot.";
                            console.log("Finalize time expired.");
                        }
                    }, 1000); // Update every second

                    // Set a timeout to clear the finalize option after 10 seconds
                    finalizeTimeout = setTimeout(() => {
                        clearInterval(countdownInterval);
                        finalizeButton.style.display = "none";
                        messageDiv.textContent = "Time's up! You can no longer take the final screenshot.";
                        console.log("Finalize option disabled.");
                    }, 10000); // 10 seconds
                });
            } else if (response && response.error) {
                console.error("Error capturing first screenshot:", response.error);
            } else {
                console.error("No response received from background script for first screenshot.");
            }
        });
    });
}

function finalizeScreenshot() {
    const messageDiv = document.getElementById("message");
    const finalizeButton = document.getElementById("finalize");
    const retakeButton = document.getElementById("retake");
    const shareButton = document.getElementById("share");

    // Clear the countdown and timeout
    clearInterval(countdownInterval);
    clearTimeout(finalizeTimeout);

    console.log("Finalizing screenshot...");

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("No active tab found.");
            return;
        }

        const tab = tabs[0];
        const fullUrl = tab.url;

        // Capture the second screenshot
        chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
            if (response && response.screenshotUrl) {
                console.log("Second screenshot captured successfully.");
                // Save the screenshot URL
                screenshotUrls.push({ url: response.screenshotUrl, filename: sanitizeFilename(fullUrl) + '-after.png' });

                // Download both screenshots
                for (const screenshot of screenshotUrls) {
                    const link = document.createElement("a");
                    link.href = screenshot.url;
                    link.download = screenshot.filename;
                    link.click();
                }

                // Update UI
                messageDiv.textContent = "Screenshots taken!";
                finalizeButton.style.display = "none";
                retakeButton.style.display = "inline-block";
                shareButton.style.display = "inline-block";
            } else if (response && response.error) {
                console.error("Error capturing second screenshot:", response.error);
            } else {
                console.error("No response received from background script for second screenshot.");
            }
        });
    });
}

function resetUI() {
    console.log("Resetting UI to initial state...");

    // Reset UI elements
    document.getElementById("message").style.display = "none";
    document.getElementById("finalize").style.display = "none";
    document.getElementById("retake").style.display = "none";
    document.getElementById("share").style.display = "none";
    document.getElementById("capture").style.display = "inline-block";

    // Clear the stored screenshot URLs
    screenshotUrls = [];
    clearInterval(countdownInterval); // Ensure countdown interval is cleared
    clearTimeout(finalizeTimeout); // Ensure finalize timeout is cleared
}

function shareScreenshots() {
    if (screenshotUrls.length === 0) {
        console.error("No screenshots available to share.");
        return;
    }

    // For simplicity, share the first screenshot URL
    const screenshotUrl = screenshotUrls[0].url;

    // Use the Web Share API if supported
    if (navigator.share) {
        navigator
            .share({
                title: "Screenshots",
                text: "Check out these screenshots!",
                url: screenshotUrl,
            })
            .then(() => console.log("Screenshot shared successfully."))
            .catch((error) => console.error("Error sharing screenshot:", error));
    } else {
        // Fallback: Copy the screenshot URL to clipboard
        navigator.clipboard
            .writeText(screenshotUrl)
            .then(() => {
                alert("Screenshot URL copied to clipboard!");
                console.log("Screenshot URL copied to clipboard:", screenshotUrl);
            })
            .catch((error) => console.error("Error copying URL to clipboard:", error));
    }
}

// Helper function to sanitize filenames
function sanitizeFilename(url) {
    // Remove protocol and replace non-alphanumeric characters with underscores
    return url.replace(/(^\w+:|^)\/\//, '').replace(/[^\w\-\.]/g, '_');
}
