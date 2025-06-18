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