document.addEventListener('DOMContentLoaded', () => {
  const myUsernameInput = document.getElementById('myUsername');
  const ollamaModelInput = document.getElementById('ollamaModel');
  const ollamaUrlInput = document.getElementById('ollamaUrl');
  const customOllamaCheckbox = document.getElementById('customOllamaUrl');
  const customOllamaInput = document.getElementById('customOllamaInput');
  const customUrlSection = document.getElementById('customUrlSection');
  const detectOllamaBtn = document.getElementById('detectOllamaBtn');
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
    if (!ollamaStatusEl || !ollamaInfoEl) return;
    
    const statusDot = ollamaStatusEl.querySelector('.status-dot');
    const statusText = ollamaStatusEl.querySelector('span');
    
    if (statusDot) statusDot.className = 'status-dot checking';
    if (statusText) statusText.textContent = 'CHECKING...';
    ollamaInfoEl.textContent = 'Connecting to Ollama...';

    try {
      let url = customOllamaCheckbox.checked ? customOllamaInput.value : ollamaUrlInput.value;
      if (!url || url === 'Not found') {
        throw new Error('No Ollama URL configured');
      }
      
      // Normalize URL
      url = url.trim();
      if (url.startsWith('https://127.') || url.startsWith('https://localhost') || url.startsWith('https://0.0.0.0')) {
        url = url.replace('https://', 'http://');
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        const hasLlama = models.some(m => m.name.includes('llama3.2'));
        
        if (statusDot) statusDot.className = 'status-dot';
        if (statusText) statusText.textContent = hasLlama ? 'ONLINE' : 'MODEL MISSING';
        
        if (hasLlama) {
          const llamaModel = models.find(m => m.name.includes('llama3.2'));
          const size = llamaModel?.size ? (llamaModel.size / 1024 / 1024 / 1024).toFixed(1) + ' GB' : 'unknown';
          ollamaInfoEl.className = 'info';
          ollamaInfoEl.innerHTML = `✓ Connected to ${url}<br>Model: llama3.2<br>Size: ${size}<br>Models: ${models.length}`;
        } else {
          ollamaInfoEl.className = 'info warning';
          ollamaInfoEl.innerHTML = `⚠ Connected to ${url}<br>llama3.2 not found<br>Available: ${models.map(m => m.name).join(', ') || 'none'}<br>Run: ollama pull llama3.2`;
        }
      } else {
        throw new Error('HTTP ' + response.status);
      }
    } catch (error) {
      if (statusDot) statusDot.className = 'status-dot offline';
      if (statusText) statusText.textContent = 'OFFLINE';
      if (ollamaInfoEl) ollamaInfoEl.className = 'info error';
      
      if (error.name === 'TimeoutError' || error.message.includes('timeout') || error.name === 'AbortError') {
        ollamaInfoEl.innerHTML = `✗ Connection timeout<br>Ollama not responding<br>Start: set OLLAMA_ORIGINS=* && ollama serve`;
      } else if (error.message.includes('Failed to fetch')) {
        ollamaInfoEl.innerHTML = `✗ Cannot connect<br>Ollama not running<br>Start: set OLLAMA_ORIGINS=* && ollama serve`;
      } else {
        ollamaInfoEl.innerHTML = `✗ Error: ${error.message}<br>Check Ollama installation`;
      }
    }
  }

  // Check button click
  if (checkOllamaBtn) {
    checkOllamaBtn.addEventListener('click', checkOllamaStatus);
  }

  // Auto-detect Ollama URL
  async function detectOllamaUrl() {
    const possibleUrls = [
      'http://127.0.0.1:11434',  // Default Ollama host
      'http://localhost:11434',   // Localhost variant
      'http://0.0.0.0:11434',     // All interfaces
      'http://127.0.0.1:8000',    // Alternative port
      'http://localhost:8000',
      'http://127.0.0.1:5000',    // Another common port
      'http://localhost:5000'
    ];
    
    if (!detectOllamaBtn || !ollamaInfoEl || !ollamaUrlInput) return null;
    
    detectOllamaBtn.textContent = 'Detecting...';
    detectOllamaBtn.disabled = true;
    ollamaInfoEl.textContent = '🔍 Scanning for Ollama server...';
    ollamaInfoEl.style.color = '#999';
    
    let foundCount = 0;
    let firstFound = null;
    
    for (const url of possibleUrls) {
      try {
        const response = await fetch(`${url}/api/tags`, { 
          method: 'GET',
          signal: AbortSignal.timeout(1500)  // Fast timeout for scanning
        });
        
        if (response.ok) {
          foundCount++;
          if (!firstFound) firstFound = url;
          
          const data = await response.json();
          const models = data.models || [];
          
          ollamaUrlInput.value = url;
          ollamaInfoEl.innerHTML = `✅ Found Ollama at <strong>${url}</strong><br>📦 Models available: ${models.length}`;
          ollamaInfoEl.style.color = '#00ff41';
          
          // Hide help banner when detected
          const notRunningBanner = document.getElementById('ollamaNotRunning');
          if (notRunningBanner) notRunningBanner.style.display = 'none';
          
          // Save detected URL
          chrome.storage.sync.set({ ollamaUrl: url });
          
          detectOllamaBtn.textContent = 'Re-Detect';
          detectOllamaBtn.disabled = false;
          
          // Auto-check status with found URL
          setTimeout(() => checkOllamaStatus(), 500);
          return url;
        }
      } catch (e) {
        // Try next URL
      }
    }
    
    ollamaUrlInput.value = 'Not found';
    ollamaInfoEl.innerHTML = `❌ Ollama server not detected<br><br>🛠️ <strong>Start Ollama:</strong><br><code style="background:#000;color:#0f0;padding:4px;display:block;margin-top:5px;">set OLLAMA_ORIGINS=* && ollama serve</code><br><br>Or check if it's running: <code>tasklist | findstr ollama</code>`;
    ollamaInfoEl.style.color = '#ff4444';
    
    // Show help banner when not detected
    const notRunningBanner = document.getElementById('ollamaNotRunning');
    if (notRunningBanner) notRunningBanner.style.display = 'block';
    
    detectOllamaBtn.textContent = 'Re-Detect';
    detectOllamaBtn.disabled = false;
    return null;
  }
  
  // Toggle custom URL input
  if (customOllamaCheckbox) {
    customOllamaCheckbox.addEventListener('change', () => {
    if (customOllamaCheckbox.checked) {
      customUrlSection.style.display = 'block';
      ollamaUrlInput.readOnly = false;
      ollamaUrlInput.value = customOllamaInput.value || 'http://localhost:11434';
    } else {
      customUrlSection.style.display = 'none';
      ollamaUrlInput.readOnly = true;
      detectOllamaUrl();
    }
    });
  }
  
  if (customOllamaInput) {
    customOllamaInput.addEventListener('input', () => {
    let url = customOllamaInput.value.trim();
    
    // Normalize URL: force http for local addresses
    if (url.startsWith('https://127.') || url.startsWith('https://localhost') || url.startsWith('https://0.0.0.0')) {
      url = url.replace('https://', 'http://');
      customOllamaInput.value = url;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && url.length > 0) {
      url = 'http://' + url;
      customOllamaInput.value = url;
    }
    
    ollamaUrlInput.value = url;
    chrome.storage.sync.set({ 
      ollamaUrl: url,
      customOllamaUrl: true 
    });
    });
  }
  
  if (detectOllamaBtn) {
    detectOllamaBtn.addEventListener('click', detectOllamaUrl);
  }
  
  // Auto-detect every 30 seconds if not connected
  setInterval(() => {
    if (!customOllamaCheckbox.checked && ollamaUrlInput.value === 'Not found') {
      detectOllamaUrl();
    }
  }, 30000);
  
  // Load saved settings
  chrome.storage.sync.get([
    'myUsername', 'ollamaModel', 'ollamaUrl', 'customOllamaUrl', 'geminiPrompt', 'geminiLanguage', 'autoSend', 'autoLike', 
    'verifiedOnly', 'skipReplies', 'likeProbability', 'minDelay', 'maxDelay', 
    'maxComments', 'blacklist'
  ], (items) => {
    if (items.myUsername) myUsernameInput.value = items.myUsername;
    if (items.ollamaModel) ollamaModelInput.value = items.ollamaModel;
    
    // Load Ollama URL
    if (items.customOllamaUrl) {
      customOllamaCheckbox.checked = true;
      customUrlSection.style.display = 'block';
      ollamaUrlInput.readOnly = false;
      if (items.ollamaUrl) {
        ollamaUrlInput.value = items.ollamaUrl;
        customOllamaInput.value = items.ollamaUrl;
      }
    } else if (items.ollamaUrl) {
      ollamaUrlInput.value = items.ollamaUrl;
    } else {
      // Auto-detect on first load
      detectOllamaUrl();
    }
    
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
  if (addBlacklistBtn) {
    addBlacklistBtn.addEventListener('click', () => {
    const username = blacklistInput.value.trim().replace('@', '').toLowerCase();
    if (username && !blacklist.includes(username)) {
      blacklist.push(username);
      blacklistInput.value = '';
      renderBlacklist();
      saveBlacklist();
    }
    });
  }

  // Enter key support for blacklist input
  if (blacklistInput) {
    blacklistInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBlacklistBtn.click();
      }
    });
  }

  // Save blacklist
  function saveBlacklist() {
    chrome.storage.sync.set({ blacklist });
  }

  // Save all settings
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
    const myUsername = myUsernameInput.value.trim().replace('@', '');
    const ollamaModel = ollamaModelInput.value;
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
    
    // Normalize Ollama URL
    let finalUrl = customOllamaCheckbox.checked ? customOllamaInput.value : ollamaUrlInput.value;
    finalUrl = finalUrl.trim();
    if (finalUrl.startsWith('https://127.') || finalUrl.startsWith('https://localhost') || finalUrl.startsWith('https://0.0.0.0')) {
      finalUrl = finalUrl.replace('https://', 'http://');
    }
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && finalUrl.length > 0) {
      finalUrl = 'http://' + finalUrl;
    }

    chrome.storage.sync.set({
      myUsername,
      ollamaModel,
      ollamaUrl: finalUrl,
      customOllamaUrl: customOllamaCheckbox.checked,
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
  }

  // Clear mention history
  if (clearMentionsBtn) {
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
  }

});