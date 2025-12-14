// Icon for the button
const GEMINI_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.02-3.01-1.09-4.12-1.1-1.1-2.72-1.55-4.12-1.09C14.17 2.05 12.93 1.17 11.5 1.17c-1.43 0-2.67.88-3.34 2.19-1.39-.46-3.01-.02-4.12 1.09-1.1 1.1-1.55 2.72-1.09 4.12C2.05 9.33 1.17 10.57 1.17 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.02 3.01 1.09 4.12 1.1 1.1 2.72 1.55 4.12 1.09.67 1.31 1.91 2.19 3.34 2.19 1.43 0 2.67-.88 3.34-2.19 1.39.46 3.01.02 4.12-1.09 1.1-1.1 1.55-2.72 1.09-4.12 1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 6.18-6.18 1.42 1.42-7.6 7.6z"></path>
</svg>
<span>Generate</span>
`;

// Function to get user-friendly error messages
function getUserFriendlyErrorMessage(errorMessage) {
  if (errorMessage.includes('Extension context invalidated')) {
    return 'Extension was reloaded. Please refresh the page to continue.';
  } else if (errorMessage.includes('rate limited') || errorMessage.includes('wait')) {
    return 'API rate limit reached. Please wait a few minutes before trying again.';
  } else if (errorMessage.includes('API Key not found')) {
    return 'Please configure your Gemini API keys in the extension popup.';
  } else if (errorMessage.includes('All API keys failed') || errorMessage.includes('quota')) {
    return 'All API keys have exceeded their quotas. Please wait or add more API keys.';
  } else if (errorMessage.includes('401') || errorMessage.includes('Invalid API key')) {
    return 'Invalid API key. Please check your API keys in the extension settings.';
  } else if (errorMessage.includes('429')) {
    return 'Rate limit exceeded. Please try again in a few minutes.';
  } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'Model not available. Using fixed model: gemini-2.0-flash';
  } else {
    return 'Error generating comment: ' + errorMessage;
  }
}

// Function to show user-friendly error messages
function showUserFriendlyError(errorMessage) {
  alert(getUserFriendlyErrorMessage(errorMessage));
}

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
          // Check if extension context is still valid
          if (!chrome.runtime?.id) {
            alert('Розширення було перезагружено. Оновлюю сторінку...');
            window.location.reload();
            return;
          }
          
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
            showUserFriendlyError(response.error);
          }
        } catch (err) {
          console.error(err);
          if (err.message && err.message.includes('Extension context invalidated')) {
            alert('Розширення було перезагружено. Оновлюю сторінку...');
            window.location.reload();
          } else {
            showUserFriendlyError('Unexpected error occurred');
          }
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
        editor = modal.querySelector('[data-testid="tweetTextarea_0"]') || 
                 modal.querySelector('[role="textbox"]') ||
                 modal.querySelector('.public-DraftEditor-content') ||
                 modal.querySelector('[contenteditable="true"]');
      } else {
        editor = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                 document.querySelector('[role="textbox"]') ||
                 document.querySelector('.public-DraftEditor-content') ||
                 document.querySelector('[contenteditable="true"]');
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
  console.log('🔧 Inserting text into editor:', editorElement);
  
  // Focus and click the editor
  editorElement.focus();
  editorElement.click();

  // Clear any existing content by selecting all and deleting
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);

  // Method 1: Use the reliable paste simulation
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', text);
  
  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true,
    composed: true
  });
  
  // Dispatch paste event
  editorElement.dispatchEvent(pasteEvent);
  
  // Wait a bit and check if it worked
  setTimeout(() => {
    if (!editorElement.innerText || editorElement.innerText.trim() === '') {
      console.log('🔧 Paste failed, trying execCommand...');
      
      // Method 2: Use execCommand insertText
      editorElement.focus();
      document.execCommand('insertText', false, text);
      
      // Check again
      setTimeout(() => {
        if (!editorElement.innerText || editorElement.innerText.trim() === '') {
          console.log('🔧 execCommand failed, trying direct manipulation...');
          
          // Method 3: Direct DOM manipulation as last resort
          editorElement.innerText = text;
          
          // Trigger all possible React events
          const events = [
            new Event('input', { bubbles: true, composed: true }),
            new Event('change', { bubbles: true, composed: true }),
            new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
            new Event('keyup', { bubbles: true }),
            new Event('keydown', { bubbles: true })
          ];
          
          events.forEach(event => {
            editorElement.dispatchEvent(event);
          });
        }
        
        // Final verification and React state sync
        const finalEvents = [
          new Event('input', { bubbles: true }),
          new Event('change', { bubbles: true }),
          new Event('blur', { bubbles: true })
        ];
        
        finalEvents.forEach(event => {
          editorElement.dispatchEvent(event);
        });
        
        // Force React to update by focusing away and back
        setTimeout(() => {
          document.body.focus();
          setTimeout(() => {
            editorElement.focus();
          }, 50);
        }, 100);
        
      }, 200);
    }
  }, 300);
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
    <div class="gemini-auto-panel-header">
      <h3>⚡ Autopilot</h3>
      <div class="gemini-panel-drag-indicator"></div>
    </div>
    <div class="gemini-auto-panel-body">
      <div class="gemini-auto-status" id="geminiStatus">READY</div>
      <div class="gemini-auto-controls">
        <button class="gemini-btn gemini-btn-start" id="geminiStartBtn">START</button>
        <button class="gemini-btn gemini-btn-stop" id="geminiStopBtn" disabled>STOP</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  autoPanel = panel;

  // Make panel draggable
  makeDraggable(panel);

  document.getElementById('geminiStartBtn').addEventListener('click', startAutoPilot);
  document.getElementById('geminiStopBtn').addEventListener('click', stopAutoPilot);
}

function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector('.gemini-auto-panel-header');
  
  if (header) {
    header.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    let newTop = element.offsetTop - pos2;
    let newLeft = element.offsetLeft - pos1;
    
    // Keep panel within viewport
    const maxTop = window.innerHeight - element.offsetHeight;
    const maxLeft = window.innerWidth - element.offsetWidth;
    
    newTop = Math.max(0, Math.min(newTop, maxTop));
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    
    element.style.top = newTop + "px";
    element.style.left = newLeft + "px";
    element.style.bottom = "auto";
    element.style.right = "auto";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function updateStatus(text) {
  const el = document.getElementById('geminiStatus');
  if (el) el.innerText = text;
}

function stopAutoPilot() {
  isAutoRunning = false;
  document.getElementById('geminiStartBtn').disabled = false;
  document.getElementById('geminiStopBtn').disabled = true;
  updateStatus('STOPPED');
}

async function startAutoPilot() {
  isAutoRunning = true;
  document.getElementById('geminiStartBtn').disabled = true;
  document.getElementById('geminiStopBtn').disabled = false;
  
  // Get limit
  const settings = await chrome.storage.sync.get(['maxComments']);
  maxCommentsLimit = settings.maxComments || 0;
  commentsCount = 0;

  updateStatus(`RUNNING | ${maxCommentsLimit > 0 ? maxCommentsLimit : '∞'}`);

  while (isAutoRunning) {
    // Check limit
    if (maxCommentsLimit > 0 && commentsCount >= maxCommentsLimit) {
      updateStatus('LIMIT REACHED');
      stopAutoPilot();
      break;
    }

    try {
      await processNextTweetInLoop();
    } catch (e) {
      console.error('Auto-Pilot Error:', e);
      updateStatus('ERROR: ' + e.message.substring(0, 30));
      await wait(5000); // Wait before retrying
    }
  }
}

async function processNextTweetInLoop() {
  if (!isAutoRunning) return;

  // 1. Find visible tweets
  const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  
  // Get settings
  const settings = await chrome.storage.sync.get(['minDelay', 'maxDelay', 'autoSend', 'autoLike', 'verifiedOnly', 'skipReplies', 'likeProbability', 'myUsername', 'blacklist']);
  const myUsername = settings.myUsername ? settings.myUsername.toLowerCase() : null;
  const blacklist = settings.blacklist || [];

  // 2. Find first unprocessed tweet
  let targetTweet = null;
  
  for (const tweet of tweets) {
    // Skip if already processed in this session
    if (tweet.hasAttribute('data-gemini-processed')) continue;
    
    // Additional check - skip if tweet is currently being processed
    if (tweet.classList.contains('gemini-processing')) continue;
    
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

    // Check Blacklist
    if (author && blacklist.length > 0) {
      const authorLower = author.toLowerCase();
      if (blacklist.includes(authorLower)) {
        console.log(`🚫 Blacklist: Skipping @${author}`);
        tweet.setAttribute('data-gemini-processed', 'true');
        continue;
      }
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
    updateStatus('SCROLLING...');
    window.scrollBy(0, 500);
    await wait(2000);
    return;
  }

  // 3. Mark tweet as being processed to prevent duplicate processing
  targetTweet.classList.add('gemini-processing');
  targetTweet.setAttribute('data-gemini-processed', 'true'); // Mark immediately
  
  // Scroll to tweet
  targetTweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateStatus(`PROCESSING ${commentsCount}/${maxCommentsLimit > 0 ? maxCommentsLimit : '∞'}`);
  
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
        updateStatus('LIKING...');
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
  updateStatus('AI GENERATING...');
  
  // 5. Wait for editor and Generate
  await wait(2000); // Wait for modal
  
  const text = findTweetText(targetTweet);
  if (!text) {
    closeModal();
    targetTweet.setAttribute('data-gemini-processed', 'true');
    return;
  }

  try {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      updateStatus('Extension reloaded. Refreshing page...');
      await wait(1000);
      window.location.reload();
      return;
    }
    
    // Call API
    const apiSettings = await chrome.storage.sync.get(['geminiPrompt', 'geminiLanguage']);
    const response = await chrome.runtime.sendMessage({
      action: 'generate_comment',
      tweetText: text,
      prompt: apiSettings.geminiPrompt,
      language: apiSettings.geminiLanguage
    });

    if (!response.success) {
      // For auto-pilot, log the error but continue with next tweet
      console.error('Comment generation failed:', response.error);
      updateStatus(`Error: ${getUserFriendlyErrorMessage(response.error)}`);
      throw new Error(response.error);
    }

    // Insert text
    // We need to find the editor again because it's in the modal now
    let editor = document.querySelector('[data-testid="tweetTextarea_0"]');
    
    // If not found, try alternative selectors
    if (!editor) {
      editor = document.querySelector('[role="textbox"]');
    }
    if (!editor) {
      editor = document.querySelector('.public-DraftEditor-content');
    }
    if (!editor) {
      editor = document.querySelector('[contenteditable="true"]');
    }
    
    if (editor) {
      console.log('🎯 Found editor element:', editor);
      insertTextIntoEditor(editor, response.data);
      updateStatus('Comment inserted.');
      
      // 6. Auto Send if enabled
      if (settings.autoSend) {
        updateStatus('Auto-sending in 3s...');
        await wait(3000); // Longer delay to ensure text is properly inserted
        
        const sendBtn = document.querySelector('[data-testid="tweetButton"]');
        if (sendBtn && !sendBtn.disabled) {
          console.log('🚀 Clicking send button:', sendBtn);
          sendBtn.click();
          commentsCount++; // Increment counter
          
          // Mark as persistently replied
          const tweetId = getTweetId(targetTweet);
          if (tweetId) await markAsReplied(tweetId);

          updateStatus(`Sent! (${commentsCount}/${maxCommentsLimit > 0 ? maxCommentsLimit : '∞'})`);
          await wait(3000); // Wait for send animation
        } else {
          updateStatus('Send button not found or disabled.');
          console.error('❌ Send button issue:', sendBtn ? 'disabled' : 'not found');
        }
      } else {
        updateStatus('Auto-send OFF. Pausing.');
        stopAutoPilot();
        return; 
      }
    } else {
      updateStatus('Editor not found!');
      console.error('❌ Could not find tweet editor element');
    }
  } catch (err) {
    console.error(err);
    
    // Check if it's a context invalidation error
    if (err.message && (err.message.includes('Extension context invalidated') || 
        err.message.includes('message port closed') ||
        err.message.includes('disconnected port'))) {
      updateStatus('Extension reloaded. Refreshing...');
      await wait(1000);
      window.location.reload();
      return;
    }
    
    updateStatus('Error generating.');
    closeModal(); // Try to close to recover
  } finally {
    // Always remove processing flag
    targetTweet.classList.remove('gemini-processing');
    
    // Close modal after processing to prevent re-entering the same tweet
    setTimeout(() => {
      closeModal();
    }, 1000);
  }
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
