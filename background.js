chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background.js:", message);

  if (message.action === "capture_screenshot") {
      console.log("Attempting to capture screenshot...");
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
          if (chrome.runtime.lastError || !dataUrl) {
              console.error("Failed to capture screenshot:", chrome.runtime.lastError);
              sendResponse({ error: "Failed to capture screenshot." });
              return;
          }
          console.log("Screenshot captured successfully. Data URL length:", dataUrl.length);
          sendResponse({ screenshotUrl: dataUrl });
      });
      return true; // Indicates response will be sent asynchronously
  }
});
