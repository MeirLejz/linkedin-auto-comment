// Backend URL Configuration
const DEV_URL = "http://localhost:5000";
const PROD_URL = "https://linkedin-comment-assistant-c78fcd89d8ae.herokuapp.com";

// Set to true for development, false for production
const IS_DEVELOPMENT = false;

const BACKEND_URL = IS_DEVELOPMENT ? DEV_URL : PROD_URL;

console.log(`Using backend URL: ${BACKEND_URL} (${IS_DEVELOPMENT ? 'Development' : 'Production'} mode)`);

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received:", request.action, request);
  
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

// Function to extract post content from a LinkedIn post
function extractPostContent(postElement) {
  // This function is now handled in the content script
  // Keeping this as a placeholder in case we need server-side extraction in the future
  return "";
}