function updateCommentPlaceholder(newPlaceholder, commentField) {
  try {
    commentField.setAttribute('data-placeholder', newPlaceholder);
    commentField.setAttribute('aria-placeholder', newPlaceholder);
    return true;
  } catch (error) {
    return false;
  }
}

function fillCommentField(text, specificField = null) {
  try {
    let commentField = specificField;
    commentField.focus();
    commentField.textContent = text;
    commentField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(commentField);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return {success: true};
  } catch (error) {
    return {success: false, error: error.toString()};
  }
}

module.exports = { updateCommentPlaceholder, fillCommentField }; 