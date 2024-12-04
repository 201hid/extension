document.getElementById("capture").addEventListener("click", captureScreenshot);
document.getElementById("retake").addEventListener("click", resetUI);
document.getElementById("share").addEventListener("click", shareScreenshot);

let screenshotUrl = ""; // Store the screenshot URL for sharing

function captureScreenshot() {
    const messageDiv = document.getElementById("message");
    const retakeButton = document.getElementById("retake");
    const shareButton = document.getElementById("share");

    // Reset UI
    messageDiv.style.display = "none";
    retakeButton.style.display = "none";
    shareButton.style.display = "none";

    console.log("Capture button clicked. Sending message to capture screenshot...");

    // Get the current active tab to retrieve its URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("No active tab found.");
            return;
        }

        const tab = tabs[0];
        const url = new URL(tab.url);
        const domain = url.hostname.replace("www.", ""); // Remove "www." if present
        console.log("Capturing screenshot for domain:", domain);

        // Send a message to the background script to capture the screenshot
        chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
            if (response && response.screenshotUrl) {
                console.log("Screenshot captured successfully. URL:", response.screenshotUrl);
                screenshotUrl = response.screenshotUrl;

                // Update UI
                messageDiv.textContent = "Screenshot taken!";
                messageDiv.style.display = "block";
                retakeButton.style.display = "inline-block";
                shareButton.style.display = "inline-block";

                const link = document.createElement("a");
                link.href = response.screenshotUrl;
                link.download = `${domain}-screenshot.png`; // Use the domain in the filename
                link.click();
            } else if (response && response.error) {
                console.error("Error capturing screenshot:", response.error);
            } else {
                console.error("No response received from background script.");
            }
        });
    });
}

function resetUI() {
    console.log("Resetting UI to initial state...");

    // Reset UI elements
    document.getElementById("message").style.display = "none";
    document.getElementById("retake").style.display = "none";
    document.getElementById("share").style.display = "none";

    // Show the capture button again
    document.getElementById("capture").style.display = "inline-block";

    // Clear the stored screenshot URL
    screenshotUrl = "";
}

function shareScreenshot() {
    if (!screenshotUrl) {
        console.error("No screenshot available to share.");
        return;
    }

    // Use the Web Share API if supported
    if (navigator.share) {
        navigator
            .share({
                title: "Screenshot",
                text: "Check out this screenshot!",
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
