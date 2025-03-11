// LinkedIn Comment Assistant Content Script
// Implements the core functionality for the LinkedIn Comment Assistant Chrome Extension

// Immediately Invoked Function Expression (IIFE) to create a module and avoid global namespace pollution
(function() {
  'use strict';
  
  // Configuration object to centralize all configurable parameters
  const CONFIG = {
    selectors: {
      // Comment section selectors
      commentSections: '.comments-comment-box, .comments-comment-texteditor, ' + 
                       'div[data-test-id="comments-comment-box"], ' +
                       'div[role="textbox"][contenteditable="true"], ' +
                       '.ql-editor[contenteditable="true"], ' +
                       '.comments-comment-box-comment__text-editor, .comments-texteditor__content',
      
      // Action area selectors
      actionsArea: [
        '.comments-comment-box__controls-actions',
        '.comments-comment-texteditor__actions',
        '[type="submit"]'
      ],
      
      // Post content selectors
      postContent: [
        '.feed-shared-update-v2__description .update-components-text',
        '.update-components-text',
        '.feed-shared-text',
        '.feed-shared-inline-show-more-text'
      ],
      
      // Post container selectors
      postContainer: '.feed-shared-update-v2, .feed-shared-update, .occludable-update, .update-components-actor',
      
      // Comment button selectors
      commentButtons: 'button.social-actions__comment, button[aria-label*="comment"], button[data-control-name="comment"]'
    },
    
    // UI related configuration
    ui: {
      buttonClass: 'linkedin-comment-assistant-btn',
      dropdownClass: 'linkedin-comment-assistant-dropdown',
      buttonText: '✨ AI',
      buttonTitle: 'Generate AI Comment',
      dataAttributes: {
        buttonAdded: 'data-assistant-button-added',
        listenerAdded: 'data-assistant-listener-added',
        postContent: 'data-post-content'
      }
    },
    
    // Timing configuration
    timing: {
      injectionCooldown: 1000, // 1 second between injection attempts
      buttonCheckCooldown: 2000, // 2 seconds between button checks
      commentBoxAppearDelay: 300, // Wait time after comment button click
      dropdownCloseDelay: 1500, // Time before closing dropdown after success
      periodicCheckInterval: 3000, // Interval for periodic checks
      maxPeriodicChecks: 10 // Maximum number of periodic checks
    },
    
    // Content limits
    content: {
      maxPostLength: 500 // Maximum length for extracted post content
    },
    
    // Comment styles available in the dropdown
    commentStyles: [
      { value: 'professional', label: 'Professional' },
      { value: 'casual', label: 'Casual' },
      { value: 'enthusiastic', label: 'Enthusiastic' },
      { value: 'thoughtful', label: 'Thoughtful' },
      { value: 'concise', label: 'Concise' }
    ]
  };
  
  // Logger utility for consistent logging
  const Logger = {
    prefix: '[LinkedIn Comment Assistant]',
    
    log: function(message, ...args) {
      console.log(`${this.prefix} ${message}`, ...args);
    },
    
    warn: function(message, ...args) {
      console.warn(`${this.prefix} ${message}`, ...args);
    },
    
    error: function(message, ...args) {
      console.error(`${this.prefix} ${message}`, ...args);
    }
  };
  
  // State management to track UI state and reduce redundant operations
  const State = {
    lastInjectionTime: 0,
    lastButtonCheckTime: 0,
    periodicCheckCount: 0,
    periodicCheckInterval: null,
    
    shouldInject: function() {
      const now = Date.now();
      if (now - this.lastInjectionTime < CONFIG.timing.injectionCooldown) {
        return false;
      }
      this.lastInjectionTime = now;
      return true;
    },
    
    shouldCheckButtons: function() {
      const now = Date.now();
      if (now - this.lastButtonCheckTime < CONFIG.timing.buttonCheckCooldown) {
        return false;
      }
      this.lastButtonCheckTime = now;
      return true;
    },
    
    resetPeriodicCheck: function() {
      this.periodicCheckCount = 0;
      if (this.periodicCheckInterval) {
        clearInterval(this.periodicCheckInterval);
        this.periodicCheckInterval = null;
      }
    }
  };
  
  // Message handling module
  const MessageHandler = {
    init: function() {
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
      Logger.log('Message handler initialized');
    },
    
    handleMessage: function(request, sender, sendResponse) {
      if (request.action === "fillComment") {
        const result = UIManager.fillCommentField(request.text);
        sendResponse(result);
      }
      else if (request.action === "getPostContent") {
        const result = ContentExtractor.extractPostContent();
        sendResponse({ postContent: result });
      }
      
      // Required for asynchronous sendResponse
      return true;
    }
  };
  
  // UI Manager module for handling UI interactions
  const UIManager = {
    /**
     * Inject the comment assistant button into LinkedIn's UI
     * Finds comment sections and adds our AI button to them
     */
    injectCommentAssistantButton: function() {
      // Look for comment sections with expanded selectors
      const commentSections = document.querySelectorAll(CONFIG.selectors.commentSections);
      
      Logger.log(`Found ${commentSections.length} potential comment sections`);
      
      // Also look for pre-made comment sections (these have a different structure)
      const premadeCommentSections = document.querySelectorAll('.comments-comment-box-comment__text-editor, .comments-texteditor__content');
      
      Logger.log(`Found ${premadeCommentSections.length} pre-made comment sections`);
      
      // Process regular comment sections
      commentSections.forEach(section => this.processCommentSection(section));
      
      // Process pre-made comment sections
      premadeCommentSections.forEach(section => this.processCommentSection(section));
    },
    
    /**
     * Process a single comment section and add button if needed
     * @param {Element} section - The comment section to process
     */
    processCommentSection: function(section) {
      // Create a unique identifier for this section
      const sectionId = this.generateUniqueId(section);
      
      // Check if we already added a button to this section using a data attribute
      if (section.hasAttribute(CONFIG.ui.dataAttributes.buttonAdded)) {
        return;
      }
      
      // Find the actions area (usually near the comment button)
      let actionsArea = this.findActionsArea(section);
      
      if (actionsArea) {
        // Check if this actions area already has our button
        if (actionsArea.querySelector('.' + CONFIG.ui.buttonClass)) {
          // Mark the section as having a button
          section.setAttribute(CONFIG.ui.dataAttributes.buttonAdded, 'true');
          return;
        }
        
        Logger.log('Found actions area for comment section:', actionsArea);
        
        // Find the post content for this specific comment section
        let postContent = ContentExtractor.getPostContentForSection(section);
        
        // Create and inject our button
        this.createAndInjectButton(actionsArea, section, postContent);
        
        Logger.log('Successfully injected AI button');
      } else {
        Logger.log('Could not find actions area for comment section');
      }
    },
    
    /**
     * Find the actions area for a comment section
     * @param {Element} section - The comment section
     * @returns {Element|null} The actions area or null if not found
     */
    findActionsArea: function(section) {
      let actionsArea = null;
      
      // Try direct child selectors first
      for (const selector of CONFIG.selectors.actionsArea) {
        actionsArea = section.querySelector(selector);
        if (actionsArea) break;
      }
      
      // If not found, try parent containers
      if (!actionsArea) {
        // For pre-made comments, look for parent containers
        const parentForm = section.closest('form');
        if (parentForm) {
          for (const selector of CONFIG.selectors.actionsArea) {
            const element = parentForm.querySelector(selector);
            if (element) {
              actionsArea = element.parentElement || element;
              break;
            }
          }
        }
      }
      
      // Try specific comment box containers
      if (!actionsArea) {
        const commentBox = section.closest('.comments-comment-box, .comments-comment-texteditor, .comments-comment-box-comment');
        if (commentBox) {
          actionsArea = commentBox.querySelector('.display-flex, .comments-comment-box__controls-container');
        }
      }
      
      // For pre-made comments, look for the footer
      if (!actionsArea) {
        actionsArea = section.closest('.comments-comment-box-comment')?.querySelector('.comments-comment-box-comment__footer');
      }
      
      return actionsArea;
    },
    
    /**
     * Create and inject the AI button into the actions area
     * @param {Element} actionsArea - The area to inject the button into
     * @param {Element} section - The comment section
     * @param {string} postContent - The content of the post
     */
    createAndInjectButton: function(actionsArea, section, postContent) {
      // Create our button
      const assistantButton = document.createElement('button');
      assistantButton.className = CONFIG.ui.buttonClass;
      assistantButton.innerHTML = CONFIG.ui.buttonText;
      assistantButton.title = CONFIG.ui.buttonTitle;
      
      // Store the post content as a data attribute on the button
      assistantButton.setAttribute(CONFIG.ui.dataAttributes.postContent, postContent);
      
      // Add click handler to show the dropdown
      assistantButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.showCommentAssistantDropdown(event.target, section);
      });
      
      // Insert the button before the comment button
      actionsArea.prepend(assistantButton);
      
      // Mark the section as having a button
      section.setAttribute(CONFIG.ui.dataAttributes.buttonAdded, 'true');
    },
    
    /**
     * Generate a unique identifier for a DOM element
     * @param {Element} element - The element to generate an ID for
     * @returns {string} A unique identifier
     */
    generateUniqueId: function(element) {
      // Create a simple hash based on element properties
      const rect = element.getBoundingClientRect();
      const position = `${rect.top.toFixed(0)}-${rect.left.toFixed(0)}-${rect.width.toFixed(0)}-${rect.height.toFixed(0)}`;
      const classes = Array.from(element.classList).join('-');
      return `${position}-${classes}`;
    },
    
    /**
     * Create and show the dropdown UI
     * @param {Element} buttonElement - The button that was clicked
     * @param {Element} commentSection - The comment section
     */
    showCommentAssistantDropdown: function(buttonElement, commentSection) {
      // Remove any existing dropdown
      const existingDropdown = document.querySelector('.' + CONFIG.ui.dropdownClass);
      if (existingDropdown) {
        existingDropdown.remove();
      }
      
      // Create dropdown container
      const dropdown = document.createElement('div');
      dropdown.className = CONFIG.ui.dropdownClass;
      
      // Position the dropdown near the button
      const buttonRect = buttonElement.getBoundingClientRect();
      dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
      dropdown.style.left = `${buttonRect.left + window.scrollX}px`;
      
      // Create dropdown content with style options
      let styleOptionsHTML = this.createStyleOptionsHTML();
      
      // Create the dropdown HTML
      dropdown.innerHTML = this.createDropdownHTML(styleOptionsHTML);
      
      // Add the dropdown to the page
      document.body.appendChild(dropdown);
      
      // Set up event handlers for the dropdown
      this.setupDropdownEventHandlers(dropdown, buttonElement, commentSection);
    },
    
    /**
     * Create HTML for style options
     * @returns {string} HTML for style options
     */
    createStyleOptionsHTML: function() {
      let styleOptionsHTML = '';
      CONFIG.commentStyles.forEach(style => {
        styleOptionsHTML += `<option value="${style.value}">${style.label}</option>`;
      });
      return styleOptionsHTML;
    },
    
    /**
     * Create HTML for the dropdown
     * @param {string} styleOptionsHTML - HTML for style options
     * @returns {string} Complete dropdown HTML
     */
    createDropdownHTML: function(styleOptionsHTML) {
      return `
        <div style="font-weight: 600; margin-bottom: 8px; color: #000000;">Generate AI Comment</div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; color: #666;">Comment Style:</label>
          <select id="comment-style-dropdown" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px;">
            ${styleOptionsHTML}
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
    },
    
    /**
     * Set up event handlers for the dropdown
     * @param {Element} dropdown - The dropdown element
     * @param {Element} buttonElement - The button that was clicked
     * @param {Element} commentSection - The comment section
     */
    setupDropdownEventHandlers: function(dropdown, buttonElement, commentSection) {
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
        const postContent = buttonElement.getAttribute(CONFIG.ui.dataAttributes.postContent);
        
        if (!postContent || postContent === "") {
          statusElement.textContent = "Error: Could not get post content";
          spinnerElement.classList.add('hidden');
          generateButton.disabled = false;
          return;
        }
        
        // Request comment generation from background script
        this.requestCommentGeneration(postContent, selectedStyle, dropdown, statusElement, spinnerElement, generateButton);
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== buttonElement) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      });
    },
    
    /**
     * Request comment generation from the background script
     * @param {string} postContent - The content of the post
     * @param {string} selectedStyle - The selected comment style
     * @param {Element} dropdown - The dropdown element
     * @param {Element} statusElement - The status element
     * @param {Element} spinnerElement - The spinner element
     * @param {Element} generateButton - The generate button
     */
    requestCommentGeneration: function(postContent, selectedStyle, dropdown, statusElement, spinnerElement, generateButton) {
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
            const result = UIManager.fillCommentField(response.comment);
            
            if (result.success) {
              statusElement.textContent = "Comment inserted successfully!";
              // Close the dropdown after a short delay
              setTimeout(() => dropdown.remove(), CONFIG.timing.dropdownCloseDelay);
            } else {
              statusElement.textContent = "Error: " + result.error;
            }
          } else {
            statusElement.textContent = "Error: " + (response?.error || "Failed to generate comment");
          }
        }
      );
    },
    
    /**
     * Function to find and fill the LinkedIn comment field
     * @param {string} text - The text to fill the comment field with
     * @returns {Object} Result object with success status and error message if applicable
     */
    fillCommentField: function(text) {
      try {
        Logger.log('Attempting to fill comment field with:', text);
        
        // First try to get the currently focused comment field
        let commentField = document.activeElement;
        
        // Check if the active element is actually a comment field
        if (!this.isCommentField(commentField)) {
          Logger.log('Active element is not a comment field, searching for visible comment fields');
          
          // Find all potential comment fields
          const commentFields = document.querySelectorAll('div[role="textbox"][contenteditable="true"], .ql-editor[contenteditable="true"]');
          
          // Try to find the most relevant comment field (visible and near the dropdown)
          const dropdown = document.querySelector('.' + CONFIG.ui.dropdownClass);
          
          if (dropdown && commentFields.length > 0) {
            commentField = this.findClosestVisibleField(commentFields, dropdown);
          }
          
          // If we still don't have a comment field, just take the first visible one
          if (!commentField) {
            commentField = this.findFirstVisibleField(commentFields);
          }
          
          // Last resort - just take the first one
          if (!commentField && commentFields.length > 0) {
            commentField = commentFields[0];
            Logger.log('Using first available comment field as fallback');
          }
        }
        
        if (!commentField) {
          Logger.warn('No comment field found');
          return {success: false, error: "No comment field found. Click on a comment box first."};
        }
        
        Logger.log('Successfully found comment field');
        
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
        Logger.error("Error filling comment field:", error);
        return {success: false, error: error.toString()};
      }
    },
    
    /**
     * Helper function to check if an element is a comment field
     * @param {Element} element - The element to check
     * @returns {boolean} True if the element is a comment field
     */
    isCommentField: function(element) {
      return element && 
        ((element.getAttribute('role') === 'textbox' && element.getAttribute('contenteditable') === 'true') ||
         (element.classList.contains('ql-editor') && element.getAttribute('contenteditable') === 'true'));
    },
    
    /**
     * Helper function to find the closest visible field to the dropdown
     * @param {NodeList} fields - The fields to check
     * @param {Element} dropdown - The dropdown element
     * @returns {Element|null} The closest visible field or null
     */
    findClosestVisibleField: function(fields, dropdown) {
      const dropdownRect = dropdown.getBoundingClientRect();
      
      let closestDistance = Infinity;
      let closestField = null;
      
      fields.forEach(field => {
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
        Logger.log('Found closest visible comment field to dropdown');
      }
      
      return closestField;
    },
    
    /**
     * Helper function to find the first visible field
     * @param {NodeList} fields - The fields to check
     * @returns {Element|null} The first visible field or null
     */
    findFirstVisibleField: function(fields) {
      for (const field of fields) {
        const rect = field.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0 && 
            rect.top >= 0 && rect.bottom <= window.innerHeight) {
          Logger.log('Using first visible comment field');
          return field;
        }
      }
      return null;
    }
  };
  
  // Content Extractor module for getting post content
  const ContentExtractor = {
    /**
     * Extract post content from LinkedIn post using multiple strategies
     * @returns {string} The extracted post content or error message
     */
    extractPostContent: function() {
      try {
        Logger.log('Attempting to extract post content');
        
        // Define extraction strategies in order of preference
        const strategies = [
          this.extractFromActiveComment,
          this.extractFromCommentSection,
          this.extractFromVisiblePosts,
          this.extractFromFallbackSelectors
        ];
        
        // Try each strategy until one succeeds
        for (const strategy of strategies) {
          const content = strategy.call(this);
          if (content) {
            return content;
          }
        }
        
        Logger.log('No post content found');
        return "No post content found. Please make sure you're on a LinkedIn post.";
        
      } catch (error) {
        Logger.error("Error extracting post content:", error);
        return "Error extracting post content: " + error.toString();
      }
    },
    
    /**
     * Strategy 1: Extract from active comment field
     * @returns {string|null} Extracted content or null if not found
     */
    extractFromActiveComment: function() {
      const activeCommentField = document.activeElement;
      
      if (!UIManager.isCommentField(activeCommentField)) {
        return null;
      }
      
      // Try to find the post container by traversing up from the active comment field
      const postContainer = activeCommentField.closest(CONFIG.selectors.postContainer);
      
      if (!postContainer) {
        return null;
      }
      
      // Try to find post content within this container
      const postElement = this.findPostElementInContainer(postContainer);
      
      if (postElement && postElement.textContent.trim()) {
        Logger.log('Found post content from active comment field');
        return this.cleanPostContent(postElement.textContent);
      }
      
      return null;
    },
    
    /**
     * Strategy 2: Extract from comment section
     * @returns {string|null} Extracted content or null if not found
     */
    extractFromCommentSection: function() {
      const activeCommentField = document.activeElement;
      const commentSection = activeCommentField?.closest('.comments-comment-item, .comments-comments-list, .social-details-social-activity');
      
      if (!commentSection) {
        return null;
      }
      
      // Find the parent post of this comment section
      const parentPost = commentSection.closest(CONFIG.selectors.postContainer);
      
      if (!parentPost) {
        return null;
      }
      
      const postElement = this.findPostElementInContainer(parentPost);
      
      if (postElement && postElement.textContent.trim()) {
        Logger.log('Found post content from comment section');
        return this.cleanPostContent(postElement.textContent);
      }
      
      return null;
    },
    
    /**
     * Strategy 3: Extract from visible posts
     * @returns {string|null} Extracted content or null if not found
     */
    extractFromVisiblePosts: function() {
      // Look for any visible post that might be in view
      const visiblePosts = Array.from(document.querySelectorAll('.feed-shared-update-v2')).filter(post => {
        const rect = post.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
      
      if (visiblePosts.length === 0) {
        return null;
      }
      
      // Use the most visible post
      const mostVisiblePost = visiblePosts[0];
      const postElement = this.findPostElementInContainer(mostVisiblePost);
      
      if (postElement && postElement.textContent.trim()) {
        Logger.log('Found post content from visible post');
        return this.cleanPostContent(postElement.textContent);
      }
      
      return null;
    },
    
    /**
     * Strategy 4: Extract using fallback selectors
     * @returns {string|null} Extracted content or null if not found
     */
    extractFromFallbackSelectors: function() {
      Logger.log('Primary selectors failed, trying fallbacks');
      
      const fallbackSelectors = [
        '.update-components-text span[dir="rtl"]',
        '.feed-shared-inline-show-more-text .update-components-text',
        '.feed-shared-update-v2__description .break-words'
      ];
      
      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          Logger.log(`Found content with fallback selector "${selector}"`);
          return this.cleanPostContent(element.textContent);
        }
      }
      
      return null;
    },
    
    /**
     * Find post element in a container using configured selectors
     * @param {Element} container - The container to search in
     * @returns {Element|null} The post element or null
     */
    findPostElementInContainer: function(container) {
      if (!container) return null;
      
      for (const selector of CONFIG.selectors.postContent) {
        const element = container.querySelector(selector);
        if (element) return element;
      }
      
      return null;
    },
    
    /**
     * Clean and format post content
     * @param {string} content - The raw content
     * @returns {string} The cleaned content
     */
    cleanPostContent: function(content) {
      const cleanedContent = content.trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[\n\r]+/g, ' '); // Replace newlines with space
      
      // Limit content length if too long
      return cleanedContent.length > CONFIG.content.maxPostLength 
        ? cleanedContent.substring(0, CONFIG.content.maxPostLength) + '...'
        : cleanedContent;
    },
    
    /**
     * Get post content for a specific comment section
     * @param {Element} section - The comment section
     * @returns {string} The extracted post content or empty string
     */
    getPostContentForSection: function(section) {
      try {
        // Find the parent post container
        const postContainer = section.closest(CONFIG.selectors.postContainer);
        
        if (postContainer) {
          // Try to find the post content within this specific container
          const postElement = this.findPostElementInContainer(postContainer);
          
          if (postElement && postElement.textContent.trim()) {
            const content = this.cleanPostContent(postElement.textContent);
            Logger.log(`Found post content for section: "${content.substring(0, 50)}..."`);
            return content;
          }
        }
      } catch (error) {
        Logger.error('Error finding post content:', error);
      }
      
      return "";
    }
  };
  
  // Observer module for handling DOM mutations
  const ObserverManager = {
    /**
     * Set up a MutationObserver to detect when new comment sections are added
     */
    setupCommentSectionObserver: function() {
      Logger.log('Setting up comment section observer');
      
      // Create a MutationObserver to watch for DOM changes
      const observer = new MutationObserver((mutations) => {
        // Check if we're within the cooldown period
        if (!State.shouldInject()) {
          return;
        }
        
        let shouldInject = false;
        
        // Check if any relevant elements were added
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if this node or its children contain comment sections
                const hasCommentBox = node.querySelector(CONFIG.selectors.commentSections);
                
                const isCommentBox = node.classList && (
                  node.classList.contains('comments-comment-box') || 
                  node.classList.contains('comments-comment-texteditor') ||
                  node.hasAttribute('contenteditable')
                );
                
                if (hasCommentBox || isCommentBox) {
                  Logger.log('Detected new comment section:', node);
                  shouldInject = true;
                }
              }
            });
          }
        });
        
        if (shouldInject) {
          Logger.log('Injecting comment assistant button due to DOM changes');
          UIManager.injectCommentAssistantButton();
        }
      });
      
      // Start observing the document with the configured parameters
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Also inject buttons for any existing comment sections
      UIManager.injectCommentAssistantButton();
    },
    
    /**
     * Add click listeners to LinkedIn's comment buttons to trigger our button injection
     */
    setupCommentButtonListeners: function() {
      Logger.log('Setting up comment button listeners');
      
      // Find all LinkedIn comment buttons
      const commentButtons = document.querySelectorAll(CONFIG.selectors.commentButtons);
      
      // Limit the number of buttons we process to avoid performance issues
      const MAX_BUTTONS = 20;
      let processedCount = 0;
      
      Logger.log(`Found ${commentButtons.length} LinkedIn comment buttons, processing up to ${MAX_BUTTONS}`);
      
      for (const button of commentButtons) {
        // Check if we already added a listener to this button
        if (!button.hasAttribute(CONFIG.ui.dataAttributes.listenerAdded)) {
          button.setAttribute(CONFIG.ui.dataAttributes.listenerAdded, 'true');
          
          button.addEventListener('click', () => {
            Logger.log('LinkedIn comment button clicked, injecting assistant button');
            // Wait a short moment for the comment box to appear
            setTimeout(() => {
              UIManager.injectCommentAssistantButton();
            }, CONFIG.timing.commentBoxAppearDelay);
          });
          
          processedCount++;
          if (processedCount >= MAX_BUTTONS) {
            Logger.log(`Reached maximum of ${MAX_BUTTONS} buttons, stopping processing`);
            break;
          }
        }
      }
      
      Logger.log(`Added click listeners to ${processedCount} new comment buttons`);
    },
    
    /**
     * Set up a MutationObserver to watch for new comment buttons
     */
    setupCommentButtonObserver: function() {
      // Create a MutationObserver to watch for new comment buttons
      const observer = new MutationObserver((mutations) => {
        // Check if we're within the cooldown period
        if (!State.shouldCheckButtons()) {
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
          this.setupCommentButtonListeners();
        }
      });
      
      // Start observing the document for new buttons
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Also set up listeners for any existing buttons
      this.setupCommentButtonListeners();
    },
    
    /**
     * Start periodic checks for comment sections
     */
    startPeriodicCheck: function() {
      State.resetPeriodicCheck();
      
      State.periodicCheckInterval = setInterval(() => {
        State.periodicCheckCount++;
        
        // Check if we already have buttons
        const existingButtons = document.querySelectorAll('.' + CONFIG.ui.buttonClass);
        
        if (existingButtons.length > 0) {
          // We have buttons, no need to keep checking
          Logger.log('Periodic check stopped - buttons already exist');
          State.resetPeriodicCheck();
        } else if (State.periodicCheckCount >= CONFIG.timing.maxPeriodicChecks) {
          // We've tried enough times, stop checking
          Logger.log('Periodic check stopped - max attempts reached');
          State.resetPeriodicCheck();
        } else {
          // Try to inject buttons
          Logger.log(`Periodic check ${State.periodicCheckCount}/${CONFIG.timing.maxPeriodicChecks} - attempting to inject buttons`);
          UIManager.injectCommentAssistantButton();
          // Also check for comment buttons
          this.setupCommentButtonListeners();
        }
      }, CONFIG.timing.periodicCheckInterval);
    }
  };
  
  /**
   * Main initialization function
   */
  function initialize() {
    Logger.log('LinkedIn Comment Assistant initializing');
    
    // Initialize message handler
    MessageHandler.init();
    
    // Set up observers for comment sections and buttons
    ObserverManager.setupCommentSectionObserver();
    ObserverManager.setupCommentButtonObserver();
    
    // Start periodic checks
    ObserverManager.startPeriodicCheck();
    
    Logger.log('LinkedIn Comment Assistant ready');
  }
  
  // Initialize when the page is fully loaded
  window.addEventListener('load', initialize);
  
  // Also try to initialize immediately in case the page is already loaded
  initialize();
  
})();