// Initialize session state
let sessionState = {
  step: 0, // 0: No session, 1: First screenshot taken, waiting for second screenshot
  firstScreenshot: null, // Data URL of the first screenshot
  firstFilename: "", // Filename for the first screenshot
  tabUrl: "", // URL of the active tab
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
      console.log("Session started. First screenshot saved:", sessionState);
      sendResponse({ success: true });
  }

  if (message.action === "get_session_state") {
      console.log("Returning session state:", sessionState);
      sendResponse(sessionState);
  }

  if (message.action === "end_session") {
      sessionState = {
          step: 0,
          firstScreenshot: null,
          firstFilename: "",
          tabUrl: "",
      };
      console.log("Session ended and reset.");
      sendResponse({ success: true });
  }
});
