/*
import { createClient } from 'https://unpkg.com/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://hzhuqrztsisuwjilobiv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHVxcnp0c2lzdXdqaWxvYml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MzA3MTQsImV4cCI6MjA1OTEwNjcxNH0.yNW1jkUTkIpanoQJP0dsFCfr5swXF10QX4nHNIoem8E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
*/

// Backend URL Configuration
const DEV_URL = "http://localhost:5000";
const PROD_URL = "https://linkedin-comment-assistant-c78fcd89d8ae.herokuapp.com";

// Set to true for development, false for production
const IS_DEVELOPMENT = false;
const BACKEND_URL = IS_DEVELOPMENT ? DEV_URL : PROD_URL;
console.log(`Using backend URL: ${BACKEND_URL} (${IS_DEVELOPMENT ? 'Development' : 'Production'} mode)`);

/*
// Auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.storage.local.set({ session });
  }
  if (event === 'SIGNED_OUT') {
    chrome.action.setBadgeText({ text: '' });
    chrome.storage.local.remove('session');
  }
});

// Session recovery
chrome.runtime.onStartup.addListener(async () => {
  const { session } = await chrome.storage.local.get('session');
  if (session) {
    await supabase.auth.setSession(session);
  }
});

async function validateSession(session) {
  const { data, error } = await supabase.auth.getUser(session.access_token);
  if (error) throw new Error('Invalid session');
  return data.user;
}
*/

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received:", request.action, request);
  
  // Handle session management
  if (request.action === "storeSession") {
    chrome.storage.local.set({ session: request.session });
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