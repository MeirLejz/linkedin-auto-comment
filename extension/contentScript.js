// Listen for messages from the popup
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "fillComment") {
      // Try to fill the comment field
      const result = fillCommentField(request.text);
      sendResponse(result);
    }
    else if (request.action === "getPostContent") {
      // Try to get the post content
      const result = extractPostContent();
      sendResponse({ postContent: result });
    }
    
    // Required for asynchronous sendResponse
    return true;
  }
);

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
  
  console.log(`Found ${commentSections.length} potential main comment sections`);
  
  commentSections.forEach(section => {
    // Skip if this is a reply box (additional check)
    if (section.closest('.comments-comment-box--reply') || 
        section.parentElement?.closest('.comments-comment-box--reply')) {
      return;
    }
    
    // Create a unique identifier for this section
    const sectionId = generateUniqueId(section);
    
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
      
      console.log('Found actions area for comment section:', actionsArea);
      
      // Find the post content for this specific comment section
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
            
            console.log(`Found post content for section ${sectionId}: "${postContent.substring(0, 50)}..."`);
          }
        }
      } catch (error) {
        console.error('Error finding post content:', error);
      }
      
      // Create our button
      const assistantButton = document.createElement('button');
      assistantButton.className = 'linkedin-comment-assistant-btn artdeco-button artdeco-button--circle artdeco-button--muted artdeco-button--2 artdeco-button--tertiary';
      assistantButton.title = 'Generate AI Comment';
      assistantButton.setAttribute('aria-label', 'Generate AI Comment');
      assistantButton.setAttribute('type', 'button');
      // Use the icon image instead of text
      assistantButton.innerHTML = '<img src="' + chrome.runtime.getURL('icon.png') + '" alt="AI" width="32" height="32">';
      
      // Store the post content as a data attribute on the button
      assistantButton.setAttribute('data-post-content', postContent);
      
      // Store a reference to the comment field
      // Find the actual input field within this section
      const inputField = 
        section.querySelector('div[role="textbox"][contenteditable="true"]') || 
        section.querySelector('.ql-editor[contenteditable="true"]') ||
        (section.getAttribute('role') === 'textbox' ? section : null);
      
      if (inputField) {
        // Store a unique ID for the input field
        const inputId = generateUniqueId(inputField);
        assistantButton.setAttribute('data-target-input-id', inputId);
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
      } else {
        // Fallback to prepending to the actions area
        actionsArea.prepend(assistantButton);
      }
      
      // Mark the section as having a button
      section.setAttribute('data-assistant-button-added', 'true');
      
      console.log('Successfully injected AI button');
    } else {
      console.log('Could not find actions area for comment section');
    }
  });
}

// Generate a unique identifier for a DOM element
function generateUniqueId(element) {
  // Create a simple hash based on element properties
  const rect = element.getBoundingClientRect();
  const position = `${rect.top.toFixed(0)}-${rect.left.toFixed(0)}-${rect.width.toFixed(0)}-${rect.height.toFixed(0)}`;
  const classes = Array.from(element.classList).join('-');
  return `${position}-${classes}`;
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
    console.error("Error: Could not get post content");
    return;
  }
  
  // Store the button element in a global variable so we can reference it when the response comes back
  window.currentCommentButton = buttonElement;
  
  // Find the specific input field for this button
  const targetInputId = buttonElement.getAttribute('data-target-input-id');
  const targetInputSelector = buttonElement.getAttribute('data-target-input-selector');
  
  // Try to find the input field using the stored information
  let inputField = null;
  
  if (targetInputSelector) {
    try {
      inputField = document.querySelector(targetInputSelector);
    } catch (e) {
      console.log('Error with selector, falling back to other methods:', e);
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
    console.error("Could not find input field for this button");
  }
  
  // Request comment generation from background script
  chrome.runtime.sendMessage(
    {
      action: "generateComment", 
      postContent: postContent
    },
    function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error: " + chrome.runtime.lastError.message);
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
    if (!commentField) {
      commentField = document.activeElement;
      if (!commentField || 
          !(commentField.getAttribute('role') === 'textbox' || 
            commentField.classList.contains('ql-editor'))) {
        return false;
      }
    }
    
    // Update the data-placeholder attribute
    commentField.setAttribute('data-placeholder', newPlaceholder);
    commentField.setAttribute('aria-placeholder', newPlaceholder);
    
    // Also try to find and update the a11y-text span that contains the placeholder
    const commentContainer = commentField.closest('.editor-container, .comments-comment-box-comment__text-editor');
    if (commentContainer) {
      const placeholderSpan = commentContainer.querySelector('.a11y-text[id$="-text-editor-placeholder"]');
      if (placeholderSpan) {
        placeholderSpan.textContent = newPlaceholder;
      }
    }
    
    console.log(`[Extension] Updated placeholder to: ${newPlaceholder}`);
    return true;
  } catch (error) {
    console.error('[Extension] Error updating placeholder:', error);
    return false;
  }
}

// Function to find and fill a specific LinkedIn comment field
function fillCommentField(text, specificField = null) {
  try {
    console.log('[Extension] Attempting to fill comment field with:', text);
    
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
        console.log('[Extension] Active element is not a comment field:', commentField);
        
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
              console.log('Error with selector:', e);
            }
          }
        }
        
        // If we still don't have a field, fall back to the old method
        if (!commentField) {
          // Find all potential comment fields
          const commentFields = document.querySelectorAll('div[role="textbox"][contenteditable="true"], .ql-editor[contenteditable="true"]');
          console.log(`[Extension] Found ${commentFields.length} potential comment fields`);
          
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
              console.log(`[Extension] Using closest comment field (distance: ${closestDistance.toFixed(2)}px)`);
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
      console.error('[Extension] Error: Attempted to use our button as a comment field');
      return {success: false, error: "Error identifying comment field."};
    }
    
    console.log(`[Extension] Found comment field (source: ${fieldSource}):`, commentField);
    
    // Focus the field first
    commentField.focus();
    
    // Set the content
    commentField.textContent = text;
    
    // Trigger input event to ensure LinkedIn registers the change
    commentField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    
    return {success: true};
    
  } catch (error) {
    console.error("[Extension] Error:", error);
    return {success: false, error: error.toString()};
  }
}

// Function to extract post content from LinkedIn post
function extractPostContent() {
  try {
    console.log('[Extension] Attempting to extract post content');
    
    // Find the closest post to the active comment field
    const activeCommentField = document.activeElement;
    let postElement = null;
    
    if (activeCommentField && 
        (activeCommentField.getAttribute('role') === 'textbox' || 
         activeCommentField.getAttribute('contenteditable') === 'true')) {
      // Try to find the post container by traversing up from the active comment field
      // Look for the feed item container that contains this comment field
      const postContainer = activeCommentField.closest('.feed-shared-update-v2, .feed-shared-update, .update-components-actor');
      
      if (postContainer) {
        // Try multiple selectors to find the post content within this specific container
        postElement = 
          postContainer.querySelector('.feed-shared-update-v2__description .update-components-text') ||
          postContainer.querySelector('.update-components-text') ||
          postContainer.querySelector('.feed-shared-text') ||
          postContainer.querySelector('.feed-shared-inline-show-more-text');
        
        console.log('[Extension] Found post container:', postContainer);
        console.log('[Extension] Found post element within container:', postElement);
      }
    }
    
    // If we couldn't find the post from the active comment field, try another approach
    if (!postElement || !postElement.textContent.trim()) {
      console.log('[Extension] Could not find post from active comment field, trying alternative approach');
      
      // Try to find the comment section that contains the active element
      const commentSection = activeCommentField?.closest('.comments-comment-item, .comments-comments-list, .social-details-social-activity');
      
      if (commentSection) {
        // Find the parent post of this comment section
        const parentPost = commentSection.closest('.feed-shared-update-v2, .feed-shared-update, .occludable-update');
        
        if (parentPost) {
          postElement = 
            parentPost.querySelector('.feed-shared-update-v2__description .update-components-text') ||
            parentPost.querySelector('.update-components-text') ||
            parentPost.querySelector('.feed-shared-text');
          
          console.log('[Extension] Found parent post from comment section:', parentPost);
        }
      }
    }
    
    // If we still couldn't find the post, fall back to the default approach
    if (!postElement || !postElement.textContent.trim()) {
      console.log('[Extension] Falling back to default approach');
      // Look for any visible post that might be in view
      const visiblePosts = Array.from(document.querySelectorAll('.feed-shared-update-v2')).filter(post => {
        const rect = post.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
      
      if (visiblePosts.length > 0) {
        // Use the most visible post
        const mostVisiblePost = visiblePosts[0];
        postElement = mostVisiblePost.querySelector('.feed-shared-update-v2__description .update-components-text');
      } else {
        // Last resort - just get the first post
        postElement = document.querySelector('.feed-shared-update-v2__description .update-components-text');
      }
    }
    
    // Process the found post content
    if (postElement && postElement.textContent.trim()) {
      const postContent = postElement.textContent.trim();
      console.log(`[Extension] Found post content: "${postContent.substring(0, 100)}${postContent.length > 100 ? '...' : ''}"`);
      
      // Clean up the content
      const cleanedContent = postContent
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[\n\r]+/g, ' ') // Replace newlines with space
        .trim();
      
      // Limit content length if too long
      const maxLength = 500;
      const finalContent = cleanedContent.length > maxLength 
        ? cleanedContent.substring(0, maxLength) + '...'
        : cleanedContent;
      
      console.log('[Extension] Final extracted post content:', finalContent);
      return finalContent;
    }
    
    // Fallback if primary selector fails
    console.log('[Extension] Primary selector failed, trying fallbacks');
    
    const fallbackSelectors = [
      '.update-components-text span[dir="rtl"]',
      '.feed-shared-inline-show-more-text .update-components-text',
      '.feed-shared-update-v2__description .break-words'
    ];
    
    for (const selector of fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const content = element.textContent.trim()
          .replace(/\s+/g, ' ')
          .replace(/[\n\r]+/g, ' ');
        
        console.log(`[Extension] Found content with fallback selector "${selector}"`);
        return content.length > 500 ? content.substring(0, 500) + '...' : content;
      }
    }
    
    console.log('[Extension] No post content found');
    return "No post content found. Please make sure you're on a LinkedIn post.";
    
  } catch (error) {
    console.error("[Extension] LinkedIn Comment Assistant Error:", error);
    return "Error extracting post content: " + error.toString();
  }
}

// Set up a MutationObserver to detect when new comment sections are added
function setupCommentSectionObserver() {
  console.log('Setting up comment section observer');
  
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
              console.log('Detected new comment section:', node);
              shouldInject = true;
            }
          }
        });
      }
    });
    
    if (shouldInject) {
      console.log('Injecting comment assistant button due to DOM changes');
      injectCommentAssistantButton();
      lastInjectionTime = now;
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also inject buttons for any existing comment sections
  injectCommentAssistantButton();
  lastInjectionTime = Date.now();
}

// Add click listeners to LinkedIn's comment buttons to trigger our button injection
function setupCommentButtonListeners() {
  console.log('Setting up comment button listeners');
  
  // Find all LinkedIn comment buttons
  const commentButtons = document.querySelectorAll(
    'button.social-actions__comment, ' +
    'button[aria-label*="comment"], ' +
    'button[data-control-name="comment"]'
  );
  
  // Limit the number of buttons we process to avoid performance issues
  const MAX_BUTTONS = 20;
  let processedCount = 0;
  
  console.log(`Found ${commentButtons.length} LinkedIn comment buttons, processing up to ${MAX_BUTTONS}`);
  
  for (const button of commentButtons) {
    // Check if we already added a listener to this button
    if (!button.hasAttribute('data-assistant-listener-added')) {
      button.setAttribute('data-assistant-listener-added', 'true');
      
      button.addEventListener('click', () => {
        console.log('LinkedIn comment button clicked, injecting assistant button');
        // Wait a short moment for the comment box to appear
        setTimeout(() => {
          injectCommentAssistantButton();
        }, 300);
      });
      
      processedCount++;
      if (processedCount >= MAX_BUTTONS) {
        console.log(`Reached maximum of ${MAX_BUTTONS} buttons, stopping processing`);
        break;
      }
    }
  }
  
  console.log(`Added click listeners to ${processedCount} new comment buttons`);
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
  console.log('[Extension] LinkedIn Comment Assistant ready');
  // Try to extract post content immediately
  extractPostContent();
  // Set up observers for comment sections and buttons
  setupCommentSectionObserver();
  setupCommentButtonObserver();
});

// Also try to extract post content immediately in case the page is already loaded
console.log('[Extension] Attempting initial post content extraction');
extractPostContent();

// Add a periodic check to catch any missed comment sections, but with a longer interval
// and only if no buttons exist yet
let periodicCheckInterval = null;

function startPeriodicCheck() {
  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval);
  }
  
  let checkCount = 0;
  const MAX_CHECKS = 10; // Only try 10 times
  
  periodicCheckInterval = setInterval(() => {
    checkCount++;
    
    // Check if we already have buttons
    const existingButtons = document.querySelectorAll('.linkedin-comment-assistant-btn');
    
    if (existingButtons.length > 0) {
      // We have buttons, no need to keep checking
      clearInterval(periodicCheckInterval);
      periodicCheckInterval = null;
      console.log('Periodic check stopped - buttons already exist');
    } else if (checkCount >= MAX_CHECKS) {
      // We've tried enough times, stop checking
      clearInterval(periodicCheckInterval);
      periodicCheckInterval = null;
      console.log('Periodic check stopped - max attempts reached');
    } else {
      // Try to inject buttons
      console.log(`Periodic check ${checkCount}/${MAX_CHECKS} - attempting to inject buttons`);
      injectCommentAssistantButton();
      // Also check for comment buttons
      setupCommentButtonListeners();
    }
  }, 3000);
}

startPeriodicCheck();

// Add a listener for stream updates
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "commentStreamUpdate") {
    if (message.error) {
      console.error("Error generating comment:", message.error);
      return;
    }
    
    // Update the comment field with the current accumulated text
    // Use the stored field if available
    fillCommentField(message.comment, window.currentCommentField);
  }
});