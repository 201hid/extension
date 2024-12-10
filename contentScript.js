chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === 'getUserSession') {
      const sessionStr = localStorage.getItem('session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        sendResponse({ user: session });
      } else {
        sendResponse({ user: null });
      }
      return true;
    }
  });
  