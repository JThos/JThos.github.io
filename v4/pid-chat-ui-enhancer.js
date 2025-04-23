/*
 * pid-chat-ui-enhancer.js
 * 
 * Enhances the P&ID Chat UI with modern styling and additional features
 * - Injects the modern CSS
 * - Adds improved message formatting
 * - Supports Markdown rendering in messages
 * - Provides better visualization for complex skill content
 */

(function() {
  // Configuration
  const config = {
    // Feature flags
    enableMarkdownFormatting: true,
    enableAnimations: true,
    enableDarkModeDetection: true,
    
    // Visual settings
    avatarEnabled: true,
    timestampsEnabled: true,
    
    // Icons (using inline SVG for better compatibility)
    icons: {
      send: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
      attachment: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`,
      settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      reset: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>`,
      close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
      chat: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`
    }
  };
  
  // Track initialization state
  let isInitialized = false;
  let markdownConverter = null;
  
  // Initialize the UI enhancer
  function initUIEnhancer() {
    if (isInitialized) return;
    
    console.log("Initializing P&ID Chat UI Enhancer...");
    
    // Load the modern CSS
    injectModernCSS();
    
    // Attempt to load Markdown library
    if (config.enableMarkdownFormatting) {
      loadMarkdownLibrary();
    }
    
    // Wait for the chat interface to initialize
    waitForChatInterface();
    
    isInitialized = true;
  }
  
  // Inject the modern CSS
  function injectModernCSS() {
    // Fetch the CSS file or embed it directly here
    const cssContent = getCSSContent();
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'pid-chat-modern-style';
    style.textContent = cssContent;
    
    // Append to document head
    document.head.appendChild(style);
    
    console.log("Modern CSS styles injected");
  }
  
  // Get the CSS content - placeholder for the CSS content retrieval
  function getCSSContent() {
    // The CSS file would be loaded or embedded here
    // For now, we'll use a minimal version as a placeholder
    return `
      /* This is a placeholder for the CSS content */
      /* The actual CSS is in pid-chat-modern.css */
      /* When deploying, you should include the CSS directly here */
    `;
  }
  
  // Load Markdown library
  function loadMarkdownLibrary() {
    // Try to load Marked.js for Markdown rendering
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    script.onload = () => {
      console.log("Markdown library loaded");
      if (window.marked) {
        markdownConverter = window.marked;
        markdownConverter.setOptions({
          gfm: true,
          breaks: true,
          sanitize: true
        });
      }
    };
    script.onerror = () => {
      console.warn("Could not load Markdown library");
    };
    document.head.appendChild(script);
  }
  
  // Wait for the chat interface to initialize
  function waitForChatInterface() {
    // Check if the chat window already exists
    const chatWindow = document.getElementById('pidChatWindow');
    
    if (chatWindow) {
      enhanceChatInterface();
    } else {
      // If not, wait and check again
      console.log("Waiting for chat interface to initialize...");
      setTimeout(waitForChatInterface, 500);
    }
  }
  
  // Enhance the chat interface with additional features
  function enhanceChatInterface() {
    // Update icons with SVG
    updateInterfaceIcons();
    
    // Enhance message display
    enhanceMessageDisplay();
    
    // Add observers to dynamically enhance new messages
    observeNewMessages();
    
    // Enhance skill content display
    enhanceSkillContent();
    
    console.log("Chat interface enhanced");
  }
  
  // Update interface icons with SVG
  function updateInterfaceIcons() {
    // Update send button
    const sendButton = document.getElementById('pidSendButton');
    if (sendButton) {
      // Text only for Send button - no icon
      sendButton.innerHTML = 'Send';
      sendButton.title = "Send message";
    }
    
    // Update upload button
    const uploadButton = document.getElementById('pidImageUploadButton');
    if (uploadButton) {
      uploadButton.innerHTML = config.icons.attachment;
      uploadButton.title = "Upload image";
    }
    
    // Update settings button
    const settingsButton = document.querySelector('.pid-chat-settings-btn');
    if (settingsButton) {
      settingsButton.innerHTML = config.icons.settings;
      settingsButton.title = "Settings";
    }
    
    // Update reset button
    const resetButton = document.querySelector('.pid-chat-reset-btn');
    if (resetButton) {
      resetButton.innerHTML = config.icons.reset;
      resetButton.title = "Reset conversation";
    }
    
    // Update close button
    const closeButton = document.querySelector('.pid-chat-close-btn');
    if (closeButton) {
      closeButton.innerHTML = config.icons.close;
      closeButton.title = "Close chat";
    }
    
    // Update chat toggle button
    const toggleButton = document.getElementById('pidChatToggle');
    if (toggleButton) {
      toggleButton.innerHTML = config.icons.chat;
      toggleButton.title = "Toggle chat";
    }
  }
  
  // Enhance message display with formatting and structure
  function enhanceMessageDisplay() {
    // Get all existing messages
    const messages = document.querySelectorAll('.pid-chat-message');
    
    // Enhance each message
    messages.forEach(enhanceMessage);
  }
  
  // Enhance a single message
  function enhanceMessage(messageElement) {
    // Skip if already enhanced
    if (messageElement.dataset.enhanced === 'true') return;
    
    // Add timestamp if enabled
    if (config.timestampsEnabled && !messageElement.querySelector('.pid-message-time')) {
      const timestamp = document.createElement('div');
      timestamp.className = 'pid-message-time';
      timestamp.textContent = formatTime(new Date());
      messageElement.appendChild(timestamp);
    }
    
    // Format message content if it's an assistant message
    if (messageElement.classList.contains('assistant') && config.enableMarkdownFormatting) {
      formatMessageContent(messageElement);
    }
    
    // Mark as enhanced
    messageElement.dataset.enhanced = 'true';
  }
  
  // Format message content with Markdown
  function formatMessageContent(messageElement) {
    const paragraphElements = messageElement.querySelectorAll('p');
    
    if (paragraphElements.length > 0) {
      // Iterate through each paragraph
      paragraphElements.forEach(p => {
        // Get the content
        const content = p.innerHTML;
        
        // If markdown converter is available
        if (markdownConverter) {
          // Use markdown
          p.innerHTML = markdownConverter(content);
        } else {
          // Basic formatting with regex
          p.innerHTML = basicFormatting(content);
        }
      });
    }
  }
  
  // Basic formatting with regex for when markdown isn't available
  function basicFormatting(text) {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Headers (simplified)
    text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Links
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Lists (simplified)
    text = text.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    text = text.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
    
    // Wrap lists
    let hasUnorderedList = text.includes('<li>');
    if (hasUnorderedList) {
      text = '<ul>' + text + '</ul>';
      // Clean up
      text = text.replace(/<\/ul>\s*<ul>/g, '');
    }
    
    return text;
  }
  
  // Format time for timestamps
  function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // Observe for new messages to enhance them
  function observeNewMessages() {
    // Get the messages container
    const messagesContainer = document.getElementById('pidChatMessages');
    
    if (!messagesContainer) {
      console.warn("Messages container not found");
      return;
    }
    
    // Create a mutation observer
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // For each added node, check if it's a message
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node.classList.contains('pid-chat-message') || 
                 node.classList.contains('pid-loading-indicator'))) {
              enhanceMessage(node);
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(messagesContainer, { childList: true });
    
    console.log("Observing for new messages");
  }
  
  // Enhance skill content display
  function enhanceSkillContent() {
    // Get the skill content container
    const skillContent = document.getElementById('pidSkillContent');
    
    if (!skillContent) {
      // If not found, wait for it to be created
      setTimeout(enhanceSkillContent, 1000);
      return;
    }
    
    // Create a mutation observer for skill content
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          formatSkillContent(skillContent);
        }
      });
    });
    
    // Start observing
    observer.observe(skillContent, { childList: true, subtree: true });
    
    console.log("Observing skill content for changes");
  }
  
  // Format skill content for better readability
  function formatSkillContent(skillContent) {
    // Format tables
    const tables = skillContent.querySelectorAll('table:not(.pid-enhanced)');
    tables.forEach(table => {
      table.classList.add('pid-result-table', 'pid-enhanced');
    });
    
    // Format code blocks
    const codeBlocks = skillContent.querySelectorAll('pre:not(.pid-enhanced)');
    codeBlocks.forEach(pre => {
      pre.classList.add('pid-agent-code', 'pid-enhanced');
    });
    
    // Format headings
    const headings = skillContent.querySelectorAll('h1:not(.pid-enhanced), h2:not(.pid-enhanced), h3:not(.pid-enhanced)');
    headings.forEach(heading => {
      heading.classList.add('pid-enhanced');
    });
    
    // Apply code syntax highlighting if a library is available
    if (window.hljs) {
      const codeElements = skillContent.querySelectorAll('pre code:not(.pid-highlighted)');
      codeElements.forEach(code => {
        hljs.highlightElement(code);
        code.classList.add('pid-highlighted');
      });
    }
  }
  
  // Apply enhancements when the window loads
  window.addEventListener('load', initUIEnhancer);
  
  // If the document is already loaded, initialize immediately
  if (document.readyState === 'complete') {
    initUIEnhancer();
  }
  
  // Expose the enhancer to the window object for debugging
  window.pidChatUIEnhancer = {
    config,
    reinitialize: initUIEnhancer,
    formatContent: function(elementSelector) {
      const element = document.querySelector(elementSelector);
      if (element) {
        if (element.classList.contains('pid-chat-message')) {
          enhanceMessage(element);
        } else {
          formatSkillContent(element);
        }
      }
    }
  };
})();
