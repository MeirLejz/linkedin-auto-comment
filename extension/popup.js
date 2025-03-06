document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const saveApiKeyButton = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('api-key');
    const statusMessage = document.getElementById('status-message');
    
    // Load saved API key
    loadApiKey();
    
    // Save API key button click handler
    saveApiKeyButton.addEventListener('click', function() {
      const apiKey = apiKeyInput.value.trim();
      
      if (!apiKey) {
        statusMessage.textContent = "Please enter a valid API key";
        statusMessage.className = "status error";
        return;
      }
      
      saveApiKeyButton.disabled = true;
      statusMessage.textContent = "Saving API key...";
      statusMessage.className = "status";
      
      chrome.runtime.sendMessage(
        {action: "saveApiKey", apiKey: apiKey},
        function(response) {
          saveApiKeyButton.disabled = false;
          
          if (chrome.runtime.lastError) {
            statusMessage.textContent = "Error saving API key: " + chrome.runtime.lastError.message;
            statusMessage.className = "status error";
            return;
          }
          
          if (response && response.success) {
            statusMessage.textContent = "API key saved successfully!";
            statusMessage.className = "status success";
          } else {
            statusMessage.textContent = "Error saving API key";
            statusMessage.className = "status error";
          }
        }
      );
    });
    
    // Function to load saved API key
    function loadApiKey() {
      chrome.runtime.sendMessage(
        {action: "getApiKey"},
        function(response) {
          if (response && response.success && response.apiKey) {
            apiKeyInput.value = response.apiKey;
          }
        }
      );
    }
  });