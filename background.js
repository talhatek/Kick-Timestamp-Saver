// Listen for the keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-timestamp") {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url.includes("kick.com")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: grabKickData,
      }, (injectionResults) => {
        if (injectionResults && injectionResults[0]) {
          saveTimestampBackground(injectionResults[0].result);
        }
      });
    }
  }
});

// The same function to grab data from the page
function grabKickData() {
  const video = document.querySelector('video');
  let rawSeconds = video ? Math.floor(video.currentTime) : 0;

  const hours = Math.floor(rawSeconds / 3600);
  const minutes = Math.floor((rawSeconds % 3600) / 60);
  const seconds = rawSeconds % 60;
  
  let formattedTime = "";
  if (hours > 0) {
    formattedTime += `${hours}:${minutes.toString().padStart(2, '0')}:`;
  } else {
    formattedTime += `${minutes}:`;
  }
  formattedTime += seconds.toString().padStart(2, '0');

  return {
    url: window.location.href,
    title: document.title.replace(' | Kick', ''),
    time: formattedTime,
    timestampCreated: new Date().toLocaleString()
  };
}

// Save directly to storage from the background
function saveTimestampBackground(data) {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const list = result.savedData;
    list.push(data);
    chrome.storage.local.set({ savedData: list });
  });
}