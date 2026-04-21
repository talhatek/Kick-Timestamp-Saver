let autoSaveInterval = null;

// Start checking the time every 15 seconds (15000 milliseconds)
function startAutoSave() {
  if (autoSaveInterval) return; 
  autoSaveInterval = setInterval(performAutoSave, 15000);
}

// Stop the interval
function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

// Check if Auto-Save is enabled when the page first loads
chrome.storage.local.get(['autoSaveEnabled'], (result) => {
  if (result.autoSaveEnabled) {
    startAutoSave();
  }
});

// Listen for the user flipping the switch in the popup menu
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.autoSaveEnabled) {
    if (changes.autoSaveEnabled.newValue) {
      startAutoSave();
    } else {
      stopAutoSave();
    }
  }
});

// The actual logic to grab and save data
function performAutoSave() {
  const video = document.querySelector('video');
  
  // Don't save if there is no video, or if the video is paused!
  if (!video || video.paused || video.currentTime === 0) return;

  let rawSeconds = Math.floor(video.currentTime);

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

  let channelName = "";
  let streamTitle = "";
  
  const usernameEl = document.getElementById('channel-username');
  if (usernameEl) channelName = usernameEl.innerText.trim();

  const titleEl = document.querySelector('[data-testid="livestream-title"]');
  if (titleEl) streamTitle = titleEl.innerText.trim();

  let finalTitle = "";
  if (channelName && streamTitle) {
    finalTitle = `${channelName} - ${streamTitle}`;
  } else if (channelName || streamTitle) {
    finalTitle = channelName || streamTitle; 
  } else {
    finalTitle = document.title.replace(' | Kick', ''); 
  }

  const data = {
    url: window.location.href,
    title: finalTitle,
    time: formattedTime,
    timestampCreated: new Date().toLocaleString()
  };

  // Save to storage using the duplicate-handling logic
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const list = result.savedData;
    const existingIndex = list.findIndex(item => item.url === data.url);

    if (existingIndex !== -1) {
      list[existingIndex] = data; // Update existing
    } else {
      list.push(data); // Add new
    }
    
    chrome.storage.local.set({ savedData: list });
  });
}