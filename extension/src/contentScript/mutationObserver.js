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