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
      // Create our button
      const assistantButton = document.createElement('button');
      assistantButton.className = 'linkedin-comment-assistant-btn';
      assistantButton.innerHTML = '✨ AI';
      assistantButton.title = 'Generate AI Comment';
      
      // Style the button to match LinkedIn's UI
      assistantButton.style.cssText = `
        background: none;
        border: none;
        color: #0a66c2;
        font-weight: 600;
        margin-right: 4px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 14px;
        display: inline;
        vertical-align: baseline;
        line-height: normal;
        float: left;
      `;
      
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
  dropdown.style.cssText = `
    position: absolute;
    top: ${buttonRect.bottom + window.scrollY}px;
    left: ${buttonRect.left + window.scrollX}px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px;
    z-index: 9999;
    width: 250px;
  `;
  
  // Create dropdown content
  dropdown.innerHTML =  `
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
    
    // Get post content
    const postContent = extractPostContent();
    
    if (!postContent || postContent.startsWith("No post content found") || postContent.startsWith("Error")) {
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
    console.log('Attempting to fill comment field with:', text);
    // LinkedIn frequently updates its DOM structure
    // Here are several possible selectors for comment fields
    const possibleSelectors = [
      'div[role="textbox"][contenteditable="true"]', // Modern LinkedIn comment box
      '.comments-comment-box__content[contenteditable="true"]', // Another common comment box
      '.ql-editor[contenteditable="true"]', // Editor used in some LinkedIn areas
      'p[data-placeholder]', // Comment fields with placeholders
      '.editor-content[contenteditable="true"]' // Older LinkedIn editor
    ];
    
    // Try each selector until we find a match
    let commentField = null;
    for (const selector of possibleSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} elements for selector: ${selector}`);
      
      // Look for a visible and focused comment field first
      for (const element of elements) {
        if (element.offsetParent !== null && 
            (document.activeElement === element || 
             element.contains(document.activeElement))) {
          commentField = element;
          break;
        }
      }
      
      // If no focused field found, take any visible one
      if (!commentField) {
        for (const element of elements) {
          if (element.offsetParent !== null) {
            commentField = element;
            break;
          }
        }
      }
      
      if (commentField) break;
    }
    
    if (!commentField) {
      console.warn('No comment field found');
      return {success: false, error: "No comment field found. Click on a comment box first."};
    }
    
    console.log('Successfully found comment field:', commentField);
    // Clear existing content and set new text
    // Some LinkedIn editors require specific handling
    if (commentField.classList.contains('ql-editor')) {
      // Quill editor handling
      commentField.innerHTML = ''; // Clear existing content
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      commentField.appendChild(paragraph);
    } else {
      // Standard contenteditable handling
      commentField.textContent = text;
    }
    
    // Trigger input event to ensure LinkedIn registers the change
    const inputEvent = new Event('input', {
      bubbles: true,
      cancelable: true,
    });
    commentField.dispatchEvent(inputEvent);
    
    // Focus the field
    commentField.focus();
    
    // Set cursor at the end
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(commentField);
    range.collapse(false); // false means collapse to end
    selection.removeAllRanges();
    selection.addRange(range);
    
    return {success: true};
    
  } catch (error) {
    console.error("LinkedIn Comment Assistant Error:", error);
    console.error("Stack trace:", error.stack);  // Add stack trace
    return {success: false, error: error.toString()};
  }
}

// Function to extract post content from LinkedIn post
function extractPostContent() {
  try {
    console.log('Attempting to extract post content');
    // LinkedIn frequently updates its DOM structure
    // Here are several possible selectors for post content
    const possibleSelectors = [
      'div[data-id="feed-detail-content"]', // Modern feed post content
      'div.feed-shared-update-v2__description-wrapper', // Feed post description
      'div.feed-shared-text', // Shared post text
      'article div.update-components-text', // Article text
      'div.post-body' // Generic post body
    ];
    
    // Try each selector until we find a match
    let postContent = null;
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        postContent = element.textContent.trim();
        if (postContent) break;
      }
    }
    
    // If no content found through main selectors, try to find any visible post content
    if (!postContent) {
      // Look for comment box to identify the post container
      const commentBox = document.querySelector('div[role="textbox"][contenteditable="true"]');
      if (commentBox) {
        // Navigate up to find the post container
        let postContainer = commentBox.closest('article') || 
                          commentBox.closest('.feed-shared-update-v2') ||
                          commentBox.closest('.feed-shared-post');
        
        if (postContainer) {
          // Get the first substantial text content from the post container
          const textNodes = Array.from(postContainer.querySelectorAll('*'))
            .filter(el => el.textContent.trim().length > 20 && 
                         !el.querySelector('input, textarea, [contenteditable="true"]'));
          
          if (textNodes.length > 0) {
            postContent = textNodes[0].textContent.trim();
          }
        }
      }
    }
    
    if (!postContent) {
      return "No post content found. Please make sure you're on a LinkedIn post.";
    }
    
    // Clean up the content
    postContent = postContent
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\n\r]+/g, ' ') // Replace newlines with space
      .trim();
    
    // Limit content length if too long
    const maxLength = 500;
    if (postContent.length > maxLength) {
      postContent = postContent.substring(0, maxLength) + '...';
    }
    
    return postContent;
    
  } catch (error) {
    console.error("LinkedIn Comment Assistant Error:", error);
    console.error("Stack trace:", error.stack);  // Add stack trace
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

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  console.log('Page loaded, setting up LinkedIn Comment Assistant');
  setupCommentSectionObserver();
});

// Also try to inject buttons immediately in case the page is already loaded
console.log('Attempting initial button injection');
injectCommentAssistantButton();

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
    }
  }, 3000);
}

startPeriodicCheck();