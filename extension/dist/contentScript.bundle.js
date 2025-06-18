(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Logger = require('./contentScript/logger');
const LINKEDIN_SELECTORS = require('./contentScript/selectors');
const rateLimiter = require('./contentScript/rateLimiter');
const { fillCommentField } = require('./contentScript/commentFieldUtils');
const { setupCommentSectionObserver } = require('./contentScript/mutationObserver');

const ATTACH_SUBMIT_LISTENER_DELAY_MS = 500; // 0.5 seconds

// Attach a click listener to the LinkedIn "Comment" button
function attachCommentSubmitListener(commentSection) {
  const submitButton = commentSection.querySelector(LINKEDIN_SELECTORS.COMMENT_SUBMIT_BUTTON);
  if (!submitButton) {
    Logger.warn('No comment submit button found to attach listener.');
    return;
  }
  if (submitButton.hasAttribute('data-ava-listener')) return;
  submitButton.addEventListener('click', () => {
    rateLimiter.recordCommentPost(() => {
      rateLimiter.getCommentCountsForTimeFrames((counts) => {
        const exceeded = counts.filter(f => f.count >= f.threshold);
        if (exceeded.length > 0) {
          const avaButton = commentSection.querySelector('.linkedin-comment-assistant-btn');
          rateLimiter.showRateLimitPopup(exceeded, avaButton);
        }
      });
    });
  });
  submitButton.setAttribute('data-ava-listener', 'true');
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "commentStreamUpdate") {
    if (message.error) {
      Logger.error("Error generating comment:", message.error);
      return;
    }
    fillCommentField(message.comment, window.currentCommentField);
    if (message.done === true && window.currentCommentSection) {
      setTimeout(() => {
        attachCommentSubmitListener(window.currentCommentSection);
      }, ATTACH_SUBMIT_LISTENER_DELAY_MS);
    }
  }
});

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  setupCommentSectionObserver();
});
},{"./contentScript/commentFieldUtils":3,"./contentScript/logger":5,"./contentScript/mutationObserver":6,"./contentScript/rateLimiter":7,"./contentScript/selectors":8}],2:[function(require,module,exports){
const Logger = require('./logger');
const LINKEDIN_SELECTORS = require('./selectors');
const { showFloatingMessage } = require('./floatingMessage');
const { updateCommentPlaceholder } = require('./commentFieldUtils');

function getElementSelector(element) {
  if (!element) return '';
  let path = [];
  let currentElement = element;
  while (currentElement && currentElement !== document.body) {
    let selector = currentElement.tagName.toLowerCase();
    if (currentElement.id) {
      selector += '#' + currentElement.id;
    } else {
      if (currentElement.className && typeof currentElement.className === 'string') {
        selector += '.' + currentElement.className.trim().replace(/\s+/g, '.');
      }
      const siblings = Array.from(currentElement.parentNode.children);
      const index = siblings.indexOf(currentElement);
      if (siblings.length > 1) {
        selector += `:nth-child(${index + 1})`;
      }
    }
    path.unshift(selector);
    currentElement = currentElement.parentNode;
  }
  return path.join(' > ');
}

function extractPostContent(section) {
  let postContent = "";
  try {
    const postContainer = section.closest(LINKEDIN_SELECTORS.POST_CONTAINER);
    if (postContainer) {
      const postElement = postContainer.querySelector(LINKEDIN_SELECTORS.POST_CONTENT);
      if (postElement && postElement.textContent.trim()) {
        postContent = postElement.textContent.trim()
          .replace(/\s+/g, ' ')
          .replace(/[\n\r]+/g, ' ');
        const maxLength = 3000;
        postContent = postContent.length > maxLength 
          ? postContent.substring(0, maxLength) + '...'
          : postContent;
      }
    }
  } catch (error) {
    Logger.error('extractPostContent failed:', error);
  }
  return postContent;
}

function generateComment(buttonElement, commentSection) {
  const postContent = buttonElement.getAttribute('data-post-content');
  if (!postContent) {
    Logger.error("No post content found for comment generation.");
    return;
  }
  chrome.runtime.sendMessage({ action: "checkAuthStatus" }, function(authResponse) {
    if (!authResponse || !authResponse.isAuthenticated) {
      showFloatingMessage({
        anchorElement: buttonElement,
        title: "Sign in to generate comments",
        body: "To generate personalized comments, please sign in to your account."
      });
      return;
    }
    window.currentCommentButton = buttonElement;
    const targetInputSelector = buttonElement.getAttribute('data-target-input-selector');
    let inputField = null;
    if (targetInputSelector) {
      try {
        inputField = document.querySelector(targetInputSelector);
      } catch (e) {
        Logger.warn('Selector error, fallback to other methods:', e);
      }
    }
    if (!inputField) {
      inputField = 
        commentSection.querySelector('div[role="textbox"][contenteditable="true"]') || 
        commentSection.querySelector('.ql-editor[contenteditable="true"]') ||
        (commentSection.getAttribute('role') === 'textbox' ? commentSection : null);
    }
    if (inputField) {
      inputField.focus();
      updateCommentPlaceholder("Thinking...", inputField);
      window.currentCommentField = inputField;
    } else {
      Logger.warn("No input field found for comment button.");
    }
    window.currentCommentSection = commentSection;
    chrome.runtime.sendMessage(
      {
        action: "generateComment", 
        postContent: postContent
      },
      function(response) {
        if (chrome.runtime.lastError) {
          Logger.error("Comment generation error:", chrome.runtime.lastError.message);
          if (window.currentCommentField) {
            updateCommentPlaceholder("Add a comment…", window.currentCommentField);
          }
          return;
        }
        if (response && response.code === "NO_CREDITS") {
          showFloatingMessage({
            anchorElement: buttonElement,
            title: "You're out of free comments",
            body: "You've used all your free comment generations. Upgrade to Pro to unlock unlimited suggestions and boost your engagement.",
            actionText: "Go Pro",
            actionHref: "https://linkedin-auto-comment.vercel.app/"
          });
          if (window.currentCommentField) {
            updateCommentPlaceholder("Add a comment…", window.currentCommentField);
          }
        }
      }
    );
  });
}

function injectCommentAssistantButton() {
  const commentSections = document.querySelectorAll(LINKEDIN_SELECTORS.COMMENT_SECTIONS);
  commentSections.forEach((section) => {
    if (section.closest(LINKEDIN_SELECTORS.REPLY_BOX) || 
        section.parentElement?.closest(LINKEDIN_SELECTORS.REPLY_BOX)) {
      return;
    }
    if (section.hasAttribute('data-assistant-button-added')) {
      return;
    }
    const editor = section.closest('.comments-comment-texteditor');
    const actionsArea = editor ? editor.querySelector('.display-flex') : null;
    if (actionsArea) {
      if (actionsArea.querySelector('.linkedin-comment-assistant-btn')) {
        section.setAttribute('data-assistant-button-added', 'true');
        return;
      }
      const postContent = extractPostContent(section);
      const assistantButton = document.createElement('button');
      assistantButton.className = 'linkedin-comment-assistant-btn artdeco-button artdeco-button--circle artdeco-button--muted artdeco-button--2 artdeco-button--tertiary';
      assistantButton.title = 'Generate AI Comment';
      assistantButton.innerHTML = '<img src="' + chrome.runtime.getURL('../public/button.png') + '" alt="AI" width="20" height="20">';
      assistantButton.setAttribute('type', 'button');
      assistantButton.setAttribute('data-post-content', postContent);
      let inputField = null;
      if (section.getAttribute('contenteditable') === 'true') {
        inputField = section;
      } else {
        inputField = section.querySelector('div[role="textbox"][contenteditable="true"]');
      }
      if (inputField) {
        assistantButton.setAttribute('data-target-input-selector', getElementSelector(inputField));
      }
      assistantButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        generateComment(event.currentTarget, section);
      });
      const buttonContainer = actionsArea.querySelector(LINKEDIN_SELECTORS.BUTTON_CONTAINER);
      if (buttonContainer) {
        buttonContainer.prepend(assistantButton);
      }
      section.setAttribute('data-assistant-button-added', 'true');
    } else {
      Logger.warn('No actions area found for comment section.');
    }
  });
}

module.exports = {
  injectCommentAssistantButton
}; 
},{"./commentFieldUtils":3,"./floatingMessage":4,"./logger":5,"./selectors":8}],3:[function(require,module,exports){
function updateCommentPlaceholder(newPlaceholder, commentField) {
  try {
    commentField.setAttribute('data-placeholder', newPlaceholder);
    commentField.setAttribute('aria-placeholder', newPlaceholder);
    return true;
  } catch (error) {
    return false;
  }
}

function fillCommentField(text, specificField = null) {
  try {
    let commentField = specificField;
    commentField.focus();
    commentField.textContent = text;
    commentField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(commentField);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return {success: true};
  } catch (error) {
    return {success: false, error: error.toString()};
  }
}

module.exports = { updateCommentPlaceholder, fillCommentField }; 
},{}],4:[function(require,module,exports){
function showFloatingMessage({ anchorElement, title, body, actionText, actionHref, onAction }) {
  // Remove any existing popup
  const existing = document.querySelector('.ava-ai-message-popup');
  if (existing) existing.remove();

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'ava-ai-message-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.innerHTML = `
    <div class="ava-ai-message-popup-title">${title}</div>
    <div class="ava-ai-message-popup-body">${body}</div>
    ${actionText && actionHref ? `<a class="ava-ai-message-popup-action" href="${actionHref}" target="_blank" rel="noopener">${actionText}</a>` : ''}
  `;

  // Optional action callback (for sign-in, etc)
  if (actionText && !actionHref && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.className = 'ava-ai-message-popup-action';
    btn.textContent = actionText;
    btn.onclick = (e) => {
      e.preventDefault();
      onAction();
      popup.remove();
    };
    popup.appendChild(btn);
  }

  document.body.appendChild(popup);

  // Position popup near anchorElement
  anchorElement.offsetHeight; // Force reflow
  const rect = anchorElement.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.zIndex = 99999;
  popup.style.top = `${rect.bottom + 8}px`;
  popup.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;

  // Dismiss logic
  let dismissTimeout;
  let hovered = false;
  function removePopup() { if (popup.parentNode) popup.parentNode.removeChild(popup); }
  function scheduleDismiss() {
    dismissTimeout = setTimeout(() => { if (!hovered) removePopup(); }, 5000);
  }
  popup.addEventListener('mouseenter', () => { hovered = true; clearTimeout(dismissTimeout); });
  popup.addEventListener('mouseleave', () => { hovered = false; scheduleDismiss(); });
  document.addEventListener('mousedown', function onDocClick(e) {
    if (!popup.contains(e.target)) {
      removePopup();
      document.removeEventListener('mousedown', onDocClick);
    }
  });
  scheduleDismiss();
}

module.exports = { showFloatingMessage }; 
},{}],5:[function(require,module,exports){
const Logger = {
  prefix: '[AVA.AI]',
  log: function(message, ...args) {
    console.log(`${this.prefix} ${message}`, ...args);
  },
  error: function(message, ...args) {
    console.error(`${this.prefix} ${message}`, ...args);
  },
  warn: function(message, ...args) {
    console.warn(`${this.prefix} ${message}`, ...args);
  },
  info: function(message, ...args) {
    console.info(`${this.prefix} ${message}`, ...args);
  },
};

module.exports = Logger; 
},{}],6:[function(require,module,exports){
const { injectCommentAssistantButton } = require('./commentButton');

function setupCommentSectionObserver() {
  let lastInjectionTime = 0;
  const INJECTION_COOLDOWN = 1000;
  const observer = new MutationObserver((mutations) => {
    const now = Date.now();
    if (now - lastInjectionTime < INJECTION_COOLDOWN) {
      return;
    }
    let shouldInject = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const hasCommentBox = node.querySelector(
              '.comments-comment-box, .comments-comment-texteditor, ' +
              'div[data-test-id="comments-comment-box"], ' +
              'div[role="textbox"][contenteditable="true"], ' +
              '.ql-editor[contenteditable="true"]'
            );
            const isCommentBox = node.classList && (
              node.classList.contains('comments-comment-box') || 
              node.classList.contains('comments-comment-texteditor') ||
              node.hasAttribute('contenteditable')
            );
            if (hasCommentBox || isCommentBox) {
              shouldInject = true;
            }
          }
        });
      }
    });
    if (shouldInject) {
      injectCommentAssistantButton();
      lastInjectionTime = now;
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  lastInjectionTime = Date.now();
}

module.exports = { setupCommentSectionObserver }; 
},{"./commentButton":2}],7:[function(require,module,exports){
// --- Rate Limiter Constants ---
const { showFloatingMessage } = require('./floatingMessage');

const COMMENT_TIME_FRAMES = [
  { label: "1min", seconds: 1 * 60, threshold: 2 },
  { label: "24h", seconds: 24 * 60 * 60, threshold: 50 },
];
const COMMENT_TIMESTAMPS_KEY = 'ava_posted_comment_timestamps';
const ALERT_COOLDOWN_SECONDS = 5 * 60; // 5 minutes
const LAST_ALERT_KEY = 'ava_last_rate_limit_alert';

// --- Utility Functions ---

// Get current time in seconds
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

// Remove timestamps older than the largest tracked time frame
function pruneOldTimestamps(timestamps) {
  const maxSeconds = Math.max(...COMMENT_TIME_FRAMES.map(tf => tf.seconds));
  const cutoff = nowSeconds() - maxSeconds;
  return timestamps.filter(ts => ts > cutoff);
}

// Record a new comment post timestamp
function recordCommentPost(callback) {
  const now = nowSeconds();
  chrome.storage.local.get([COMMENT_TIMESTAMPS_KEY], (result) => {
    let timestamps = result[COMMENT_TIMESTAMPS_KEY] || [];
    timestamps = pruneOldTimestamps(timestamps);
    timestamps.push(now);
    chrome.storage.local.set({ [COMMENT_TIMESTAMPS_KEY]: timestamps }, () => {
      if (callback) callback(timestamps);
    });
  });
}

// Get comment counts for all time frames
function getCommentCountsForTimeFrames(callback) {
  chrome.storage.local.get([COMMENT_TIMESTAMPS_KEY], (result) => {
    const timestamps = result[COMMENT_TIMESTAMPS_KEY] || [];
    const now = nowSeconds();
    const counts = COMMENT_TIME_FRAMES.map(tf => {
      const cutoff = now - tf.seconds;
      return {
        label: tf.label,
        count: timestamps.filter(ts => ts > cutoff).length,
        threshold: tf.threshold
      };
    });
    callback(counts);
  });
}

// Show a floating message if any rate limit is exceeded
function showRateLimitPopup(exceededFrames, anchorElement) {
  chrome.storage.local.get([LAST_ALERT_KEY], (result) => {
    const lastAlert = result[LAST_ALERT_KEY] || 0;
    const now = nowSeconds();
    if ((now - lastAlert) < ALERT_COOLDOWN_SECONDS) {
      return; // Don't show alert if within cooldown
    }
    const body = exceededFrames.map(f =>
      `You've been active! <b>${f.count}</b> comments in the last <b>${f.label}</b> (suggested max: ${f.threshold}).`
    ).join('<br>') + '<br><b>Tip:</b> Engaging is great, but spreading your comments out can help you get more authentic responses and avoid being seen as spammy.';
    showFloatingMessage({
      anchorElement: anchorElement || document.body,
      title: "Nice Engagement!",
      body: body
    });
    chrome.storage.local.set({ [LAST_ALERT_KEY]: now });
  });
}

// --- Exports ---
module.exports = {
  recordCommentPost,
  getCommentCountsForTimeFrames,
  showRateLimitPopup
}; 
},{"./floatingMessage":4}],8:[function(require,module,exports){
const LINKEDIN_SELECTORS = {
  POST_CONTAINER: '.feed-shared-update-v2',
  POST_CONTENT: '.feed-shared-update-v2__description .update-components-text',
  COMMENT_SECTIONS: '.comments-comment-texteditor:not(.comments-comment-box--reply), ' + 
                    '.ql-editor[contenteditable="true"]:not(.comments-comment-box--reply)',
  ACTIONS_AREA: '.comments-comment-texteditor .display-flex',
  BUTTON_CONTAINER: '.display-flex:not(.justify-space-between)',
  REPLY_BOX: '.comments-comment-box--reply',
  COMMENT_SUBMIT_BUTTON: '.comments-comment-box__submit-button--cr',
};

module.exports = LINKEDIN_SELECTORS; 
},{}]},{},[1]);
