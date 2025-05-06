const STORAGE_KEY = 'urlLists';
const LIST_NAME = 'default'; // For now, use a single list

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

async function getUrlList() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const lists = result[STORAGE_KEY] || {};
      resolve(lists[LIST_NAME] || []);
    });
  });
}

async function saveUrlList(urlList) {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const allLists = result[STORAGE_KEY] || {};
      allLists[LIST_NAME] = urlList;
      chrome.storage.local.set({ [STORAGE_KEY]: allLists }, resolve);
    });
  });
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function autoFixUrl(input) {
  // If the user forgot to add a scheme, add "https://"
  if (!/^https?:\/\//i.test(input)) {
    return "https://" + input;
  }
  return input;
}

async function addUrl(url) {
  url = autoFixUrl(url);

  if (!isValidUrl(url)) {
    alert("Please enter a valid URL.");
    return;
  }

  const list = await getUrlList();
  list.unshift({ id: generateId(), url });
  await saveUrlList(list);
  currentUrlPage = 1; // reset to page 1
  renderUrlList();
}

async function deleteUrl(id) {
  const list = await getUrlList();
  const updated = list.filter(entry => entry.id !== id);
  await saveUrlList(updated);
  renderUrlList();
}

async function editUrl(id, newUrl) {
  const list = await getUrlList();
  const updated = list.map(entry => entry.id === id ? { ...entry, url: newUrl } : entry);
  await saveUrlList(updated);
  renderUrlList();
}

function createUrlElement(entry) {
  const container = document.createElement('div');
  container.className = 'url-item';

  const urlText = document.createElement('span');
  urlText.textContent = entry.url;

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => {
    const newUrl = prompt('Edit URL:', entry.url);
    if (newUrl && newUrl.trim()) {
      editUrl(entry.id, newUrl.trim());
    }
  };

  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Share';
  shareBtn.onclick = async () => {
    const list = await getUrlList();
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: `${LIST_NAME}.json`,
      saveAs: true
    });
  };

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.onclick = () => deleteUrl(entry.id);

  container.appendChild(urlText);
  container.appendChild(editBtn);
  container.appendChild(shareBtn);
  container.appendChild(delBtn);

  return container;
}

async function renderUrlList() {
  const list = await getUrlList();
  const container = document.getElementById('url-list-container');
  container.innerHTML = '';
  list.forEach(entry => {
    container.appendChild(createUrlElement(entry));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-url-btn').addEventListener('click', () => {
    const input = document.getElementById('new-url-input');
    const url = input.value.trim();
    if (url) {
      addUrl(url);
      input.value = '';
    }
  });

  document.getElementById('file-input').addEventListener('change', handleFile);
  document.getElementById('drop-zone').addEventListener('dragover', e => e.preventDefault());
  document.getElementById('drop-zone').addEventListener('drop', handleDrop);

  renderUrlList();
});

function handleFile(event) {
  const file = event.target.files[0];
  if (file) processJsonFile(file);
}

function handleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.name.endsWith('.json')) {
    processJsonFile(file);
  }
}

function processJsonFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const urls = JSON.parse(reader.result);
      if (Array.isArray(urls)) {
        const tabUrls = urls.map(u => u.url);
        chrome.windows.create({
          focused: true,
          url: tabUrls,
        }, (window) => {
          chrome.tabs.group({
            tabIds: tabUrls.map((_, i) => window.tabs[i].id),
            createProperties: { windowId: window.id }
          }, groupId => {
            chrome.tabGroups.update(groupId, { title: LIST_NAME });
          });
        });
      }
    } catch (e) {
      alert("Invalid file");
    }
  };
  reader.readAsText(file);
}
