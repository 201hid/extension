document.getElementById("capture").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "capture_screenshot" }, (response) => {
      if (response && response.screenshotUrl) {
        const link = document.createElement("a");
        link.href = response.screenshotUrl;
        link.download = "screenshot.png";
        link.click();
      }
    });
  });
  