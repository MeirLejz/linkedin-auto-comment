// Store backend URL
// const BACKEND_URL = "http://localhost:5000"; // Change to your production URL when deployed
const BACKEND_URL = "https://linkedin-comment-assistant-c78fcd89d8ae.herokuapp.com"

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received:", request.action, request);
  
  // Handle comment generation
  if (request.action === "generateComment") {
    console.log("Generate comment request received:", {
      postContentLength: request.postContent?.length,
      style: request.style
    });
    
    console.log("Calling backend to generate comment...");
    generateComment(request.postContent, request.style)
      .then(comment => {
        console.log("Comment generated successfully:", comment.substring(0, 30) + "...");
        sendResponse({success: true, comment: comment});
      })
      .catch(error => {
        console.error("Error generating comment:", error);
        sendResponse({
          success: false, 
          error: error.message || "Failed to generate comment"
        });
      });
    
    return true; // Required for async sendResponse
  }
});

// Function to generate a comment using backend API
async function generateComment(postContent, style) {
  console.log("generateComment called with style:", style);
  try {
    console.log("Sending request to backend API...");
    // Call backend API
    const response = await fetch(`${BACKEND_URL}/generate-comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        post_content: postContent,
        style: style
      })
    });
    
    console.log("Backend API response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error response:", errorData);
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API response received:", data);
    return data.comment;
    
  } catch (error) {
    console.error("Error in generateComment:", error);
    throw error;
  }
}

// Function to extract post content from a LinkedIn post
function extractPostContent(postElement) {
  // This function is now handled in the content script
  // Keeping this as a placeholder in case we need server-side extraction in the future
  return "";
}