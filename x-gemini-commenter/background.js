chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generate_comment') {
    generateCommentWithRetry(request.tweetText, request.prompt, request.language)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (request.action === 'check_mention_allowed') {
    checkMentionAllowed(request.username)
      .then(allowed => sendResponse({ allowed }))
      .catch(error => sendResponse({ allowed: true })); // Default allow on error
    return true;
  } else if (request.action === 'record_mention') {
    recordMention(request.username)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false }));
    return true;
  }
});

// Clean up expired rate limit data on startup
chrome.runtime.onStartup.addListener(() => {
  cleanupExpiredRateLimits();
});

chrome.runtime.onInstalled.addListener(() => {
  cleanupExpiredRateLimits();
});

// Function to clean up expired rate limit entries
async function cleanupExpiredRateLimits() {
  const data = await chrome.storage.sync.get(['rateLimitStatus']);
  const rateLimitStatus = data.rateLimitStatus || {};
  
  const now = Date.now();
  let hasChanges = false;
  
  for (const [keyId, status] of Object.entries(rateLimitStatus)) {
    if (now > status.resetTime) {
      delete rateLimitStatus[keyId];
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    await chrome.storage.sync.set({ rateLimitStatus });
    console.log('Cleaned up expired rate limit data');
  }
}

async function generateCommentWithRetry(tweetText, customPrompt, language) {
  // Get saved Ollama model or use default
  const storage = await chrome.storage.sync.get(['ollamaModel', 'ollamaUrl']);
  const OLLAMA_MODEL = storage.ollamaModel || 'llama3.2';
  let ollamaUrl = storage.ollamaUrl || 'http://127.0.0.1:11434';
  
  // Normalize URL: force http for local addresses
  ollamaUrl = ollamaUrl.trim();
  if (ollamaUrl.startsWith('https://127.') || ollamaUrl.startsWith('https://localhost') || ollamaUrl.startsWith('https://0.0.0.0')) {
    ollamaUrl = ollamaUrl.replace('https://', 'http://');
  }
  if (!ollamaUrl.startsWith('http://') && !ollamaUrl.startsWith('https://')) {
    ollamaUrl = 'http://' + ollamaUrl;
  }
  
  console.error('🧠 USING OLLAMA MODEL:', OLLAMA_MODEL);
  console.error('🌐 Normalized Ollama URL:', ollamaUrl);
  
  try {
    return await callOllamaApi(OLLAMA_MODEL, tweetText, customPrompt, language);
  } catch (error) {
    console.error('❌ Model failed:', error.message);
    
    // Provide specific error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('Cannot connect')) {
      throw new Error('🚨 Ollama не запущено!\n\nЗапустіть Ollama:\n\nset OLLAMA_ORIGINS=* && ollama serve');
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      throw new Error(`🤖 Модель "${OLLAMA_MODEL}" не знайдено!\n\nВстановіть модель:\n\nollama pull ${OLLAMA_MODEL}`);
    } else if (error.message.includes('crashed') || error.message.includes('exit status')) {
      throw new Error(`🔥 Модель "${OLLAMA_MODEL}" зламалась!\n\nПереінсталюйте:\n\nollama pull ${OLLAMA_MODEL}`);
    } else {
      throw new Error('🔧 Помилка Ollama: ' + error.message);
    }
  }
}

// No rate limiting needed with Ollama! 🎉

// Ollama AI Client class (local API) - Chrome Service Worker Compatible
class OllamaAI {
  constructor(baseUrl = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
  }

  async generateText(model, prompt) {
    const apiUrl = `${this.baseUrl}/api/generate`;
    
    const payload = {
      model: model,
      prompt: prompt,
      stream: false
    };

    try {
      console.error('🌐 Making fetch request to:', apiUrl);
      console.error('📤 PROMPT SENT TO OLLAMA:', JSON.stringify(payload, null, 2));
      
      // Use fetch with proper timeout handling for service workers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 60000); // 60 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.error('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 Ollama API Error:', `HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        
        // Check for specific errors
        if (errorText.includes('llama runner process has terminated') || errorText.includes('exit status')) {
          throw new Error('model crashed');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.error('✅ Got response from Ollama');
      console.error('📥 RESPONSE FROM OLLAMA:', result.response);
      
      if (result.response) {
        return result.response;
      } else {
        throw new Error('No response field in Ollama result');
      }
    } catch (error) {
      console.error('🚨 Ollama API Error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 60 seconds');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to Ollama. Ensure it\'s running: ollama serve');
      } else if (error.message.includes('NetworkError')) {
        throw new Error('Network error - check if Ollama is accessible on 127.0.0.1:11434');
      } else {
        throw error;
      }
    }
  }
}

async function callOllamaApi(modelName, tweetText, customPrompt, language) {
  console.error('🤖🤖🤖 callOllamaApi USING MODEL:', modelName);
  
  // Get Ollama URL from storage
  const storage = await chrome.storage.sync.get(['ollamaUrl']);
  let ollamaUrl = storage.ollamaUrl || 'http://127.0.0.1:11434';
  
  // Normalize URL
  ollamaUrl = ollamaUrl.trim();
  if (ollamaUrl.startsWith('https://127.') || ollamaUrl.startsWith('https://localhost') || ollamaUrl.startsWith('https://0.0.0.0')) {
    ollamaUrl = ollamaUrl.replace('https://', 'http://');
  }
  if (!ollamaUrl.startsWith('http://') && !ollamaUrl.startsWith('https://')) {
    ollamaUrl = 'http://' + ollamaUrl;
  }
  
  console.error('🌐 Using Ollama URL:', ollamaUrl);
  const ai = new OllamaAI(ollamaUrl);

  // Ultra-short prompts to prevent rambling and repetition
  let prompt = "";
  
  // Detect common abbreviations and create appropriate responses
  const tweetLower = tweetText.toLowerCase();
  let isGreeting = false;
  let greetingType = '';
  
  // Common social media abbreviations
  if (tweetLower.match(/\b(gm|good morning)\b/)) {
    isGreeting = true;
    greetingType = 'morning';
  } else if (tweetLower.match(/\b(gn|good night|goodnight)\b/)) {
    isGreeting = true;
    greetingType = 'night';
  } else if (tweetLower.match(/\b(ga|good afternoon)\b/)) {
    isGreeting = true;
    greetingType = 'afternoon';
  } else if (tweetLower.match(/\b(ge|good evening)\b/)) {
    isGreeting = true;
    greetingType = 'evening';
  } else if (tweetLower.match(/\b(wagmi|we are gonna make it|lfg|let's fucking go|gmi|gonna make it|hodl|diamond hands)\b/)) {
    isGreeting = true;
    greetingType = 'motivation';
  } else if (tweetLower.match(/\b(btw|by the way|imo|in my opinion|tbh|to be honest|ngl|not gonna lie|fr|for real|smh|shake my head|fyi|for your information|afaik|as far as i know)\b/)) {
    isGreeting = true;
    greetingType = 'casual';
  } else if (tweetLower.match(/\b(fomo|fear of missing out|yolo|you only live once|rekt|wrecked|ath|all time high|dyor|do your own research)\b/)) {
    isGreeting = true;
    greetingType = 'crypto';
  }
  
  if (language === 'uk') {
    if (isGreeting) {
      switch (greetingType) {
        case 'morning':
          prompt = `Користувач написав привітання "gm" або "good morning". Відповідай як жива людина: одна коротка фраза українською, дружній тон, без формальностей, без хештегів, максимум один емодзі якщо доречно.`;
          break;
        case 'night':
          prompt = `Користувач написав "gn" або "good night". Відповідай природно українською, побажай доброї ночі однією фразою, без офіціозу, без хештегів, максимум один емодзі.`;
          break;
        case 'afternoon':
          prompt = `Користувач написав "ga" або "good afternoon". Відповідай невимушено українською однією фразою, звучить як друг, без хештегів, максимум один емодзі.`;
          break;
        case 'evening':
          prompt = `Користувач написав "ge" або "good evening". Відповідай невимушено українською однією фразою, без шаблонів, без хештегів, максимум один емодзі.`;
          break;
        case 'motivation':
          prompt = `Користувач написав мотиваційне "wagmi" або "lfg". Підтримай коротко українською, як друг: 6-18 слів, енергійно, без корпоративної мови, без хештегів, максимум один емодзі.`;
          break;
        case 'casual':
          prompt = `Твіт: "${tweetText.substring(0, 100)}". Відповідай природно українською, як жива людина: 8-18 слів, допускаються скорочення, без канцеляризмів, без хештегів, максимум один емодзі, не повторюй дослівно твіт.`;
          break;
        case 'crypto':
          prompt = `Твіт містить крипто сленг: "${tweetText.substring(0, 100)}". Відповідай як досвідчений трейдер українською: невимушено, без води, 8-18 слів, максимум один емодзі, без хештегів.`;
          break;
      }
    } else {
      prompt = `Твіт: "${tweetText.substring(0, 150)}"

Інструкція: дай одну людську відповідь українською (1 фраза, 8-20 слів). Звучить як друг, без канцеляризмів і шаблонів. Не повторюй дослівно слова твіту, не роби зведення. Без хештегів, без лапок, максимум один емодзі якщо доречно.

Твоя відповідь:`;
    }

  } else {
    if (isGreeting) {
      switch (greetingType) {
        case 'morning':
          prompt = `User posted "gm" or "good morning". Reply like a real human friend: one short line, warm and casual, no hashtags, max one emoji if it feels right.`;
          break;
        case 'night':
          prompt = `User posted "gn" or "good night". Reply naturally in English with one line wishing good night, keep it human and light, no hashtags, max one emoji.`;
          break;
        case 'afternoon':
          prompt = `User posted "ga" or "good afternoon". Reply in one casual English line, friendly tone, no hashtags, max one emoji.`;
          break;
        case 'evening':
          prompt = `User posted "ge" or "good evening". Reply in one relaxed English line, keep it human, no hashtags, max one emoji.`;
          break;
        case 'motivation':
          prompt = `User posted motivational "wagmi" or "lfg". Support them in 6-18 words, energetic but human, no corporate tone, no hashtags, max one emoji.`;
          break;
        case 'casual':
          prompt = `Tweet: "${tweetText.substring(0, 100)}". Reply naturally in English like a real person: 8-18 words, abbreviations ok, no stiff phrasing, no hashtags, max one emoji, don’t echo the tweet.`;
          break;
        case 'crypto':
          prompt = `Tweet contains crypto slang: "${tweetText.substring(0, 100)}". Reply like an experienced trader in English: concise, conversational, 8-18 words, no hashtags, max one emoji.`;
          break;
      }
    } else {
      prompt = `Tweet: "${tweetText.substring(0, 150)}"

Instruction: write one human, conversational line in English (1 sentence, 8-20 words). Sound like a person, not corporate. Do not repeat the tweet wording. No hashtags, no quotes, max one emoji if it fits.

Your response:`;
    }
  }

  console.error('🚀🚀🚀 SENDING TO OLLAMA:', modelName);
  console.error('📝 Prompt length:', prompt.length);
  
  const response = await ai.generateText(modelName, prompt);
  
  // Process mentions to prevent duplicates
  const processedResponse = await processMentionsInResponse(response);
  
  // Aggressive cleanup to prevent repetition and long responses
  let cleaned = processedResponse.trim();
  
  // Remove hashtags first (including #DiscordLife, #Solana, etc.)
  cleaned = cleaned.replace(/#[A-Za-z0-9_]+/g, '').trim();
  
  // FIRST: Remove quotes immediately at the start
  cleaned = cleaned.replace(/^["'`«»„""''"\u201C\u201D\u2018\u2019\u00AB\u00BB]+/g, ''); // Remove any quotes at start
  cleaned = cleaned.replace(/["'`«»„""''"\u201C\u201D\u2018\u2019\u00AB\u00BB]+$/g, ''); // Remove any quotes at end
  cleaned = cleaned.trim(); // Trim again after quote removal
  
  // Advanced duplicate detection and removal
  
  // Remove exact sentence duplicates
  const allSentences = cleaned.split(/[.!?]+/);
  const uniqueSentences = [];
  const seenSentences = new Set();
  
  for (let sentence of allSentences) {
    const normalized = sentence.trim().toLowerCase();
    if (normalized && !seenSentences.has(normalized)) {
      seenSentences.add(normalized);
      uniqueSentences.push(sentence.trim());
    }
  }
  
  cleaned = uniqueSentences.join('. ');
  
  // Remove repetitive patterns (same text repeated)
  cleaned = cleaned.replace(/(.{15,}?)\1{1,}/gi, '$1');
  
  // Remove meta-text about instructions  
  cleaned = cleaned.replace(/^(The provided instruction|This is a|Here is a|This response|Impressed with).*/gi, '');
  cleaned = cleaned.replace(/.*instruction.*clear.*specific.*/gi, '');
  cleaned = cleaned.replace(/.*character limit.*/gi, '');
  cleaned = cleaned.replace(/.*initiative.*offer.*raise.*/gi, ''); // Remove specific duplicated phrases
  
  // Remove duplicate phrases within the same text
  const words = cleaned.split(' ');
  for (let i = 0; i < words.length - 5; i++) {
    const phrase = words.slice(i, i + 5).join(' ');
    const restText = words.slice(i + 5).join(' ');
    if (restText.includes(phrase)) {
      // Found duplicate phrase, remove the second occurrence
      const duplicateIndex = restText.indexOf(phrase);
      if (duplicateIndex !== -1) {
        words.splice(i + 5 + duplicateIndex, 5);
      }
    }
  }
  cleaned = words.join(' ');
  
  // Take only the first meaningful sentence
  const finalSentences = cleaned.split(/[.!?]+/);
  if (finalSentences.length > 0) {
    cleaned = finalSentences[0].trim();
  }
  
  // FINAL: Aggressive quote removal with Unicode support
  cleaned = cleaned.replace(/^["'`«»„""''\u201C\u201D\u2018\u2019\u00AB\u00BB\u2039\u203A]+/g, ''); // Remove quotes at start
  cleaned = cleaned.replace(/["'`«»„""''\u201C\u201D\u2018\u2019\u00AB\u00BB\u2039\u203A]+$/g, ''); // Remove quotes at end
  
  // Remove quotes in the middle (like 'Community Superstar')
  // Keep apostrophes for natural contractions; strip only quote-like chars
  cleaned = cleaned.replace(/["`]/g, '');
  
  // Remove any remaining quote wrapping patterns
  const quotePatterns = [
    ['"', '"'], ["'", "'"], ['«', '»'], ['„', '"'], ['\u201C', '\u201D'], 
    ['\u2018', '\u2019'], ['\u00AB', '\u00BB'], ['\u2039', '\u203A']
  ];
  
  for (let [start, end] of quotePatterns) {
    if (cleaned.startsWith(start) && cleaned.endsWith(end) && cleaned.length > 2) {
      cleaned = cleaned.slice(1, -1);
      break; // Only remove one layer at a time
    }
  }
  
  // Final emergency quote removal - if still starts with any quote character
  if (cleaned.match(/^["'`«»„""''\u201C\u201D\u2018\u2019\u00AB\u00BB]/)) {
    cleaned = cleaned.substring(1);
  }
  
  // Final length check - cut at word boundary
  if (cleaned.length > 280) {
    const finalWords = cleaned.substring(0, 277).split(' ');
    finalWords.pop(); // Remove last potentially cut word
    cleaned = finalWords.join(' ') + '...';
  }
  
  // Final trim to ensure no extra spaces
  cleaned = cleaned.trim();
  
  console.error('✂️ Cleaned response:', cleaned);
  console.error('📏 Final length:', cleaned.length);
  
  return cleaned;
}

// System to prevent duplicate mentions of the same users
async function checkMentionAllowed(username) {
  if (!username) return true;
  
  const data = await chrome.storage.local.get(['mentionHistory']);
  const mentionHistory = data.mentionHistory || {};
  
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Clean up old mentions (older than 24 hours)
  for (const [user, timestamp] of Object.entries(mentionHistory)) {
    if (now - timestamp > oneDayMs) {
      delete mentionHistory[user];
    }
  }
  
  // Save cleaned history
  await chrome.storage.local.set({ mentionHistory });
  
  // Check if user was mentioned recently
  const lastMention = mentionHistory[username.toLowerCase()];
  if (lastMention && (now - lastMention < oneDayMs)) {
    console.error('🚫 User @' + username + ' was already mentioned in last 24h');
    return false;
  }
  
  return true;
}

async function recordMention(username) {
  if (!username) return;
  
  const data = await chrome.storage.local.get(['mentionHistory']);
  const mentionHistory = data.mentionHistory || {};
  
  mentionHistory[username.toLowerCase()] = Date.now();
  
  await chrome.storage.local.set({ mentionHistory });
  console.error('✅ Recorded mention of @' + username);
}

// Function to clean mentions from AI response and check for duplicates
async function processMentionsInResponse(response) {
  // Extract mentions from response
  const mentions = response.match(/@\w+/g) || [];
  
  if (mentions.length === 0) return response;
  
  let processedResponse = response;
  
  for (let mention of mentions) {
    const username = mention.substring(1); // Remove @
    
    const allowed = await checkMentionAllowed(username);
    if (!allowed) {
      // Remove the mention or replace with generic term
      processedResponse = processedResponse.replace(mention, 'them');
      console.error('🔄 Replaced duplicate mention @' + username + ' with "them"');
    } else {
      // Record this mention for future checks
      await recordMention(username);
    }
  }
  
  return processedResponse;
}