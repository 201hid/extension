// Authentication-related elements
const statusDiv = document.getElementById('status');
const userInfoDiv = document.getElementById('user-info');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');

// Screenshot-related elements
const captureButton = document.getElementById("capture");
const captureSecondButton = document.getElementById("captureSecond");
const restartButton = document.getElementById("restart");
const messageDiv = document.getElementById("message");

let countdownInterval;

// Flag to track user login state
let userLoggedIn = false;

// Authentication Functions
function getUserSession() {
  chrome.tabs.query({ url: "http://localhost:3003/*" }, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, 'getUserSession', (response) => {
        if (response && response.user) {
          // User is logged in
          userLoggedIn = true;
          statusDiv.textContent = `User: ${response.user.email || response.user['cognito:username']} - Logged In`;
          userInfoDiv.textContent = `Welcome, ${response.user.email || response.user['cognito:username']}!`;
          logoutButton.style.display = 'inline-block';
          loginButton.style.display = 'none';

          // Show screenshot controls now that user is logged in
          showScreenshotControls();
        } else {
          // User not logged in
          userLoggedIn = false;
          statusDiv.textContent = "User not logged in.";
          userInfoDiv.textContent = '';
          loginButton.style.display = 'inline-block';
          logoutButton.style.display = 'none';

          // Hide screenshot controls if not logged in
          hideScreenshotControls();
        }
      });
    } else {
      // No localhost:3003 tab open, create one
      chrome.tabs.create({ url: "http://localhost:3003" }, () => {
        statusDiv.textContent = "Please try again after page loads.";
      });
    }
  });
}

function redirectToLogin() {
  // Redirect to localhost:3003 for login
  chrome.tabs.create({ url: "http://localhost:3003" });
}

function logout() {
  // Implement logout logic if necessary
  // For now, just alert and rely on no session in localhost:3003
  alert("Logged out");
}

// Event listeners for auth buttons
loginButton.addEventListener('click', redirectToLogin);
logoutButton.addEventListener('click', logout);

// On popup load, check user session
document.addEventListener('DOMContentLoaded', getUserSession);

// Screenshot Logic (Only works if userLoggedIn = true)
captureButton.addEventListener("click", captureFirstScreenshot);
captureSecondButton.addEventListener("click", captureSecondScreenshot);
restartButton.addEventListener("click", restartSession);

function showScreenshotControls() {
  // After confirming user is logged in, check session state and update UI
  updateUI();
}

function hideScreenshotControls() {
  captureButton.style.display = "none";
  captureSecondButton.style.display = "none";
  restartButton.style.display = "none";
  messageDiv.textContent = "";
}

// From previous logic: capture first screenshot, start session
function captureFirstScreenshot() {
  if (!userLoggedIn) {
    messageDiv.textContent = "You must be logged in to capture screenshots.";
    return;
  }

  console.log("Capturing first screenshot...");
  captureButton.style.display = "none";
  messageDiv.textContent = "Capturing first screenshot...";

  chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
    if (response && response.screenshotUrl) {
      console.log("First screenshot captured successfully:", response.screenshotUrl);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          console.error("No active tab found.");
          return;
        }

        const tab = tabs[0];
        const filename = sanitizeFilename(tab.url) + "-before.png";

        // Start session with first screenshot
        chrome.runtime.sendMessage(
          {
            action: "start_session",
            firstScreenshot: response.screenshotUrl,
            firstFilename: filename,
            tabUrl: tab.url,
            tabId: tab.id, // Include tabId for tab-change detection
            countdown: 10
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
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      console.error("No active tab found.");
      return;
    }

    const tab = tabs[0];
    messageDiv.textContent = "Refreshing page...";

    chrome.tabs.reload(tab.id, { bypassCache: true }, () => {
      console.log("Page refreshed. Starting countdown for second screenshot.");
      updateUI();
    });
  });
}

function captureSecondScreenshot() {
  if (!userLoggedIn) {
    messageDiv.textContent = "You must be logged in to capture screenshots.";
    return;
  }

  console.log("Capturing second screenshot...");
  chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
    if (response && response.screenshotUrl) {
      console.log("Second screenshot captured successfully:", response.screenshotUrl);
      chrome.runtime.sendMessage({ action: "get_session_state" }, (sessionState) => {
        if (sessionState.step === 1) {
          const firstScreenshot = sessionState.firstScreenshot;
          const firstFilename = sessionState.firstFilename;
          const secondScreenshot = response.screenshotUrl;
          const secondFilename = sanitizeFilename(sessionState.tabUrl) + "-after.png";

          // Download both screenshots
          downloadScreenshot(firstScreenshot, firstFilename);
          downloadScreenshot(secondScreenshot, secondFilename);

          // End session
          chrome.runtime.sendMessage({ action: "end_session" }, () => {
            console.log("Session ended after second screenshot.");
            messageDiv.textContent = "Both screenshots downloaded.";
            captureSecondButton.style.display = "none";
            restartButton.style.display = "none";
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

function downloadScreenshot(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function restartSession() {
  console.log("Restarting session...");
  resetUI();
  chrome.runtime.sendMessage({ action: "end_session" }, () => {
    console.log("Session restarted.");
  });
}

// Reset UI to initial state
function resetUI() {
  messageDiv.textContent = "";
  clearInterval(countdownInterval);
  if (userLoggedIn) {
    captureButton.style.display = "inline-block";
  } else {
    captureButton.style.display = "none";
  }
  captureSecondButton.style.display = "none";
  restartButton.style.display = "none";
}

// Sanitize filename
function sanitizeFilename(url) {
  return url
    .replace(/(^\w+:|^)\/\//, '')
    .replace(/[^\w\-\.]/g, '_')
    .replace(/_+/g, '_')
    .replace(/_$/g, '');
}

// Update UI based on session state
function updateUI() {
  chrome.runtime.sendMessage({ action: "get_session_state" }, (sessionState) => {
    if (!userLoggedIn) {
      hideScreenshotControls();
      return;
    }

    if (sessionState.step === 1 && sessionState.countdown > 0) {
      console.log("Resuming session. Countdown for second screenshot is active.");
      captureButton.style.display = "none";
      captureSecondButton.style.display = "inline-block";
      restartButton.style.display = "inline-block";
      messageDiv.textContent = `Please capture the second screenshot within ${sessionState.countdown} seconds.`;
      clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        chrome.runtime.sendMessage({ action: "get_session_state" }, (updatedSession) => {
          if (updatedSession.countdown > 0 && updatedSession.step === 1) {
            messageDiv.textContent = `Please capture the second screenshot within ${updatedSession.countdown} seconds.`;
          } else {
            clearInterval(countdownInterval);
            // If countdown or step changed, reset to initial state
            messageDiv.textContent = "Time's up or session reset. Please start again.";
            captureSecondButton.style.display = "none";
            restartButton.style.display = "none";
            if (userLoggedIn) {
              captureButton.style.display = "inline-block";
            }
          }
        });
      }, 1000);
    } else {
      // No active session, show initial state if user is logged in
      resetUI();
    }
  });
}
