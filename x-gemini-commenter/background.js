chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generate_comment') {
    generateComment(request.tweetText, request.prompt, request.language)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function generateComment(tweetText, customPrompt, language) {
  // Retrieve API key from storage
  const data = await chrome.storage.sync.get(['geminiApiKey', 'geminiModel']);
  const apiKey = data.geminiApiKey;
  const modelName = data.geminiModel || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('API Key not found. Please set it in the extension popup.');
  }

  // Використовуємо модель, яку вказав користувач
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  let baseInstruction = customPrompt || "You are a regular Twitter user. Read the tweet and write a natural, engaging reply.";
  
  let languageInstruction = "";
  if (language === 'uk') {
    languageInstruction = "OUTPUT LANGUAGE: UKRAINIAN (Українська). Write ONLY in Ukrainian.";
  } else if (language === 'en') {
    languageInstruction = "OUTPUT LANGUAGE: ENGLISH. Write ONLY in English. Even if the tweet is in another language, your reply MUST be in English.";
  }

  const finalPrompt = `
${languageInstruction}

CONTEXT: You are a real person replying to a tweet on X (Twitter).
TWEET: "${tweetText}"

YOUR TASK: ${baseInstruction}

STRICT RULES:
1. Follow the OUTPUT LANGUAGE strictly. If it says English, write in English.
2. Do NOT translate the tweet.
3. Do NOT repeat the tweet content.
4. Do NOT summarize the tweet.
5. Write a reaction, opinion, or question based on the tweet.
6. Keep it short (under 280 chars).
7. Output ONLY the text of the reply. No quotes, no preambles.
`;

  const payload = {
    contents: [{
      parts: [{
        text: finalPrompt
      }]
    }]
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to fetch from Gemini API');
  }

  const result = await response.json();
  
  if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
    return result.candidates[0].content.parts[0].text;
  } else {
    throw new Error('No response generated.');
  }
}