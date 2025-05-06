// Create the button
function createToggleButton(username, savedUsers) {
  const button = document.createElement('button');
    button.title = 'Flag asshole';

  updateButtonIcon(button, username, savedUsers);

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleUsername(username, button);
  });

  return button;
}

// Update button icon depending on saved status
function updateButtonIcon(button, username, savedUsers) {
  if (savedUsers.includes(username)) {
    button.innerText = '☉';
    button.title = 'Remove user';
  } else {
    button.innerText = '⚑';
    button.title = 'Flag asshole';
  }
}

// Save or remove username
function toggleUsername(username, button) {
  chrome.storage.local.get(['savedUsers'], (result) => {
    let savedUsers = result.savedUsers || [];

    if (savedUsers.includes(username)) {
      savedUsers = savedUsers.filter(user => user !== username); // Remove username
    } else {
      savedUsers.push(username); // Add username
    }

    chrome.storage.local.set({ savedUsers }, () => {
      updateButtonIcon(button, username, savedUsers);
      injectCustomCSS(savedUsers);

      updateButtonIcon(button, username, savedUsers);
      button.classList.add('animate');
      setTimeout(() => button.classList.remove('animate'), 300);
      injectCustomCSS(savedUsers);
    });
  });
}

// ###########################################################

function createGoodGuyToggleButton(username, goodGuyUsers) {
  const button = document.createElement('button');
  button.title = 'Flag good user';

  updateGoodGuyButtonIcon(button, username, goodGuyUsers);

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleGoodGuyUsername(username, button);
  });

  return button;
}

function updateGoodGuyButtonIcon(button, username, goodGuyUsers) {
  if (goodGuyUsers.includes(username)) {
    button.innerText = '☀';
    button.title = 'Remove user';
  } else {
    button.innerText = '⚑';
    button.title = 'Flag good user';
  }
}

function toggleGoodGuyUsername(username, button) {
  chrome.storage.local.get(['savedUsers', 'savedGoodGuyUsers'], (result) => {
    let goodGuyUsers = result.savedGoodGuyUsers || [];
    if (goodGuyUsers.includes(username)) {
      goodGuyUsers = goodGuyUsers.filter(u => u !== username);
    } else {
      goodGuyUsers.push(username);
    }

    chrome.storage.local.set({ savedGoodGuyUsers: goodGuyUsers }, () => {
      updateGoodGuyButtonIcon(button, username, goodGuyUsers);
      button.classList.add('animate');
      setTimeout(() => button.classList.remove('animate'), 300);

      const assholeUsers = result.savedUsers || [];
      injectCustomCSS(assholeUsers, goodGuyUsers);
    });
  });
}

// ###########################################################

// Inject custom CSS for highlighting saved users
function injectCustomCSS(assholeUsers = [], goodGuyUsers = []) {
  let styleTag = document.getElementById('reddit-user-flagger');

  if (styleTag) styleTag.remove();

  styleTag = document.createElement('style');
  styleTag.id = 'reddit-user-flagger';

  const assholeCSS = assholeUsers.map(name =>
    `shreddit-comment[author="${name}"] { border: 2px solid #f00; background-color: rgba(255,0,0,0.15); }`
  ).join('\n');

  const GoodGuyCSS = goodGuyUsers.map(name =>
    `shreddit-comment[author="${name}"] { border: 2px solid #0f0; background-color: rgba(0,255,0,0.12); }`
  ).join('\n');

  styleTag.textContent = assholeCSS + '\n' + GoodGuyCSS;
  document.head.appendChild(styleTag);
}

// Scan Reddit Comments page and inject buttons next to each user name
function addButtons() {
  chrome.storage.local.get(['savedUsers', 'savedGoodGuyUsers'], (result) => {
    const assholeUsers = result.savedUsers || [];
    const goodGuyUsers = result.savedGoodGuyUsers || [];

    const commentAuthors = document.querySelectorAll('shreddit-comment');

    commentAuthors.forEach(comment => {
      const username = comment.getAttribute('author');
      if (!username) return;

      const header = comment.querySelector('faceplate-tracker a');
      if (!header) return;

      const alreadyHasAsshole = comment.querySelector('.asshole-button');
      const alreadyHasGoodGuy = comment.querySelector('.goodGuy-button');

      if (!alreadyHasGoodGuy) {
        const goodGuyBtn = createGoodGuyToggleButton(username, goodGuyUsers);
        goodGuyBtn.classList.add('goodGuy-button');
        header.parentElement.appendChild(goodGuyBtn);
      }

      if (!alreadyHasAsshole) {
        const assholeBtn = createToggleButton(username, assholeUsers);
        assholeBtn.classList.add('asshole-button');
        header.parentElement.appendChild(assholeBtn);
      }
    });
  });
}

// Load saved users and apply highlighting
chrome.storage.local.get(['savedUsers', 'savedGoodGuyUsers'], (result) => {
  injectCustomCSS(result.savedUsers || [], result.savedGoodGuyUsers || []);
});

// Execute immediately, and monitor for dynamic page changes
addButtons();

const observer = new MutationObserver(addButtons);

observer.observe(document.body, { childList: true, subtree: true });
