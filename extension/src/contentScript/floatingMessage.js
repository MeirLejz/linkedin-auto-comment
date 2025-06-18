function showFloatingMessage({ anchorElement, title, body, actionText, actionHref, onAction }) {
  // Remove any existing popup
  const existing = document.querySelector('.ava-ai-message-popup');
  if (existing) existing.remove();

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'ava-ai-message-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.innerHTML = `
    <div class="ava-ai-message-popup-title">${title}</div>
    <div class="ava-ai-message-popup-body">${body}</div>
    ${actionText && actionHref ? `<a class="ava-ai-message-popup-action" href="${actionHref}" target="_blank" rel="noopener">${actionText}</a>` : ''}
  `;

  // Optional action callback (for sign-in, etc)
  if (actionText && !actionHref && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.className = 'ava-ai-message-popup-action';
    btn.textContent = actionText;
    btn.onclick = (e) => {
      e.preventDefault();
      onAction();
      popup.remove();
    };
    popup.appendChild(btn);
  }

  document.body.appendChild(popup);

  // Position popup near anchorElement
  anchorElement.offsetHeight; // Force reflow
  const rect = anchorElement.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.zIndex = 99999;
  popup.style.top = `${rect.bottom + 8}px`;
  popup.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;

  // Dismiss logic
  let dismissTimeout;
  let hovered = false;
  function removePopup() { if (popup.parentNode) popup.parentNode.removeChild(popup); }
  function scheduleDismiss() {
    dismissTimeout = setTimeout(() => { if (!hovered) removePopup(); }, 5000);
  }
  popup.addEventListener('mouseenter', () => { hovered = true; clearTimeout(dismissTimeout); });
  popup.addEventListener('mouseleave', () => { hovered = false; scheduleDismiss(); });
  document.addEventListener('mousedown', function onDocClick(e) {
    if (!popup.contains(e.target)) {
      removePopup();
      document.removeEventListener('mousedown', onDocClick);
    }
  });
  scheduleDismiss();
}

module.exports = { showFloatingMessage }; 