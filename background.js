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

function grabKickData() {
  const video = document.querySelector('video');
  let rawSeconds = video ? Math.floor(video.currentTime) : 0;

  // Format the time
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

  // Grab the specific title elements
  let channelName = "";
  let streamTitle = "";
  
  // Find the username by its ID
  const usernameEl = document.getElementById('channel-username');
  if (usernameEl) {
    channelName = usernameEl.innerText.trim();
  }

  // Find the stream title by its data-testid attribute
  const titleEl = document.querySelector('[data-testid="livestream-title"]');
  if (titleEl) {
    streamTitle = titleEl.innerText.trim();
  }

  // Construct the final title format "Username - Title"
  let finalTitle = "";
  if (channelName && streamTitle) {
    finalTitle = `${channelName} - ${streamTitle}`;
  } else if (channelName || streamTitle) {
    // If only one of them exists for some reason
    finalTitle = channelName || streamTitle; 
  } else {
    // A safe fallback just in case Kick updates their website layout in the future
    finalTitle = document.title.replace(' | Kick', ''); 
  }

  return {
    url: window.location.href,
    title: finalTitle,
    time: formattedTime,
    timestampCreated: new Date().toLocaleString()
  };
}

// Save directly to storage from the background (Hotkey Version)
function saveTimestampBackground(data) {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const list = result.savedData;
    
    // Check if we already have a saved timestamp for this exact URL
    const existingIndex = list.findIndex(item => item.url === data.url);

    if (existingIndex !== -1) {
      // If the link already exists, update that specific entry
      list[existingIndex] = data;
    } else {
      // If it's a new link, push it to the end of the list
      list.push(data);
    }

    // Save the updated list back to storage
    chrome.storage.local.set({ savedData: list });
  });
}