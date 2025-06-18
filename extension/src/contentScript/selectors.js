const LINKEDIN_SELECTORS = {
  POST_CONTAINER: '.feed-shared-update-v2',
  POST_CONTENT: '.feed-shared-update-v2__description .update-components-text',
  COMMENT_SECTIONS: '.comments-comment-texteditor:not(.comments-comment-box--reply), ' + 
                    '.ql-editor[contenteditable="true"]:not(.comments-comment-box--reply)',
  ACTIONS_AREA: '.comments-comment-texteditor .display-flex',
  BUTTON_CONTAINER: '.display-flex:not(.justify-space-between)',
  REPLY_BOX: '.comments-comment-box--reply',
  COMMENT_SUBMIT_BUTTON: '.comments-comment-box__submit-button--cr',
};

module.exports = LINKEDIN_SELECTORS; 