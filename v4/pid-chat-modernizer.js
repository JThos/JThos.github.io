/*
 * pid-chat-modernizer.js
 * 
 * Implementation script to load the modern UI for P&ID Chat
 * This script should be included after the original chat scripts
 */

(function() {
  // Configuration
  const config = {
    // CSS file path - update this to your actual hosting path
    cssPath: 'pid-chat-modern.css',
    
    // UI enhancer path - update this to your actual hosting path
    enhancerPath: 'pid-chat-ui-enhancer.js',
    
    // Whether to use external files or embed them
    useExternalFiles: false,
    
    // Debug mode
    debug: true
  };
  
  // Log function that respects debug mode
  function log(message) {
    if (config.debug) {
      console.log(`[P&ID Chat Modernizer] ${message}`);
    }
  }
  
  // Load external CSS file
  function loadExternalCSS() {
    log(`Loading external CSS from ${config.cssPath}`);
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = config.cssPath;
    link.id = 'pid-chat-modern-css';
    
    link.onload = () => log('Modern CSS loaded successfully');
    link.onerror = () => {
      console.error(`Failed to load CSS from ${config.cssPath}`);
      // Fallback: Try to use embedded CSS
      embedCSS();
    };
    
    document.head.appendChild(link);
  }
  
  // Embed CSS directly
  function embedCSS() {
    log('Embedding CSS directly');
    
    // Fetch the CSS content
    fetch(config.cssPath)
      .then(response => response.text())
      .then(css => {
        const style = document.createElement('style');
        style.id = 'pid-chat-modern-css-embedded';
        style.textContent = css;
        document.head.appendChild(style);
        log('CSS embedded successfully');
      })
      .catch(error => {
        console.error('Failed to embed CSS:', error);
      });
  }
  
  // Load external enhancer script
  function loadEnhancerScript() {
    log(`Loading UI enhancer from ${config.enhancerPath}`);
    
    const script = document.createElement('script');
    script.src = config.enhancerPath;
    script.id = 'pid-chat-ui-enhancer';
    
    script.onload = () => log('UI enhancer loaded successfully');
    script.onerror = () => console.error(`Failed to load UI enhancer from ${config.enhancerPath}`);
    
    document.body.appendChild(script);
  }
  
  // Wait for original scripts to load
  function waitForOriginalScripts() {
    log('Checking for original P&ID Chat scripts...');
    
    // Look for key elements or global objects that indicate the original chat is loaded
    if (window.conversationManager || document.getElementById('pidChatWindow')) {
      log('Original chat detected, loading modern UI');
      
      // Load CSS and enhancer
      if (config.useExternalFiles) {
        loadExternalCSS();
        loadEnhancerScript();
      } else {
        // When embedding is preferred, the UI enhancer script will handle the CSS
        loadEnhancerScript();
      }
    } else {
      // Wait and try again
      log('Original chat not detected yet, waiting...');
      setTimeout(waitForOriginalScripts, 500);
    }
  }
  
  // Start the modernization process
  function initialize() {
    log('Initializing P&ID Chat Modernizer');
    waitForOriginalScripts();
  }
  
  // Initialize when the window has loaded
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize);
  }
})();
