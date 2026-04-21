document.addEventListener('DOMContentLoaded', () => {
  displayTimestamps();
  // Init interval first so the label reads the correct value
  initIntervalSelector();
  initAutoSaveToggle();
  initSearch();

  document.getElementById('save-btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url.includes("kick.com")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['utils.js']
      }, () => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => grabKickData(),
        }, (injectionResults) => {
          if (injectionResults && injectionResults[0]) {
            saveTimestampToStorage(injectionResults[0].result, () => {
              displayTimestamps();
            });
          }
        });
      });
    } else {
      alert("Please navigate to a Kick.com stream first!");
    }
  });

  // Live-update the popup when storage changes (e.g. from auto-save)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.savedData) {
      displayTimestamps();
    }
  });
});

// --- Auto-Save Toggle ---
function initAutoSaveToggle() {
  const toggle = document.getElementById('autosave-toggle');
  chrome.storage.local.get(['autoSaveEnabled', 'autoSaveIntervalMs'], (result) => {
    toggle.checked = !!result.autoSaveEnabled;
    // Also sync the interval select in case it hasn't loaded yet
    const select = document.getElementById('interval-select');
    const ms = result.autoSaveIntervalMs || 15000;
    select.value = String(ms / 1000);
    updateAutoSaveLabel(toggle.checked);
  });
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoSaveEnabled: toggle.checked });
    updateAutoSaveLabel(toggle.checked);
  });
}

function updateAutoSaveLabel(enabled) {
  const label = document.getElementById('autosave-label');
  if (label) {
    const intervalSelect = document.getElementById('interval-select');
    const seconds = intervalSelect ? intervalSelect.value : '15';
    label.textContent = enabled ? `Auto-Save ON (Every ${seconds}s)` : 'Enable Auto-Save';
  }
}

// --- Configurable Interval ---
function initIntervalSelector() {
  const select = document.getElementById('interval-select');
  chrome.storage.local.get(['autoSaveIntervalMs'], (result) => {
    const ms = result.autoSaveIntervalMs || 15000;
    select.value = String(ms / 1000);
  });
  select.addEventListener('change', () => {
    const ms = parseInt(select.value) * 1000;
    chrome.storage.local.set({ autoSaveIntervalMs: ms });
    updateAutoSaveLabel(document.getElementById('autosave-toggle').checked);
  });
}

// --- Search/Filter ---
function initSearch() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    displayTimestamps(searchInput.value.toLowerCase());
  });
}

// --- Display Timestamps ---
function displayTimestamps(filter) {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const ul = document.getElementById('saved-list');
    ul.innerHTML = '';

    const dataWithIndices = result.savedData.map((item, index) => {
      return { ...item, originalIndex: index };
    });

    let reversedData = dataWithIndices.reverse();

    if (filter) {
      reversedData = reversedData.filter(item =>
        item.title.toLowerCase().includes(filter) ||
        item.time.toLowerCase().includes(filter)
      );
    }

    if (reversedData.length === 0) {
      ul.innerHTML = '<li style="text-align:center;color:#aaa;">No timestamps found</li>';
      return;
    }

    reversedData.forEach((item) => {
      const li = document.createElement('li');
      const linkUrl = item.rawSeconds !== undefined ? `${item.url}?t=${item.rawSeconds}` : item.url;

      li.innerHTML = `
        <div class="info">
          <strong>${item.time}</strong> - <a href="${linkUrl}" target="_blank">Link</a><br>
          <small>${item.title}</small>
        </div>
        <button class="delete-btn" data-index="${item.originalIndex}">X</button>
      `;
      ul.appendChild(li);
    });

    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const indexToRemove = parseInt(e.target.getAttribute('data-index'));
        removeTimestamp(indexToRemove);
      });
    });
  });
}

function removeTimestamp(index) {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const list = result.savedData;
    list.splice(index, 1);
    chrome.storage.local.set({ savedData: list }, () => {
      displayTimestamps();
    });
  });
}
