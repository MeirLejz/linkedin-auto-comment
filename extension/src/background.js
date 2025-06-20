const supabase = require('./supabaseConfig.js');
const { SessionManager, sessionManager } = require('./sessionManager.js');

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
    "getRequestCount": handleGetRequestCount,
    "getPlanType": handleGetPlanType
  };

  // Call the appropriate handler if it exists
  if (handlers[request.action]) {
    handlers[request.action](request, sender, sendResponse);
    return true; // Indicates async response
  }
});

// =========================================================================  
// Handler functions for different message types
// =========================================================================
function handleStartAuthFlow(request, sender, sendResponse) {
  (async () => {
    try {
      const manifest = chrome.runtime.getManifest();
      const url = new URL('https://accounts.google.com/o/oauth2/auth');
      url.searchParams.set('client_id', manifest.oauth2.client_id);
      url.searchParams.set('response_type', 'id_token');
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('redirect_uri', `https://${chrome.runtime.id}.chromiumapp.org`);
      url.searchParams.set('scope', manifest.oauth2.scopes.join(' '));
      // url.searchParams.set('prompt', 'consent');
      chrome.identity.launchWebAuthFlow({ url: url.href, interactive: true }, async (redirectedTo) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        try {
          const url = new URL(redirectedTo);
          const params = new URLSearchParams(url.hash.replace('#', ''));
          const id_token = params.get('id_token');
          if (!id_token) throw new Error('No ID token returned from Google');
          // Authenticate with Supabase
          const supabaseSession = await sessionManager.signInSupabaseWithGoogleIdToken(id_token);
          const session = {
            supabase: {
              access_token: supabaseSession.access_token,
              refresh_token: supabaseSession.refresh_token,
              expires_at: supabaseSession.expires_at,
              user: {
                id: supabaseSession.user.id,
                email: supabaseSession.user.email,
                name: supabaseSession.user.display_name,
              },
            },
          };
          await sessionManager.saveSession(session);
          supabase.auth.setSession({
            access_token: session.supabase.access_token,
            refresh_token: session.supabase.refresh_token,
          });
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
      });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  })();
  return true;
}

function handleCheckAuthStatus(request, sender, sendResponse) {
  (async () => {
    try {
      const session = await sessionManager.loadSession();
      const authenticated = !!(session && session.supabase && session.supabase.user && session.supabase.access_token);
      sendResponse({
        isAuthenticated: authenticated,
        email: session?.supabase?.user?.email || null,
      });
    } catch (e) {
      sendResponse({ isAuthenticated: false, error: e.message });
    }
  })();
  return true;
}

function handleSignOut(request, sender, sendResponse) {
  (async () => {
    await sessionManager.signOut();
    sendResponse({ success: true });
  })();
  return true;
}

function handleGenerateComment(request, sender, sendResponse) {
  withAuthenticatedSession(async (session) => {
    // Check if user has remaining requests
    const { data, error } = await supabase.rpc('use_request', {
      user_uuid: session.supabase.user.id
    });
    if (error || !data) {
      sendResponse({
        success: false,
        error: 'No remaining requests. Please upgrade your plan or try again later.',
        code: 'NO_CREDITS'
      });
      return;
    }
    // Proceed with comment generation
    streamComment(request.postContent, sender.tab.id, sendResponse);
  }, sendResponse).catch((e) => {
    // Error already sent
  });
  return true;
}

function handleGetRequestCount(request, sender, sendResponse) {
  withAuthenticatedSession(async (session) => {
    const { data, error } = await supabase.rpc('get_user_remaining_requests', {
      p_user_id: session.supabase.user.id
    });
    if (error) {
      sendResponse({ success: false, error: error.message });
      return;
    }
    sendResponse({ success: true, count: data });
  }, sendResponse).catch(() => {});
  return true;
}

function handleGetPlanType(request, sender, sendResponse) {
  withAuthenticatedSession(async (session) => {
    const { data, error } = await supabase.rpc('get_user_plan_type', {
      p_user_id: session.supabase.user.id
    });
    if (error) {
      sendResponse({ success: false, error: error.message });
      return;
    }
    sendResponse({ success: true, planType: data });
  }, sendResponse).catch(() => {});
  return true;
}

// =========================================================================
// Implementation functions
// =========================================================================

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

// =========================
// Authenticated Call Wrapper
// =========================
async function withAuthenticatedSession(fn, sendResponse) {
  try {
    const session = await sessionManager.ensureFreshSession();
    return await fn(session);
  } catch (err) {
    // On error, try once more if it's an auth error
    if (err.message && (err.message.includes('token') || err.message.includes('session'))) {
      try {
        // We assume ensureFreshSession returns the session, so we use that.
        // This makes the retry logic consistent with the initial attempt.
        const refreshedSession = await sessionManager.ensureFreshSession();
        return await fn(refreshedSession);
      } catch (err2) {
        console.error('[Auth] Auth retry failed:', err2);
        if (sendResponse) sendResponse({ success: false, error: err2.message });
        throw err2;
      }
    } else {
      console.error('[Auth] Error:', err);
      if (sendResponse) sendResponse({ success: false, error: err.message });
      throw err;
    }
  }
}