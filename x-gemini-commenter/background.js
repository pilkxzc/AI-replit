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
  // Use local Ollama - better model for instruction following!
  const OLLAMA_MODEL = 'llama3.2';
  console.error('🧠 USING SMARTER OLLAMA MODEL:', OLLAMA_MODEL);
  
  try {
    // Test Ollama connectivity first
    console.error('🔍 Testing Ollama connectivity...');
    
    return await callOllamaApi(OLLAMA_MODEL, tweetText, customPrompt, language);
  } catch (error) {
    console.error('❌ Ollama API failed:', error.message);
    
    // Provide specific troubleshooting steps
    if (error.message.includes('Failed to fetch') || error.message.includes('Cannot connect')) {
      throw new Error('🚨 Ollama Connection Failed!\n\nPlease restart Ollama with CORS support:\n\n1. Open Command Prompt as Administrator\n2. Run: taskkill /F /IM ollama.exe\n3. Run: set OLLAMA_ORIGINS=* && ollama serve\n4. Wait for "Ollama is running" message\n5. Try the extension again');
    } else if (error.message.includes('timed out') || error.message.includes('25 seconds')) {
      throw new Error('⏰ Ollama Timeout!\n\nThe model is too slow. Try:\n1. ollama run phi3.5 (to preload model)\n2. Use a faster model: ollama pull llama3.2:1b\n3. Restart your computer if Ollama is stuck');
    } else if (error.message.includes('HTTP 404')) {
      throw new Error('🤖 Model Not Found!\n\nPlease install the model:\n1. ollama pull phi3.5\n2. Wait for download to complete\n3. Try again');
    } else {
      throw new Error('🔧 Ollama Error: ' + error.message + '\n\nTry restarting Ollama: set OLLAMA_ORIGINS=* && ollama serve');
    }
  }
}

// No rate limiting needed with Ollama! 🎉

// Ollama AI Client class (local API) - Chrome Service Worker Compatible
class OllamaAI {
  constructor() {
    this.baseUrl = 'http://localhost:11434';
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
      
      // Use fetch with proper timeout handling for service workers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 25000); // 25 second timeout
      
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
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.error('✅ Got response from Ollama');
      
      if (result.response) {
        return result.response;
      } else {
        throw new Error('No response field in Ollama result');
      }
    } catch (error) {
      console.error('🚨 Ollama API Error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 25 seconds');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to Ollama. Ensure it\'s running: ollama serve');
      } else if (error.message.includes('NetworkError')) {
        throw new Error('Network error - check if Ollama is accessible on localhost:11434');
      } else {
        throw error;
      }
    }
  }
}

async function callOllamaApi(modelName, tweetText, customPrompt, language) {
  console.error('🤖🤖🤖 callOllamaApi USING MODEL:', modelName);
  const ai = new OllamaAI();

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
          prompt = `Користувач написав привітання "gm" або "good morning". Відповіси коротко українською як друг:`;
          break;
        case 'night':
          prompt = `Користувач написав "gn" або "good night". Відповіси коротко українською побажавши доброї ночі:`;
          break;
        case 'afternoon':
          prompt = `Користувач написав "ga" або "good afternoon". Відповіси коротко українською:`;
          break;
        case 'evening':
          prompt = `Користувач написав "ge" або "good evening". Відповіси коротко українською:`;
          break;
        case 'motivation':
          prompt = `Користувач написав мотиваційне "wagmi" або "lfg". Підтримай його коротко українською:`;
          break;
        case 'casual':
          prompt = `Твіт: "${tweetText.substring(0, 100)}". Відповіси природно українською на це повідомлення зі скороченнями:`;
          break;
        case 'crypto':
          prompt = `Твіт містить крипто сленг: "${tweetText.substring(0, 100)}". Відповіси як досвідчений трейдер українською:`;
          break;
      }
    } else {
      prompt = `Твіт: "${tweetText.substring(0, 150)}"

Інструкція: Напиши одне коротке речення українською мовою як реакцію на твіт. ВАЖЛИВО: не повторюй слова з твіту, не дублюй текст. Максимум 20 слів.

Твоя відповідь:`;
    }

  } else {
    if (isGreeting) {
      switch (greetingType) {
        case 'morning':
          prompt = `User posted "gm" or "good morning" greeting. Reply shortly in English as a friend:`;
          break;
        case 'night':
          prompt = `User posted "gn" or "good night". Reply shortly in English wishing good night:`;
          break;
        case 'afternoon':
          prompt = `User posted "ga" or "good afternoon". Reply shortly in English:`;
          break;
        case 'evening':
          prompt = `User posted "ge" or "good evening". Reply shortly in English:`;
          break;
        case 'motivation':
          prompt = `User posted motivational "wagmi" or "lfg". Support them shortly in English:`;
          break;
        case 'casual':
          prompt = `Tweet: "${tweetText.substring(0, 100)}". Reply naturally in English to this message with abbreviations:`;
          break;
        case 'crypto':
          prompt = `Tweet contains crypto slang: "${tweetText.substring(0, 100)}". Reply as an experienced trader in English:`;
          break;
      }
    } else {
      prompt = `Tweet: "${tweetText.substring(0, 150)}"

Instruction: Write one short sentence in English as a reaction to the tweet. IMPORTANT: don't repeat words from the tweet, don't duplicate text. Maximum 20 words.

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
  if (cleaned && !cleaned.match(/[.!?]$/)) cleaned += '.';
  
  // Remove repetitive patterns (same text repeated)
  cleaned = cleaned.replace(/(.{15,}?)\1{1,}/gi, '$1');
  
  // Remove meta-text about instructions  
  cleaned = cleaned.replace(/^(The provided instruction|This is a|Here is a|This response|Impressed with).*/gi, '');
  cleaned = cleaned.replace(/.*instruction.*clear.*specific.*/gi, '');
  cleaned = cleaned.replace(/.*character limit.*/gi, '');
  cleaned = cleaned.replace(/.*initiative.*offer.*raise.*/gi, ''); // Remove specific duplicated phrases
  cleaned = cleaned.replace(/#\w+\)\s*,?\s*/g, ' '); // Remove repeated hashtags
  
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
    // Add punctuation if missing
    if (cleaned && !cleaned.match(/[.!?]$/)) {
      cleaned += '.';
    }
  }
  
  // FINAL: Aggressive quote removal with Unicode support
  cleaned = cleaned.replace(/^["'`«»„""''\u201C\u201D\u2018\u2019\u00AB\u00BB\u2039\u203A]+/g, ''); // Remove quotes at start
  cleaned = cleaned.replace(/["'`«»„""''\u201C\u201D\u2018\u2019\u00AB\u00BB\u2039\u203A]+$/g, ''); // Remove quotes at end
  
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