/*
 * skill-manager.js
 * 
 * Manages specialized skills for the P&ID Chat interface.
 * Skills are task-specific workflows that can be activated by the user.
 */

(function() {
  // Skills registry and state
  let registeredSkills = {};
  let activeSkill = null;
  let skillSelectorDiv = null;
  let skillContentDiv = null;
  
  // Initialize the skill manager
  function initSkillManager() {
    console.log("Initializing Skill Manager...");
    
    // Create skill selector UI
    createSkillUI();
    
    // Load available skills
    loadSkills();
    
    return {
      registerSkill,
      activateSkill,
      deactivateSkill,
      getActiveSkill,
      isSkillActive
    };
  }
  
  // Create the skill selector UI
  function createSkillUI() {
    // Check if chat window exists yet
    const chatWindow = document.getElementById('pidChatWindow');
    if (!chatWindow) {
      console.error("Cannot initialize skill UI: Chat window not found.");
      // Retry after a delay
      setTimeout(createSkillUI, 1000);
      return;
    }
    
    // Create skill selector container
    skillSelectorDiv = document.createElement('div');
    skillSelectorDiv.id = 'pidSkillSelector';
    skillSelectorDiv.className = 'pid-skill-selector';
    
    // Add header
    const skillHeader = document.createElement('div');
    skillHeader.className = 'pid-skill-header';
    skillHeader.innerHTML = '<span>Skills</span>';
    
    // Add selector dropdown
    const skillDropdown = document.createElement('select');
    skillDropdown.id = 'pidSkillDropdown';
    skillDropdown.className = 'pid-skill-dropdown';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Select a skill...';
    skillDropdown.appendChild(defaultOption);
    
    // Add event listener for skill selection
    skillDropdown.addEventListener('change', function() {
      const selectedSkillId = this.value;
      if (selectedSkillId) {
        activateSkill(selectedSkillId);
      } else {
        deactivateSkill();
      }
    });
    
    // Add to skill selector
    skillSelectorDiv.appendChild(skillHeader);
    skillSelectorDiv.appendChild(skillDropdown);
    
    // Create skill content container (for UI of active skill)
    skillContentDiv = document.createElement('div');
    skillContentDiv.id = 'pidSkillContent';
    skillContentDiv.className = 'pid-skill-content';
    skillContentDiv.style.display = 'none';
    
    // Add to chat window
    const chatInputArea = document.querySelector('.pid-chat-input-area');
    if (chatInputArea) {
      chatWindow.insertBefore(skillSelectorDiv, chatInputArea);
      chatWindow.insertBefore(skillContentDiv, chatInputArea);
    } else {
      console.error("Cannot find chat input area to attach skill UI");
    }
    
    // Add styles
    addSkillStyles();
  }
  
  // Load available skills
  function loadSkills() {
    // This will be called by individual skill modules when they load
    // Skills register themselves using the registerSkill function
    console.log("Ready to load skills. Skills will self-register.");
  }
  
  // Register a new skill
  function registerSkill(skill) {
    if (!skill.id || !skill.name || !skill.description || !skill.initialize) {
      console.error("Invalid skill definition. Skills must have id, name, description, and initialize function.");
      return false;
    }
    
    // Store skill
    registeredSkills[skill.id] = skill;
    console.log(`Registered skill: ${skill.name}`);
    
    // Add to dropdown
    const skillDropdown = document.getElementById('pidSkillDropdown');
    if (skillDropdown) {
      const option = document.createElement('option');
      option.value = skill.id;
      option.text = skill.name;
      skillDropdown.appendChild(option);
    }
    
    return true;
  }
  
  // Activate a skill
  function activateSkill(skillId) {
    // Deactivate current skill if any
    if (activeSkill) {
      deactivateSkill();
    }
    
    // Get skill
    const skill = registeredSkills[skillId];
    if (!skill) {
      console.error(`Skill not found: ${skillId}`);
      return false;
    }
    
    // Update UI
    console.log(`Activating skill: ${skill.name}`);
    skillContentDiv.innerHTML = '';
    skillContentDiv.style.display = 'block';
    
    // Add description
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'pid-skill-description';
    descriptionDiv.textContent = skill.description;
    skillContentDiv.appendChild(descriptionDiv);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'pid-skill-close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close skill';
    closeButton.onclick = deactivateSkill;
    skillContentDiv.appendChild(closeButton);
    
    // Create content container for the skill's UI
    const skillUIContainer = document.createElement('div');
    skillUIContainer.className = 'pid-skill-ui-container';
    skillContentDiv.appendChild(skillUIContainer);
    
    // Initialize skill
    try {
      skill.initialize(skillUIContainer);
      activeSkill = skill;
      
      // Update dropdown to match
      const skillDropdown = document.getElementById('pidSkillDropdown');
      if (skillDropdown) {
        skillDropdown.value = skillId;
      }
      
      return true;
    } catch (error) {
      console.error(`Error initializing skill ${skill.name}:`, error);
      skillContentDiv.style.display = 'none';
      return false;
    }
  }
  
  // Deactivate the current skill
  function deactivateSkill() {
    if (activeSkill && activeSkill.cleanup) {
      try {
        activeSkill.cleanup();
      } catch (error) {
        console.error(`Error cleaning up skill ${activeSkill.name}:`, error);
      }
    }
    
    // Update UI
    activeSkill = null;
    skillContentDiv.innerHTML = '';
    skillContentDiv.style.display = 'none';
    
    // Reset dropdown
    const skillDropdown = document.getElementById('pidSkillDropdown');
    if (skillDropdown) {
      skillDropdown.value = '';
    }
    
    return true;
  }
  
  // Get the currently active skill
  function getActiveSkill() {
    return activeSkill;
  }
  
  // Check if a skill is active
  function isSkillActive() {
    return activeSkill !== null;
  }
  
  // Add styles for skill UI
  function addSkillStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pid-skill-selector {
        padding: 10px 15px;
        border-top: 1px solid #eee;
        background-color: #f9f9f9;
        cursor: default !important;
        pointer-events: auto !important;
      }
      
      .pid-skill-selector *,
      .pid-skill-content * {
        cursor: default !important;
        pointer-events: auto !important;
      }
      
      .pid-skill-selector button,
      .pid-skill-selector select,
      .pid-skill-content button,
      .pid-skill-content select,
      .pid-skill-content a {
        cursor: pointer !important;
      }
      
      .pid-skill-content input,
      .pid-skill-content textarea {
        cursor: text !important;
      }
      
      .pid-skill-header {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .pid-skill-dropdown {
        width: 100%;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #ddd;
        background-color: white;
      }
      
      .pid-skill-content {
        padding: 15px;
        border-top: 1px solid #eee;
        background-color: #f0f7ff;
        position: relative;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .pid-skill-description {
        margin-bottom: 15px;
        font-style: italic;
        color: #555;
        padding-right: 25px;
      }
      
      .pid-skill-close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #555;
      }
      
      .pid-skill-ui-container {
        border-top: 1px solid #ddd;
        padding-top: 15px;
      }
      
      .pid-skill-button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 10px;
        margin-bottom: 10px;
      }
      
      .pid-skill-button:hover {
        background-color: #0069d9;
      }
      
      .pid-skill-input {
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .pid-skill-textarea {
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        min-height: 100px;
      }
      
      .pid-skill-section {
        margin-bottom: 15px;
      }
      
      .pid-skill-label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }
      
      .pid-skill-results {
        margin-top: 15px;
        padding: 10px;
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .pid-skill-result-item {
        padding: 5px;
        border-bottom: 1px solid #eee;
      }
      
      .pid-skill-result-item:last-child {
        border-bottom: none;
      }
      
      .pid-skill-result-success {
        color: #28a745;
      }
      
      .pid-skill-result-warning {
        color: #ffc107;
      }
      
      .pid-skill-result-error {
        color: #dc3545;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Initialize when window loads
  if (document.readyState === 'complete') {
    setTimeout(function() {
        window.skillManager = initSkillManager();
    }, 1500);
} else
	{
  window.addEventListener('load', function() {
    // Wait for the chat interface to initialize
    setTimeout(function() {
      // Initialize and expose the skill manager
      window.skillManager = initSkillManager();
    }, 1500);
  
}
);}

})();
