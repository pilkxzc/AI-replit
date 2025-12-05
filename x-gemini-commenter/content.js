// Icon for the button
const GEMINI_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.02-3.01-1.09-4.12-1.1-1.1-2.72-1.55-4.12-1.09C14.17 2.05 12.93 1.17 11.5 1.17c-1.43 0-2.67.88-3.34 2.19-1.39-.46-3.01-.02-4.12 1.09-1.1 1.1-1.55 2.72-1.09 4.12C2.05 9.33 1.17 10.57 1.17 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.02 3.01 1.09 4.12 1.1 1.1 2.72 1.55 4.12 1.09.67 1.31 1.91 2.19 3.34 2.19 1.43 0 2.67-.88 3.34-2.19 1.39.46 3.01.02 4.12-1.09 1.1-1.1 1.55-2.72 1.09-4.12 1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 6.18-6.18 1.42 1.42-7.6 7.6z"></path>
</svg>
<span>Generate</span>
`;

function createAIButton() {
  const btn = document.createElement('div');
  btn.className = 'gemini-reply-btn';
  btn.role = 'button';
  btn.innerHTML = GEMINI_ICON;
  btn.title = 'Згенерувати відповідь (Gemini)';
  return btn;
}

function findTweetText(tweetElement) {
  const textNode = tweetElement.querySelector('[data-testid="tweetText"]');
  return textNode ? textNode.innerText : '';
}

function injectButtons() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  
  tweets.forEach(tweet => {
    // Check if we already injected
    if (tweet.querySelector('.gemini-reply-btn')) return;

    // Find the action bar (Reply, Retweet, Like, Share)
    const actionBar = tweet.querySelector('div[role="group"]');
    if (actionBar) {
      const btn = createAIButton();
      
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const text = findTweetText(tweet);
        if (!text) {
          alert('Could not find tweet text.');
          return;
        }

        // Visual feedback
        btn.classList.add('gemini-loading');
        btn.innerHTML = '<span>Generating...</span>';

        try {
          // Get settings
          const settings = await chrome.storage.sync.get(['geminiPrompt', 'geminiLanguage']);
          
          // Send to background
          const response = await chrome.runtime.sendMessage({
            action: 'generate_comment',
            tweetText: text,
            prompt: settings.geminiPrompt,
            language: settings.geminiLanguage
          });

          if (response.success) {
            openReplyAndInsert(tweet, response.data);
          } else {
            alert('Error: ' + response.error);
          }
        } catch (err) {
          console.error(err);
          alert('Error generating comment');
        } finally {
          btn.classList.remove('gemini-loading');
          btn.innerHTML = GEMINI_ICON;
        }
      });

      // Append to the action bar
      actionBar.appendChild(btn);
    }
  });
}

async function openReplyAndInsert(tweetElement, text) {
  // 1. Click the reply button on the tweet to open the modal/inline editor
  const replyBtn = tweetElement.querySelector('[data-testid="reply"]');
  if (replyBtn) {
    replyBtn.click();
    
    // 2. Wait for the editor to appear
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds approx
    
    const interval = setInterval(() => {
      attempts++;
      // Look for the visible editor. Usually in a modal (role=dialog) or inline.
      // We prioritize the one in the dialog if it exists.
      const modal = document.querySelector('[role="dialog"]');
      let editor;
      
      if (modal) {
        editor = modal.querySelector('[data-testid="tweetTextarea_0"]');
      } else {
        editor = document.querySelector('[data-testid="tweetTextarea_0"]');
      }
      
      // Check if editor is visible
      if (editor && editor.offsetParent !== null) {
        clearInterval(interval);
        // Small delay to ensure React is ready
        setTimeout(() => insertTextIntoEditor(editor, text), 500);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('Could not find reply editor');
      }
    }, 100);
  }
}

function insertTextIntoEditor(editorElement, text) {
  // Focus the editor
  editorElement.focus();
  editorElement.click();

  // Select all existing text to replace it (optional, but cleaner)
  document.execCommand('selectAll', false, null);

  // Method: Simulate Paste
  // This is the most reliable way to trigger React's internal state update
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', text);
  
  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true,
    view: window,
    composed: true
  });
  
  editorElement.dispatchEvent(pasteEvent);

  // Fallback: execCommand if paste didn't work visually (though paste is better for React)
  if (editorElement.innerText.trim() === '') {
     document.execCommand('insertText', false, text);
  }
  
  // Dispatch multiple events to wake up the UI
  const events = ['input', 'change', 'textInput'];
  events.forEach(eventType => {
    editorElement.dispatchEvent(new Event(eventType, { bubbles: true, composed: true }));
  });
}

// Observer to handle infinite scroll
const observer = new MutationObserver((mutations) => {
  injectButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// --- HELPERS FOR TWEET ANALYSIS ---

function getTweetId(tweetElement) {
  // Try to find the status link
  const links = tweetElement.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    const match = link.href.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  return null;
}

function getTweetAuthor(tweetElement) {
  // Look for the @handle
  // Usually in a span starting with @, or inside User-Name data-testid
  const userInfo = tweetElement.querySelector('[data-testid="User-Name"]');
  if (userInfo) {
    const text = userInfo.innerText;
    // Extract @handle from text like "Name @handle · 2h"
    const match = text.match(/@([a-zA-Z0-9_]+)/);
    if (match) return match[1];
  }
  return null;
}

function isVerified(tweetElement) {
  const userInfo = tweetElement.querySelector('[data-testid="User-Name"]');
  if (!userInfo) return false;
  
  // Look for the verified badge SVG
  // It usually has aria-label="Verified account" or "Verified organization"
  const verifiedBadge = userInfo.querySelector('svg[aria-label="Verified account"], svg[aria-label="Verified organization"], svg[data-testid="icon-verified"]');
  return !!verifiedBadge;
}

function isReply(tweetElement) {
  // Check if the tweet is a reply to someone else
  // We look for the "Replying to @..." text
  const spans = tweetElement.querySelectorAll('span');
  for (const span of spans) {
    const text = span.innerText;
    if (text.startsWith('Replying to @') || text.startsWith('У відповідь @') || text.startsWith('В ответ @')) {
      return true;
    }
  }
  return false;
}

// --- HISTORY MANAGEMENT ---
async function hasRepliedTo(tweetId) {
  if (!tweetId) return false;
  const data = await chrome.storage.local.get(['repliedTweets']);
  const history = data.repliedTweets || [];
  return history.includes(tweetId);
}

async function markAsReplied(tweetId) {
  if (!tweetId) return;
  const data = await chrome.storage.local.get(['repliedTweets']);
  let history = data.repliedTweets || [];
  
  // Keep history size manageable (e.g., last 1000 tweets)
  if (history.length > 1000) {
    history = history.slice(-900);
  }
  
  if (!history.includes(tweetId)) {
    history.push(tweetId);
    await chrome.storage.local.set({ repliedTweets: history });
  }
}

// --- AUTO PILOT LOGIC ---

let isAutoRunning = false;
let processedTweets = new Set();
let autoPanel = null;
let commentsCount = 0;
let maxCommentsLimit = 0;

function createAutoPanel() {
  if (document.querySelector('.gemini-auto-panel')) return;

  const panel = document.createElement('div');
  panel.className = 'gemini-auto-panel';
  panel.innerHTML = `
    <h3>Gemini Auto-Pilot</h3>
    <div class="gemini-auto-status" id="geminiStatus">Ready to start</div>
    <div class="gemini-auto-controls">
      <button class="gemini-btn gemini-btn-start" id="geminiStartBtn">Start</button>
      <button class="gemini-btn gemini-btn-stop" id="geminiStopBtn" disabled>Stop</button>
    </div>
  `;
  
  document.body.appendChild(panel);
  autoPanel = panel;

  document.getElementById('geminiStartBtn').addEventListener('click', startAutoPilot);
  document.getElementById('geminiStopBtn').addEventListener('click', stopAutoPilot);
}

function updateStatus(text) {
  const el = document.getElementById('geminiStatus');
  if (el) el.innerText = text;
}

function stopAutoPilot() {
  isAutoRunning = false;
  document.getElementById('geminiStartBtn').disabled = false;
  document.getElementById('geminiStopBtn').disabled = true;
  updateStatus('Stopped.');
}

async function startAutoPilot() {
  isAutoRunning = true;
  document.getElementById('geminiStartBtn').disabled = true;
  document.getElementById('geminiStopBtn').disabled = false;
  
  // Get limit
  const settings = await chrome.storage.sync.get(['maxComments']);
  maxCommentsLimit = settings.maxComments || 0;
  commentsCount = 0;

  updateStatus(`Starting... Limit: ${maxCommentsLimit > 0 ? maxCommentsLimit : '∞'}`);

  while (isAutoRunning) {
    // Check limit
    if (maxCommentsLimit > 0 && commentsCount >= maxCommentsLimit) {
      updateStatus('Limit reached. Done!');
      stopAutoPilot();
      break;
    }

    try {
      await processNextTweetInLoop();
    } catch (e) {
      console.error('Auto-Pilot Error:', e);
      updateStatus('Error: ' + e.message);
      await wait(5000); // Wait before retrying
    }
  }
}

async function processNextTweetInLoop() {
  if (!isAutoRunning) return;

  // 1. Find visible tweets
  const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  
  // Get settings
  const settings = await chrome.storage.sync.get(['minDelay', 'maxDelay', 'autoSend', 'autoLike', 'verifiedOnly', 'skipReplies', 'likeProbability', 'myUsername']);
  const myUsername = settings.myUsername ? settings.myUsername.toLowerCase() : null;

  // 2. Find first unprocessed tweet
  let targetTweet = null;
  
  for (const tweet of tweets) {
    // Skip if already processed in this session
    if (tweet.hasAttribute('data-gemini-processed')) continue;
    
    // Check persistent history
    const tweetId = getTweetId(tweet);
    if (tweetId && await hasRepliedTo(tweetId)) {
      tweet.setAttribute('data-gemini-processed', 'true'); // Mark as processed so we don't check storage again
      continue;
    }

    // Check author (Self-Spam Protection)
    const author = getTweetAuthor(tweet);
    if (myUsername && author && author.toLowerCase() === myUsername) {
      console.log(`Skipping my own tweet: @${author}`);
      tweet.setAttribute('data-gemini-processed', 'true');
      continue;
    }

    // Check Verified Only
    if (settings.verifiedOnly) {
      if (!isVerified(tweet)) {
        console.log(`Skipping non-verified user: @${author}`);
        tweet.setAttribute('data-gemini-processed', 'true');
        continue;
      }
    }

    // Check Skip Replies
    if (settings.skipReplies !== false) { // Default to true if undefined
      if (isReply(tweet)) {
        console.log(`Skipping reply: @${author}`);
        tweet.setAttribute('data-gemini-processed', 'true');
        continue;
      }
    }

    // If we passed all checks
    targetTweet = tweet;
    break;
  }

  if (!targetTweet) {
    updateStatus('No new tweets. Scrolling...');
    window.scrollBy(0, 500);
    await wait(2000);
    return;
  }

  // 3. Scroll to tweet
  targetTweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateStatus(`Found tweet. Waiting delay... (${commentsCount}/${maxCommentsLimit > 0 ? maxCommentsLimit : '∞'})`);
  
  const minDelay = (settings.minDelay || 5) * 1000;
  const maxDelay = (settings.maxDelay || 15) * 1000;
  
  // Random delay before action
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  await wait(delay);

  if (!isAutoRunning) return;

  // --- AUTO LIKE LOGIC ---
  if (settings.autoLike) {
    const probability = settings.likeProbability !== undefined ? settings.likeProbability : 50;
    const shouldLike = Math.random() * 100 < probability;
    
    if (shouldLike) {
      // Look for the like button. It usually has data-testid="like"
      const likeBtn = targetTweet.querySelector('[data-testid="like"]');
      if (likeBtn) {
        updateStatus('Liking tweet...');
        likeBtn.click();
        await wait(1000 + Math.random() * 1000); // Natural delay after like
      }
    }
  }

  // 4. Click Reply Button on the tweet
  const replyBtn = targetTweet.querySelector('[data-testid="reply"]');
  if (!replyBtn) {
    targetTweet.setAttribute('data-gemini-processed', 'true'); // Skip if no reply button
    return;
  }
  
  replyBtn.click();
  updateStatus('Generating comment...');
  
  // 5. Wait for editor and Generate
  await wait(2000); // Wait for modal
  
  const text = findTweetText(targetTweet);
  if (!text) {
    closeModal();
    targetTweet.setAttribute('data-gemini-processed', 'true');
    return;
  }

  try {
    // Call API
    const apiSettings = await chrome.storage.sync.get(['geminiPrompt', 'geminiLanguage']);
    const response = await chrome.runtime.sendMessage({
      action: 'generate_comment',
      tweetText: text,
      prompt: apiSettings.geminiPrompt,
      language: apiSettings.geminiLanguage
    });

    if (!response.success) throw new Error(response.error);

    // Insert text
    // We need to find the editor again because it's in the modal now
    const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (editor) {
      insertTextIntoEditor(editor, response.data);
      updateStatus('Comment inserted.');
      
      // 6. Auto Send if enabled
      if (settings.autoSend) {
        updateStatus('Auto-sending in 2s...');
        await wait(2000); // Small delay before clicking send
        
        const sendBtn = document.querySelector('[data-testid="tweetButton"]');
        if (sendBtn) {
          sendBtn.click();
          commentsCount++; // Increment counter
          
          // Mark as persistently replied
          const tweetId = getTweetId(targetTweet);
          if (tweetId) await markAsReplied(tweetId);

          updateStatus(`Sent! (${commentsCount}/${maxCommentsLimit > 0 ? maxCommentsLimit : '∞'})`);
          await wait(3000); // Wait for send animation
        } else {
          updateStatus('Send button not found.');
        }
      } else {
        updateStatus('Auto-send OFF. Pausing.');
        stopAutoPilot();
        return; 
      }
    }
  } catch (err) {
    console.error(err);
    updateStatus('Error generating.');
    closeModal(); // Try to close to recover
  }

  // Mark as processed (session level)
  targetTweet.setAttribute('data-gemini-processed', 'true');
}

function closeModal() {
  const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
  if (closeBtn) closeBtn.click();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initial run
injectButtons();
createAutoPanel();
