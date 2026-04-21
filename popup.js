document.addEventListener('DOMContentLoaded', () => {
  displayTimestamps();

  document.getElementById('save-btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url.includes("kick.com")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: grabKickData,
      }, (injectionResults) => {
        if (injectionResults && injectionResults[0]) {
          saveTimestamp(injectionResults[0].result);
        }
      });
    } else {
      alert("Please navigate to a Kick.com stream first!");
    }
  });
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

// Save the grabbed data to Chrome's local storage (Popup Version)
function saveTimestamp(data) {
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
    
    chrome.storage.local.set({ savedData: list }, () => {
      displayTimestamps(); // Refresh the UI
    });
  });
}
function displayTimestamps() {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const ul = document.getElementById('saved-list');
    ul.innerHTML = ''; 

    // We map the original index so we know exactly which one to delete
    // Even after reversing the array for visual display
    const dataWithIndices = result.savedData.map((item, index) => {
      return { ...item, originalIndex: index };
    });

    const reversedData = dataWithIndices.reverse();

    reversedData.forEach((item) => {
      const li = document.createElement('li');
      
      li.innerHTML = `
        <div class="info">
          <strong>${item.time}</strong> - <a href="${item.url}" target="_blank">Link</a><br>
          <small>${item.title}</small>
        </div>
        <button class="delete-btn" data-index="${item.originalIndex}">X</button>
      `;
      ul.appendChild(li);
    });

    // --- NEW AUTO-SAVE TOGGLE LOGIC ---
  const autoSaveToggle = document.getElementById('autosave-toggle');
  
  // Load the current state of the toggle when opening the menu
  chrome.storage.local.get(['autoSaveEnabled'], (result) => {
    autoSaveToggle.checked = !!result.autoSaveEnabled;
  });

  // Save the state when the user clicks the checkbox
  autoSaveToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ autoSaveEnabled: e.target.checked });
  });
  // ----------------------------------

    // Attach click listeners to all the new delete buttons
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
    // Remove 1 item at the specified index
    list.splice(index, 1); 
    
    // Save the newly updated list back to storage and re-render
    chrome.storage.local.set({ savedData: list }, () => {
      displayTimestamps();
    });
  });
}