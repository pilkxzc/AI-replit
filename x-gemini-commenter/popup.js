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
  const status = document.getElementById('status');
  const mentionStats = document.getElementById('mentionStats');

  // Load saved settings
  chrome.storage.sync.get(['myUsername', 'geminiPrompt', 'geminiLanguage', 'autoSend', 'autoLike', 'verifiedOnly', 'skipReplies', 'likeProbability', 'minDelay', 'maxDelay', 'maxComments'], (items) => {
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
  });

  // Load and display mention statistics
  chrome.storage.local.get(['mentionHistory'], (data) => {
    const mentionHistory = data.mentionHistory || {};
    const count = Object.keys(mentionHistory).length;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Count recent mentions (last 24h)
    const recentMentions = Object.values(mentionHistory).filter(timestamp => 
      now - timestamp < oneDayMs
    ).length;
    
    mentionStats.textContent = `Згадано користувачів за 24г: ${recentMentions}`;
  });

  // Save settings
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
      myUsername: myUsername,
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