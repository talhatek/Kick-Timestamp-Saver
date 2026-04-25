// --- CONTEXT VALIDITY CHECK ---
function isContextValid() {
  try {
    return !!chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// --- AUTO-SEEK LOGIC ---
function checkAndSeek() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetTime = urlParams.get('t');

  if (targetTime) {
    let attempts = 0;
    const seekInterval = setInterval(() => {
      const video = document.querySelector('video');
      if (video && video.readyState >= 1) {
        video.currentTime = parseFloat(targetTime);
        clearInterval(seekInterval);
      }
      attempts++;
      if (attempts > 40) clearInterval(seekInterval);
    }, 500);
  }
}

checkAndSeek();

// --- AUTO-SAVE LOGIC ---
let autoSaveTimer = null;

function startAutoSave(intervalMs) {
  stopAutoSave();
  const ms = intervalMs || 15000;
  autoSaveTimer = setInterval(performAutoSave, ms);
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// Track current interval so we can use it when restarting
let currentIntervalMs = 15000;

// Initialize auto-save from storage
chrome.storage.local.get(['autoSaveEnabled', 'autoSaveIntervalMs'], (result) => {
  currentIntervalMs = result.autoSaveIntervalMs || 15000;
  if (result.autoSaveEnabled) {
    startAutoSave(currentIntervalMs);
  }
});

// React to storage changes (toggle or interval change)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;

  if (changes.autoSaveIntervalMs) {
    currentIntervalMs = changes.autoSaveIntervalMs.newValue || 15000;
  }

  if (changes.autoSaveEnabled || changes.autoSaveIntervalMs) {
    const enabled = changes.autoSaveEnabled
      ? changes.autoSaveEnabled.newValue
      : null;

    // If toggle changed, use the new value; otherwise check current state
    if (enabled === false) {
      stopAutoSave();
    } else if (enabled === true) {
      startAutoSave(currentIntervalMs);
    } else {
      // Only interval changed — restart if currently running
      if (autoSaveTimer) {
        startAutoSave(currentIntervalMs);
      }
    }
  }
});

// --- TOAST NOTIFICATION ---
function showToast(message) {
  // Remove existing toast if any
  const existing = document.getElementById('kick-ts-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'kick-ts-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(83, 252, 24, 0.9);
    color: #000;
    padding: 10px 18px;
    border-radius: 6px;
    font-family: 'Segoe UI', sans-serif;
    font-size: 13px;
    font-weight: bold;
    z-index: 999999;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.5s ease;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

// --- PERFORM AUTO-SAVE ---
function performAutoSave() {
  if (!isContextValid()) {
    stopAutoSave();
    return;
  }

  if (!document.title.includes('VOD')) return;

  const video = document.querySelector('video');
  if (!video || video.paused || video.currentTime === 0) return;

  const data = grabKickData();

  chrome.storage.local.get({ savedData: [] }, (result) => {
    if (chrome.runtime.lastError) {
      stopAutoSave();
      return;
    }
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
