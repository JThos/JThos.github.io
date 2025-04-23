/*
 * pid-chat-skills-integration.js
 * 
 * Integrates specialized skills into the P&ID Chat interface.
 * This file acts as a bridge between the main chat interface and the skill system.
 */

(function() {
  // Initialize skills integration
  function initSkillsIntegration() {
    console.log("Initializing P&ID Chat Skills Integration...");
    
    // Load skill-manager.js
    loadScript('skill-manager.js', function() {
      console.log("Skill Manager loaded successfully");
      
      // Load skills
      loadSkills();
    });
  }
  
  // Load skills
  function loadSkills() {
    // Load P&ID QA skill
    loadScript('pid-qa-skill.js', function() {
      console.log("P&ID QA skill loaded successfully");
    });
    
    // Add more skills here as they are developed
    // loadScript('pid-path-analysis-skill.js', ...);
    // loadScript('pid-material-balance-skill.js', ...);
  }
  
  // Helper function to load scripts
  function loadScript(scriptName, callback) {
    const script = document.createElement('script');
    script.src = scriptName;
    script.onload = callback;
    script.onerror = function() {
      console.error(`Failed to load script: ${scriptName}`);
    };
    document.head.appendChild(script);
  }
  
  // Initialize when chat is loaded
  function checkAndInitialize() {
    // Ensure the chat exists
    if (document.getElementById('pidChatWindow')) {
      initSkillsIntegration();
    } else {
      // Retry after a delay
      setTimeout(checkAndInitialize, 1000);
    }
  }
  
  // Initialize skills integration when window loads
  window.addEventListener('load', function() {
    // Wait a moment for the chat to initialize
    setTimeout(checkAndInitialize, 2000);
  });
})();
