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

function saveTimestamp(data) {
  chrome.storage.local.get({ savedData: [] }, (result) => {
    const list = result.savedData;
    list.push(data);
    chrome.storage.local.set({ savedData: list }, () => {
      displayTimestamps(); 
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