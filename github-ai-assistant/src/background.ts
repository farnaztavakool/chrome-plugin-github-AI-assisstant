// background.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log("GitHub AI Assistant installed.");
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.startsWith("https://github.com/")) {
    try {
      // Try to send a message to the existing content script
      await chrome.tabs.sendMessage(tab.id!, { action: "TOGGLE_SIDEBAR" });
    } catch (err) {
      console.log("Content script not ready. Injecting now...", err);
      // If message fails, inject the script programmatically
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ["contentScript.js"]
        });
      } catch (injectionErr) {
        console.error("Failed to inject script:", injectionErr);
      }
    }
  }
});

