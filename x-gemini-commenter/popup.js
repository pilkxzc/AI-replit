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

  // Presets
  const presetSelect = document.getElementById('presetSelect');
  const applyPresetBtn = document.getElementById('applyPresetBtn');

  // Reputation filter elements
  const enableEthosFilterInput = document.getElementById('enableEthosFilter');
  const minEthosScoreInput = document.getElementById('minEthosScore');
  const maxEthosScoreInput = document.getElementById('maxEthosScore');
  const enableWallchainFilterInput = document.getElementById('enableWallchainFilter');
  const minWallchainScoreInput = document.getElementById('minWallchainScore');
  const maxWallchainScoreInput = document.getElementById('maxWallchainScore');
  const enableKaitoFilterInput = document.getElementById('enableKaitoFilter');
  const minKaitoYapsInput = document.getElementById('minKaitoYaps');
  const maxKaitoYapsInput = document.getElementById('maxKaitoYaps');
  const enableMoniFilterInput = document.getElementById('enableMoniFilter');
  const minMoniScoreInput = document.getElementById('minMoniScore');
  const maxMoniScoreInput = document.getElementById('maxMoniScore');
  const reputationLogicInput = document.getElementById('reputationLogic');
  const reputationMissingPolicyInput = document.getElementById('reputationMissingPolicy');

  const presets = {
    trust: {
      name: 'Trust Only',
      description: 'Strict reputation gates, slower pace, safer tone. Auto-send OFF.',
      language: 'uk',
      prompt: 'Будь стриманим і ввічливим. Пиши коротко, по суті, без гіпербол.',
      autoSend: false,
      autoLike: true,
      verifiedOnly: true,
      skipReplies: true,
      likeProbability: 25,
      minDelay: 12,
      maxDelay: 26,
      maxComments: 0,
      ollamaModel: 'qwen2.5:0.5b',
      reputationLogic: 'all',
      reputationMissingPolicy: 'skip',
      ethos: { enabled: true, min: 2000, max: 2800 },
      wallchain: { enabled: true, min: 250, max: 1000 },
      kaito: { enabled: true, min: 140, max: 9999 },
      moni: { enabled: true, min: 320, max: 2000 }
    },
    builder: {
      name: 'Builder',
      description: 'Balanced quality + throughput. Auto-send ON, reasonable filters.',
      language: 'en',
      prompt: 'Be friendly, concise, and insightful. Offer one actionable takeaway.',
      autoSend: true,
      autoLike: true,
      verifiedOnly: false,
      skipReplies: true,
      likeProbability: 65,
      minDelay: 6,
      maxDelay: 14,
      maxComments: 40,
      ollamaModel: 'qwen2.5:0.5b',
      reputationLogic: 'any',
      reputationMissingPolicy: 'allow',
      ethos: { enabled: true, min: 1700, max: 2700 },
      wallchain: { enabled: true, min: 130, max: 1000 },
      kaito: { enabled: true, min: 90, max: 9999 },
      moni: { enabled: true, min: 220, max: 2000 }
    },
    fast: {
      name: 'Fast Engage',
      description: 'High speed, lighter gates. Auto-send ON, shorter delays.',
      language: 'en',
      prompt: 'Keep it tight, upbeat, and non-repetitive. One quick point.',
      autoSend: true,
      autoLike: true,
      verifiedOnly: false,
      skipReplies: false,
      likeProbability: 55,
      minDelay: 3,
      maxDelay: 8,
      maxComments: 60,
      ollamaModel: 'qwen2.5:0.5b',
      reputationLogic: 'any',
      reputationMissingPolicy: 'allow',
      ethos: { enabled: true, min: 1500, max: 2600 },
      wallchain: { enabled: true, min: 100, max: 1000 },
      kaito: { enabled: true, min: 70, max: 9999 },
      moni: { enabled: false, min: 0, max: 0 }
    },
    quiet: {
      name: 'Quiet Observer',
      description: 'Manual send, low activity. Reads more, posts less.',
      language: 'uk',
      prompt: 'Пиши лаконічно, тактовно, без нав’язливості.',
      autoSend: false,
      autoLike: false,
      verifiedOnly: false,
      skipReplies: true,
      likeProbability: 15,
      minDelay: 8,
      maxDelay: 20,
      maxComments: 10,
      ollamaModel: 'qwen2.5:0.5b',
      reputationLogic: 'any',
      reputationMissingPolicy: 'skip',
      ethos: { enabled: true, min: 1600, max: 2800 },
      wallchain: { enabled: false, min: 0, max: 0 },
      kaito: { enabled: false, min: 0, max: 0 },
      moni: { enabled: false, min: 0, max: 0 }
    },
    open: {
      name: 'Open',
      description: 'No reputation filters. Use with care. Auto-send OFF by default.',
      language: 'en',
      prompt: 'Keep it concise and positive. Avoid repetition.',
      autoSend: false,
      autoLike: true,
      verifiedOnly: false,
      skipReplies: false,
      likeProbability: 25,
      minDelay: 4,
      maxDelay: 10,
      maxComments: 0,
      ollamaModel: 'llama3.2',
      reputationLogic: 'any',
      reputationMissingPolicy: 'allow',
      ethos: { enabled: false, min: 0, max: 0 },
      wallchain: { enabled: false, min: 0, max: 0 },
      kaito: { enabled: false, min: 0, max: 0 },
      moni: { enabled: false, min: 0, max: 0 }
    }
  };
  
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

  // Auto-detect Ollama URL (restored)
  async function detectOllamaUrl() {
    const possibleUrls = [
      'http://127.0.0.1:11434',
      'http://localhost:11434',
      'http://0.0.0.0:11434',
      'http://127.0.0.1:8000',
      'http://localhost:8000',
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    ];

    if (!detectOllamaBtn || !ollamaInfoEl || !ollamaUrlInput) return null;

    detectOllamaBtn.textContent = 'Detecting...';
    detectOllamaBtn.disabled = true;
    ollamaInfoEl.textContent = ' Scanning for Ollama server...';
    ollamaInfoEl.style.color = '#999';

    let foundCount = 0;
    let firstFound = null;

    for (const url of possibleUrls) {
      try {
        const response = await fetch(`${url}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(1500)
        });

        if (response.ok) {
          foundCount++;
          if (!firstFound) firstFound = url;

          const data = await response.json();
          const models = data.models || [];

          ollamaUrlInput.value = url;
          ollamaInfoEl.innerHTML = ` Found Ollama at <strong>${url}</strong><br> Models available: ${models.length}`;
          ollamaInfoEl.style.color = '#00ff41';

          const notRunningBanner = document.getElementById('ollamaNotRunning');
          if (notRunningBanner) notRunningBanner.style.display = 'none';

          chrome.storage.sync.set({ ollamaUrl: url });

          detectOllamaBtn.textContent = 'Re-Detect';
          detectOllamaBtn.disabled = false;

          setTimeout(() => checkOllamaStatus(), 500);
          return url;
        }
      } catch (e) {
        // keep scanning
      }
    }

    ollamaUrlInput.value = 'Not found';
    ollamaInfoEl.innerHTML = `❌ Ollama server not detected<br><br>🛠️ <strong>Start Ollama:</strong><br><code style="background:#000;color:#0f0;padding:4px;display:block;margin-top:5px;">set OLLAMA_ORIGINS=* && ollama serve</code><br><br>Or check if it's running: <code>tasklist | findstr ollama</code>`;
    ollamaInfoEl.style.color = '#ff4444';

    const notRunningBanner = document.getElementById('ollamaNotRunning');
    if (notRunningBanner) notRunningBanner.style.display = 'block';

    detectOllamaBtn.textContent = 'Re-Detect';
    detectOllamaBtn.disabled = false;
    return null;
  }

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
          ollamaInfoEl.innerHTML = ` Connected to ${url}<br>Model: llama3.2<br>Size: ${size}<br>Models: ${models.length}`;
        } else {
          ollamaInfoEl.className = 'info warning';
          ollamaInfoEl.innerHTML = ` Connected to ${url}<br>llama3.2 not found<br>Available: ${models.map(m => m.name).join(', ') || 'none'}<br>Run: ollama pull llama3.2`;
        }
      } else {
        throw new Error('HTTP ' + response.status);
      }
    } catch (error) {
      if (statusDot) statusDot.className = 'status-dot offline';
      if (statusText) statusText.textContent = 'OFFLINE';
      if (ollamaInfoEl) ollamaInfoEl.className = 'info error';
      
      if (error.name === 'TimeoutError' || error.message.includes('timeout') || error.name === 'AbortError') {
        ollamaInfoEl.innerHTML = ` Connection timeout<br>Ollama not responding<br>Start: set OLLAMA_ORIGINS=* && ollama serve`;
      } else if (error.message.includes('Failed to fetch')) {
        ollamaInfoEl.innerHTML = ` Cannot connect<br>Ollama not running<br>Start: set OLLAMA_ORIGINS=* && ollama serve`;
      } else {
        ollamaInfoEl.innerHTML = ` Error: ${error.message}<br>Check Ollama installation`;
      }
    }
  }

  function collectSettings() {
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

    const minEthosScore = parseInt(minEthosScoreInput.value, 10) || 0;
    const maxEthosScore = parseInt(maxEthosScoreInput.value, 10) || 0;
    const minWallchainScore = parseInt(minWallchainScoreInput.value, 10) || 0;
    const maxWallchainScore = parseInt(maxWallchainScoreInput.value, 10) || 0;
    const minKaitoYaps = parseInt(minKaitoYapsInput.value, 10) || 0;
    const maxKaitoYaps = parseInt(maxKaitoYapsInput.value, 10) || 0;
    const minMoniScore = parseInt(minMoniScoreInput.value, 10) || 0;
    const maxMoniScore = parseInt(maxMoniScoreInput.value, 10) || 0;
    const reputationLogic = reputationLogicInput?.value || 'any';
    const reputationMissingPolicy = reputationMissingPolicyInput?.value || 'skip';

    return {
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
      blacklist,
      enableEthosFilter: enableEthosFilterInput?.checked || false,
      minEthosScore,
      maxEthosScore,
      enableWallchainFilter: enableWallchainFilterInput?.checked || false,
      minWallchainScore,
      maxWallchainScore,
      enableKaitoFilter: enableKaitoFilterInput?.checked || false,
      minKaitoYaps,
      maxKaitoYaps,
      enableMoniFilter: enableMoniFilterInput?.checked || false,
      minMoniScore,
      maxMoniScore,
      reputationLogic,
      reputationMissingPolicy
    };
  }

  function persistSettings(settings, feedbackBtn) {
    chrome.storage.sync.set(settings, () => {
      if (!feedbackBtn) return;
      feedbackBtn.textContent = '✓ SAVED';
      feedbackBtn.style.background = '#00cc33';
      setTimeout(() => {
        feedbackBtn.textContent = feedbackBtn.id === 'applyPresetBtn' ? 'Apply Preset' : 'SAVE SETTINGS';
        feedbackBtn.style.background = feedbackBtn.id === 'applyPresetBtn' ? '#111' : '#00ff41';
      }, 1500);
    });
  }

  // Save all settings
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const settings = collectSettings();
      persistSettings(settings, saveBtn);
    });
  }

  // Apply preset
  function applyPreset(name) {
    const preset = presets[name];
    if (!preset) return;

    if (languageInput) languageInput.value = preset.language;
    if (promptStyleInput) promptStyleInput.value = preset.prompt;
    if (autoSendInput) autoSendInput.checked = preset.autoSend;
    if (autoLikeInput) autoLikeInput.checked = preset.autoLike;
    if (verifiedOnlyInput) verifiedOnlyInput.checked = preset.verifiedOnly;
    if (skipRepliesInput) skipRepliesInput.checked = preset.skipReplies;
    if (likeProbabilityInput) likeProbabilityInput.value = preset.likeProbability;
    if (minDelayInput) minDelayInput.value = preset.minDelay;
    if (maxDelayInput) maxDelayInput.value = preset.maxDelay;
    if (maxCommentsInput) maxCommentsInput.value = preset.maxComments;
    if (ollamaModelInput && preset.ollamaModel) ollamaModelInput.value = preset.ollamaModel;

    if (reputationLogicInput) reputationLogicInput.value = preset.reputationLogic;
    if (reputationMissingPolicyInput) reputationMissingPolicyInput.value = preset.reputationMissingPolicy;

    if (enableEthosFilterInput) enableEthosFilterInput.checked = preset.ethos.enabled;
    if (minEthosScoreInput) minEthosScoreInput.value = preset.ethos.min;
    if (maxEthosScoreInput) maxEthosScoreInput.value = preset.ethos.max;

    if (enableWallchainFilterInput) enableWallchainFilterInput.checked = preset.wallchain.enabled;
    if (minWallchainScoreInput) minWallchainScoreInput.value = preset.wallchain.min;
    if (maxWallchainScoreInput) maxWallchainScoreInput.value = preset.wallchain.max;

    if (enableKaitoFilterInput) enableKaitoFilterInput.checked = preset.kaito.enabled;
    if (minKaitoYapsInput) minKaitoYapsInput.value = preset.kaito.min;
    if (maxKaitoYapsInput) maxKaitoYapsInput.value = preset.kaito.max;

    if (enableMoniFilterInput) enableMoniFilterInput.checked = preset.moni.enabled;
    if (minMoniScoreInput) minMoniScoreInput.value = preset.moni.min;
    if (maxMoniScoreInput) maxMoniScoreInput.value = preset.moni.max;

    const settings = collectSettings();
    persistSettings(settings, applyPresetBtn);
  }

  if (applyPresetBtn) {
    applyPresetBtn.addEventListener('click', () => {
      const name = presetSelect?.value;
      if (!name) return;
      applyPreset(name);
    });
  }

  function updatePresetDescription(name) {
    const box = document.getElementById('presetDescription');
    if (!box) return;
    const preset = presets[name];
    if (!preset) {
      box.textContent = 'Presets instantly apply and save common settings (language, prompt, autopilot, reputation thresholds). Select one to see details.';
    } else {
      box.innerHTML = `<strong>${preset.name}</strong>: ${preset.description}`;
    }
  }

  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      updatePresetDescription(e.target.value);
    });
  }

  // Initialize description
  updatePresetDescription('');
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
    'maxComments', 'blacklist',
    'enableEthosFilter', 'minEthosScore', 'enableWallchainFilter', 'minWallchainScore',
    'enableKaitoFilter', 'minKaitoYaps', 'enableMoniFilter', 'minMoniScore', 
    'maxEthosScore', 'maxWallchainScore', 'maxKaitoYaps', 'maxMoniScore',
    'reputationLogic', 'reputationMissingPolicy'
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

    // Reputation filters
    if (enableEthosFilterInput) enableEthosFilterInput.checked = items.enableEthosFilter || false;
    if (minEthosScoreInput) minEthosScoreInput.value = items.minEthosScore || 1600;
    if (maxEthosScoreInput) maxEthosScoreInput.value = items.maxEthosScore || 0;
    if (enableWallchainFilterInput) enableWallchainFilterInput.checked = items.enableWallchainFilter || false;
    if (minWallchainScoreInput) minWallchainScoreInput.value = items.minWallchainScore || 150;
    if (maxWallchainScoreInput) maxWallchainScoreInput.value = items.maxWallchainScore || 0;
    if (enableKaitoFilterInput) enableKaitoFilterInput.checked = items.enableKaitoFilter || false;
    if (minKaitoYapsInput) minKaitoYapsInput.value = items.minKaitoYaps || 50;
    if (maxKaitoYapsInput) maxKaitoYapsInput.value = items.maxKaitoYaps || 0;
    if (enableMoniFilterInput) enableMoniFilterInput.checked = items.enableMoniFilter || false;
    if (minMoniScoreInput) minMoniScoreInput.value = items.minMoniScore || 200;
    if (maxMoniScoreInput) maxMoniScoreInput.value = items.maxMoniScore || 0;
    if (reputationLogicInput) reputationLogicInput.value = items.reputationLogic || 'any';
    if (reputationMissingPolicyInput) reputationMissingPolicyInput.value = items.reputationMissingPolicy || 'skip';
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

    // Reputation filters
    const minEthosScore = parseInt(minEthosScoreInput.value, 10) || 0;
    const maxEthosScore = parseInt(maxEthosScoreInput.value, 10) || 0;
    const minWallchainScore = parseInt(minWallchainScoreInput.value, 10) || 0;
    const maxWallchainScore = parseInt(maxWallchainScoreInput.value, 10) || 0;
    const minKaitoYaps = parseInt(minKaitoYapsInput.value, 10) || 0;
    const maxKaitoYaps = parseInt(maxKaitoYapsInput.value, 10) || 0;
    const minMoniScore = parseInt(minMoniScoreInput.value, 10) || 0;
    const maxMoniScore = parseInt(maxMoniScoreInput.value, 10) || 0;
    const reputationLogic = reputationLogicInput?.value || 'any';
    const reputationMissingPolicy = reputationMissingPolicyInput?.value || 'skip';
    
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
        blacklist,
        enableEthosFilter: enableEthosFilterInput?.checked || false,
        minEthosScore,
        maxEthosScore,
        enableWallchainFilter: enableWallchainFilterInput?.checked || false,
        minWallchainScore,
        maxWallchainScore,
        enableKaitoFilter: enableKaitoFilterInput?.checked || false,
        minKaitoYaps,
        maxKaitoYaps,
        enableMoniFilter: enableMoniFilterInput?.checked || false,
        minMoniScore,
        maxMoniScore,
        reputationLogic,
        reputationMissingPolicy
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