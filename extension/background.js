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

  // Handle auth flow initiation
  if (request.action === "startAuthFlow") {
    startAuthFlow()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }

  // Handle comment generation
  if (request.action === "generateComment") {
    console.log("Generate comment request received");
    
    // Start streaming comment generation and pass the sendResponse function
    streamComment(request.postContent, sender.tab.id, sendResponse);
    
    // Indicate we'll respond asynchronously
    return true;
  }
});

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