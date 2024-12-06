let sessionState = {
  step: 0, // 0: No session, 1: First screenshot taken
  firstScreenshot: null, // Data URL of the first screenshot
  firstFilename: "", // Filename for the first screenshot
  tabUrl: "", // URL of the active tab
  tabId: null, // ID of the tab where session started
  countdown: 0, // Remaining time for second screenshot
  countdownIntervalId: null, // Interval ID for the countdown
};

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
          sendResponse({ screenshotUrl: dataUrl });
      });

      return true; // Indicates response will be sent asynchronously
  }

  if (message.action === "start_session") {
      sessionState.step = 1;
      sessionState.firstScreenshot = message.firstScreenshot;
      sessionState.firstFilename = message.firstFilename;
      sessionState.tabUrl = message.tabUrl;
      sessionState.tabId = message.tabId; // Store the tab ID here
      sessionState.countdown = message.countdown;

      console.log("Session started. First screenshot saved. Starting countdown...");

      // Start the countdown
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
  // If we're in step 1 (waiting for second screenshot) and countdown > 0
  // and the user changes the tab, reset the session
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
