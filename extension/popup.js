// Check authentication status when popup opens
document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status');
  const signInButton = document.getElementById('signInButton');
  const signOutButton = document.getElementById('signOutButton');
  const upgradeButton = document.getElementById('upgradeButton');
  
  // State containers
  const notSignedInState = document.getElementById('not-signed-in');
  const freePlanState = document.getElementById('free-plan');
  const basicPlanState = document.getElementById('basic-plan');
  
  // Initially show 'not signed in' state
  showState('not-signed-in');
  
  // Ensure upgrade button is visible when on free plan
  if (upgradeButton) {
    upgradeButton.style.display = 'block';
    
    // Add click event for upgrade button
    upgradeButton.addEventListener('click', () => {
      // Open the upgrade page
      chrome.tabs.create({ url: 'https://linkedin-auto-comment.vercel.app/' });
    });
  }
  
  // Set up event listeners for auth buttons
  signInButton.addEventListener('click', handleSignIn);
  signOutButton.addEventListener('click', handleSignOut);
  
  // Check if user is authenticated
  checkAuthStatus();
});

// Function to check authentication status
function checkAuthStatus() {
  const statusElement = document.getElementById('status');
  
  chrome.runtime.sendMessage({ action: 'checkAuthStatus' }, (response) => {
    if (response && response.isAuthenticated) {
      // User is authenticated
      statusElement.textContent = `Welcome, ${response.email || 'User'}!`;
      
      // Check the user's plan type
      getPlanInfo();
    } else {
      // User is not authenticated
      showState('not-signed-in');
      statusElement.textContent = '';
    }
  });
}

// Function to get plan information
function getPlanInfo(retryCount = 0, maxRetries = 3) {
  chrome.runtime.sendMessage({ action: 'getPlanType' }, (planResponse) => {
    console.log("Plan response:", planResponse);
    
    if (planResponse && planResponse.success && planResponse.planType) {
      // Convert plan type to lowercase for case-insensitive comparison
      const planType = planResponse.planType.toLowerCase();
      
      console.log('planType:', planType);

      if (planType === 'basic') {
        // Show PRO plan state
        showState('basic-plan');
        displayRequestCount('basic');
      } else if (planType === 'free') {
        // Default to free plan
        showState('free-plan');
        displayRequestCount('free');
      }
    } else {
      // Handle error case - attempt retry if under max retries
      console.error("Invalid plan response:", planResponse, `Retry attempt: ${retryCount+1}/${maxRetries+1}`);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying getPlanInfo in ${(retryCount+1)*500}ms...`);
        // Exponential backoff: increase wait time with each retry
        setTimeout(() => getPlanInfo(retryCount + 1, maxRetries), (retryCount+1) * 500);
      } else {
        // After max retries, default to free plan
        console.error("Max retries reached. Defaulting to free plan.");
        showState('free-plan');
        displayRequestCount('free');
      }
    }
  });
}

// Function to show the appropriate state and hide others
function showState(stateId) {
  const states = ['not-signed-in', 'free-plan', 'basic-plan'];
  
  states.forEach(state => {
    const element = document.getElementById(state);
    if (element) {
      if (state === stateId) {
        element.classList.add('state-active');
      } else {
        element.classList.remove('state-active');
      }
    }
  });
  
  // Special handling for sign out button visibility
  const signOutButton = document.getElementById('signOutButton');
  if (signOutButton) {
    signOutButton.style.display = (stateId !== 'not-signed-in') ? 'block' : 'none';
  }
  
  // Special handling for upgrade button visibility
  const upgradeButton = document.getElementById('upgradeButton');
  if (upgradeButton) {
    upgradeButton.style.display = (stateId === 'free-plan') ? 'block' : 'none';
  }
}

// Function to get and display request count
function displayRequestCount(plan) {
  chrome.runtime.sendMessage({ action: 'getRequestCount' }, (response) => {
    const elementId = plan === 'basic' ? 'basic-request-count' : 'free-request-count';
    const requestCountElement = document.getElementById(elementId);
    
    if (!requestCountElement) return;
    
    if (plan === 'basic') {
      requestCountElement.textContent = 'Unlimited comments';
    } else if (response && response.success) {
      requestCountElement.textContent = `Remaining comments: ${response.count}`;
    } else {
      requestCountElement.textContent = 'Unable to load usage data';
    }
  });
}

// Handle the sign in button click
function handleSignIn() {
  const statusElement = document.getElementById('status');
  const signInButton = document.getElementById('signInButton');
  
  // Show loading state
  statusElement.textContent = 'Signing in...';
  signInButton.textContent = 'Signing in...';
  signInButton.classList.add('loading');
  
  // Send message to background script to start auth flow
  chrome.runtime.sendMessage({ action: 'startAuthFlow' }, (response) => {
    signInButton.classList.remove('loading');
    signInButton.textContent = 'Sign in with Google';
    
    if (response && response.success) {
      statusElement.textContent = 'Successfully signed in!';
      
      // Check plan type after successful sign-in
      getPlanInfo();
    } else {
      showState('not-signed-in');
      statusElement.textContent = response?.error || 'Failed to sign in. Please try again.';
    }
  });
}

// Handle the sign out button click
function handleSignOut() {
  const statusElement = document.getElementById('status');
  const signOutButton = document.getElementById('signOutButton');
  
  // Show loading state
  statusElement.textContent = 'Signing out...';
  signOutButton.classList.add('loading');
  
  chrome.runtime.sendMessage({ action: 'signOut' }, (response) => {
    signOutButton.classList.remove('loading');
    
    if (response && response.success) {
      statusElement.textContent = 'Successfully signed out.';
      showState('not-signed-in');
    } else {
      statusElement.textContent = response?.error || 'Failed to sign out. Please try again.';
    }
  });
}