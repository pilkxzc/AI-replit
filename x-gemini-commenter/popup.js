document.addEventListener('DOMContentLoaded', () => {
  const apiKeysInput = document.getElementById('apiKeys');
  const myUsernameInput = document.getElementById('myUsername');
  const modelNameInput = document.getElementById('modelName');
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
  const status = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get(['geminiApiKeys', 'geminiApiKey', 'myUsername', 'geminiModel', 'geminiPrompt', 'geminiLanguage', 'autoSend', 'autoLike', 'verifiedOnly', 'skipReplies', 'likeProbability', 'minDelay', 'maxDelay', 'maxComments'], (items) => {
    // Support for multiple keys or fallback to single key
    if (items.geminiApiKeys && items.geminiApiKeys.length > 0) {
      apiKeysInput.value = items.geminiApiKeys.join('\n');
    } else if (items.geminiApiKey) {
      apiKeysInput.value = items.geminiApiKey;
    }

    if (items.myUsername) myUsernameInput.value = items.myUsername;
    if (items.geminiModel) modelNameInput.value = items.geminiModel;
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
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    // Split by newline and filter empty strings
    const apiKeys = apiKeysInput.value.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    const myUsername = myUsernameInput.value.trim().replace('@', '');
    
    const model = modelNameInput.value || 'gemini-1.5-flash';
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
      geminiApiKeys: apiKeys,
      myUsername: myUsername,
      geminiModel: model,
      geminiPrompt: prompt,
      geminiLanguage: language,
      autoSend: autoSend,
      autoLike: autoLike,
      verifiedOnly: verifiedOnly,
      skipReplies: skipReplies,
      likeProbability: likeProbability,
      minDelay: minDelay,
      maxDelay: maxDelay,
      maxComments: maxComments
    }, () => {
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
    });
  });
});