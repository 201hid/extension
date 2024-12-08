let sessionState = {
    step: 0, // 0: No session, 1: First screenshot taken
    firstScreenshot: null, // Data URL of the first screenshot
    firstFilename: "", // Filename for the first screenshot
    tabUrl: "", // URL of the active tab
    tabId: null, // ID of the tab where session started
    countdown: 0, // Remaining time for second screenshot
    countdownIntervalId: null, // Interval ID for the countdown
};

const AWS_BUCKET_URL = "https://varifyy-screenshots.s3.YOUR_REGION.amazonaws.com";  // NEEDS TO BE REPLACED WHEN WE CREATE THE S3 BUCKET

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "capture_screenshot") {
        console.log("Attempting to capture screenshot...");

        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
                console.error("Failed to capture screenshot:", chrome.runtime.lastError);
                sendResponse({ error: "Failed to capture screenshot." });
                return;
            }
            console.log("Screenshot captured successfully.");
            const filename = generateFilename();
            uploadToS3(dataUrl, filename).then((url) => {
                sendResponse({ screenshotUrl: url });
                notifyWebsite(url); // Notify the website about the new screenshot
            }).catch((error) => {
                console.error("Upload to S3 failed:", error);
                sendResponse({ error: "Failed to upload screenshot to S3." });
            });

            return true; // Indicates response will be sent asynchronously
        });

        return true; // Indicates response will be sent asynchronously
    }

    if (message.action === "start_session") {
        sessionState.step = 1;
        sessionState.firstScreenshot = message.firstScreenshot;
        sessionState.firstFilename = message.firstFilename;
        sessionState.tabUrl = message.tabUrl;
        sessionState.tabId = message.tabId;
        sessionState.countdown = message.countdown;

        console.log("Session started. First screenshot saved. Starting countdown...");

        if (sessionState.countdownIntervalId) {
            clearInterval(sessionState.countdownIntervalId);
        }

        sessionState.countdownIntervalId = setInterval(() => {
            sessionState.countdown--;
            console.log(`Countdown: ${sessionState.countdown} seconds remaining.`);

            if (sessionState.countdown <= 0) {
                clearInterval(sessionState.countdownIntervalId);
                sessionState.countdownIntervalId = null;
                resetSession("Countdown finished. Session reset.");
            }
        }, 1000);

        sendResponse({ success: true });
    }

    if (message.action === "get_session_state") {
        sendResponse(sessionState);
    }

    if (message.action === "end_session") {
        endSession();
        sendResponse({ success: true });
    }
});

// Listen for tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
    if (sessionState.step === 1 && sessionState.countdown > 0) {
        if (activeInfo.tabId !== sessionState.tabId) {
            resetSession("User changed tab, resetting session.");
        }
    }
});

function resetSession(reason) {
    console.log(reason);
    if (sessionState.countdownIntervalId) {
        clearInterval(sessionState.countdownIntervalId);
        sessionState.countdownIntervalId = null;
    }

    sessionState = {
        step: 0,
        firstScreenshot: null,
        firstFilename: "",
        tabUrl: "",
        tabId: null,
        countdown: 0,
        countdownIntervalId: null,
    };
}

function endSession() {
    if (sessionState.countdownIntervalId) {
        clearInterval(sessionState.countdownIntervalId);
        sessionState.countdownIntervalId = null;
    }

    sessionState = {
        step: 0,
        firstScreenshot: null,
        firstFilename: "",
        tabUrl: "",
        tabId: null,
        countdown: 0,
        countdownIntervalId: null,
    };
    console.log("Session ended and reset.");
}

function generateFilename() {
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    return `screenshot_${timestamp}.png`;
}

function uploadToS3(dataUrl, filename) {
    const blob = dataURItoBlob(dataUrl);

    return fetch(`${AWS_BUCKET_URL}/${filename}`, {
        method: "PUT",
        headers: {
            "Content-Type": "image/png",
            "x-amz-acl": "public-read",
        },
        body: blob,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to upload to S3: ${response.statusText}`);
            }
            return `${AWS_BUCKET_URL}/${filename}`;
        });
}

function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const buffer = new ArrayBuffer(byteString.length);
    const dataView = new Uint8Array(buffer);

    for (let i = 0; i < byteString.length; i++) {
        dataView[i] = byteString.charCodeAt(i);
    }

    return new Blob([buffer], { type: mimeString });
}

function notifyWebsite(screenshotUrl) {
    // Send a message to your website to add the new screenshot
    fetch("https://your-website-url/api/screenshots", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: screenshotUrl }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to notify website.");
            }
            console.log("Website notified successfully.");
        })
        .catch((error) => {
            console.error("Error notifying website:", error);
        });
}
