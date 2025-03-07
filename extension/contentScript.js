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
  // Look for comment sections with expanded selectors
  const commentSections = document.querySelectorAll(
    '.comments-comment-box, .comments-comment-texteditor, ' + 
    'div[data-test-id="comments-comment-box"], ' +
    'div[role="textbox"][contenteditable="true"], ' +
    '.ql-editor[contenteditable="true"]'
  );
  
  console.log(`Found ${commentSections.length} potential comment sections`);
  
  commentSections.forEach(section => {
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
      assistantButton.className = 'linkedin-comment-assistant-btn';
      assistantButton.innerHTML = '✨ AI';
      assistantButton.title = 'Generate AI Comment';
      
      // Store the post content as a data attribute on the button
      assistantButton.setAttribute('data-post-content', postContent);
      
      // Add click handler to show the dropdown
      assistantButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showCommentAssistantDropdown(event.target, section);
      });
      
      // Insert the button before the comment button
      actionsArea.prepend(assistantButton);
      
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

// Create and show the dropdown UI
function showCommentAssistantDropdown(buttonElement, commentSection) {
  // Remove any existing dropdown
  const existingDropdown = document.querySelector('.linkedin-comment-assistant-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
  }
  
  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'linkedin-comment-assistant-dropdown';
  
  // Position the dropdown near the button
  const buttonRect = buttonElement.getBoundingClientRect();
  dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
  dropdown.style.left = `${buttonRect.left + window.scrollX}px`;
  
  // Create dropdown content
  dropdown.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: #000000;">Generate AI Comment</div>
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; color: #666;">Comment Style:</label>
      <select id="comment-style-dropdown" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px;">
        <option value="professional">Professional</option>
        <option value="casual">Casual</option>
        <option value="enthusiastic">Enthusiastic</option>
        <option value="thoughtful">Thoughtful</option>
        <option value="concise">Concise</option>
      </select>
    </div>
    <button id="generate-comment-btn" style="background: #0a66c2; color: white; border: none; padding: 8px 16px; border-radius: 16px; width: 100%; cursor: pointer; font-weight: 600;">Generate Comment</button>
    <div id="dropdown-status" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
    <div id="dropdown-spinner" class="hidden" style="text-align: center; margin-top: 8px;">
      <div style="display: inline-block; width: 18px; height: 18px; border: 2px solid #0a66c2; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .hidden {
        display: none;
      }
    </style>
  `;
  
  // Add the dropdown to the page
  document.body.appendChild(dropdown);
  
  // Add click handler for generate button
  const generateButton = document.getElementById('generate-comment-btn');
  const statusElement = document.getElementById('dropdown-status');
  const spinnerElement = document.getElementById('dropdown-spinner');
  
  generateButton.addEventListener('click', async () => {
    // Show loading state
    generateButton.disabled = true;
    spinnerElement.classList.remove('hidden');
    statusElement.textContent = "Generating comment...";
    
    // Get selected comment style
    const styleSelect = document.getElementById('comment-style-dropdown');
    const selectedStyle = styleSelect.value;
    
    // Get post content from the button's data attribute
    const postContent = buttonElement.getAttribute('data-post-content');
    
    if (!postContent || postContent === "") {
      statusElement.textContent = "Error: Could not get post content";
      spinnerElement.classList.add('hidden');
      generateButton.disabled = false;
      return;
    }
    
    // Request comment generation from background script
    chrome.runtime.sendMessage(
      {
        action: "generateComment", 
        style: selectedStyle,
        postContent: postContent
      },
      function(response) {
        // Hide loading spinner
        spinnerElement.classList.add('hidden');
        generateButton.disabled = false;
        
        if (chrome.runtime.lastError) {
          statusElement.textContent = "Error: " + chrome.runtime.lastError.message;
          return;
        }
        
        if (response && response.success) {
          // Fill the comment field
          const result = fillCommentField(response.comment);
          
          if (result.success) {
            statusElement.textContent = "Comment inserted successfully!";
            // Close the dropdown after a short delay
            setTimeout(() => dropdown.remove(), 1500);
          } else {
            statusElement.textContent = "Error: " + result.error;
          }
        } else {
          statusElement.textContent = "Error: " + (response?.error || "Failed to generate comment");
        }
      }
    );
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function closeDropdown(e) {
    if (!dropdown.contains(e.target) && e.target !== buttonElement) {
      dropdown.remove();
      document.removeEventListener('click', closeDropdown);
    }
  });
}

// Function to find and fill the LinkedIn comment field
function fillCommentField(text) {
  try {
    console.log('[Extension] Attempting to fill comment field with:', text);
    
    // First try to get the currently focused comment field
    let commentField = document.activeElement;
    
    // Check if the active element is actually a comment field
    if (!commentField || 
        !(commentField.getAttribute('role') === 'textbox' && commentField.getAttribute('contenteditable') === 'true') &&
        !(commentField.classList.contains('ql-editor') && commentField.getAttribute('contenteditable') === 'true')) {
      
      console.log('[Extension] Active element is not a comment field, searching for visible comment fields');
      
      // Find all potential comment fields
      const commentFields = document.querySelectorAll('div[role="textbox"][contenteditable="true"], .ql-editor[contenteditable="true"]');
      
      // Try to find the most relevant comment field (visible and near the dropdown)
      const dropdown = document.querySelector('.linkedin-comment-assistant-dropdown');
      
      if (dropdown && commentFields.length > 0) {
        const dropdownRect = dropdown.getBoundingClientRect();
        
        // Find the closest visible comment field to our dropdown
        let closestDistance = Infinity;
        let closestField = null;
        
        commentFields.forEach(field => {
          const fieldRect = field.getBoundingClientRect();
          
          // Check if the field is visible
          if (fieldRect.height > 0 && fieldRect.width > 0) {
            // Calculate distance between field and dropdown
            const distance = Math.sqrt(
              Math.pow(dropdownRect.left - fieldRect.left, 2) + 
              Math.pow(dropdownRect.top - fieldRect.top, 2)
            );
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestField = field;
            }
          }
        });
        
        if (closestField) {
          commentField = closestField;
          console.log('[Extension] Found closest visible comment field to dropdown');
        }
      }
      
      // If we still don't have a comment field, just take the first visible one
      if (!commentField) {
        for (const field of commentFields) {
          const rect = field.getBoundingClientRect();
          if (rect.height > 0 && rect.width > 0 && 
              rect.top >= 0 && rect.bottom <= window.innerHeight) {
            commentField = field;
            console.log('[Extension] Using first visible comment field');
            break;
          }
        }
      }
      
      // Last resort - just take the first one
      if (!commentField && commentFields.length > 0) {
        commentField = commentFields[0];
        console.log('[Extension] Using first available comment field as fallback');
      }
    }
    
    if (!commentField) {
      console.warn('[Extension] No comment field found');
      return {success: false, error: "No comment field found. Click on a comment box first."};
    }
    
    console.log('[Extension] Successfully found comment field');
    
    // Focus the field first
    commentField.focus();
    
    // Set the content
    commentField.textContent = text;
    
    // Trigger input event to ensure LinkedIn registers the change
    const inputEvent = new Event('input', {
      bubbles: true,
      cancelable: true,
    });
    commentField.dispatchEvent(inputEvent);
    
    return {success: true};
    
  } catch (error) {
    console.error("[Extension] LinkedIn Comment Assistant Error:", error);
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