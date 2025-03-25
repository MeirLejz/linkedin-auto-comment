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

      Logger.log('[INJECTION] Successfully injected comment assistant button');
      
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
      Logger.log('[AVA.AI] Error with selector, falling back to other methods:', e);
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
    
    Logger.log(`[AVA.AI] Updated placeholder to: ${newPlaceholder}`);
    return true;
  } catch (error) {
    Logger.error('[AVA.AI] Error updating placeholder:', error);
    return false;
  }
}

// Function to find and fill a specific LinkedIn comment field
function fillCommentField(text, specificField = null) {
  try {
    Logger.log('[AVA.AI] Attempting to fill comment field with:', text);
    
    let commentField = specificField;
    let fieldSource = "specified field";
    
    // If no specific field was provided, try to use the stored field
    if (!commentField && window.currentCommentField) {
      commentField = window.currentCommentField;
      fieldSource = "stored field";
    }
    
    // If we still don't have a field, try to use the active element
    if (!commentField) {
      commentField = document.activeElement;
      fieldSource = "active element";
      
      // Check if the active element is actually a comment field
      const isCommentField = element => 
        element && 
        ((element.getAttribute('role') === 'textbox' && element.getAttribute('contenteditable') === 'true') ||
         (element.classList.contains('ql-editor') && element.getAttribute('contenteditable') === 'true'));
      
      if (!isCommentField(commentField)) {
        Logger.log('[AVA.AI] Active element is not a comment field:', commentField);
        
        // If we have a stored button, try to find its input field
        if (window.currentCommentButton) {
          const targetSelector = window.currentCommentButton.getAttribute('data-target-input-selector');
          if (targetSelector) {
            try {
              commentField = document.querySelector(targetSelector);
              if (commentField) {
                fieldSource = "button's target selector";
              }
            } catch (e) {
              Logger.log('Error with selector:', e);
            }
          }
        }
        
        // If we still don't have a field, fall back to the old method
        if (!commentField) {
          // Find all potential comment fields
          const commentFields = document.querySelectorAll('div[role="textbox"][contenteditable="true"], .ql-editor[contenteditable="true"]');
          Logger.log(`[AVA.AI] Found ${commentFields.length} potential comment fields`);
          
          // Try to find the most relevant comment field (visible and near the button)
          const button = window.currentCommentButton || document.querySelector('.linkedin-comment-assistant-btn');
          
          if (button && commentFields.length > 0) {
            fieldSource = "closest to button";
            const buttonRect = button.getBoundingClientRect();
            
            // Find the closest visible comment field to our button
            let closestDistance = Infinity;
            let closestField = null;
            
            commentFields.forEach((field, index) => {
              // Skip if this is our button
              if (field === button || field.contains(button) || button.contains(field)) {
                return;
              }
              
              const fieldRect = field.getBoundingClientRect();
              
              // Check if the field is visible
              if (fieldRect.height > 0 && fieldRect.width > 0) {
                // Calculate distance between field and button
                const distance = Math.sqrt(
                  Math.pow(buttonRect.left - fieldRect.left, 2) + 
                  Math.pow(buttonRect.top - fieldRect.top, 2)
                );
                
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestField = field;
                }
              }
            });
            
            if (closestField) {
              commentField = closestField;
              Logger.log(`[AVA.AI] Using closest comment field (distance: ${closestDistance.toFixed(2)}px)`);
            }
          }
        }
      }
    }
    
    if (!commentField) {
      return {success: false, error: "No comment field found. Click on a comment box first."};
    }
    
    // Double-check that we're not targeting our button
    if (commentField.classList.contains('linkedin-comment-assistant-btn') || 
        commentField.closest('.linkedin-comment-assistant-btn')) {
      Logger.error('[AVA.AI] Error: Attempted to use our button as a comment field');
      return {success: false, error: "Error identifying comment field."};
    }
    
    Logger.log(`[AVA.AI] Found comment field (source: ${fieldSource}):`, commentField);
    
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
  Logger.log('Setting up comment section observer');
  
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
      Logger.log('[setupCommentSectionObserver] Trying to inject comment assistant button');
      injectCommentAssistantButton();
      lastInjectionTime = now;
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also inject buttons for any existing comment sections
  //Logger.log('[setupCommentSectionObserver] Trying to inject comment assistant button into existing comment sections');
  //injectCommentAssistantButton();
  lastInjectionTime = Date.now();
}

// Add click listeners to LinkedIn's comment buttons to trigger our button injection
function setupCommentButtonListeners() {
  
  // Find all LinkedIn comment buttons
  const commentButtons = document.querySelectorAll(
    'button.social-actions__comment, ' +
    'button[aria-label*="comment"], ' +
    'button[data-control-name="comment"]'
  );
  
  // Limit the number of buttons we process to avoid performance issues
  const MAX_BUTTONS = 20;
  let processedCount = 0;
  
  //Logger.log(`Found ${commentButtons.length} LinkedIn comment buttons, processing up to ${MAX_BUTTONS}`);
  
  for (const button of commentButtons) {
    // Check if we already added a listener to this button
    if (!button.hasAttribute('data-assistant-listener-added')) {
      button.setAttribute('data-assistant-listener-added', 'true');
      /*
      button.addEventListener('click', () => {
        Logger.log('[setupCommentButtonListeners] LinkedIn comment button clicked, injecting assistant button');
        // Wait a short moment for the comment box to appear
        setTimeout(() => {
          injectCommentAssistantButton();
        }, 300);
      });
      */
      processedCount++;
      if (processedCount >= MAX_BUTTONS) {
        //Logger.log(`Reached maximum of ${MAX_BUTTONS} buttons, stopping processing`);
        break;
      }
    }
  }
  
  //Logger.log(`Added click listeners to ${processedCount} new comment buttons`);
}

// Function to periodically check for new comment buttons
function setupCommentButtonObserver() {
  // Keep track of the last time we checked for buttons
  let lastCheckTime = 0;
  const CHECK_COOLDOWN = 2000; // 2 second cooldown
  
  // Create a MutationObserver to watch for new comment buttons
  const observer = new MutationObserver((mutations) => {
    // Check if we're within the cooldown period
    const now = Date.now();
    if (now - lastCheckTime < CHECK_COOLDOWN) {
      return;
    }
    
    // Check if any mutations contain potential comment buttons
    let shouldCheck = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this node or its children might contain comment buttons
            if (node.querySelector('button') || node.tagName === 'BUTTON') {
              shouldCheck = true;
              break;
            }
          }
        }
        if (shouldCheck) break;
      }
    }
    
    if (shouldCheck) {
      setupCommentButtonListeners();
      lastCheckTime = now;
    }
  });
  
  // Start observing the document for new buttons
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also set up listeners for any existing buttons
  setupCommentButtonListeners();
  lastCheckTime = Date.now();
}

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  Logger.log('LinkedIn Comment Assistant ready');
  // Set up observers for comment sections and buttons
  setupCommentSectionObserver();
  setupCommentButtonObserver();
})

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "commentStreamUpdate") {
    if (message.error) {
      Logger.error("[AVA.AI] Error generating comment:", message.error);
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
    const postContainer = section.closest('.feed-shared-update-v2, .feed-shared-update, .occludable-update, .update-components-actor');
    
    if (postContainer) {
      // Try multiple selectors to find the post content within this specific container
      const postElement = 
        postContainer.querySelector('.feed-shared-update-v2__description .update-components-text') ||
        postContainer.querySelector('.update-components-text') ||
        postContainer.querySelector('.feed-shared-text') ||
        postContainer.querySelector('.feed-shared-inline-show-more-text');
      
      if (postElement && postElement.textContent.trim()) {
        postContent = postElement.textContent.trim()
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/[\n\r]+/g, ' '); // Replace newlines with space
        
        // Limit content length if too long
        const maxLength = 500;
        postContent = postContent.length > maxLength 
          ? postContent.substring(0, maxLength) + '...'
          : postContent;
      }
    }
  } catch (error) {
    Logger.error('[AVA.AI] Error finding post content:', error);
  }
  
  return postContent;
}