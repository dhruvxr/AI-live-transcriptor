// Background service worker for the extension
let currentSessionId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "saveSession":
      saveSessionToStorage(message.data);
      sendResponse({ success: true });
      break;

    case "getSessionData":
      getSessionData(sendResponse);
      return true; // Keep message channel open for async response

    case "syncWithMainApp":
      syncWithMainApp(message.data);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: "Unknown action" });
  }
});

function saveSessionToStorage(sessionData) {
  // Save to Chrome extension storage
  chrome.storage.local.get(["sessions"], (result) => {
    const sessions = result.sessions || [];
    sessions.unshift(sessionData);

    // Keep only last 50 sessions to prevent storage bloat
    if (sessions.length > 50) {
      sessions.splice(50);
    }

    chrome.storage.local.set({
      sessions: sessions,
      lastSessionId: sessionData.id,
    });

    // Try to sync with main app if possible
    syncWithMainApp(sessionData);
  });
}

function getSessionData(sendResponse) {
  chrome.storage.local.get(["sessions"], (result) => {
    sendResponse({
      success: true,
      sessions: result.sessions || [],
    });
  });
}

function syncWithMainApp(sessionData) {
  // Attempt to sync with the main app running on localhost
  fetch("http://localhost:5173/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionData),
  })
    .then((response) => {
      if (response.ok) {
        console.log("Session synced with main app");
      }
    })
    .catch((error) => {
      // Main app not available, data is still saved locally
      console.log("Main app not available, session saved locally only");
    });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default settings
    chrome.storage.local.set({
      settings: {
        autoStart: false,
        questionDetection: true,
        aiResponses: true,
        saveLocally: true,
        syncWithMainApp: true,
      },
    });

    // Open welcome page
    chrome.tabs.create({
      url: "http://localhost:5173/?source=extension",
    });
  }
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // Inject our content script into the page if needed
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      })
      .catch(() => {
        // Silently fail if we can't inject (e.g., on chrome:// pages)
      });
  }
});

// Periodic cleanup of old sessions
chrome.alarms.create("cleanupSessions", {
  delayInMinutes: 60,
  periodInMinutes: 1440,
}); // Daily

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanupSessions") {
    chrome.storage.local.get(["sessions"], (result) => {
      const sessions = result.sessions || [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSessions = sessions.filter((session) => {
        const sessionDate = new Date(session.date);
        return sessionDate > thirtyDaysAgo;
      });

      chrome.storage.local.set({ sessions: recentSessions });
    });
  }
});
