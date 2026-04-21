// Shared utility functions for Kick Timestamp Saver

function formatTime(rawSeconds) {
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
  return formattedTime;
}

function getCleanUrl() {
  return window.location.origin + window.location.pathname;
}

function grabKickData() {
  const video = document.querySelector('video');
  let rawSeconds = video ? Math.floor(video.currentTime) : 0;
  let formattedTime = formatTime(rawSeconds);

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

  const cleanUrl = getCleanUrl();

  return {
    url: cleanUrl,
    title: finalTitle,
    time: formattedTime,
    rawSeconds: rawSeconds,
    timestampCreated: new Date().toISOString()
  };
}

function saveTimestampToStorage(data, callback) {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const list = result.savedData;
    const existingIndex = list.findIndex(item => item.url === data.url);

    if (existingIndex !== -1) {
      list[existingIndex] = data;
    } else {
      list.push(data);
    }

    chrome.storage.local.set({ savedData: list }, () => {
      if (callback) callback();
    });
  });
}
