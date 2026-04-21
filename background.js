// Listen for the keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-timestamp") {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url.includes("kick.com")) {
      // Inject utils.js first, then grab data
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['utils.js']
      }, () => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => grabKickData(),
        }, (injectionResults) => {
          if (injectionResults && injectionResults[0]) {
            saveTimestampBackground(injectionResults[0].result);
          }
        });
      });
    }
  }
});

// Save directly to storage from the background (Hotkey Version)
function saveTimestampBackground(data) {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const list = result.savedData;
    const existingIndex = list.findIndex(item => item.url === data.url);

    if (existingIndex !== -1) {
      list[existingIndex] = data;
    } else {
      list.push(data);
    }

    chrome.storage.local.set({ savedData: list });
  });
}
