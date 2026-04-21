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

function captureVideoThumbnail(video) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 216;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch (e) {
    // Cross-origin video will throw a SecurityError
    return null;
  }
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
  const thumbnail = video ? captureVideoThumbnail(video) : null;

  return {
    url: cleanUrl,
    title: finalTitle,
    time: formattedTime,
    rawSeconds: rawSeconds,
    thumbnail: thumbnail,
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
