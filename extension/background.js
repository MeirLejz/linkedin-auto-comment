import supabase from './supabaseConfig.js';

// Backend URL Configuration
const DEV_URL = "http://localhost:5000";
const PROD_URL = "https://linkedin-comment-assistant-c78fcd89d8ae.herokuapp.com";

// Set to true for development, false for production
const IS_DEVELOPMENT = false;
const BACKEND_URL = IS_DEVELOPMENT ? DEV_URL : PROD_URL;
console.log(`Using backend URL: ${BACKEND_URL} (${IS_DEVELOPMENT ? 'Development' : 'Production'} mode)`);

// Initialize supabase client
console.log('Supabase client initialized');

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received:", request.action, request);

  // Route messages to appropriate handlers
  const handlers = {
    "startAuthFlow": handleStartAuthFlow,
    "checkAuthStatus": handleCheckAuthStatus,
    "signOut": handleSignOut,
    "generateComment": handleGenerateComment,
    "getRequestCount": handleGetRequestCount
  };

  // Call the appropriate handler if it exists
  if (handlers[request.action]) {
    handlers[request.action](request, sender, sendResponse);
    return true; // Indicates async response
  }
});

// Handler functions for different message types
function handleStartAuthFlow(request, sender, sendResponse) {
  startAuthFlow()
    .then(() => sendResponse({ success: true }))
    .catch(error => sendResponse({ success: false, error: error.message }));
}

function handleCheckAuthStatus(request, sender, sendResponse) {
  (async () => {
    const authenticated = await isAuthenticated();
    const user = authenticated ? await getCurrentUser() : null;
    sendResponse({ 
      isAuthenticated: authenticated,
      email: user?.email
    });
  })();
}

function handleSignOut(request, sender, sendResponse) {
  signOutUser()
    .then(result => sendResponse(result))
    .catch(error => sendResponse({ success: false, error: error.message }));
}

function handleGenerateComment(request, sender, sendResponse) {
  ensureAuthenticated(async () => {
    // Get current user information
    const user = await getCurrentUser();
    if (!user || !user.id) {
      sendResponse({ 
        success: false, 
        error: "User information could not be retrieved." 
      });
      return;
    }

    console.log("User ID:", user.id, "Type:", typeof user.id);

    // Check if the user has remaining requests
    const { data, error } = await supabase.rpc('use_request', {
      user_uuid: user.id
    });
    console.log("Data:", data);
    console.log("Error:", error);
    if (error || !data) {
      sendResponse({ 
        success: false, 
        error: "No remaining requests. Please upgrade your plan or try again later." 
      });
      return;
    }

    // Proceed with comment generation
    console.log("Generate comment request received");
    streamComment(request.postContent, sender.tab.id, sendResponse);
  }).catch(error => {
    sendResponse({ 
      success: false, 
      error: error.message || "Authentication failed. Please sign in again." 
    });
  });
}

function handleGetRequestCount(request, sender, sendResponse) {
  getUserRequestCount()
    .then(count => sendResponse({ success: true, count: count }))
    .catch(error => sendResponse({ success: false, error: error.message }));
}

// Function to handle the OAuth authentication flow
function startAuthFlow() {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure supabase is initialized
      if (!supabase) {
        supabase = await initSupabase();
      }
      
      const manifest = chrome.runtime.getManifest();
      
      const url = new URL('https://accounts.google.com/o/oauth2/auth');
      url.searchParams.set('client_id', manifest.oauth2.client_id);
      url.searchParams.set('response_type', 'id_token');
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('redirect_uri', `https://${chrome.runtime.id}.chromiumapp.org`);
      url.searchParams.set('scope', manifest.oauth2.scopes.join(' '));
      
      console.log('Auth URL:', url.href); // Debugging
      console.log("Extension ID:", chrome.runtime.id);
      
      chrome.identity.launchWebAuthFlow(
        {
          url: url.href,
          interactive: true,
        },
        async (redirectedTo) => {
          if (chrome.runtime.lastError) {
            // Auth was not successful
            console.error('Authentication failed:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            try {
              // Auth was successful, extract the ID token from the redirectedTo URL
              const url = new URL(redirectedTo);
              const params = new URLSearchParams(url.hash.replace('#', ''));

              // Call Supabase auth with the ID token
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: params.get('id_token'),
              });
              
              if (error) {
                console.error('Supabase authentication error:', error);
                reject(error);
              } else {
                // Store the session
                await storeUserSession(data.session);
                resolve({ success: true });
              }
            } catch (error) {
              console.error('Error processing auth response:', error);
              reject(error);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error starting auth flow:', error);
      reject(error);
    }
  });
}

// Function to stream a comment from the backend API
async function streamComment(postContent, tabId, sendResponse) {
  console.log("streamComment called");
  try {
    // Call backend API with fetch
    const response = await fetch(`${BACKEND_URL}/generate-comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_content: postContent
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      chrome.tabs.sendMessage(tabId, {
        action: "commentStreamUpdate",
        error: errorData.error || `API request failed with status ${response.status}`
      });
      return;
    }
    
    // Initialize comment accumulator
    let accumulatedComment = "";
    
    // Create a reader for the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // Process the stream
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log("Stream complete");
        break;
      }
      
      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      
      // Process each line in the chunk
      const lines = chunk.split('\n\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            
            if (data.error) {
              chrome.tabs.sendMessage(tabId, {
                action: "commentStreamUpdate",
                error: data.error
              });
              return;
            }
            
            if (data.content) {
              // Accumulate the comment
              accumulatedComment += data.content;
              
              // Send update to content script
              chrome.tabs.sendMessage(tabId, {
                action: "commentStreamUpdate",
                comment: accumulatedComment,
                done: false
              });
            }
            
            if (data.done) {
              // Final update
              chrome.tabs.sendMessage(tabId, {
                action: "commentStreamUpdate",
                comment: accumulatedComment,
                done: true
              });
            }
          } catch (e) {
            console.error("Error parsing stream data:", e, line);
          }
        }
      }
    }
    
    // Send a final response to close the message channel properly
    sendResponse({success: true, complete: true});
  } catch (error) {
    console.error("Error in streamComment:", error);
    chrome.tabs.sendMessage(tabId, {
      action: "commentStreamUpdate",
      error: error.message || "Failed to generate comment"
    });
    
    // Send error response to close the message channel properly
    sendResponse({success: false, error: error.message || "Failed to generate comment"});
  }
}

// Check if user is authenticated
async function isAuthenticated() {
  try {
    const data = await chrome.storage.local.get('userSession');
    if (!data.userSession) return false;
    
    // Check if session is expired
    if (data.userSession.expires_at && new Date(data.userSession.expires_at * 1000) < new Date()) {
      console.log('Session expired, attempting refresh');
      // Try to refresh the token
      const refreshed = await refreshToken(data.userSession.refresh_token);
      return refreshed;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

// Refresh the access token using the refresh token
async function refreshToken(refreshToken) {
  try {
    if (!refreshToken) {
      console.log('No refresh token available');
      return false;
    }
    
    // Call Supabase to refresh the token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error) {
      console.error('Token refresh failed:', error.message);
      return false;
    }
    
    if (data && data.session) {
      // Store the new session
      await storeUserSession(data.session);
      console.log('Token refreshed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

// Store user session data (updated to handle Supabase session format correctly)
async function storeUserSession(session) {
  await chrome.storage.local.set({ 
    userSession: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: session.user.id,
        email: session.user.email
      },
      expires_at: session.expires_at
    }
  });
  console.log('User session stored');
}

// Get current user data
async function getCurrentUser() {
  try {
    const data = await chrome.storage.local.get('userSession');
    return data.userSession?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Sign out user
async function signOutUser() {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear local storage
    await chrome.storage.local.remove('userSession');
    console.log('User signed out');
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
}

// Utility function to ensure authentication
async function ensureAuthenticated(action) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    const refreshed = await refreshToken();
    if (!refreshed) {
      throw new Error('Authentication failed. Please sign in again.');
    }
  }
  return action();
}

// Example usage with getUserRequestCount
async function getUserRequestCount() {
  return ensureAuthenticated(async () => {
    const user = await getCurrentUser();
    
    const { data, error } = await supabase.rpc('get_user_remaining_requests', {
      p_user_id: user.id
    });
    
    if (error) {
      console.error('Error fetching request count:', error);
      return 0;
    }
    
    return data || 0;
  });
}