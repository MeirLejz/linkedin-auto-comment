// Store API key in Chrome storage
let openaiApiKey = null;

// Load API key from storage when extension starts
chrome.storage.local.get(['openaiApiKey'], function(result) {
  if (result.openaiApiKey) {
    openaiApiKey = result.openaiApiKey;
  }
});

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received:", request.action, request);
  
  // Handle API key management
  if (request.action === "saveApiKey") {
    console.log("Saving API key...");
    openaiApiKey = request.apiKey;
    chrome.storage.local.set({openaiApiKey: request.apiKey}, function() {
      console.log("API key saved successfully");
      sendResponse({success: true});
    });
    return true; // Required for async sendResponse
  }
  
  else if (request.action === "getApiKey") {
    console.log("Getting API key, current value:", openaiApiKey ? "Key exists" : "No key");
    sendResponse({success: true, apiKey: openaiApiKey});
  }
  
  // Handle comment generation
  else if (request.action === "generateComment") {
    console.log("Generate comment request received:", {
      postContentLength: request.postContent?.length,
      style: request.style,
      hasApiKey: !!openaiApiKey
    });
    
    if (!openaiApiKey) {
      console.log("API key not set, returning error");
      sendResponse({
        success: false, 
        error: "API key not set. Please set your OpenAI API key in the extension popup."
      });
      return true;
    }
    
    console.log("Calling generateComment function...");
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

// Function to generate a comment using OpenAI API
async function generateComment(postContent, style) {
  console.log("generateComment called with style:", style);
  try {
    // Prepare the prompt based on the selected style
    let prompt = "";
    
    switch(style) {
      case "professional":
        prompt = `Write a professional and insightful comment for this LinkedIn post. The comment should be thoughtful, business-appropriate, and demonstrate expertise without being overly formal. Keep it under 3 sentences.\n\nPost content: "${postContent}"`;
        break;
      case "casual":
        prompt = `Write a friendly, conversational comment for this LinkedIn post. The tone should be warm and approachable, as if talking to a colleague you know well. Keep it under 3 sentences.\n\nPost content: "${postContent}"`;
        break;
      case "enthusiastic":
        prompt = `Write an enthusiastic and supportive comment for this LinkedIn post. The comment should be energetic, positive, and encouraging. Keep it under 3 sentences.\n\nPost content: "${postContent}"`;
        break;
      case "thoughtful":
        prompt = `Write a thoughtful, reflective comment for this LinkedIn post that adds value to the conversation. The comment should demonstrate careful consideration of the topic and possibly add a new perspective. Keep it under 3 sentences.\n\nPost content: "${postContent}"`;
        break;
      case "concise":
        prompt = `Write a brief, to-the-point comment for this LinkedIn post. The comment should be direct and efficient while still being engaging. Keep it to 1-2 short sentences.\n\nPost content: "${postContent}"`;
        break;
      default:
        prompt = `Write a professional comment for this LinkedIn post. Keep it under 3 sentences.\n\nPost content: "${postContent}"`;
    }
    
    console.log("Sending request to OpenAI API...");
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that writes engaging LinkedIn comments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    console.log("OpenAI API response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error response:", errorData);
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API response received:", data);
    return data.choices[0].message.content.trim();
    
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