// contentScript.js

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'get_user_session') {
    try {
      // Access the session from localStorage (adjust 'user_session' if needed)
      const session = JSON.parse(localStorage.getItem('user_session'));
      if (session && session.token) {
        sendResponse({ isLoggedIn: true, userSession: session });
      } else {
        sendResponse({ isLoggedIn: false });
      }
    } catch (error) {
      console.error('Error accessing user session:', error);
      sendResponse({ isLoggedIn: false });
    }
    return true; // Indicates response is sent asynchronously
  }
});
