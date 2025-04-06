// Check authentication status when popup opens
document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status');
  const signInButton = document.getElementById('signInButton');
  const signOutButton = document.getElementById('signOutButton');
  
  // Initially hide sign out button
  signOutButton.style.display = 'none';
  
  // Check if user is authenticated
  chrome.runtime.sendMessage({ action: 'checkAuthStatus' }, (response) => {
    if (response && response.isAuthenticated) {
      // User is authenticated
      statusElement.textContent = `Signed in as ${response.email || 'User'}`;
      signInButton.style.display = 'none';
      signOutButton.style.display = 'block';
      
      // Get and display request count
      displayRequestCount();
    } else {
      // User is not authenticated
      statusElement.textContent = 'Not signed in';
      signInButton.style.display = 'block';
      signOutButton.style.display = 'none';
      
      // Hide request count if any
      const requestCountElement = document.getElementById('requestCount');
      if (requestCountElement) {
        requestCountElement.style.display = 'none';
      }
    }
  });
});

// Function to get and display request count
function displayRequestCount() {
  chrome.runtime.sendMessage({ action: 'getRequestCount' }, (response) => {
    // Create or get the request count element
    let requestCountElement = document.getElementById('requestCount');

    // Display the count
    if (response && response.success) {
      requestCountElement.textContent = `Comments generated: ${response.count || 0}`;
      requestCountElement.style.display = 'block';
    } else {
      requestCountElement.textContent = 'Unable to load usage data';
      requestCountElement.style.display = 'block';
    }
  });
}

// Listen for the sign in button click
document.getElementById('signInButton').addEventListener('click', () => {
  // Update status to show authentication is in progress
  const statusElement = document.getElementById('status');
  statusElement.textContent = 'Authentication in progress...';
  
  // Send message to background script to start auth flow
  chrome.runtime.sendMessage({ action: 'startAuthFlow' }, (response) => {
    if (response && response.success) {
      statusElement.textContent = 'Authentication successful!';
      document.getElementById('signInButton').style.display = 'none';
      document.getElementById('signOutButton').style.display = 'block';
    } else {
      statusElement.textContent = response?.error || 'Failed to authenticate.';
    }
  });
});

// Listen for the sign out button click
document.getElementById('signOutButton').addEventListener('click', () => {
  const statusElement = document.getElementById('status');
  statusElement.textContent = 'Signing out...';
  
  chrome.runtime.sendMessage({ action: 'signOut' }, (response) => {
    if (response && response.success) {
      statusElement.textContent = 'Signed out successfully.';
      document.getElementById('signInButton').style.display = 'block';
      document.getElementById('signOutButton').style.display = 'none';
    } else {
      statusElement.textContent = response?.error || 'Failed to sign out.';
    }
  });
});