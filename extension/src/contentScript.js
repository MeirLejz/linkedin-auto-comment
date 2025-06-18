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