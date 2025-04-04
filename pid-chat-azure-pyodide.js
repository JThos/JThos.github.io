/*
 * pid-chat-azure-pyodide.js
 * 
 * Advanced P&ID Chat interface that uses Pyodide to:
 * 1. Extract graph data from the HTML/XML
 * 2. Format system prompt with graph properties
 * 3. Call Azure OpenAI API with conversation management
 * 4. Process responses and highlight elements
 */

(function() {
  // Variables for the chat interface
  let chatWindow = null;
  let isChatVisible = false;
  let isProcessing = false;
  let pyodide = null;
  let isPyodideLoaded = false;
  let isAIConfigured = false;
  let azureAPIKey = '';
  let azureEndpoint = '';
  let azureAPIVersion = '';
  let configModalVisible = false;
  
  // Cache for system prompt with graph data
  let cachedSystemPrompt = null;
  
  // Variable to store uploaded image
  let uploadedImage = null;
  
  // Wait for the original script to load completely
  window.addEventListener('load', function() {
    // Ensure the page has fully loaded, then initialize
    setTimeout(initChat, 1000);
    
    // Initialize conversation manager
    if (window.conversationManager) {
      window.conversationManager.init();
    } else {
      console.error("Conversation manager not found. Make sure conversation-manager.js is loaded.");
    }
  });
  
  // Initialize the chat interface
  function initChat() {
    // Check if the required variables from spid2graph.js exist
    if (typeof xmlDoc === 'undefined') {
      console.error('P&ID Chat: Could not find xmlDoc. Make sure spid2graph.js is loaded first.');
      return;
    }
    
    createChatUI();
    addChatStyles();
    
    // Try to load credentials from localStorage if available
    azureAPIKey = localStorage.getItem('pidChat_azureAPIKey') || '';
    azureEndpoint = localStorage.getItem('pidChat_azureEndpoint') || '';
    azureAPIVersion = localStorage.getItem('pidChat_azureAPIVersion') || '2024-02-15-preview';
    
    isAIConfigured = azureAPIKey && azureEndpoint && azureAPIVersion;
    
    // Check credentials on startup and log status
    if (isAIConfigured) {
      console.log("Azure OpenAI credentials found in localStorage");
      
      // Sanitize for logging (show only partial endpoint)
      const sanitizedEndpoint = azureEndpoint ? `${azureEndpoint.substring(0, 12)}...` : null;
      console.log(`Endpoint: ${sanitizedEndpoint}, API Version: ${azureAPIVersion}`);
      
      // Auto-fix common issues
      if (azureEndpoint.endsWith('/')) {
        console.log("Removing trailing slash from endpoint");
        azureEndpoint = azureEndpoint.slice(0, -1);
      }
    } else {
      console.warn("Azure OpenAI credentials not fully configured");
      console.log("Missing:", {
        apiKey: !azureAPIKey,
        endpoint: !azureEndpoint,
        apiVersion: !azureAPIVersion
      });
      
      // Show modal with credentials prompt on first load
      setTimeout(() => {
        if (!isAIConfigured && isChatVisible) {
          addUIMessage("Azure OpenAI credentials not configured. Click the ⚙️ button to set them up.", false);
        }
      }, 1500);
    }
    
    // Initialize Pyodide in the background
    initPyodide().then(() => {
      // Generate and cache the system prompt on initialization
      if (isPyodideLoaded) {
        console.log("Generating and caching system prompt with graph data...");
        cachedSystemPrompt = generateSystemPrompt();
        console.log("System prompt cached successfully");
      }
    });
  }
  
  // Create the chat user interface elements
  function createChatUI() {
    // Create chat window container
    chatWindow = document.createElement('div');
    chatWindow.id = 'pidChatWindow';
    chatWindow.className = 'pid-chat-window';
    chatWindow.style.display = 'none';
    
    // Create chat header
    const chatHeader = document.createElement('div');
    chatHeader.className = 'pid-chat-header';
    chatHeader.innerHTML = '<span>P&ID Assistant</span>';
    
    // Create question counter
    const questionCounter = document.createElement('div');
    questionCounter.id = 'pidQuestionCounter';
    questionCounter.className = 'pid-question-counter';
    questionCounter.innerHTML = `0/${window.conversationManager.MAX_QUESTIONS}`;
    chatHeader.appendChild(questionCounter);
    
    // Create reset button
    const resetButton = document.createElement('button');
    resetButton.className = 'pid-chat-reset-btn';
    resetButton.innerHTML = '🔄';
    resetButton.title = 'Reset conversation';
    resetButton.onclick = resetConversation;
    chatHeader.appendChild(resetButton);
    
    // Create settings button
    const settingsButton = document.createElement('button');
    settingsButton.className = 'pid-chat-settings-btn';
    settingsButton.innerHTML = '⚙️';
    settingsButton.title = 'Configure Azure OpenAI';
    settingsButton.onclick = showConfigModal;
    chatHeader.appendChild(settingsButton);
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'pid-chat-close-btn';
    closeButton.innerHTML = '×';
    closeButton.onclick = toggleChatWindow;
    chatHeader.appendChild(closeButton);
    
    // Create chat messages container
    const chatMessages = document.createElement('div');
    chatMessages.id = 'pidChatMessages';
    chatMessages.className = 'pid-chat-messages';
    
    // Create welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'pid-chat-message assistant';
    welcomeMessage.innerHTML = '<p>Hello! I can help you analyze this P&ID. Ask me questions like "How many valves are in this diagram?" or "Find all flow paths from pump P-101."</p>';
    chatMessages.appendChild(welcomeMessage);
    
    // Create input area
    const chatInputArea = document.createElement('div');
    chatInputArea.className = 'pid-chat-input-area';
    
    // Create input field
    const chatInput = document.createElement('input');
    chatInput.id = 'pidChatInput';
    chatInput.type = 'text';
    chatInput.placeholder = 'Ask a question about the P&ID...';
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !isProcessing) {
        sendMessage();
      }
    });
    
    // Create image upload button and input
    const imageUploadContainer = document.createElement('div');
    imageUploadContainer.className = 'pid-image-upload-container';
    
    const imageUploadInput = document.createElement('input');
    imageUploadInput.id = 'pidImageUpload';
    imageUploadInput.type = 'file';
    imageUploadInput.accept = 'image/*';
    imageUploadInput.style.display = 'none';
    imageUploadInput.addEventListener('change', handleImageUpload);
    
    const imageUploadButton = document.createElement('button');
    imageUploadButton.id = 'pidImageUploadButton';
    imageUploadButton.className = 'pid-image-upload-btn';
    imageUploadButton.innerHTML = '📷';
    imageUploadButton.title = 'Upload image';
    imageUploadButton.onclick = () => imageUploadInput.click();
    
    imageUploadContainer.appendChild(imageUploadInput);
    imageUploadContainer.appendChild(imageUploadButton);
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.id = 'pidSendButton';
    sendButton.innerHTML = 'Send';
    sendButton.onclick = sendMessage;
    
    // Assemble input area
    chatInputArea.appendChild(chatInput);
    chatInputArea.appendChild(imageUploadContainer);
    chatInputArea.appendChild(sendButton);
    
    // Assemble chat window
    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(chatMessages);
    chatWindow.appendChild(chatInputArea);
    
    // Add to document
    document.body.appendChild(chatWindow);
    
    // Add chat toggle button to the document
    const chatToggleBtn = document.createElement('button');
    chatToggleBtn.id = 'pidChatToggle';
    chatToggleBtn.className = 'pid-chat-toggle';
    chatToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    chatToggleBtn.onclick = toggleChatWindow;
    document.body.appendChild(chatToggleBtn);
    
    // Make the chat window draggable
    makeChatWindowDraggable(chatWindow, chatHeader);
    
    // Create configuration modal
    createConfigModal();
  }
  
  // Create configuration modal for Azure OpenAI settings
  function createConfigModal() {
    const modal = document.createElement('div');
    modal.id = 'pidConfigModal';
    modal.className = 'pid-config-modal';
    modal.style.display = 'none';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'pid-config-modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'pid-config-modal-header';
    modalHeader.innerHTML = '<h3>Configure Azure OpenAI</h3>';
    
    const closeButton = document.createElement('span');
    closeButton.className = 'pid-config-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = hideConfigModal;
    modalHeader.appendChild(closeButton);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'pid-config-modal-body';
    
    modalBody.innerHTML = `
      <div class="pid-config-form-group">
        <label for="azureAPIKey">Azure API Key:</label>
        <input type="password" id="azureAPIKey" placeholder="Enter your Azure OpenAI API key">
      </div>
      <div class="pid-config-form-group">
        <label for="azureEndpoint">Azure Endpoint:</label>
        <input type="text" id="azureEndpoint" placeholder="https://your-resource.openai.azure.com/">
      </div>
      <div class="pid-config-form-group">
        <label for="azureAPIVersion">API Version:</label>
        <input type="text" id="azureAPIVersion" placeholder="2024-02-15-preview" value="2024-02-15-preview">
      </div>
      <div class="pid-config-form-group">
        <button id="saveConfigButton">Save Configuration</button>
      </div>
    `;
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // Add save handler
    document.getElementById('saveConfigButton').addEventListener('click', saveConfig);
  }
  
  // Show configuration modal
  function showConfigModal() {
    const modal = document.getElementById('pidConfigModal');
    modal.style.display = 'block';
    configModalVisible = true;
    
    // Pre-populate fields if values exist
    document.getElementById('azureAPIKey').value = azureAPIKey || '';
    document.getElementById('azureEndpoint').value = azureEndpoint || '';
    document.getElementById('azureAPIVersion').value = azureAPIVersion || '2024-02-15-preview';
  }
  
  // Hide configuration modal
  function hideConfigModal() {
    const modal = document.getElementById('pidConfigModal');
    modal.style.display = 'none';
    configModalVisible = false;
  }
  
  // Save configuration
  function saveConfig() {
    azureAPIKey = document.getElementById('azureAPIKey').value.trim();
    azureEndpoint = document.getElementById('azureEndpoint').value.trim();
    azureAPIVersion = document.getElementById('azureAPIVersion').value.trim();
    
    // Remove trailing slash from endpoint if present
    if (azureEndpoint.endsWith('/')) {
      azureEndpoint = azureEndpoint.slice(0, -1);
    }
    
    // Save to localStorage
    localStorage.setItem('pidChat_azureAPIKey', azureAPIKey);
    localStorage.setItem('pidChat_azureEndpoint', azureEndpoint);
    localStorage.setItem('pidChat_azureAPIVersion', azureAPIVersion);
    
    isAIConfigured = azureAPIKey && azureEndpoint && azureAPIVersion;
    
    hideConfigModal();
    
    if (isAIConfigured) {
      addUIMessage("Azure OpenAI configuration saved. You can now ask more complex questions about the P&ID.", false);
    } else {
      addUIMessage("Please provide all required Azure OpenAI credentials to enable advanced features.", false);
    }
  }
  
  // Make the chat window draggable
  function makeChatWindowDraggable(element, handle) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    handle.addEventListener("mousedown", (e) => {
      if (e.target === handle || e.target.tagName === 'SPAN') {
        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        handle.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      element.style.left = `${e.clientX - offsetX}px`;
      element.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      handle.style.cursor = "grab";
    });
  }
  
  // Add the CSS styles for the chat UI
  function addChatStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pid-chat-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: #007bff;
        color: white;
        border: none;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .pid-chat-window {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        z-index: 10000;
        overflow: hidden;
        font-family: Arial, sans-serif;
      }
      
      .pid-chat-header {
        padding: 15px;
        background-color: #007bff;
        color: white;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
      }
      
      .pid-chat-close-btn, .pid-chat-settings-btn, .pid-chat-reset-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 10px;
      }
      
      .pid-chat-settings-btn, .pid-chat-reset-btn {
        font-size: 16px;
      }
      
      .pid-question-counter {
        position: absolute;
        top: 15px;
        right: 140px;
        font-size: 12px;
        color: white;
        background-color: rgba(255,255,255,0.2);
        padding: 2px 6px;
        border-radius: 10px;
      }
      
      .pid-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .pid-chat-message {
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 15px;
        word-wrap: break-word;
        white-space: pre-wrap;
        overflow-wrap: break-word;
      }
      
      .pid-chat-message.user {
        align-self: flex-end;
        background-color: #e6f2ff;
      }
      
      .pid-chat-message.assistant {
        align-self: flex-start;
        background-color: #f1f1f1;
      }
      
      .pid-chat-message p {
        margin: 0;
      }
      
      .pid-chat-input-area {
        display: flex;
        border-top: 1px solid #eee;
        padding: 10px;
        align-items: center;
      }
      
      #pidChatInput {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
      }
      
      .pid-image-upload-container {
        margin: 0 5px;
      }
      
      .pid-image-upload-btn {
        background-color: #f1f1f1;
        color: #333;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .pid-image-upload-btn:hover {
        background-color: #e0e0e0;
      }
      
      .pid-uploaded-image {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
        margin: 5px 0;
      }
      
      .pid-image-message {
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 15px;
        background-color: #e6f2ff;
        align-self: flex-end;
        display: flex;
        flex-direction: column;
      }
      
      #pidSendButton {
        margin-left: 5px;
        padding: 10px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
      }
      
      .pid-loading-indicator {
        display: flex;
        gap: 4px;
        align-items: center;
        justify-content: center;
      }
      
      .pid-loading-indicator span {
        width: 8px;
        height: 8px;
        background-color: #007bff;
        border-radius: 50%;
        animation: pid-bounce 1.4s infinite ease-in-out both;
      }
      
      .pid-loading-indicator span:nth-child(1) {
        animation-delay: -0.32s;
      }
      
      .pid-loading-indicator span:nth-child(2) {
        animation-delay: -0.16s;
      }
      
      @keyframes pid-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      .pid-highlighted-element {
        stroke: #ff8c00 !important;
        stroke-width: 3px !important;
      }
      
      .pid-status-indicator {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 5px;
      }
      
      .pid-status-good {
        background-color: #28a745;
      }
      
      .pid-status-warning {
        background-color: #ffc107;
      }
      
      .pid-status-error {
        background-color: #dc3545;
      }
      
      /* Configuration Modal Styles */
      .pid-config-modal {
        display: none;
        position: fixed;
        z-index: 10001;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0,0,0,0.4);
      }
      
      .pid-config-modal-content {
        background-color: #fefefe;
        margin: 15% auto;
        padding: 0;
        border: 1px solid #888;
        width: 400px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }
      
      .pid-config-modal-header {
        padding: 15px;
        background-color: #007bff;
        color: white;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .pid-config-modal-header h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .pid-config-close {
        color: white;
        float: right;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
      }
      
      .pid-config-modal-body {
        padding: 20px;
      }
      
      .pid-config-form-group {
        margin-bottom: 15px;
      }
      
      .pid-config-form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }
      
      .pid-config-form-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }
      
      #saveConfigButton {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        font-size: 16px;
      }
      
      #saveConfigButton:hover {
        background-color: #0069d9;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Format long text with line breaks
  function formatLongText(text, maxLineLength = 60) {
    // Split into words
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    
    // Build lines of appropriate length
    words.forEach(word => {
      if ((currentLine + ' ' + word).length <= maxLineLength || currentLine === '') {
        currentLine += (currentLine === '' ? '' : ' ') + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    
    // Add the last line
    if (currentLine) lines.push(currentLine);
    
    // Join lines with <br> tags
    return lines.join('<br>');
  }
  
  // Function to add a message to the UI (not to the conversation manager)
  function addUIMessage(text, isUser) {
    const chatMessages = document.getElementById('pidChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'pid-chat-message user' : 'pid-chat-message assistant';
    
    // Add line breaks for long user messages to improve readability
    if (isUser && text.length > 60) {
      // Process text to add line breaks at natural break points
      const formattedText = formatLongText(text);
      messageDiv.innerHTML = `<p>${formattedText}</p>`;
    } else {
      messageDiv.innerHTML = `<p>${text}</p>`;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Handle image upload
  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      addUIMessage("Please select a valid image file.", false);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      // Store the image data
      uploadedImage = {
        data: e.target.result,
        name: file.name,
        type: file.type
      };
      
      // Display the image in the chat
      const chatMessages = document.getElementById('pidChatMessages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'pid-image-message';
      
      // Add image preview
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'pid-uploaded-image';
      img.alt = 'Uploaded image';
      
      // Add caption
      const caption = document.createElement('p');
      caption.textContent = `Uploaded: ${file.name}`;
      
      messageDiv.appendChild(img);
      messageDiv.appendChild(caption);
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
      // Add a prompt to ask a question about the image
      addUIMessage("I've received your image. What would you like to know about it?", false);
    };
    
    reader.readAsDataURL(file);
    
    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  }
  
  // Function to toggle chat window visibility
  function toggleChatWindow() {
    isChatVisible = !isChatVisible;
    chatWindow.style.display = isChatVisible ? 'flex' : 'none';
    
    // If configuration modal was open, keep it open
    if (configModalVisible) {
      document.getElementById('pidConfigModal').style.display = 'block';
    }
  }
  
  // Function to reset conversation
  function resetConversation() {
    // Use conversation manager to reset
    const state = window.conversationManager.resetConversation();
    
    // Clear chat messages except for the first welcome message
    const chatMessages = document.getElementById('pidChatMessages');
    const welcomeMessage = chatMessages.firstChild;
    chatMessages.innerHTML = '';
    chatMessages.appendChild(welcomeMessage);
    
    // Update the counter display
    document.getElementById('pidQuestionCounter').innerHTML = `${state.questionCount}/${window.conversationManager.MAX_QUESTIONS}`;
    
    // Refresh the system prompt cache (in case graph data has changed)
    if (isPyodideLoaded) {
      console.log("Refreshing system prompt cache after conversation reset...");
      cachedSystemPrompt = generateSystemPrompt();
    }
    
    // Clear any uploaded image
    uploadedImage = null;
    
    // Add reset notification
    addUIMessage("Conversation has been reset. You can ask up to 5 new questions.", false);
  }
  
  // Function to show loading indicator
  function showLoadingIndicator() {
    const chatMessages = document.getElementById('pidChatMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pidLoadingIndicator';
    loadingDiv.className = 'pid-chat-message assistant pid-loading-indicator';
    loadingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Function to remove loading indicator
  function removeLoadingIndicator() {
    const loadingIndicator = document.getElementById('pidLoadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }
  
  // Function to send a message
  function sendMessage() {
    const chatInput = document.getElementById('pidChatInput');
    const userMessage = chatInput.value.trim();
    
    if ((!userMessage && !uploadedImage) || isProcessing) return;
    
    // Check if we've reached the question limit using conversation manager
    if (window.conversationManager.hasReachedQuestionLimit()) {
      addUIMessage(`You've reached the limit of ${window.conversationManager.MAX_QUESTIONS} questions. Please reset the conversation to continue.`, false);
      return;
    }
    
    // Add user message to UI if there is text
    if (userMessage) {
      addUIMessage(userMessage, true);
    }
    
    // For Azure OpenAI API: format the message with image if present
    if (uploadedImage) {
      // If using a vision model, format the message properly
      const message = {
        role: 'user',
        content: [
          { type: 'text', text: userMessage || 'What can you tell me about this diagram?' }
        ]
      };
      
      // Add the image content
      message.content.push({
        type: 'image_url',
        image_url: {
          url: uploadedImage.data
        }
      });
      
      // Add to conversation manager with special handling
      window.conversationManager.addMessage('user', JSON.stringify(message));
      
      // Clear the uploaded image after sending
      uploadedImage = null;
    } else {
      // Add regular text message to conversation manager
      window.conversationManager.addMessage('user', userMessage);
    }
    
    const state = window.conversationManager.getConversationState();
    
    // Update the counter display
    document.getElementById('pidQuestionCounter').innerHTML = `${state.questionCount}/${window.conversationManager.MAX_QUESTIONS}`;
    
    // Clear input
    chatInput.value = '';
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Set processing flag
    isProcessing = true;
    
    // Initialize Pyodide if not already loaded
    if (!isPyodideLoaded) {
      initPyodide().then(() => processAndRespond());
    } else {
      processAndRespond();
    }
  }
  
  // Initialize Pyodide
  async function initPyodide() {
    try {
      // Don't re-initialize if already loaded
      if (isPyodideLoaded) return true;
      
      // Load Pyodide script if not already loaded
      if (!window.loadPyodide) {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
        document.head.appendChild(script);
        
        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error("Failed to load Pyodide script"));
          // Timeout after 30 seconds
          setTimeout(() => reject(new Error("Timeout loading Pyodide")), 30000);
        });
      }
      
      // Initialize Pyodide
      pyodide = await loadPyodide();
      
      // Install required packages
      await pyodide.loadPackagesFromImports(`
        import micropip
        await micropip.install(['pandas', 'networkx'])
        import pandas as pd
        import networkx as nx
        import json
      `);
      
      // Set flag
      isPyodideLoaded = true;
      console.log("Pyodide initialized successfully");
      return true;
      
    } catch (error) {
      console.error("Failed to initialize Pyodide:", error);
      return false;
    }
  }
  
  // Extract graph properties from XML and format as CSV
  function extractGraphPropertiesCSV() {
    // If Pyodide is not loaded, we can't process this
    if (!isPyodideLoaded) return { nodeCSV: '', edgeCSV: '' };
    
    try {
      // Extract nodes
      const nodes = xmlDoc.getElementsByTagName("Node");
      let nodeRows = [];
      
      // Add header row
      nodeRows.push("id,type,subtype,itemtag,drawingid,xcoord,ycoord");
      
      // Process each node
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeData = node.getElementsByTagName("Data")[0];
        
        if (nodeData) {
          const id = node.getAttribute("id") || '';
          const type = nodeData.getAttribute("Type") || '';
          const subtype = nodeData.getAttribute("Subtype") || '';
          const itemtag = nodeData.getAttribute("ItemTag") || '';
          const drawingid = node.getAttribute("DrawingID") || '';
          const cx = node.getAttribute("cx") || '0';
          const cy = node.getAttribute("cy") || '0';
          
          // Escape any commas in the values
          const row = [
            id,
            type.replace(/,/g, ';'),
            subtype.replace(/,/g, ';'),
            itemtag.replace(/,/g, ';'),
            drawingid.replace(/,/g, ';'),
            cx,
            cy
          ].join(',');
          
          nodeRows.push(row);
        }
      }
      
      // Extract edges
      const edges = xmlDoc.getElementsByTagName("Edge");
      let edgeRows = [];
      
      // Add header row
      edgeRows.push("id,startnode,endnode,type,flowdir");
      
      // Process each edge
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const edgeData = edge.getElementsByTagName("Data")[0];
        
        if (edgeData) {
          const id = edge.getAttribute("id") || '';
          const startNode = edge.getAttribute("StartNode") || '';
          const endNode = edge.getAttribute("EndNode") || '';
          const type = edgeData.getAttribute("Type") || '';
          const flowDir = edge.getAttribute("FlowDir") || '';
          
          // Escape any commas in the values
          const row = [
            id,
            startNode,
            endNode,
            type.replace(/,/g, ';'),
            flowDir.replace(/,/g, ';')
          ].join(',');
          
          edgeRows.push(row);
        }
      }
      
      return {
        nodeCSV: nodeRows.join('\n'),
        edgeCSV: edgeRows.join('\n')
      };
      
    } catch (error) {
      console.error("Error extracting graph properties:", error);
      return { nodeCSV: '', edgeCSV: '' };
    }
  }
  
  // Generate system prompt with graph properties
  function generateSystemPrompt() {
    // If we already have a cached system prompt, return it
    if (cachedSystemPrompt) {
      console.log("Using cached system prompt");
      return cachedSystemPrompt;
    }
    
    console.log("Generating new system prompt with graph data...");
    const { nodeCSV, edgeCSV } = extractGraphPropertiesCSV();
    
    const systemPrompt = `
You are an assistant that analyzes Piping and Instrumentation Diagrams (P&IDs). Your task is to answer questions about the P&ID graph data provided.

The graph represents a P&ID with nodes (symbols like valves, pumps, equipment) and edges (connections like pipes and signals).

NODE DATA (CSV format):
${nodeCSV}

EDGE DATA (CSV format):
${edgeCSV}

IMPORTANT: You MUST respond in JSON format with the following structure:
{
  "response": {
    "answer": "Your detailed explanation goes here",
    "highlight": {
      "nodes": ["node1", "node2", "node3"],
      "edges": ["edge1", "edge2", "edge3"]
    }
  }
}

When asked a question about the P&ID:
1. Analyze the relevant nodes and edges in the graph data
2. Include a clear, concise answer in the "answer" field 
3. Include ALL relevant node IDs in the "nodes" array
4. Include ALL relevant edge IDs in the "edges" array
5. Make sure to return ALL relevant elements for proper visualization
6. Consider also indirect connections of reasonable range (5% of node count in graph) when asked questions like "Is pumpt p-100 connected to a vessel" or "isolate heat exchanger h-100".
7. Think step-by-step.

For example, if asked "How many valves are in the P&ID?", you MUST respond with ALL valve nodes in the nodes array.

For path or connection questions, you MUST include ALL nodes and ALL connecting edges along the path.

The visualization depends on complete highlighting of ALL relevant elements, so NEVER omit any nodes or edges from your response.
`;
    
    return systemPrompt;
  }
  
  // Function to determine if a query is suitable for code interpreter
  function shouldUseCodeInterpreter(query) {
    const complexPatterns = [
      /path.*between/i,
      /route.*from/i,
      /connection.*to/i,
      /isolate/i,
      /all.*connected/i,
      /shortest.*path/i,
      /analyze.*flow/i,
      /calculate/i,
      /count.*all/i,
      /find.*all/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(query));
  }
  
  // Analyze P&ID with code interpreter
  async function analyzePIDWithCodeInterpreter(query, nodeData, edgeData) {
    console.log("Using code interpreter mode for complex P&ID analysis");
    
    try {
      // Prepare code for analysis
      const code = `
import pandas as pd
import networkx as nx
import json

# Convert node CSV to DataFrame
node_csv = """${nodeData}"""
nodes_df = pd.read_csv(pd.StringIO(node_csv))

# Convert edge CSV to DataFrame
edge_csv = """${edgeData}"""
edges_df = pd.read_csv(pd.StringIO(edge_csv))

# Create a directed graph
G = nx.DiGraph()

# Add nodes to the graph
for _, row in nodes_df.iterrows():
    node_id = row['id']
    # Add all node attributes
    node_attrs = row.to_dict()
    G.add_node(node_id, **node_attrs)

# Add edges to the graph
for _, row in edges_df.iterrows():
    edge_id = row['id']
    start_node = row['startnode']
    end_node = row['endnode']
    # Add edge with all its attributes
    edge_attrs = row.to_dict()
    G.add_edge(start_node, end_node, id=edge_id, **edge_attrs)

# Function to find paths between components
def find_paths(start_node, end_node, max_paths=5):
    try:
        paths = list(nx.all_simple_paths(G, start_node, end_node, cutoff=10))
        return paths[:max_paths]  # Limit to max_paths
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []

# Function to get all connected components
def get_connected_components(node_id):
    if node_id not in G:
        return {"nodes": [], "edges": []}
    
    # Get the subgraph of connected nodes
    connected = nx.node_connected_component(G.to_undirected(), node_id)
    subgraph = G.subgraph(connected)
    
    # Extract nodes and edges
    nodes = list(subgraph.nodes())
    edges = [data['id'] for u, v, data in subgraph.edges(data=True) if 'id' in data]
    
    return {"nodes": nodes, "edges": edges}

# Function to get all valves in the graph
def get_all_valves():
    valves = []
    for node, attrs in G.nodes(data=True):
        if 'subtype' in attrs and 'valve' in attrs['subtype'].lower():
            valves.append(node)
    return valves

# Process the user query: "${query}"
query = "${query}".lower()
result = {}

# Path finding queries
if 'path' in query or 'connection' in query or 'route' in query:
    # Extract component IDs from query (this is simplified)
    import re
    components = re.findall(r'\\b([A-Za-z]+-\\d+|\\w+\\d+)\\b', query)
    
    if len(components) >= 2:
        start = components[0]
        end = components[1]
        paths = find_paths(start, end)
        
        if paths:
            # Extract all nodes and edges in all paths
            all_nodes = set()
            all_edges = set()
            
            for path in paths:
                all_nodes.update(path)
                
                # Get edge IDs for consecutive nodes in path
                for i in range(len(path) - 1):
                    u, v = path[i], path[i+1]
                    if G.has_edge(u, v) and 'id' in G[u][v]:
                        all_edges.add(G[u][v]['id'])
            
            result = {
                "paths_found": len(paths),
                "highlight": {
                    "nodes": list(all_nodes),
                    "edges": list(all_edges)
                },
                "answer": f"I found {len(paths)} paths from {start} to {end}."
            }
        else:
            result = {
                "paths_found": 0,
                "highlight": {"nodes": [], "edges": []},
                "answer": f"No path found between {start} and {end}."
            }

# Valve queries
elif 'valve' in query:
    valves = get_all_valves()
    result = {
        "count": len(valves),
        "highlight": {
            "nodes": valves,
            "edges": []
        },
        "answer": f"I found {len(valves)} valves in this P&ID."
    }

# Connected component queries
elif 'connected' in query or 'component' in query:
    import re
    components = re.findall(r'\\b([A-Za-z]+-\\d+|\\w+\\d+)\\b', query)
    
    if components:
        node_id = components[0]
        connected = get_connected_components(node_id)
        
        result = {
            "count": len(connected["nodes"]),
            "highlight": connected,
            "answer": f"I found {len(connected['nodes'])} connected components to {node_id}."
        }

# Format result for JSON response
output = {
    "response": {
        "answer": result.get("answer", "Analysis complete."),
        "highlight": {
            "nodes": result.get("highlight", {}).get("nodes", []),
            "edges": result.get("highlight", {}).get("edges", [])
        }
    }
}

# Output the result as JSON
print(json.dumps(output, indent=2))
      `;
      
      // Call Python code using Pyodide
      await pyodide.runPythonAsync(code);
      
      // Get the output (this is a simplified approach - in a real implementation, 
      // you'd want to capture the Python stdout)
      const outputResult = pyodide.runPython(`
        # Return a default structure if no specific result was found
        if not result:
            result = {
                "answer": "I analyzed your query but couldn't find specific results to highlight.",
                "highlight": {"nodes": [], "edges": []}
            }
        
        json.dumps({"response": {
            "answer": result.get("answer", "Analysis complete."),
            "highlight": {
                "nodes": result.get("highlight", {}).get("nodes", []),
                "edges": result.get("highlight", {}).get("edges", [])
            }
        }})
      `);
      
      // Parse the result
      const parsedResult = JSON.parse(outputResult);
      return {
        text: parsedResult.response.answer,
        highlightElements: [
          ...(parsedResult.response.highlight.nodes || []),
          ...(parsedResult.response.highlight.edges || [])
        ]
      };
      
    } catch (error) {
      console.error("Error in code interpreter mode:", error);
      return {
        text: "I encountered an error while analyzing the P&ID data.",
        highlightElements: []
      };
    }
  }
  
  // Call Azure OpenAI API using Pyodide
  async function callAzureOpenAI() {
    if (!isPyodideLoaded) {
      throw new Error("Pyodide not initialized");
    }
    
    if (!isAIConfigured) {
      throw new Error("Azure OpenAI not configured");
    }
    
    try {
      // Create Python function to call Azure OpenAI with token counting and JSON mode
      await pyodide.runPythonAsync(`
        import json
        import re
        from pyodide.http import pyfetch
        
        # Function to count tokens (approximation)
        def num_tokens_from_messages(messages, tokens_per_message=4, tokens_per_name=1):
            num_tokens = 0
            for message in messages:
                # Check if content is a string or an array (for multimodal messages)
                if isinstance(message.get('content', ''), str):
                    # Count tokens in the content (roughly 4 chars per token for English)
                    content_tokens = len(message.get('content', '')) // 4
                else:
                    # Estimate tokens for multimodal content
                    content_tokens = 200  # Image typically uses ~200-300 tokens
                
                # Add tokens for role
                role_tokens = len(message.get('role', '')) // 4
                # Add base tokens per message
                num_tokens += tokens_per_message + content_tokens + role_tokens
            return num_tokens
        
        async def call_azure_openai(api_key, endpoint, api_version, system_content, messages, max_tokens=4096, max_response_tokens=1024):
            url = f"{endpoint}/openai/deployments/gpt-4o/chat/completions?api-version={api_version}"
            
            headers = {
                "Content-Type": "application/json",
                "api-key": api_key
            }
            
            # Process messages for multimodal content
            formatted_messages = []
            for msg in messages:
                # Check if content is a JSON string containing image data
                if isinstance(msg.get('content', ''), str) and msg['content'].startswith('{') and 'image_url' in msg['content']:
                    try:
                        # Parse the content to get the properly formatted multimodal message
                        parsed_content = json.loads(msg['content'])
                        formatted_messages.append({
                            'role': msg['role'],
                            'content': parsed_content.get('content', [])
                        })
                    except:
                        # If parsing fails, add as is
                        formatted_messages.append(msg)
                else:
                    # Regular text message
                    formatted_messages.append(msg)
            
            # Start with system message
            api_messages = [{"role": "system", "content": system_content}]
            
            # Add conversation messages
            api_messages.extend(formatted_messages)
            
            # Calculate token count and trim if needed
            prompt_max_tokens = max_tokens - max_response_tokens
            token_count = num_tokens_from_messages(api_messages)
            
            # Remove oldest messages (after system message) if token count is too high
            while token_count > prompt_max_tokens and len(api_messages) > 2:
                # Keep system message, remove oldest conversation message
                api_messages.pop(1)
                token_count = num_tokens_from_messages(api_messages)
            
            data = {
                "messages": api_messages,
                "temperature": 0.7,
                "max_tokens": max_response_tokens,
                "response_format": {"type": "json_object"}
            }
            
            print(f"Calling Azure OpenAI API at: {url}")
            print(f"Total messages: {len(api_messages)}")
            print(f"Estimated token count: {token_count}")
            
            try:
                response = await pyfetch(
                    url,
                    method="POST",
                    headers=headers,
                    body=json.dumps(data)
                )
                
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Error calling Azure OpenAI API: {response.status} - {error_text}")
            except Exception as e:
                print(f"Exception during API call: {str(e)}")
                raise e
      `);
      
      // Use cached system prompt with graph properties
      const systemPrompt = generateSystemPrompt();
      
      // Get messages from conversation manager
      const conversationMessages = window.conversationManager.getMessagesForAPI();
      
      // Set Python variables
      pyodide.globals.set("api_key", azureAPIKey);
      pyodide.globals.set("endpoint", azureEndpoint);
      pyodide.globals.set("api_version", azureAPIVersion);
      pyodide.globals.set("system_content", systemPrompt);
      pyodide.globals.set("messages", conversationMessages);
      pyodide.globals.set("max_tokens", window.conversationManager.MAX_TOKENS);
      pyodide.globals.set("max_response_tokens", window.conversationManager.MAX_RESPONSE_TOKENS);
      
      console.log("Calling Azure OpenAI via Pyodide with JSON mode...");
      
      // Call the API
      const result = await pyodide.runPythonAsync(`
        result = await call_azure_openai(api_key, endpoint, api_version, system_content, messages, max_tokens, max_response_tokens)
        json.dumps(result)
      `);
      
      // Parse result
      return JSON.parse(result);
      
    } catch (error) {
      console.error("Error calling Azure OpenAI:", error);
      throw error;
    }
  }
  
  // Call Azure OpenAI API using direct fetch (non-Pyodide fallback)
  async function callAzureOpenAIDirectly() {
    if (!isAIConfigured) {
      throw new Error("Azure OpenAI not configured");
    }
    
    try {
      // Use cached system prompt with graph properties (or generate if not cached)
      const systemPrompt = generateSystemPrompt();
      
      // Get messages from conversation manager
      const conversationMessages = window.conversationManager.getMessagesForAPI();
      
      // Process messages for multimodal content
      const formattedMessages = [];
      for (const msg of conversationMessages) {
        // Check if message is a JSON string containing image data
        if (typeof msg.content === 'string' && msg.content.startsWith('{') && msg.content.includes('image_url')) {
          try {
            // Parse the content to get the properly formatted multimodal message
            const parsedContent = JSON.parse(msg.content);
            formattedMessages.push({
              role: msg.role,
              content: parsedContent.content
            });
          } catch (e) {
            // If parsing fails, add as is
            formattedMessages.push(msg);
          }
        } else {
          // Regular text message
          formattedMessages.push(msg);
        }
      }
      
      // Create messages array for API
      const messages = [
        { role: "system", content: systemPrompt },
        ...formattedMessages
      ];
      
      // Calculate and trim if too many tokens (rough estimate)
      let totalChars = 0;
      messages.forEach(msg => {
        if (typeof msg.content === 'string') {
          totalChars += msg.content.length;
        } else {
          // Estimate for multimodal content
          totalChars += 800; // ~200 tokens for image
        }
      });
      
      // Rough token estimation (4 chars per token) and trimming
      const promptMaxTokens = window.conversationManager.PROMPT_MAX_TOKENS;
      while ((totalChars / 4) > promptMaxTokens && messages.length > 2) {
        // Keep system message (at index 0), remove oldest conversation message
        messages.splice(1, 1);
        
        // Recalculate total chars
        totalChars = 0;
        messages.forEach(msg => {
          if (typeof msg.content === 'string') {
            totalChars += msg.content.length;
          } else {
            totalChars += 800;
          }
        });
      }
      
      // Full API URL
      const apiUrl = `${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=${azureAPIVersion}`;
      
      console.log("Calling Azure OpenAI via direct fetch with JSON mode...");
      console.log(`URL: ${apiUrl}`);
      console.log(`Messages: ${messages.length}`);
      console.log(`Estimated token count: ${Math.round(totalChars / 4)}`);
      
      // Call the API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureAPIKey
        },
        body: JSON.stringify({
          messages: messages,
          temperature: 0.7,
          max_tokens: window.conversationManager.MAX_RESPONSE_TOKENS,
          response_format: { type: "json_object" }
        })
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
      }
      
      // Parse and return the response
      return await response.json();
      
    } catch (error) {
      console.error("Error calling Azure OpenAI directly:", error);
      throw error;
    }
  }
  
  // Parse the AI response to extract answer and elements to highlight
  function parseAIResponse(response) {
    try {
      const content = response.choices?.[0]?.message?.content || '';
      
      // Add the assistant response to conversation manager
      window.conversationManager.addMessage('assistant', content);
      
      // Try to parse as JSON first (for new JSON format)
      try {
        const parsedContent = JSON.parse(content);
        
        // Extract answer and highlight elements from JSON structure
        const answer = parsedContent?.response?.answer || "No answer provided";
        const nodes = parsedContent?.response?.highlight?.nodes || [];
        const edges = parsedContent?.response?.highlight?.edges || [];
        
        // Combine nodes and edges for highlighting
        const elementsToHighlight = [...nodes, ...edges];
        
        return {
          text: answer,
          highlightElements: elementsToHighlight
        };
      } catch (jsonError) {
        // Fallback to legacy format if JSON parsing fails
        console.log("JSON parsing failed, falling back to legacy format", jsonError);
        
        // Extract answer and highlight sections using regex
        const answerMatch = content.match(/ANSWER:(.*?)(?=HIGHLIGHT:|$)/s);
        const highlightMatch = content.match(/HIGHLIGHT:(.*)/s);
        
        const answer = answerMatch ? answerMatch[1].trim() : content.trim();
        
        let elementsToHighlight = [];
        if (highlightMatch) {
          // Extract comma-separated IDs and trim whitespace
          elementsToHighlight = highlightMatch[1]
            .split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0);
        }
        
        return {
          text: answer,
          highlightElements: elementsToHighlight
        };
      }
      
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return {
        text: "I'm having trouble processing the response. Please try again.",
        highlightElements: []
      };
    }
  }
  
  // Process message with local analysis if Pyodide/Azure not available
  async function processMessageLocally() {
    // Add these lines at the beginning of processMessageLocally function
    console.log("Using local processing - Azure OpenAI API not available");
    if (!isAIConfigured) {
      console.warn("Azure OpenAI credentials not configured");
    }
    if (!isPyodideLoaded) {
      console.warn("Pyodide not loaded");
    }
    
    try {
      // Get the last user message
      const state = window.conversationManager.getConversationState();
      const userMessages = state.messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
        return {
          text: "Please ask a question about the P&ID.",
          highlightElements: []
        };
      }
      
      const lastUserMessage = userMessages[userMessages.length - 1].content;
      const queryLower = lastUserMessage.toLowerCase();
      
      // Define response and elements to highlight
      let response = {
        text: '',
        highlightElements: []
      };
      
      // Example responses based on query patterns
      if (queryLower.includes('how many valve') || queryLower.includes('count valve')) {
        const valves = findElementsByType('valve');
        response.text = `I found ${valves.length} valves in this P&ID.`;
        response.highlightElements = valves;
        
        // Add to conversation history
        window.conversationManager.addMessage('assistant', JSON.stringify({
          response: {
            answer: response.text,
            highlight: {
              nodes: valves,
              edges: []
            }
          }
        }));
      } 
      else if (queryLower.includes('list all valve') || queryLower.includes('show all valve')) {
        const valves = findElementsByType('valve');
        const valveList = valves.map(v => {
          const node = xmlDoc.getElementById(v);
          const itemTag = node?.getElementsByTagName("Data")[0]?.getAttribute("ItemTag") || 'Unknown';
          return itemTag;
        }).join(', ');
        
        response.text = `Valves in this P&ID: ${valveList}`;
        response.highlightElements = valves;
        
        // Add to conversation history - using JSON format
        window.conversationManager.addMessage('assistant', JSON.stringify({
          response: {
            answer: response.text,
            highlight: {
              nodes: valves,
              edges: []
            }
          }
        }));
      }
      else if (queryLower.includes('show pump') || queryLower.includes('find pump')) {
        const pumps = findElementsByType('pump');
        response.text = `I found ${pumps.length} pumps in this P&ID.`;
        response.highlightElements = pumps;
        
        // Add to conversation history - using JSON format
        window.conversationManager.addMessage('assistant', JSON.stringify({
          response: {
            answer: response.text,
            highlight: {
              nodes: pumps,
              edges: []
            }
          }
        }));
      }
      else if (queryLower.includes('path') || queryLower.includes('connection')) {
        // Use existing path finding functions if available
        if (typeof FindDownstreamPaths === 'function') {
          response.text = 'I\'ve highlighted possible downstream paths from selected elements.';
          
          // Try to use existing path function on a selected element
          if (highlightedItem) {
            try {
              window.selectedPaths = FindDownstreamPaths(highlightedItem);
              response.text = `Found ${window.selectedPaths.length} downstream paths from the selected element.`;
            } catch (e) {
              console.error('Error finding paths:', e);
              response.text = 'I couldn\'t find paths from the selected element. Please select a starting point first.';
            }
          } else {
            response.text = 'Please select a starting point first by clicking on an element.';
          }
          
          // Add to conversation history with JSON format
          window.conversationManager.addMessage('assistant', JSON.stringify({
            response: {
              answer: response.text,
              highlight: {
                nodes: [],
                edges: []
              }
            }
          }));
        } else {
          response.text = 'Path finding functionality is not available.';
          window.conversationManager.addMessage('assistant', JSON.stringify({
            response: {
              answer: response.text,
              highlight: {
                nodes: [],
                edges: []
              }
            }
          }));
        }
      }
      else if (queryLower.includes('isolate')) {
        // Try to use existing isolation function if available
        if (typeof IsolateEquipment === 'function') {
          if (highlightedItem) {
            try {
              window.selectedPaths = IsolateEquipment(highlightedItem);
              response.text = 'I\'ve highlighted isolation points for the equipment.';
            } catch (e) {
              console.error('Error isolating equipment:', e);
              response.text = 'I couldn\'t isolate the selected equipment. Make sure you have selected an equipment first.';
            }
          } else {
            response.text = 'Please select an equipment first by clicking on it.';
          }
          
          // Add to conversation history with JSON format
          window.conversationManager.addMessage('assistant', JSON.stringify({
            response: {
              answer: response.text,
              highlight: {
                nodes: [],
                edges: []
              }
            }
          }));
        } else {
          response.text = 'Equipment isolation functionality is not available.';
          window.conversationManager.addMessage('assistant', JSON.stringify({
            response: {
              answer: response.text,
              highlight: {
                nodes: [],
                edges: []
              }
            }
          }));
        }
      }
      else {
        // Default response
        response.text = "I'm not sure how to answer that question. Try asking about valves, pumps, paths between components, or isolation points.";
        
        // Add to conversation history with JSON format
        window.conversationManager.addMessage('assistant', JSON.stringify({
          response: {
            answer: response.text,
            highlight: {
              nodes: [],
              edges: []
            }
          }
        }));
      }
      
      return response;
      
    } catch (error) {
      console.error('Error in processMessageLocally:', error);
      throw error;
    }
  }
  
  // Process message and respond
  async function processAndRespond() {
    try {
      let response;
      let apiCallSuccessful = false;
      let error = null;
      
      // Get the last user message for analysis
      const state = window.conversationManager.getConversationState();
      const userMessages = state.messages.filter(m => m.role === 'user');
      const lastUserMessage = userMessages.length > 0 ? 
                             (typeof userMessages[userMessages.length - 1].content === 'string' ? 
                              userMessages[userMessages.length - 1].content : "Analyze this image") : '';
      
      // Check if the user uploaded an image
      const hasImage = userMessages.length > 0 && 
                      typeof userMessages[userMessages.length - 1].content === 'string' &&
                      userMessages[userMessages.length - 1].content.includes('image_url');
      
      // Check if query is suitable for code interpreter (only for text queries, not images)
      if (isPyodideLoaded && !hasImage && shouldUseCodeInterpreter(lastUserMessage)) {
        console.log("Using code interpreter for complex query");
        
        // Extract graph data
        const { nodeCSV, edgeCSV } = extractGraphPropertiesCSV();
        
        // Process with code interpreter
        response = await analyzePIDWithCodeInterpreter(lastUserMessage, nodeCSV, edgeCSV);
        apiCallSuccessful = true;
      } 
      // Otherwise use Azure OpenAI API if configured
      else if (isAIConfigured) {
        // First try Pyodide if available
        if (isPyodideLoaded) {
          try {
            console.log("Trying Azure OpenAI via Pyodide...");
            const apiResponse = await callAzureOpenAI();
            response = parseAIResponse(apiResponse);
            apiCallSuccessful = true;
            console.log("Pyodide API call successful!");
          } catch (e) {
            console.error("Error with Pyodide API call:", e);
            error = e;
            // Continue to direct fetch method
          }
        }
        
        // If Pyodide failed or isn't available, try direct fetch
        if (!apiCallSuccessful) {
          try {
            console.log("Trying Azure OpenAI via direct fetch...");
            const apiResponse = await callAzureOpenAIDirectly();
            response = parseAIResponse(apiResponse);
            apiCallSuccessful = true;
            console.log("Direct fetch API call successful!");
          } catch (e) {
            console.error("Error with direct fetch API call:", e);
            error = e || error;
            // Fall back to local processing
          }
        }
      }
      
      // If API calls failed or aren't configured, use local processing
      if (!apiCallSuccessful) {
        console.log("Using local processing fallback...");
        if (error) {
          console.error("API error details:", error);
        }
        response = await processMessageLocally();
      }
      
      // Remove loading indicator
      removeLoadingIndicator();
      
      // Add assistant response to UI
      addUIMessage(response.text, false);
      
      // Highlight elements if any
      if (response.highlightElements && response.highlightElements.length > 0) {
        highlightElements(response.highlightElements);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      removeLoadingIndicator();
      addUIMessage("I'm sorry, I encountered an error while processing your question. Please try again.", false);
    } finally {
      // Reset processing flag
      isProcessing = false;
    }
  }
  
  // Function to find elements by type (valve, pump, etc.)
  function findElementsByType(type) {
    const nodes = xmlDoc.getElementsByTagName("Node");
    const matchingElements = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const nodeData = nodes[i].getElementsByTagName("Data")[0];
      if (nodeData) {
        const subtype = nodeData.getAttribute("Subtype")?.toLowerCase() || '';
        if (subtype.includes(type.toLowerCase())) {
          matchingElements.push(nodes[i].getAttribute("id"));
        }
      }
    }
    
    return matchingElements;
  }
  
  // Function to highlight elements
  function highlightElements(elementIds) {
    // First, clear any existing highlights
    clearHighlights();
    
    // Highlight each element
    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        // Use existing highlight function if available
        if (typeof highlight === 'function') {
          highlight(id);
        } else {
          // Fallback highlighting
          element.classList.add('pid-highlighted-element');
        }
      }
    });
  }
  
  // Function to clear all highlights
  function clearHighlights() {
    // Use existing unhighlight function if available
    if (typeof unhighlight === 'function') {
      const elements = document.querySelectorAll("[class$='_highlighted']");
      elements.forEach(el => {
        const id = el.getAttribute("id");
        if (id) unhighlight(id);
      });
    } else {
      // Fallback unhighlighting
      const elements = document.querySelectorAll(".pid-highlighted-element");
      elements.forEach(el => {
        el.classList.remove('pid-highlighted-element');
      });
    }
  }
  
  // Function to debug Azure OpenAI integration
  function debugAzureIntegration() {
    const debugInfo = {
      isPyodideLoaded,
      isAIConfigured,
      azureEndpoint: azureEndpoint ? `${azureEndpoint.substring(0, 10)}...` : null, // Show partial for security
      azureAPIVersion,
      hasAPIKey: azureAPIKey ? true : false,
      hasSystemPromptCache: cachedSystemPrompt ? true : false,
      hasUploadedImage: uploadedImage ? true : false,
      conversationState: window.conversationManager ? window.conversationManager.getConversationState() : null
    };
    
    console.log('Azure OpenAI Integration Debug Info:', debugInfo);
    
    // Add a debug message to the chat
    addUIMessage(`Debug Info:\n- Pyodide Loaded: ${isPyodideLoaded}\n- Azure Configured: ${isAIConfigured}\n- Messages: ${debugInfo.conversationState?.messageCount || 0}`, false);
    
    // Check for common issues
    if (!isPyodideLoaded) {
      console.error('Pyodide not loaded. Azure OpenAI integration requires Pyodide.');
      addUIMessage('Error: Pyodide not loaded. Try reloading the page.', false);
    }
    
    if (!isAIConfigured) {
      console.error('Azure OpenAI not configured. Please check your API key, endpoint, and version.');
      addUIMessage('Error: Azure OpenAI not configured. Click the ⚙️ to set up your credentials.', false);
    }
    
    // Force initialize Pyodide if needed
    if (!isPyodideLoaded) {
      addUIMessage('Attempting to initialize Pyodide...', false);
      initPyodide().then(result => {
        addUIMessage(`Pyodide initialization ${result ? 'successful' : 'failed'}.`, false);
      });
    }
    
    // Try a test API call if configured
    if (isPyodideLoaded && isAIConfigured) {
      addUIMessage('Attempting test API call...', false);
      
      // Show loading indicator
      showLoadingIndicator();
      
      // Create a minimal test message
      if (window.conversationManager) {
        window.conversationManager.addMessage('user', 'This is a test message');
      }
      
      // Try the API call
      callAzureOpenAIDirectly()
        .then(response => {
          removeLoadingIndicator();
          console.log('API Test Response:', response);
          addUIMessage('API test successful! You can now ask questions.', false);
        })
        .catch(error => {
          removeLoadingIndicator();
          console.error('API Test Error:', error);
          addUIMessage(`API test failed: ${error.message || 'Unknown error'}`, false);
        });
    }
    
    return debugInfo;
  }
  
  // Expose chat API
  window.pidChat = {
    toggleChat: toggleChatWindow,
    sendMessage: sendMessage,
    highlightElements: highlightElements,
    clearHighlights: clearHighlights,
    showSettings: showConfigModal,
    resetConversation: resetConversation,
    initPyodide: initPyodide,
    debugAzureIntegration: debugAzureIntegration
  };
})();
