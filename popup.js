const STORAGE_KEY = 'urlLists';
const SELECTED_LIST_KEY = 'selectedList';

const URLS_PER_PAGE = 5;
const LISTS_PER_PAGE = 10;
let currentUrlPage = 1;
let currentListPage = 1;

async function setLastPageForList(listName, page) {
  const key = 'lastPage_' + listName;
  chrome.storage.local.set({ [key]: page });
}

async function getLastPageForList(listName) {
  return new Promise((resolve) => {
    const key = 'lastPage_' + listName;
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || 1);
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
  if (list.some(item => item.url === url)) {
    alert("This URL is already in the list.");
    return;
  }
  list.unshift({ id: generateId(), url });
  await saveUrlList(list);
  currentUrlPage = 1;
  renderUrlList();
}


function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

async function getSelectedListName() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SELECTED_LIST_KEY], (result) => {
      resolve(result[SELECTED_LIST_KEY] || 'Default');
    });
  });
}

async function setSelectedListName(name) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SELECTED_LIST_KEY]: name }, resolve);
  });
}

async function getAllLists() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

async function saveAllLists(lists) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: lists }, resolve);
  });
}

async function getUrlList() {
  const selected = await getSelectedListName();
  const all = await getAllLists();
  return all[selected] || [];
}

async function saveUrlList(urlList) {
  const selected = await getSelectedListName();
  const allLists = await getAllLists();
  allLists[selected] = urlList;
  await saveAllLists(allLists);
}


async function deleteUrl(id) {
  if (!confirm("Are you sure you want to delete this URL?")) return;
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
  editBtn.className = "btn-edit";
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => {
    const newUrl = prompt('Edit URL:', entry.url);
    if (newUrl && newUrl.trim()) {
      editUrl(entry.id, newUrl.trim());
    }
  };
  
  //const shareBtn = document.createElement('button');
  //shareBtn.textContent = 'Share';
  // shareBtn.onclick = async () => {
    //   const list = await getUrlList();
    //   const selected = await getSelectedListName();
    //   const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    //   const url = URL.createObjectURL(blob);
    //   chrome.downloads.download({
      //     url,
      //     filename: `${selected}.json`,
      //     saveAs: true
      //   });
      // };
      
  const delBtn = document.createElement('button');
  delBtn.className = "btn-delete";
  delBtn.textContent = 'Delete';
  delBtn.onclick = () => deleteUrl(entry.id);

  container.appendChild(urlText);
  container.appendChild(editBtn);
  container.appendChild(delBtn);

  return container;
}

async function renderUrlList() {
  const list = await getUrlList();
  const container = document.getElementById('url-list-container');
  container.innerHTML = '';

  const paged = list.slice((currentUrlPage - 1) * URLS_PER_PAGE, currentUrlPage * URLS_PER_PAGE);
  paged.forEach(entry => {
    container.appendChild(createUrlElement(entry));
  });

  renderUrlPagination(list.length);
}

function renderUrlPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / URLS_PER_PAGE);
  const container = document.getElementById('url-pagination');
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentUrlPage === 1;
  prevBtn.onclick = async () => {
    currentUrlPage--;
    setSelectedListName(await getSelectedListName());
    setLastPageForList(await getSelectedListName(), currentUrlPage);
    renderUrlList();
  };

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentUrlPage === totalPages;
  nextBtn.onclick = async () => {
    currentUrlPage++;
    setLastPageForList(await getSelectedListName(), currentUrlPage);
    renderUrlList();
  };

  container.appendChild(prevBtn);
  container.appendChild(document.createTextNode(` Page ${currentUrlPage} of ${totalPages} `));
  container.appendChild(nextBtn);
}

async function renderListSelector() {
  const listSelector = document.getElementById('list-selector');
  const allLists = await getAllLists();
  const selected = await getSelectedListName();

  const names = Object.keys(allLists).sort();
  const paged = names.slice((currentListPage - 1) * LISTS_PER_PAGE, currentListPage * LISTS_PER_PAGE);

  listSelector.innerHTML = '';
  paged.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    if (name === selected) option.selected = true;
    listSelector.appendChild(option);
  });

  listSelector.onchange = async () => {
    await setSelectedListName(listSelector.value);
    currentUrlPage = 1;
    renderUrlList();
  };

  renderListPagination(names.length);
}

function renderListPagination(totalItems) {
  const container = document.getElementById('list-pagination');
  container.innerHTML = '';
  const totalPages = Math.ceil(totalItems / LISTS_PER_PAGE);

  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = currentListPage === 1;
  prevBtn.onclick = () => {
    currentListPage--;
    renderListSelector();
  };

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentListPage === totalPages;
  nextBtn.onclick = () => {
    currentListPage++;
    renderListSelector();
  };

  container.appendChild(prevBtn);
  container.appendChild(document.createTextNode(` Page ${currentListPage} of ${totalPages} `));
  container.appendChild(nextBtn);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-url-btn').addEventListener('click', () => {
    const input = document.getElementById('new-url-input');
    const url = input.value.trim();
    if (url) {
      addUrl(url);
      input.value = '';
    }
  document.getElementById('new-url-input').focus();
  document.getElementById('share-list-btn').addEventListener('click', async () => {
    const list = await getUrlList();
    const selected = await getSelectedListName();
    if (list.length === 0) {
      alert("This list is empty.");
      return;
    }
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: `${selected}.json`,
      saveAs: true
    });
  });
});

document.getElementById('new-url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('add-url-btn').click();
  }
});

  document.getElementById('create-list-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('new-list-name');
    const name = nameInput.value.trim();
    if (name) {
      const all = await getAllLists();
      if (!all[name]) {
        all[name] = [];
        await saveAllLists(all);
        await setSelectedListName(name);
        nameInput.value = '';
        currentListPage = 1;
        currentUrlPage = 1;
        renderListSelector();
        renderUrlList();
      } else {
        alert("List already exists.");
      }
    }
  });

  document.getElementById('file-input').addEventListener('change', handleFile);
  document.getElementById('drop-zone').addEventListener('dragover', e => e.preventDefault());
  document.getElementById('drop-zone').addEventListener('drop', handleDrop);

  renderListSelector();
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
          }, async groupId => {
            const selected = await getSelectedListName();
            chrome.tabGroups.update(groupId, { title: selected });
          });
        });
      }
    } catch (e) {
      alert("Invalid file");
    }
  };
  reader.readAsText(file);
}
