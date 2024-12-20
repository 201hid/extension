document.getElementById("capture").addEventListener("click", captureFirstScreenshot);
document.getElementById("captureSecond").addEventListener("click", captureSecondScreenshot);
document.getElementById("restart").addEventListener("click", restartSession);

let countdownInterval;

function captureFirstScreenshot() {
  const messageDiv = document.getElementById("message");
  const captureButton = document.getElementById("capture");

  console.log("Capturing first screenshot...");

  // Hide capture button and show status message
  captureButton.style.display = "none";
  messageDiv.textContent = "Capturing first screenshot...";

  // Capture the screenshot
  chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
      if (response && response.screenshotUrl) {
          console.log("First screenshot captured successfully:", response.screenshotUrl);

          // Fetch the current tab URL and tabId
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs.length === 0) {
                  console.error("No active tab found.");
                  return;
              }

              const tab = tabs[0];
              const filename = sanitizeFilename(tab.url) + "-before.png";

              // Start session with first screenshot and store tabId
              chrome.runtime.sendMessage(
                  {
                      action: "start_session",
                      firstScreenshot: response.screenshotUrl,
                      firstFilename: filename,
                      tabUrl: tab.url,
                      tabId: tab.id, // include the tabId
                      countdown: 100, // 10 seconds countdown
                  },
                  (sessionResponse) => {
                      if (sessionResponse && sessionResponse.success) {
                          console.log("Session started with first screenshot.");
                          hardRefreshTab();
                      } else {
                          console.error("Failed to start session:", sessionResponse);
                          messageDiv.textContent = "Failed to start session.";
                      }
                  }
              );
          });
      } else {
          console.error("Error capturing first screenshot:", response ? response.error : "Unknown error");
          messageDiv.textContent = "Failed to capture the first screenshot.";
      }
  });
}


function hardRefreshTab() {
    const messageDiv = document.getElementById("message");

    // Reload the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("No active tab found.");
            return;
        }

        const tab = tabs[0];
        messageDiv.textContent = "Refreshing page...";

        chrome.tabs.reload(tab.id, { bypassCache: true }, () => {
            console.log("Page refreshed. Starting countdown for second screenshot.");
            // The background script is handling the countdown.
            // Update the popup UI accordingly.
            updateUI();
        });
    });
}

function captureSecondScreenshot() {
    const messageDiv = document.getElementById("message");

    console.log("Capturing second screenshot...");

    // Capture the second screenshot
    chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
        if (response && response.screenshotUrl) {
            console.log("Second screenshot captured successfully:", response.screenshotUrl);

            // Get session state to retrieve the first screenshot
            chrome.runtime.sendMessage({ action: "get_session_state" }, (sessionState) => {
                if (sessionState.step === 1) {
                    const firstScreenshot = sessionState.firstScreenshot;
                    const firstFilename = sessionState.firstFilename;
                    const secondScreenshot = response.screenshotUrl;
                    const secondFilename = sanitizeFilename(sessionState.tabUrl) + "-after.png";

                    // Download the first screenshot
                    const firstLink = document.createElement("a");
                    firstLink.href = firstScreenshot;
                    firstLink.download = firstFilename;
                    firstLink.click();

                    // Download the second screenshot
                    const secondLink = document.createElement("a");
                    secondLink.href = secondScreenshot;
                    secondLink.download = secondFilename;
                    secondLink.click();

                    // End the session
                    chrome.runtime.sendMessage({ action: "end_session" }, () => {
                        console.log("Session ended after second screenshot.");
                        messageDiv.textContent = "Both screenshots downloaded.";
                        document.getElementById("captureSecond").style.display = "none";
                        document.getElementById("restart").style.display = "none";
                        clearInterval(countdownInterval);
                    });
                } else {
                    console.error("Session state not valid for second screenshot.");
                    messageDiv.textContent = "Session state error. Please restart.";
                }
            });
        } else {
            console.error("Error capturing second screenshot:", response ? response.error : "Unknown error");
            messageDiv.textContent = "Failed to capture second screenshot.";
        }
    });
}

function restartSession() {
    console.log("Restarting session...");

    // Reset UI
    resetUI();

    // End session in background
    chrome.runtime.sendMessage({ action: "end_session" }, () => {
        console.log("Session restarted.");
    });
}

function resetUI() {
    const messageDiv = document.getElementById("message");
    document.getElementById("capture").style.display = "inline-block";
    document.getElementById("captureSecond").style.display = "none";
    document.getElementById("restart").style.display = "none";
    messageDiv.textContent = "";
    clearInterval(countdownInterval);
}

// Sanitize filename
function sanitizeFilename(url) {
    return url
        .replace(/(^\w+:|^)\/\//, '') // Remove protocol (http, https, etc.)
        .replace(/[^\w\-\.]/g, '_') // Replace all non-alphanumeric, non-dash, and non-dot characters with underscores
        .replace(/_+/g, '_') // Replace multiple underscores with a single underscore
        .replace(/_$/g, ''); // Remove trailing underscores
}

// Update UI based on session state
function updateUI() {
    chrome.runtime.sendMessage({ action: "get_session_state" }, (sessionState) => {
        const messageDiv = document.getElementById("message");
        if (sessionState.step === 1 && sessionState.countdown > 0) {
            console.log("Resuming session. Countdown for second screenshot is active.");
            document.getElementById("capture").style.display = "none";
            document.getElementById("captureSecond").style.display = "inline-block";
            document.getElementById("restart").style.display = "inline-block";

            // Start the countdown display
            messageDiv.textContent = `Please capture the second screenshot within ${sessionState.countdown} seconds.`;
            clearInterval(countdownInterval);
            countdownInterval = setInterval(() => {
                chrome.runtime.sendMessage({ action: "get_session_state" }, (updatedSession) => {
                    if (updatedSession.countdown > 0) {
                        messageDiv.textContent = `Please capture the second screenshot within ${updatedSession.countdown} seconds.`;
                    } else {
                        clearInterval(countdownInterval);
                        messageDiv.textContent = "Time's up! Session reset.";
                        document.getElementById("captureSecond").style.display = "none";
                        document.getElementById("restart").style.display = "none";
                        document.getElementById("capture").style.display = "inline-block";
                    }
                });
            }, 1000);
        } else {
            resetUI();
        }
    });
}

// On popup load, update the UI
updateUI();