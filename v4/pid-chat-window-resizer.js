/*
 * pid-chat-window-resizer.js
 * 
 * Adds functionality to resize the chat window between normal and enlarged states
 * Primarily increases width for better readability of skills content
 */

(function() {
  // Configuration
  const config = {
    // CSS classes
    enlargedWindowClass: 'pid-chat-window-enlarged',
    resizeButtonClass: 'pid-chat-resize-btn',
    
    // Button icons (SVG)
    enlargeIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`,
    shrinkIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`,
    
    // Sizing details (percentage of viewport)
    normalWidthPercent: 450,  // Fixed width in pixels
    enlargedWidthPercent: 70, // Percentage of viewport width
    maxEnlargedWidth: 1200,   // Maximum width in pixels
    
    // Debug mode
    debug: true
  };
  
  // State
  let isEnlarged = false;
  let isInitialized = false;
  let resizeButton = null;
  let chatWindow = null;
  
  // Log helper
  function log(message) {
    if (config.debug) {
      console.log(`[Window Resizer] ${message}`);
    }
  }
  
  // Initialize the window resizer
  function initialize() {
    if (isInitialized) return;
    
    log('Initializing chat window resizer');
    
    // Wait for chat interface to be ready
    waitForChatInterface();
    
    // Add resize styles to the document
    addResizeStyles();
    
    isInitialized = true;
  }
  
  // Wait for chat interface to be ready
  function waitForChatInterface() {
    chatWindow = document.getElementById('pidChatWindow');
    
    if (chatWindow) {
      log('Chat window found');
      addResizeButton();
    } else {
      log('Waiting for chat window to be ready');
      setTimeout(waitForChatInterface, 500);
    }
  }
  
  // Add resize button to the chat header
  function addResizeButton() {
    const chatHeader = chatWindow.querySelector('.pid-chat-header');
    
    if (!chatHeader) {
      log('Chat header not found');
      return;
    }
    
    // Create resize button
    resizeButton = document.createElement('button');
    resizeButton.className = `${config.resizeButtonClass}`;
    resizeButton.title = 'Enlarge chat window';
    resizeButton.innerHTML = config.enlargeIcon;
    resizeButton.addEventListener('click', toggleWindowSize);
    
    // Add button before close button (if exists) or at the end of header
    const closeButton = chatHeader.querySelector('.pid-chat-close-btn');
    if (closeButton) {
      chatHeader.insertBefore(resizeButton, closeButton);
    } else {
      chatHeader.appendChild(resizeButton);
    }
    
    log('Resize button added to chat header');
  }
  
  // Add resize styles to document
  function addResizeStyles() {
    const style = document.createElement('style');
    style.id = 'pid-chat-resize-styles';
    style.textContent = `
      /* Resize button styling */
      .${config.resizeButtonClass} {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        margin-left: 10px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      
      .${config.resizeButtonClass}:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      /* Enlarged window styling */
      .${config.enlargedWindowClass} {
        width: ${config.enlargedWidthPercent}vw !important;
        max-width: ${config.maxEnlargedWidth}px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        height: 80vh !important;
        bottom: 10vh !important;
        right: auto !important;
        z-index: 10001 !important;
      }
      
      /* Ensure the skill content has better visibility when enlarged */
      .${config.enlargedWindowClass} .pid-skill-content {
        max-height: 55vh !important;
      }
      
      .${config.enlargedWindowClass} .pid-chat-messages {
        max-height: 60vh !important;
      }
      
      /* Improved table layout in enlarged mode */
      .${config.enlargedWindowClass} .pid-result-table {
        table-layout: fixed;
        width: 100%;
      }
      
      .${config.enlargedWindowClass} .pid-result-table td {
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      /* Better agent message rendering in enlarged mode */
      .${config.enlargedWindowClass} .pid-agent-message {
        max-width: 90%;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .${config.enlargedWindowClass} {
          width: 90vw !important;
          height: 85vh !important;
          bottom: 7.5vh !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    log('Resize styles added to document');
  }
  
  // Toggle window size between normal and enlarged
  function toggleWindowSize() {
    if (!chatWindow) return;
    
    isEnlarged = !isEnlarged;
    
    // Update button icon and title
    if (resizeButton) {
      resizeButton.innerHTML = isEnlarged ? config.shrinkIcon : config.enlargeIcon;
      resizeButton.title = isEnlarged ? 'Restore window size' : 'Enlarge chat window';
    }
    
    // Toggle enlarged class
    if (isEnlarged) {
      chatWindow.classList.add(config.enlargedWindowClass);
      log('Window enlarged');
    } else {
      chatWindow.classList.remove(config.enlargedWindowClass);
      log('Window restored to normal size');
    }
    
    // If skills are active, adjust their container too
    adjustSkillContainers();
    
    // Store state in session storage to remember preference
    try {
      sessionStorage.setItem('pidChatEnlarged', isEnlarged ? 'true' : 'false');
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  // Adjust skill containers if skills are active
  function adjustSkillContainers() {
    const skillContent = document.getElementById('pidSkillContent');
    if (skillContent && skillContent.style.display !== 'none') {
      // Skill is active, enhance readability
      
      // For tables in skill content
      const tables = skillContent.querySelectorAll('table');
      tables.forEach(table => {
        if (isEnlarged) {
          table.style.width = '100%';
          table.style.tableLayout = 'fixed';
        } else {
          table.style.width = '';
          table.style.tableLayout = '';
        }
      });
      
      // Ensure no horizontal scrolling for code blocks
      const codeBlocks = skillContent.querySelectorAll('pre, .pid-agent-code');
      codeBlocks.forEach(block => {
        if (isEnlarged) {
          block.style.maxWidth = '100%';
          block.style.whiteSpace = 'pre-wrap';
        } else {
          block.style.maxWidth = '';
          block.style.whiteSpace = '';
        }
      });
    }
  }
  
  // Restore window state from session storage
  function restoreWindowState() {
    try {
      const savedState = sessionStorage.getItem('pidChatEnlarged');
      if (savedState === 'true' && chatWindow) {
        isEnlarged = true;
        chatWindow.classList.add(config.enlargedWindowClass);
        
        if (resizeButton) {
          resizeButton.innerHTML = config.shrinkIcon;
          resizeButton.title = 'Restore window size';
        }
        
        adjustSkillContainers();
        log('Restored enlarged state from session storage');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  // Check for chat state changes to adapt layout
  function monitorChatState() {
    // Watch for skill activation
    const skillContentElement = document.getElementById('pidSkillContent');
    if (skillContentElement) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            // Skill display changed, adjust containers if needed
            if (isEnlarged) {
              adjustSkillContainers();
            }
          }
        });
      });
      
      observer.observe(skillContentElement, { attributes: true });
      log('Monitoring skill content state');
    }
  }
  
  // Run initialization
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize);
  }
  
  // After initialization, set up state monitors
  setTimeout(() => {
    restoreWindowState();
    monitorChatState();
  }, 1000);
  
  // Expose API for external use
  window.pidChatResizer = {
    enlarge: function() {
      if (!isEnlarged) toggleWindowSize();
    },
    shrink: function() {
      if (isEnlarged) toggleWindowSize();
    },
    toggle: toggleWindowSize,
    isEnlarged: () => isEnlarged
  };
})();
