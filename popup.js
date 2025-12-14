document.addEventListener('DOMContentLoaded', () => {
  const myUsernameInput = document.getElementById('myUsername');
  const promptStyleInput = document.getElementById('promptStyle');
  const languageInput = document.getElementById('language');
  const autoSendInput = document.getElementById('autoSend');
  const autoLikeInput = document.getElementById('autoLike');
  const verifiedOnlyInput = document.getElementById('verifiedOnly');
  const skipRepliesInput = document.getElementById('skipReplies');
  const likeProbabilityInput = document.getElementById('likeProbability');
  const minDelayInput = document.getElementById('minDelay');
  const maxDelayInput = document.getElementById('maxDelay');
  const maxCommentsInput = document.getElementById('maxComments');
  const saveBtn = document.getElementById('saveBtn');
  const mentionStats = document.getElementById('mentionStats');
  const clearMentionsBtn = document.getElementById('clearMentionsBtn');
  
  // Blacklist elements
  const blacklistInput = document.getElementById('blacklistInput');
  const addBlacklistBtn = document.getElementById('addBlacklistBtn');
  const blacklistList = document.getElementById('blacklistList');
  const blacklistStats = document.getElementById('blacklistStats');

  // Ollama status elements
  const ollamaStatusEl = document.getElementById('ollamaStatus');
  const ollamaInfoEl = document.getElementById('ollamaInfo');
  const checkOllamaBtn = document.getElementById('checkOllamaBtn');

  let blacklist = [];

  // Check Ollama status on load
  checkOllamaStatus();

  // Function to check Ollama connection
  async function checkOllamaStatus() {
    const statusDot = ollamaStatusEl.querySelector('.status-dot');
    const statusText = ollamaStatusEl.querySelector('span');
    
    statusDot.className = 'status-dot checking';
    statusText.textContent = 'CHECKING...';
    ollamaInfoEl.textContent = 'Connecting to Ollama...';

    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        const hasLlama = models.some(m => m.name.includes('llama3.2'));
        
        statusDot.className = 'status-dot';
        statusText.textContent = 'LLAMA3.2 ONLINE';
        
        if (hasLlama) {
          const llamaModel = models.find(m => m.name.includes('llama3.2'));
          const size = llamaModel?.size ? (llamaModel.size / 1024 / 1024 / 1024).toFixed(1) + ' GB' : 'unknown';
          ollamaInfoEl.className = 'info';
          ollamaInfoEl.innerHTML = `✓ Connected<br>Model: llama3.2<br>Size: ${size}<br>Models: ${models.length}`;
        } else {
          ollamaInfoEl.className = 'info warning';
          ollamaInfoEl.innerHTML = `⚠ Connected but llama3.2 not found<br>Available: ${models.map(m => m.name).join(', ') || 'none'}<br>Run: ollama pull llama3.2`;
          statusText.textContent = 'MODEL MISSING';
        }
      } else {
        throw new Error('HTTP ' + response.status);
      }
    } catch (error) {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'OFFLINE';
      ollamaInfoEl.className = 'info error';
      
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        ollamaInfoEl.innerHTML = `✗ Connection timeout<br>Ollama not responding<br>Start: set OLLAMA_ORIGINS=* && ollama serve`;
      } else if (error.message.includes('Failed to fetch')) {
        ollamaInfoEl.innerHTML = `✗ Cannot connect to 127.0.0.1:11434<br>Ollama not running<br>Start: set OLLAMA_ORIGINS=* && ollama serve`;
      } else {
        ollamaInfoEl.innerHTML = `✗ Error: ${error.message}<br>Check Ollama installation`;
      }
    }
  }

  // Check button click
  checkOllamaBtn.addEventListener('click', checkOllamaStatus);

  // Load saved settings
  chrome.storage.sync.get([
    'myUsername', 'geminiPrompt', 'geminiLanguage', 'autoSend', 'autoLike', 
    'verifiedOnly', 'skipReplies', 'likeProbability', 'minDelay', 'maxDelay', 
    'maxComments', 'blacklist'
  ], (items) => {
    if (items.myUsername) myUsernameInput.value = items.myUsername;
    if (items.geminiPrompt) promptStyleInput.value = items.geminiPrompt;
    if (items.geminiLanguage) languageInput.value = items.geminiLanguage;
    if (items.autoSend !== undefined) autoSendInput.checked = items.autoSend;
    if (items.autoLike !== undefined) autoLikeInput.checked = items.autoLike;
    if (items.verifiedOnly !== undefined) verifiedOnlyInput.checked = items.verifiedOnly;
    if (items.skipReplies !== undefined) skipRepliesInput.checked = items.skipReplies;
    if (items.likeProbability) likeProbabilityInput.value = items.likeProbability;
    if (items.minDelay) minDelayInput.value = items.minDelay;
    if (items.maxDelay) maxDelayInput.value = items.maxDelay;
    if (items.maxComments) maxCommentsInput.value = items.maxComments;
    if (items.blacklist) {
      blacklist = items.blacklist;
      renderBlacklist();
    }
  });

  // Load and display mention statistics
  function updateMentionStats() {
    chrome.storage.local.get(['mentionHistory'], (data) => {
      const mentionHistory = data.mentionHistory || {};
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const recentMentions = Object.values(mentionHistory).filter(timestamp => 
        now - timestamp < oneDayMs
      ).length;
      
      mentionStats.textContent = `Mentions (24h): ${recentMentions}`;
    });
  }
  updateMentionStats();

  // Render blacklist
  function renderBlacklist() {
    blacklistList.innerHTML = '';
    blacklist.forEach((username, index) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <span>@${username}</span>
        <button data-index="${index}">DEL</button>
      `;
      blacklistList.appendChild(item);
    });
    
    blacklistStats.textContent = `${blacklist.length} blocked user${blacklist.length !== 1 ? 's' : ''}`;
    
    // Add delete handlers
    document.querySelectorAll('.list-item button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        blacklist.splice(index, 1);
        renderBlacklist();
        saveBlacklist();
      });
    });
  }

  // Add to blacklist
  addBlacklistBtn.addEventListener('click', () => {
    const username = blacklistInput.value.trim().replace('@', '').toLowerCase();
    if (username && !blacklist.includes(username)) {
      blacklist.push(username);
      blacklistInput.value = '';
      renderBlacklist();
      saveBlacklist();
    }
  });

  // Enter key support for blacklist input
  blacklistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addBlacklistBtn.click();
    }
  });

  // Save blacklist
  function saveBlacklist() {
    chrome.storage.sync.set({ blacklist });
  }

  // Save all settings
  saveBtn.addEventListener('click', () => {
    const myUsername = myUsernameInput.value.trim().replace('@', '');
    const prompt = promptStyleInput.value;
    const language = languageInput.value;
    const autoSend = autoSendInput.checked;
    const autoLike = autoLikeInput.checked;
    const verifiedOnly = verifiedOnlyInput.checked;
    const skipReplies = skipRepliesInput.checked;
    const likeProbability = parseInt(likeProbabilityInput.value, 10) || 50;
    const minDelay = parseInt(minDelayInput.value, 10) || 5;
    const maxDelay = parseInt(maxDelayInput.value, 10) || 15;
    const maxComments = parseInt(maxCommentsInput.value, 10) || 0;

    chrome.storage.sync.set({
      myUsername,
      geminiPrompt: prompt,
      geminiLanguage: language,
      autoSend,
      autoLike,
      verifiedOnly,
      skipReplies,
      likeProbability,
      minDelay,
      maxDelay,
      maxComments,
      blacklist
    }, () => {
      saveBtn.textContent = '✓ SAVED';
      saveBtn.style.background = '#00cc33';
      setTimeout(() => {
        saveBtn.textContent = 'SAVE SETTINGS';
        saveBtn.style.background = '#00ff41';
      }, 1500);
    });
  });

  // Clear mention history
  clearMentionsBtn.addEventListener('click', () => {
    if (confirm('Clear all mention history?')) {
      chrome.storage.local.set({ mentionHistory: {} }, () => {
        updateMentionStats();
        clearMentionsBtn.textContent = '✓ CLEARED';
        setTimeout(() => {
          clearMentionsBtn.textContent = 'CLEAR HISTORY';
        }, 1500);
      });
    }
  });

});