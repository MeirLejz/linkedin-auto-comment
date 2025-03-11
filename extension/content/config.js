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

export default CONFIG;
