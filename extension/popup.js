// Listen for the sign in button click
document.getElementById('signInButton').addEventListener('click', () => {
  // Update status to show authentication is in progress
  const statusElement = document.getElementById('status');
  statusElement.textContent = 'Authentication in progress...';
  
  // Send message to background script to start auth flow
  chrome.runtime.sendMessage({ action: 'startAuthFlow' }, (response) => {
    if (response && response.success) {
      statusElement.textContent = 'Authentication started. You can close this popup.';
    } else {
      statusElement.textContent = response?.error || 'Failed to start authentication.';
    }
  });
});