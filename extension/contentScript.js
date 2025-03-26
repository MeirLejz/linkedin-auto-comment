// Create a logging utility to centralize and standardize logging
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

// LinkedIn DOM selectors - centralized for easier maintenance
const LINKEDIN_SELECTORS = {
  // Post container selector
  POST_CONTAINER: '.feed-shared-update-v2',
  
  // Post content selector
  POST_CONTENT: '.feed-shared-update-v2__description .update-components-text',
  
  // Comment section selectors
  COMMENT_SECTIONS: '.comments-comment-box:not(.comments-comment-box--reply), ' + 
    '.comments-comment-texteditor:not(.comments-comment-box--reply), ' + 
    'div[data-test-id="comments-comment-box"]:not(.comments-comment-box--reply), ' +
    'div[role="textbox"][contenteditable="true"]:not(.ql-editor), ' +
    '.ql-editor[contenteditable="true"]:not(.comments-comment-box--reply)'
};

// Inject the comment assistant button into LinkedIn's UI
function injectCommentAssistantButton() {
  // Look for comment sections with expanded selectors, but exclude reply boxes
  const commentSections = document.querySelectorAll(
    '.comments-comment-box:not(.comments-comment-box--reply), ' + 
    '.comments-comment-texteditor:not(.comments-comment-box--reply), ' + 
    'div[data-test-id="comments-comment-box"]:not(.comments-comment-box--reply), ' +
    'div[role="textbox"][contenteditable="true"]:not(.ql-editor), ' +
    '.ql-editor[contenteditable="true"]:not(.comments-comment-box--reply)'
  );
    
  commentSections.forEach(section => {
    // Skip if this is a reply box (additional check)
    if (section.closest('.comments-comment-box--reply') || 
        section.parentElement?.closest('.comments-comment-box--reply')) {
      return;
    }

    // Check if we already added a button to this section using a data attribute
    if (section.hasAttribute('data-assistant-button-added')) {
      return;
    }
    
    // Find the actions area (usually near the comment button)
    // Expanded selector list to catch more UI variations
    const actionsArea = 
      section.querySelector('.comments-comment-box__controls-actions') || 
      section.querySelector('.comments-comment-texteditor__actions') ||
      section.closest('form')?.querySelector('[type="submit"]')?.parentElement ||
      section.closest('.comments-comment-box')?.querySelector('.display-flex') ||
      section.closest('.comments-comment-texteditor')?.querySelector('.display-flex');
    
    if (actionsArea) {
      // Check if this actions area already has our button
      if (actionsArea.querySelector('.linkedin-comment-assistant-btn')) {
        // Mark the section as having a button
        section.setAttribute('data-assistant-button-added', 'true');
        return;
      }
                  
      // Get the post content using the extracted function
      const postContent = extractPostContent(section);
      
      // Create our button
      const assistantButton = document.createElement('button');
      assistantButton.className = 'linkedin-comment-assistant-btn artdeco-button artdeco-button--circle artdeco-button--muted artdeco-button--2 artdeco-button--tertiary';
      assistantButton.title = 'Generate AI Comment';
      assistantButton.innerHTML = '<img src="' + chrome.runtime.getURL('button.png') + '" alt="AI" width="20" height="20">';
      assistantButton.setAttribute('type', 'button');
      assistantButton.setAttribute('data-post-content', postContent);
            
      // Store a reference to the comment field
      // Find the actual input field within this section
      const inputField = 
        section.querySelector('div[role="textbox"][contenteditable="true"]') || 
        section.querySelector('.ql-editor[contenteditable="true"]') ||
        (section.getAttribute('role') === 'textbox' ? section : null);
      
      if (inputField) {
        // Also store the input field's selector path for more reliable retrieval
        assistantButton.setAttribute('data-target-input-selector', getElementSelector(inputField));
      }
      
      // Add click handler to directly generate comment
      assistantButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        generateComment(event.currentTarget, section);
      });
      
      // Find the emoji button container or the detour container to insert our button next to
      const buttonContainer = actionsArea.querySelector('.display-flex:not(.justify-space-between)') || 
                              actionsArea.querySelector('.display-flex');
      
      if (buttonContainer) {
        // Insert at the beginning of the button container
        buttonContainer.prepend(assistantButton);
      }
      
      // Mark the section as having a button
      section.setAttribute('data-assistant-button-added', 'true');
      
    } else {
      Logger.error('Could not find actions area for comment section');
    }
  });
}

// Helper function to get a CSS selector path for an element
function getElementSelector(element) {
  if (!element) return '';
  
  // Simple implementation - could be enhanced for more reliable selectors
  let path = [];
  let currentElement = element;
  
  while (currentElement && currentElement !== document.body) {
    let selector = currentElement.tagName.toLowerCase();
    
    // Add id if available
    if (currentElement.id) {
      selector += '#' + currentElement.id;
    } else {
      // Add classes
      if (currentElement.className && typeof currentElement.className === 'string') {
        selector += '.' + currentElement.className.trim().replace(/\s+/g, '.');
      }
      
      // Add position among siblings
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

// Function to directly generate a comment when the AI button is clicked
function generateComment(buttonElement, commentSection) {
  // Get post content from the button's data attribute
  const postContent = buttonElement.getAttribute('data-post-content');

  if (!postContent || postContent === "") {
    Logger.error("[AVA.AI] Error: Could not get post content");
    return;
  }
  
  // Store the button element in a global variable so we can reference it when the response comes back
  window.currentCommentButton = buttonElement;
  
  // Find the specific input field for this button
  const targetInputSelector = buttonElement.getAttribute('data-target-input-selector');
  
  // Try to find the input field using the stored information
  let inputField = null;
  
  if (targetInputSelector) {
    try {
      inputField = document.querySelector(targetInputSelector);
    } catch (e) {
      Logger.error('Error with selector, falling back to other methods:', e);
    }
  }
  
  // If we couldn't find it with the selector, try other methods
  if (!inputField) {
    // Look for input fields near the button
    inputField = 
      commentSection.querySelector('div[role="textbox"][contenteditable="true"]') || 
      commentSection.querySelector('.ql-editor[contenteditable="true"]') ||
      (commentSection.getAttribute('role') === 'textbox' ? commentSection : null);
  }
  
  if (inputField) {
    // Focus the input field
    inputField.focus();
    
    // Update placeholder
    updateCommentPlaceholder("Thinking...", inputField);
    
    // Store the input field for later use
    window.currentCommentField = inputField;
  } else {
    Logger.error("[AVA.AI] Could not find input field for this button");
  }
  
  // Request comment generation from background script
  chrome.runtime.sendMessage(
    {
      action: "generateComment", 
      postContent: postContent
    },
    function(response) {
      if (chrome.runtime.lastError) {
        Logger.error("Error: " + chrome.runtime.lastError.message);
        // Reset placeholder if there was an error
        if (window.currentCommentField) {
          updateCommentPlaceholder("Add a comment…", window.currentCommentField);
        }
        return;
      }
    }
  );
}

// Helper function to update the placeholder text of a specific comment field
function updateCommentPlaceholder(newPlaceholder, commentField) {
  try {
    
    // Update the data-placeholder attribute
    commentField.setAttribute('data-placeholder', newPlaceholder);
    commentField.setAttribute('aria-placeholder', newPlaceholder);
    
    return true;
  } catch (error) {
    Logger.error('Error updating placeholder:', error);
    return false;
  }
}

// Function to find and fill a specific LinkedIn comment field
function fillCommentField(text, specificField = null) {
  try {
    
    let commentField = specificField;
    
    // Focus the field first
    commentField.focus();
    
    // Set the content
    commentField.textContent = text;
    
    // Trigger input event to ensure LinkedIn registers the change
    commentField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    
    // Move caret to the end of the text - simplified approach
    // For contentEditable divs, this is the most reliable method
    const selection = window.getSelection();
    const range = document.createRange();
    
    // Place the range at the end of the content
    range.selectNodeContents(commentField);
    range.collapse(false); // false means collapse to end
    
    // Apply the range to move the caret
    selection.removeAllRanges();
    selection.addRange(range);
    
    return {success: true};
    
  } catch (error) {
    Logger.error("[AVA.AI] Error:", error);
    return {success: false, error: error.toString()};
  }
}

// Set up a MutationObserver to detect when new comment sections are added
function setupCommentSectionObserver() {
  
  // Keep track of when we last injected buttons
  let lastInjectionTime = 0;
  const INJECTION_COOLDOWN = 1000; // 1 second cooldown
  
  // Create a MutationObserver to watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    // Check if we're within the cooldown period
    const now = Date.now();
    if (now - lastInjectionTime < INJECTION_COOLDOWN) {
      return;
    }
    
    let shouldInject = false;
    
    // Check if any relevant elements were added
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this node or its children contain comment sections
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
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
  
  lastInjectionTime = Date.now();
}

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  // Set up observers for comment sections and buttons
  setupCommentSectionObserver();
})

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "commentStreamUpdate") {
    if (message.error) {
      Logger.error("Error generating comment:", message.error);
      return;
    }
    // Update the comment field with the current accumulated text
    // Use the stored field if available to ensure we're updating the correct field
    fillCommentField(message.comment, window.currentCommentField);
  }
});

// Function to extract post content from a comment section's parent post
function extractPostContent(section) {
  let postContent = "";
  try {
    // Find the parent post container
    const postContainer = section.closest(LINKEDIN_SELECTORS.POST_CONTAINER);
    
    if (postContainer) {
      // Find the post content element
      const postElement = postContainer.querySelector(LINKEDIN_SELECTORS.POST_CONTENT);
      
      if (postElement && postElement.textContent.trim()) {
        postContent = postElement.textContent.trim()
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/[\n\r]+/g, ' '); // Replace newlines with space
        
        // Limit content length if too long
        const maxLength = 3000;
        postContent = postContent.length > maxLength 
          ? postContent.substring(0, maxLength) + '...'
          : postContent;
      }
    }
  } catch (error) {
    Logger.error('Error finding post content:', error);
  }
  
  return postContent;
}