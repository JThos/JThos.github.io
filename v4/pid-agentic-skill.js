(function() {
  // Debug flag - set to true to see detailed logs
  const DEBUG = true;
  
  // Skill configuration
  const skillConfig = {
    id: 'pid-agentic',
    name: 'P&ID Rule-Based Analysis',
    description: 'Analyze P&ID data using rule-based graph analysis following the autocorrection methodology',
    
    // Skill state
    state: {
      rules: [],
      nodes: [],
      edges: [],
      nodeCSV: '',
      edgeCSV: '',
      agents: [
        {
          id: 'rule_converter',
          name: 'Rule Converter',
          color: '#1890ff',
          role: "Rule Converter. Transform natural language engineering rules into graph patterns (subgraphs) that can be applied to the P&ID graph. Use the node and edge data to properly encode rule patterns using component types and connectivity.",
          active: true
        },
        {
          id: 'rule_validator',
          name: 'Rule Validator',
          color: '#52c41a',
          role: "Rule Validator. Apply the rule subgraphs to the P&ID graph to detect compliant and non-compliant elements. Consider indirect connections and generate a CSV assessment with ITEM tags and matching scores.",
          active: true
        },
        {
          id: 'rule_reporter',
          name: 'Rule Reporter',
          color: '#722ed1',
          role: "Rule Reporter. Provide a concise written assessment and recommendations based on the validation results. Highlight key areas for improvement and potential safety or design concerns.",
          active: true
        }
      ],
      conversation: [],
      results: [],
      ruleSubgraphs: [],
      activeAgentIndex: 0,
      analysisInProgress: false,
      analysisComplete: false
    },
    
    // Initialize the skill
    initialize: function(container) {
      console.log("Initializing P&ID Rule-Based Analysis skill...");
      
      createAgenticUI(container);
      return true;
    },
    
    // Cleanup when skill is deactivated
    cleanup: function() {
      console.log("Cleaning up P&ID Rule-Based Analysis skill...");
      
      // If an analysis is in progress, we should cancel it
      if (this.state.analysisInProgress) {
        this.state.analysisInProgress = false;
      }
      
      // Reset state
      this.state.rules = [];
      this.state.nodes = [];
      this.state.edges = [];
      this.state.nodeCSV = '';
      this.state.edgeCSV = '';
      this.state.conversation = [];
      this.state.results = [];
      this.state.ruleSubgraphs = [];
      this.state.activeAgentIndex = 0;
      this.state.analysisInProgress = false;
      this.state.analysisComplete = false;
      
      // Reset active state for agents
      this.state.agents.forEach(agent => {
        agent.active = true;
      });
      
      return true;
    }
  };
  
  // Create the Agentic UI
  function createAgenticUI(container) {
    // Create rule input section
    const ruleSection = document.createElement('div');
    ruleSection.className = 'pid-skill-section';
    
    const ruleLabel = document.createElement('label');
    ruleLabel.className = 'pid-skill-label';
    ruleLabel.textContent = 'Define P&ID Rules for Analysis:';
    ruleSection.appendChild(ruleLabel);
    
    const ruleInput = document.createElement('textarea');
    ruleInput.className = 'pid-skill-textarea';
    ruleInput.placeholder = 'Enter rules here. Examples:\n' +
      '1. All pumps must have a check valve on the discharge line\n' +
      '2. Vessels must have level instrumentation\n' +
      '3. Valves larger than 100DN should not be globe valves\n' +
      '4. Pumps must have suction strainers\n' +
      '5. Pumps must have isolation valves on suction and discharge lines';
    ruleSection.appendChild(ruleInput);
    
    // Create preset rules dropdown
    const presetSection = document.createElement('div');
    presetSection.className = 'pid-skill-section';
    
    const presetLabel = document.createElement('label');
    presetLabel.className = 'pid-skill-label';
    presetLabel.textContent = 'Or select preset rules:';
    presetSection.appendChild(presetLabel);
    
    const presetDropdown = document.createElement('select');
    presetDropdown.className = 'pid-skill-dropdown';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Select preset rules...';
    presetDropdown.appendChild(defaultOption);
    
    // Add preset rule options
    const presets = [
      { value: 'basic', text: 'Basic P&ID Rules' },
      { value: 'pumps', text: 'Pump Installation Standards' },
      { value: 'valves', text: 'Valve Selection Standards' },
      { value: 'vessels', text: 'Vessel Instrumentation Standards' },
      { value: 'safety', text: 'Safety and Isolation Standards' }
    ];
    
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.value;
      option.text = preset.text;
      presetDropdown.appendChild(option);
    });
    
    // Add event listener
    presetDropdown.addEventListener('change', function() {
      if (this.value) {
        loadPresetRules(this.value, ruleInput);
      }
    });
    
    presetSection.appendChild(presetDropdown);
    
    // Create agent selection section
    const agentSection = document.createElement('div');
    agentSection.className = 'pid-skill-section';
    
    const agentLabel = document.createElement('label');
    agentLabel.className = 'pid-skill-label';
    agentLabel.textContent = 'Agents in the workflow:';
    agentSection.appendChild(agentLabel);
    
    // Add checkboxes for each agent
    const agentGrid = document.createElement('div');
    agentGrid.className = 'pid-skill-agent-grid';
    
    skillConfig.state.agents.forEach((agent, index) => {
      const agentCheck = document.createElement('div');
      agentCheck.className = 'pid-skill-agent-item';
      agentCheck.style.borderLeft = `3px solid ${agent.color}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `agent-${agent.id}`;
      checkbox.checked = agent.active;
      checkbox.addEventListener('change', function() {
        // Update agent active state
        skillConfig.state.agents[index].active = this.checked;
      });
      
      const checkLabel = document.createElement('label');
      checkLabel.htmlFor = `agent-${agent.id}`;
      checkLabel.textContent = agent.name;
      
      agentCheck.appendChild(checkbox);
      agentCheck.appendChild(checkLabel);
      agentGrid.appendChild(agentCheck);
    });
    
    agentSection.appendChild(agentGrid);
    
    // Create action buttons
    const actionSection = document.createElement('div');
    actionSection.className = 'pid-skill-section';
    
    const startButton = document.createElement('button');
    startButton.id = 'pidAgenticStartBtn';
    startButton.className = 'pid-skill-button';
    startButton.textContent = 'Start Rule Analysis';
    // Explicitly set up click handler to ensure it works
    startButton.addEventListener('click', function() {
      if (DEBUG) console.log("Start button clicked");
      const rules = ruleInput.value.trim();
      if (rules) {
        startAgenticAnalysis(rules.split('\n').filter(r => r.trim().length > 0));
      } else {
        addUIMessage("Please enter at least one rule or select a preset.", false);
      }
    });
    actionSection.appendChild(startButton);
    
    const exportButton = document.createElement('button');
    exportButton.id = 'pidAgenticExportBtn';
    exportButton.className = 'pid-skill-button';
    exportButton.textContent = 'Export Report (CSV)';
    exportButton.disabled = true;
    // Explicitly set up click handler to ensure it works
    exportButton.addEventListener('click', function() {
      if (DEBUG) console.log("Export button clicked");
      exportAgenticResults();
    });
    actionSection.appendChild(exportButton);
    
    // Create conversation section
    const conversationSection = document.createElement('div');
    conversationSection.className = 'pid-skill-section';
    
    const conversationLabel = document.createElement('label');
    conversationLabel.className = 'pid-skill-label';
    conversationLabel.textContent = 'Analysis Progress:';
    conversationSection.appendChild(conversationLabel);
    
    const conversationContainer = document.createElement('div');
    conversationContainer.id = 'pidAgenticConversation';
    conversationContainer.className = 'pid-skill-conversation';
    conversationContainer.innerHTML = '<div class="pid-skill-placeholder">Agents will analyze the P&ID against your rules here.</div>';
    conversationSection.appendChild(conversationContainer);
    
    // Add all sections to the container
    container.appendChild(ruleSection);
    container.appendChild(presetSection);
    container.appendChild(agentSection);
    container.appendChild(actionSection);
    container.appendChild(conversationSection);
    
    // Add specific styles for agentic UI
    const style = document.createElement('style');
    style.textContent = `
      .pid-skill-agent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 8px;
        margin-bottom: 15px;
      }
      
      .pid-skill-agent-item {
        padding: 8px;
        background-color: #f5f5f5;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }
      
      .pid-skill-agent-item input {
        margin-right: 8px;
      }
      
      .pid-skill-conversation {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        padding: 0;
      }
      
      .pid-skill-placeholder {
        padding: 10px;
        color: #888;
        font-style: italic;
      }
      
      .pid-agent-message {
        padding: 10px;
        margin: 0;
        border-bottom: 1px solid #eee;
      }
      
      .pid-agent-message:last-child {
        border-bottom: none;
      }
      
      .pid-agent-message .agent-header {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
      }
      
      .pid-agent-message .agent-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 6px;
      }
      
      .pid-agent-message .agent-name {
        font-weight: bold;
      }
      
      .pid-agent-message .agent-content {
        white-space: pre-wrap;
      }
      
      .pid-agent-message .agent-thinking {
        font-style: italic;
        color: #888;
        margin-top: 5px;
        font-size: 0.9em;
      }
      
      .pid-agent-message-rule_converter {
        background-color: #e6f7ff;
      }
      
      .pid-agent-message-rule_validator {
        background-color: #f6ffed;
      }
      
      .pid-agent-message-rule_reporter {
        background-color: #f9f0ff;
      }
      
      /* Code block styling */
      .pid-agent-code {
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        font-family: monospace;
        white-space: pre;
        overflow-x: auto;
        font-size: 12px;
        margin: 10px 0;
      }
      
      /* Result table styling */
      .pid-result-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
        font-size: 12px;
      }
      
      .pid-result-table th,
      .pid-result-table td {
        border: 1px solid #ddd;
        padding: 6px;
        text-align: left;
      }
      
      .pid-result-table th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      
      .pid-result-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      /* Subgraph visualization */
      .pid-subgraph {
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        background-color: white;
      }
      
      .pid-subgraph-title {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      /* Loading animation for agent thinking */
      .pid-agent-thinking-animation {
        display: inline-block;
        position: relative;
        width: 80px;
        height: 20px;
      }
      
      .pid-agent-thinking-animation div {
        position: absolute;
        top: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #888;
        animation-timing-function: cubic-bezier(0, 1, 1, 0);
      }
      
      .pid-agent-thinking-animation div:nth-child(1) {
        left: 8px;
        animation: pid-agent-thinking-animation1 0.6s infinite;
      }
      
      .pid-agent-thinking-animation div:nth-child(2) {
        left: 8px;
        animation: pid-agent-thinking-animation2 0.6s infinite;
      }
      
      .pid-agent-thinking-animation div:nth-child(3) {
        left: 32px;
        animation: pid-agent-thinking-animation2 0.6s infinite;
      }
      
      .pid-agent-thinking-animation div:nth-child(4) {
        left: 56px;
        animation: pid-agent-thinking-animation3 0.6s infinite;
      }
      
      @keyframes pid-agent-thinking-animation1 {
        0% { transform: scale(0); }
        100% { transform: scale(1); }
      }
      
      @keyframes pid-agent-thinking-animation3 {
        0% { transform: scale(1); }
        100% { transform: scale(0); }
      }
      
      @keyframes pid-agent-thinking-animation2 {
        0% { transform: translate(0, 0); }
        100% { transform: translate(24px, 0); }
      }
    `;
    document.head.appendChild(style);
    
    // Store references to important elements
    skillConfig.state.ui = {
      ruleInput,
      startButton,
      exportButton,
      conversationContainer
    };
  }
  
  // Load preset rules
  function loadPresetRules(presetId, ruleInput) {
    const presets = {
      'basic': [
        "All pumps must have a discharge check valve",
        "All vessels must have level indicators",
        "Flow lines must have flow indicators",
        "Control valves must have manual bypasses",
        "Heat exchangers must have temperature indicators"
      ],
      'pumps': [
        "All pumps must have a check valve on the discharge line",
        "All pumps must have a strainer on the suction line",
        "All pumps must have isolation valves on suction and discharge lines",
        "All pumps must have pressure indicators on suction and discharge",
        "Centrifugal pumps must have a minimum flow recirculation line"
      ],
      'valves': [
        "Valves larger than 100DN (4\") should not be globe valves",
        "All control valves must have upstream strainers",
        "All control valves must have bypass manual valves",
        "Control valve bodies must be sized for 130% of normal flow",
        "Valves in corrosive service must be of appropriate material"
      ],
      'vessels': [
        "All vessels must have level indicators",
        "All vessels must have pressure indicators",
        "All vessels must have temperature indicators if they contain heated or cooled media",
        "Vessels must have high level alarms",
        "Vessels must have low level alarms if pump protection is needed"
      ],
      'safety': [
        "All vessels must have pressure relief devices",
        "Relief devices must have isolation valves for maintenance",
        "Pumps handling hazardous fluids must have double mechanical seals",
        "Critical equipment must have redundant instrumentation",
        "Emergency shutdown valves must be fail-safe"
      ]
    };
    
    const rules = presets[presetId] || [];
    if (rules.length > 0) {
      ruleInput.value = rules.join('\n');
    }
  }
  
  // Start the rule-based analysis
  function startAgenticAnalysis(rules) {
    // Get the skill state
    const state = skillConfig.state;
    
    // Check if analysis is already in progress
    if (state.analysisInProgress) {
      console.log("Analysis already in progress");
      return;
    }
    
    // Log that we're starting
    if (DEBUG) {
      console.log("Starting rule-based analysis with rules:", rules);
      console.log("API Credentials:", {
        hasApiKey: !!window.azureAPIKey,
        hasEndpoint: !!window.azureEndpoint,
        apiVersion: window.azureAPIVersion
      });
    }
    
    // Update UI and state
    state.analysisInProgress = true;
    state.analysisComplete = false;
    state.rules = rules;
    state.conversation = [];
    state.results = [];
    state.ruleSubgraphs = [];
    state.activeAgentIndex = 0;
    
    // Disable start button
    state.ui.startButton.disabled = true;
    state.ui.exportButton.disabled = true;
    
    // Clear conversation container
    state.ui.conversationContainer.innerHTML = '';
    
    // Extract P&ID data for the agents to use
    const pidData = extractPIDData();
    
    // Extract graph CSVs
    const { nodeCSV, edgeCSV } = extractGraphPropertiesCSV();
    state.nodeCSV = nodeCSV;
    state.edgeCSV = edgeCSV;
    
    // Get active agents
    const activeAgents = state.agents.filter(agent => agent.active);
    
    if (activeAgents.length === 0) {
      addAgentMessage({
        role: 'system',
        name: 'System',
        content: 'Error: At least one agent must be active for the analysis.',
        color: '#ff4d4f'
      });
      
      state.analysisInProgress = false;
      state.ui.startButton.disabled = false;
      return;
    }
    
    // Check credentials before starting
    if (!window.azureAPIKey || !window.azureEndpoint) {
      addAgentMessage({
        role: 'system',
        name: 'System',
        content: 'Error: Azure OpenAI credentials not configured. Please set up your credentials in the settings.',
        color: '#ff4d4f'
      });
      
      state.analysisInProgress = false;
      state.ui.startButton.disabled = false;
      return;
    }
    
    // Start with a system message that introduces the task
    addAgentMessage({
      role: 'system',
      name: 'System',
      content: `P&ID Rule-Based Analysis Task:\n\nAnalyze the P&ID against these rules:\n${rules.map((r, i) => `${i+1}. ${r}`).join('\n')}`,
      color: '#1890ff'
    });
    
    // Start the first agent (Rule Converter)
    const firstAgent = activeAgents[0];
    
    // Add thinking animation for first agent
    addAgentThinking(firstAgent);
    
    // Add node and edge data message
    addAgentMessage({
      role: 'system', 
      name: 'Data Provider',
      content: 'P&ID Graph Data Extracted:\n\n' + 
               `Nodes: ${pidData.nodes.length}\n` +
               `Edges: ${pidData.edges.length}\n\n` +
               'This data will be used for rule-based analysis.',
      color: '#888888'
    });
    
    // Run the first agent
    callRuleConverterAgent(firstAgent, pidData, rules, state.nodeCSV, state.edgeCSV)
      .then(response => {
        // Remove thinking animation
        removeAgentThinking();
        
        // Add message to conversation
        const message = {
          agent: firstAgent.id,
          content: response.content,
          ruleSubgraphs: response.ruleSubgraphs
        };
        
        state.conversation.push(message);
        state.ruleSubgraphs = response.ruleSubgraphs;
        
        // Display message in UI
        addAgentMessage({
          role: firstAgent.id,
          name: firstAgent.name,
          content: response.content,
          color: firstAgent.color
        });
        
        // Move to next agent
        continueAgentWorkflow(pidData, rules, state.ruleSubgraphs);
      })
      .catch(error => {
        console.error("Error calling first agent:", error);
        
        // Remove thinking animation
        removeAgentThinking();
        
        // Add error message
        addAgentMessage({
          role: 'system',
          name: 'System',
          content: `Error starting analysis: ${error.message}`,
          color: '#ff4d4f'
        });
        
        // Reset state
        state.analysisInProgress = false;
        state.ui.startButton.disabled = false;
      });
  }
  
  // Continue the agent workflow to the next agent
  function continueAgentWorkflow(pidData, rules, ruleSubgraphs) {
    // Get the skill state
    const state = skillConfig.state;
    
    // If analysis was cancelled or completed
    if (!state.analysisInProgress) {
      return;
    }
    
    // Get active agents
    const activeAgents = state.agents.filter(agent => agent.active);
    
    // Move to next agent
    state.activeAgentIndex++;
    
    // Check if we've completed all agents
    if (state.activeAgentIndex >= activeAgents.length) {
      // Complete the analysis
      state.analysisInProgress = false;
      state.analysisComplete = true;
      state.ui.startButton.disabled = false;
      state.ui.exportButton.disabled = false;
      return;
    }
    
    const nextAgent = activeAgents[state.activeAgentIndex];
    
    // Add thinking animation
    addAgentThinking(nextAgent);
    
    // Call the next agent based on its role
    if (nextAgent.id === 'rule_validator') {
      callRuleValidatorAgent(nextAgent, pidData, rules, ruleSubgraphs, state.nodeCSV, state.edgeCSV)
        .then(response => {
          // Remove thinking animation
          removeAgentThinking();
          
          // Add message to conversation
          const message = {
            agent: nextAgent.id,
            content: response.content,
            results: response.results
          };
          
          state.conversation.push(message);
          state.results = response.results;
          
          // Display message in UI
          addAgentMessage({
            role: nextAgent.id,
            name: nextAgent.name,
            content: response.content,
            color: nextAgent.color
          });
          
          // Enable export button if we have results
          if (state.results.length > 0) {
            state.ui.exportButton.disabled = false;
          }
          
          // Move to next agent
          continueAgentWorkflow(pidData, rules, ruleSubgraphs);
        })
        .catch(error => {
          console.error("Error calling validator agent:", error);
          
          // Remove thinking animation
          removeAgentThinking();
          
          // Add error message
          addAgentMessage({
            role: 'system',
            name: 'System',
            content: `Error in validation: ${error.message}`,
            color: '#ff4d4f'
          });
          
          // Try to continue with next agent
          continueAgentWorkflow(pidData, rules, ruleSubgraphs);
        });
    } 
    else if (nextAgent.id === 'rule_reporter') {
      callRuleReporterAgent(nextAgent, pidData, rules, state.results)
        .then(response => {
          // Remove thinking animation
          removeAgentThinking();
          
          // Add message to conversation
          const message = {
            agent: nextAgent.id,
            content: response
          };
          
          state.conversation.push(message);
          
          // Display message in UI
          addAgentMessage({
            role: nextAgent.id,
            name: nextAgent.name,
            content: response,
            color: nextAgent.color
          });
          
          // Complete the analysis
          state.analysisInProgress = false;
          state.analysisComplete = true;
          state.ui.startButton.disabled = false;
          
          // Highlight elements if applicable
          if (state.results.length > 0) {
            highlightNonCompliantElements(state.results);
          }
        })
        .catch(error => {
          console.error("Error calling reporter agent:", error);
          
          // Remove thinking animation
          removeAgentThinking();
          
          // Add error message
          addAgentMessage({
            role: 'system',
            name: 'System',
            content: `Error in reporting: ${error.message}`,
            color: '#ff4d4f'
          });
          
          // Complete the analysis (with error)
          state.analysisInProgress = false;
          state.analysisComplete = true;
          state.ui.startButton.disabled = false;
        });
    }
  }
  
  // Call Rule Converter Agent API
  function callRuleConverterAgent(agent, pidData, rules, nodeCSV, edgeCSV) {
    return new Promise((resolve, reject) => {
      // Log what we're about to do
      if (DEBUG) {
        console.log(`Calling Rule Converter agent with ${rules.length} rules`);
      }
      
      // Ensure the Azure OpenAI credentials are configured
      if (!window.azureAPIKey || !window.azureEndpoint) {
        reject(new Error("Azure OpenAI not configured. Please set up your credentials in the settings."));
        return;
      }
      
      // Prepare the API call
      const apiUrl = `${window.azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=${window.azureAPIVersion}`;
      
      // Construct the system prompt specifically for this agent
      let systemPrompt = `You are a ${agent.name} agent analyzing a P&ID (Piping and Instrumentation Diagram). ${agent.role}

Your task is to convert the following rules into graph patterns (subgraphs) that can be used to validate the P&ID:
${rules.map((r, i) => `${i+1}. ${r}`).join('\n')}

The P&ID is represented as a graph with:
- Nodes: P&ID components (pumps, vessels, valves, etc.)
- Edges: Connections between components (pipes, signals)

I'll provide you with the node and edge data in CSV format:

NODE DATA (CSV format):
${nodeCSV}

EDGE DATA (CSV format):
${edgeCSV}

Your task is to:
1. Analyze each rule and convert it to a NetworkX-compatible subgraph pattern
2. For each rule, create both "compliant" and "non-compliant" patterns where appropriate
3. Use the node and edge types from the CSV data to create accurate patterns
4. Consider indirect connections (paths) where relevant
5. Explain your reasoning for each pattern

Your response must be in JSON format with the following structure:
{
  "rule_subgraphs": [
    {
      "rule_id": 1,
      "rule_text": "Original rule text",
      "subgraph_type": "compliant|non_compliant",
      "nodes": [
        {"id": "n1", "type": "Pump", "attributes": {"key": "value"}},
        {"id": "n2", "type": "Valve", "attributes": {"key": "value"}}
      ],
      "edges": [
        {"source": "n1", "target": "n2", "type": "Pipe", "attributes": {"key": "value"}}
      ],
      "explanation": "Explanation of how this pattern matches or violates the rule"
    }
  ],
  "explanation": "Overall analysis of the rules and patterns"
}

Use networkx-compatible descriptions that can be easily implemented in Python code.`;

      // Create messages array
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      
      // Log the request we're about to make
      if (DEBUG) {
        console.log("API Request:", {
          url: apiUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': '***REDACTED***'
          },
          bodyLength: JSON.stringify({
            messages: messages,
            temperature: 0,
            max_tokens: 4000,
            response_format: { type: "json_object" }
          }).length
        });
      }
      
      // Make the API call
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': window.azureAPIKey
        },
        body: JSON.stringify({
          messages: messages,
          temperature: 0, // Use deterministic output
          max_tokens: 4000, // Allow for longer responses
          response_format: { type: "json_object" } // Force JSON output
        })
      })
      .then(response => {
        if (DEBUG) {
          console.log("API Response status:", response.status);
        }
        
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`API error: ${response.status} ${response.statusText} - ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (DEBUG) {
          console.log("API Response data:", {
            choices: data.choices ? data.choices.length : 0,
            usage: data.usage
          });
        }
        
        if (data.choices && data.choices.length > 0) {
          try {
            // Parse the JSON response
            const jsonResponse = JSON.parse(data.choices[0].message.content);
            
            // Format the response for display
            let formattedContent = "## Rule to Graph Pattern Conversion\n\n";
            
            jsonResponse.rule_subgraphs.forEach((subgraph, index) => {
              formattedContent += `### Rule ${index + 1}: ${subgraph.rule_text}\n\n`;
              formattedContent += `Type: ${subgraph.subgraph_type === 'compliant' ? '✅ Compliant' : '❌ Non-Compliant'}\n\n`;
              formattedContent += `${subgraph.explanation}\n\n`;
              
              // Add simplified subgraph visualization
              formattedContent += "```\nGraph pattern:\n";
              formattedContent += `Nodes: ${subgraph.nodes.map(n => `${n.id}(${n.type})`).join(', ')}\n`;
              formattedContent += `Edges: ${subgraph.edges.map(e => `${e.source}--[${e.type}]-->${e.target}`).join(', ')}\n`;
              formattedContent += "```\n\n";
            });
            
            formattedContent += "## Overall Analysis\n\n" + jsonResponse.explanation;
            
            resolve({
              content: formattedContent,
              ruleSubgraphs: jsonResponse.rule_subgraphs
            });
          } catch (e) {
            reject(new Error(`Error parsing JSON response: ${e.message}`));
          }
        } else {
          reject(new Error("Empty response from API"));
        }
      })
      .catch(error => {
        console.error("Error calling OpenAI API:", error);
        reject(error);
      });
    });
  }
  
  // Call Rule Validator Agent API
  function callRuleValidatorAgent(agent, pidData, rules, ruleSubgraphs, nodeCSV, edgeCSV) {
    return new Promise((resolve, reject) => {
      // Log what we're about to do
      if (DEBUG) {
        console.log(`Calling Rule Validator agent with ${ruleSubgraphs.length} rule subgraphs`);
      }
      
      // Ensure the Azure OpenAI credentials are configured
      if (!window.azureAPIKey || !window.azureEndpoint) {
        reject(new Error("Azure OpenAI not configured. Please set up your credentials in the settings."));
        return;
      }
      
      // Prepare the API call
      const apiUrl = `${window.azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=${window.azureAPIVersion}`;
      
      // Construct the system prompt specifically for this agent
      let systemPrompt = `You are a ${agent.name} agent analyzing a P&ID (Piping and Instrumentation Diagram). ${agent.role}

Your task is to validate the P&ID against the rule subgraphs (patterns) created by the Rule Converter:
${rules.map((r, i) => `${i+1}. ${r}`).join('\n')}

The P&ID is represented as a graph with:
- Nodes: P&ID components (pumps, vessels, valves, etc.)
- Edges: Connections between components (pipes, signals)

I'll provide you with the node and edge data in CSV format:

NODE DATA (CSV format):
${nodeCSV}

EDGE DATA (CSV format):
${edgeCSV}

I'll also provide you with the rule subgraphs created by the Rule Converter:
${JSON.stringify(ruleSubgraphs, null, 2)}

Your task is to:
1. For each rule, validate the P&ID against the corresponding rule subgraphs
2. Check if the P&ID contains the compliant patterns and/or non-compliant patterns
3. For each match, record the relevant P&ID elements (using ItemTag where available)
4. Calculate a compliance score for each rule (0-100%)
5. Generate a comprehensive validation report

Use networkx-compatible code to validate the patterns. Consider both direct connections and indirect connections (paths) when validating.

Your response must be in JSON format with the following structure:
{
  "validation_results": [
    {
      "rule_id": 1,
      "rule_text": "Original rule text",
      "compliance_score": 75,
      "compliant_elements": ["P-101", "V-201"],
      "non_compliant_elements": ["P-102"],
      "explanation": "Detailed explanation of findings"
    }
  ],
  "summary": "Overall summary of compliance",
  "csv_data": "Rule,RuleText,ComplianceScore,CompliantElements,NonCompliantElements,Comments\\n1,Rule text,75,P-101;V-201,P-102,Comments here"
}`;

      // Create messages array
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      
      // Make the API call
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': window.azureAPIKey
        },
        body: JSON.stringify({
          messages: messages,
          temperature: 0, // Use deterministic output
          max_tokens: 4000, // Allow for longer responses
          response_format: { type: "json_object" } // Force JSON output
        })
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`API error: ${response.status} ${response.statusText} - ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.choices && data.choices.length > 0) {
          try {
            // Parse the JSON response
            const jsonResponse = JSON.parse(data.choices[0].message.content);
            
            // Format the response for display
            let formattedContent = "## P&ID Rule Validation Results\n\n";
            
            // Create a table for the validation results
            formattedContent += "| Rule | Compliance | Compliant Elements | Non-Compliant Elements |\n";
            formattedContent += "|------|------------|-------------------|----------------------|\n";
            
            jsonResponse.validation_results.forEach((result) => {
              formattedContent += `| Rule ${result.rule_id}: ${result.rule_text.substring(0, 40)}${result.rule_text.length > 40 ? '...' : ''} | ${result.compliance_score}% | ${result.compliant_elements.join(', ') || 'None'} | ${result.non_compliant_elements.join(', ') || 'None'} |\n`;
            });
            
            formattedContent += "\n\n## Detailed Findings\n\n";
            
            jsonResponse.validation_results.forEach((result) => {
              formattedContent += `### Rule ${result.rule_id}: ${result.rule_text}\n\n`;
              formattedContent += `**Compliance Score:** ${result.compliance_score}%\n\n`;
              formattedContent += `**Explanation:** ${result.explanation}\n\n`;
              
              if (result.compliant_elements.length > 0) {
                formattedContent += `**Compliant Elements:** ${result.compliant_elements.join(', ')}\n\n`;
              }
              
              if (result.non_compliant_elements.length > 0) {
                formattedContent += `**Non-Compliant Elements:** ${result.non_compliant_elements.join(', ')}\n\n`;
              }
            });
            
            formattedContent += "## Summary\n\n" + jsonResponse.summary;
            
            resolve({
              content: formattedContent,
              results: jsonResponse.validation_results,
              csvData: jsonResponse.csv_data
            });
          } catch (e) {
            reject(new Error(`Error parsing JSON response: ${e.message}`));
          }
        } else {
          reject(new Error("Empty response from API"));
        }
      })
      .catch(error => {
        console.error("Error calling OpenAI API:", error);
        reject(error);
      });
    });
  }
  
  // Call Rule Reporter Agent API
  function callRuleReporterAgent(agent, pidData, rules, validationResults) {
    return new Promise((resolve, reject) => {
      // Log what we're about to do
      if (DEBUG) {
        console.log(`Calling Rule Reporter agent with validation results`);
      }
      
      // Ensure the Azure OpenAI credentials are configured
      if (!window.azureAPIKey || !window.azureEndpoint) {
        reject(new Error("Azure OpenAI not configured. Please set up your credentials in the settings."));
        return;
      }
      
      // Prepare the API call
      const apiUrl = `${window.azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=${window.azureAPIVersion}`;
      
      // Construct the system prompt specifically for this agent
      let systemPrompt = `You are a ${agent.name} agent analyzing a P&ID (Piping and Instrumentation Diagram). ${agent.role}

Your task is to provide a comprehensive assessment report based on the validation results:
${rules.map((r, i) => `${i+1}. ${r}`).join('\n')}

Here are the validation results:
${JSON.stringify(validationResults, null, 2)}

Your task is to:
1. Summarize the overall compliance status
2. Identify critical issues that require immediate attention
3. Provide specific recommendations for improvement
4. Prioritize actions based on safety, compliance, and efficiency
5. Include references to industry standards and best practices where relevant

Your report should be concise, clear, and actionable. Focus on providing value to engineers who will use this information to improve the P&ID design.`;

      // Create messages array
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      
      // Make the API call
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': window.azureAPIKey
        },
        body: JSON.stringify({
          messages: messages,
          temperature: 0, // Use deterministic output
          max_tokens: 3000, // Allow for longer responses
          response_format: { type: "text" } // Regular text output
        })
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`API error: ${response.status} ${response.statusText} - ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.choices && data.choices.length > 0) {
          const reportContent = data.choices[0].message.content;
          resolve(reportContent);
        } else {
          reject(new Error("Empty response from API"));
        }
      })
      .catch(error => {
        console.error("Error calling OpenAI API:", error);
        reject(error);
      });
    });
  }
  
  // Extract graph properties CSV
  function extractGraphPropertiesCSV() {
    try {
      // First, look for the function in the main window
      if (typeof window.extractGraphPropertiesCSV === 'function') {
        return window.extractGraphPropertiesCSV();
      }
    
      // If not available, use our own implementation
      if (typeof xmlDoc === 'undefined') {
        console.error("xmlDoc not found. Using sample data instead.");
        return {
          nodeCSV: 'id,type,subtype,itemtag,xcoord,ycoord,sparse\n' +
                 '1,Pump,Centrifugal,P-101,100,200,sizing: 10 m3/h\n' +
                 '2,Vessel,Storage,V-301,300,150,volume: 20 m3\n' +
                 '3,HeatExchanger,Shell and Tube,HE-102,500,200,area: 25 m2\n' +
                 '4,Valve,Gate,FV-201,200,250,size: 4"',
          edgeCSV: 'id,startnode,endnode,type,flowdir,sparse\n' +
                 'e1,1,4,Pipe,Forward,size: 4"\n' +
                 'e2,4,3,Pipe,Forward,\n' +
                 'e3,3,2,Pipe,Forward,'
        };
      }
      
      // Extract nodes
      const nodes = xmlDoc.getElementsByTagName("Node");
      
      // First pass - discover all possible node attributes and prepare data
      const nodeAttributes = new Set();
      const nodeData = [];
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeDataElement = node.getElementsByTagName("Data")[0];
        
        if (nodeDataElement) {
          // Create an object to store this node's data
          const record = {};
          
          // Add standard attributes 
          record["id"] = node.getAttribute("id") || '';
          nodeAttributes.add("id");
          
          record["type"] = nodeDataElement.getAttribute("Type") || '';
          nodeAttributes.add("type");
          
          record["subtype"] = nodeDataElement.getAttribute("Subtype") || '';
          nodeAttributes.add("subtype");
          
          record["itemtag"] = nodeDataElement.getAttribute("ItemTag") || '';
          nodeAttributes.add("itemtag");
          
          record["drawingid"] = node.getAttribute("DrawingID") || '';
          nodeAttributes.add("drawingid");
          
          record["xcoord"] = node.getAttribute("cx") || '0';
          nodeAttributes.add("xcoord");
          
          record["ycoord"] = node.getAttribute("cy") || '0';
          nodeAttributes.add("ycoord");
          
          // Find all other attributes in the Data element
          const attributes = nodeDataElement.attributes;
          for (let j = 0; j < attributes.length; j++) {
            const attr = attributes[j];
            // Skip the ones we already processed
            if (!["Type", "Subtype", "ItemTag"].includes(attr.name)) {
              const name = attr.name.toLowerCase();
              record[name] = attr.value || '';
              nodeAttributes.add(name);
            }
          }
          
          // Store this node's data
          nodeData.push(record);
        }
      }
      
      // Convert nodeAttributes Set to array for easier processing
      const nodeAttributeList = Array.from(nodeAttributes);
      
      // Second pass - count non-empty values for each attribute to determine sparsity
      const attributeCounts = {};
      const nodeCount = nodeData.length;
      
      // Initialize counts
      nodeAttributeList.forEach(attr => {
        attributeCounts[attr] = 0;
      });
      
      // Count non-empty values
      nodeData.forEach(record => {
        nodeAttributeList.forEach(attr => {
          if (record[attr] && record[attr] !== '') {
            attributeCounts[attr]++;
          }
        });
      });
      
      // Determine which attributes are sparse
      const SPARSITY_THRESHOLD = 0.5;
      const regularAttributes = [];
      const sparseAttributes = [];
      
      nodeAttributeList.forEach(attr => {
        const presenceRatio = attributeCounts[attr] / nodeCount;
        if (presenceRatio < SPARSITY_THRESHOLD) {
          sparseAttributes.push(attr);
        } else {
          regularAttributes.push(attr);
        }
      });
      
      // Generate CSV for nodes
      let nodeRows = [];
      
      // Create header row (with sparse column if needed)
      const nodeHeader = [...regularAttributes];
      if (sparseAttributes.length > 0) {
        nodeHeader.push('sparse');
      }
      nodeRows.push(nodeHeader.join(','));
      
      // Create data rows
      nodeData.forEach(record => {
        const rowData = [];
        
        // Add regular attributes
        regularAttributes.forEach(attr => {
          rowData.push((record[attr] || '').replace(/,/g, ';'));
        });
        
        // Add sparse column if needed
        if (sparseAttributes.length > 0) {
          const sparseItems = [];
          sparseAttributes.forEach(attr => {
            if (record[attr] && record[attr] !== '') {
              sparseItems.push(`${attr}: ${record[attr]}`);
            }
          });
          rowData.push(sparseItems.join('; ').replace(/,/g, ';'));
        }
        
        nodeRows.push(rowData.join(','));
      });
      
      // Now do the same for edges
      const edges = xmlDoc.getElementsByTagName("Edge");
      
      // First pass - discover all possible edge attributes and prepare data
      const edgeAttributes = new Set();
      const edgeData = [];
      
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const edgeDataElement = edge.getElementsByTagName("Data")[0];
        
        if (edgeDataElement) {
          // Create an object to store this edge's data
          const record = {};
          
          // Add standard attributes
          record["id"] = edge.getAttribute("id") || '';
          edgeAttributes.add("id");
          
          record["startnode"] = edge.getAttribute("StartNode") || '';
          edgeAttributes.add("startnode");
          
          record["endnode"] = edge.getAttribute("EndNode") || '';
          edgeAttributes.add("endnode");
          
          record["type"] = edgeDataElement.getAttribute("Type") || '';
          edgeAttributes.add("type");
          
          record["flowdir"] = edge.getAttribute("FlowDir") || '';
          edgeAttributes.add("flowdir");
          
          // Find all other attributes in the Data element
          const attributes = edgeDataElement.attributes;
          for (let j = 0; j < attributes.length; j++) {
            const attr = attributes[j];
            // Skip the ones we already processed
            if (attr.name !== "Type") {
              const name = attr.name.toLowerCase();
              record[name] = attr.value || '';
              edgeAttributes.add(name);
            }
          }
          
          // Store this edge's data
          edgeData.push(record);
        }
      }
      
      // Convert edgeAttributes Set to array for easier processing
      const edgeAttributeList = Array.from(edgeAttributes);
      
      // Second pass - count non-empty values for each attribute to determine sparsity
      const edgeAttributeCounts = {};
      const edgeCount = edgeData.length;
      
      // Initialize counts
      edgeAttributeList.forEach(attr => {
        edgeAttributeCounts[attr] = 0;
      });
      
      // Count non-empty values
      edgeData.forEach(record => {
        edgeAttributeList.forEach(attr => {
          if (record[attr] && record[attr] !== '') {
            edgeAttributeCounts[attr]++;
          }
        });
      });
      
      // Determine which attributes are sparse
      const edgeRegularAttributes = [];
      const edgeSparseAttributes = [];
      
      edgeAttributeList.forEach(attr => {
        const presenceRatio = edgeAttributeCounts[attr] / edgeCount;
        if (presenceRatio < SPARSITY_THRESHOLD) {
          edgeSparseAttributes.push(attr);
        } else {
          edgeRegularAttributes.push(attr);
        }
      });
      
      // Generate CSV for edges
      let edgeRows = [];
      
      // Create header row (with sparse column if needed)
      const edgeHeader = [...edgeRegularAttributes];
      if (edgeSparseAttributes.length > 0) {
        edgeHeader.push('sparse');
      }
      edgeRows.push(edgeHeader.join(','));
      
      // Create data rows
      edgeData.forEach(record => {
        const rowData = [];
        
        // Add regular attributes
        edgeRegularAttributes.forEach(attr => {
          rowData.push((record[attr] || '').replace(/,/g, ';'));
        });
        
        // Add sparse column if needed
        if (edgeSparseAttributes.length > 0) {
          const sparseItems = [];
          edgeSparseAttributes.forEach(attr => {
            if (record[attr] && record[attr] !== '') {
              sparseItems.push(`${attr}: ${record[attr]}`);
            }
          });
          rowData.push(sparseItems.join('; ').replace(/,/g, ';'));
        }
        
        edgeRows.push(rowData.join(','));
      });
      
      return {
        nodeCSV: nodeRows.join('\n'),
        edgeCSV: edgeRows.join('\n')
      };
      
    } catch (error) {
      console.error("Error extracting graph properties:", error);
      return { 
        nodeCSV: 'id,type,subtype,itemtag,sparse\n1,Pump,Centrifugal,P-101,size: 4"\n2,Vessel,Storage,V-301,\n3,Valve,Gate,V-102,',
        edgeCSV: 'id,startnode,endnode,type,flowdir,sparse\ne1,1,3,Pipe,Forward,\ne2,3,2,Pipe,Forward,' 
      };
    }
  }
  
  // Extract P&ID data
  function extractPIDData() {
    // Extract nodes and edges
    const nodes = [];
    const edges = [];
    
    if (window.xmlDoc) {
      // Extract nodes
      const nodeElements = window.xmlDoc.getElementsByTagName("Node");
      for (let i = 0; i < nodeElements.length; i++) {
        const node = nodeElements[i];
        const nodeData = node.getElementsByTagName("Data")[0];
        
        if (nodeData) {
          nodes.push({
            id: node.getAttribute("id") || '',
            x: node.getAttribute("cx") || 0,
            y: node.getAttribute("cy") || 0,
            type: nodeData.getAttribute("Type") || '',
            subtype: nodeData.getAttribute("Subtype") || '',
            itemtag: nodeData.getAttribute("ItemTag") || ''
          });
        }
      }
      
      // Extract edges
      const edgeElements = window.xmlDoc.getElementsByTagName("Edge");
      for (let i = 0; i < edgeElements.length; i++) {
        const edge = edgeElements[i];
        const edgeData = edge.getElementsByTagName("Data")[0];
        
        edges.push({
          id: edge.getAttribute("id") || '',
          startnode: edge.getAttribute("StartNode") || '',
          endnode: edge.getAttribute("EndNode") || '',
          flowdir: edge.getAttribute("FlowDir") || '',
          type: edgeData ? edgeData.getAttribute("Type") || '' : ''
        });
      }
    } else {
      // No xmlDoc, add some sample data
      if (DEBUG) {
        console.log("No xmlDoc found, using sample data");
      }
      
      // Sample nodes
      nodes.push(
        { id: '1', type: 'Pump', subtype: 'Centrifugal', itemtag: 'P-101' },
        { id: '2', type: 'Vessel', subtype: 'Storage', itemtag: 'V-301' },
        { id: '3', type: 'HeatExchanger', subtype: 'Shell and Tube', itemtag: 'HE-102' },
        { id: '4', type: 'Valve', subtype: 'Gate', itemtag: 'FV-201' }
      );
      
      // Sample edges
      edges.push(
        { id: 'e1', startnode: '1', endnode: '4', type: 'Pipe', flowdir: 'Forward' },
        { id: 'e2', startnode: '4', endnode: '3', type: 'Pipe', flowdir: 'Forward' },
        { id: 'e3', startnode: '3', endnode: '2', type: 'Pipe', flowdir: 'Forward' }
      );
    }
    
    return {
      nodes,
      edges
    };
  }
  
  // Add agent message to UI
  function addAgentMessage(options) {
    const container = skillConfig.state.ui.conversationContainer;
    
    // Remove placeholder if present
    if (container.querySelector('.pid-skill-placeholder')) {
      container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `pid-agent-message pid-agent-message-${options.role}`;
    
    // Create header with agent name and color
    const headerDiv = document.createElement('div');
    headerDiv.className = 'agent-header';
    
    // Add color indicator
    const colorDiv = document.createElement('div');
    colorDiv.className = 'agent-color';
    colorDiv.style.backgroundColor = options.color;
    headerDiv.appendChild(colorDiv);
    
    // Add agent name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'agent-name';
    nameDiv.textContent = options.name;
    headerDiv.appendChild(nameDiv);
    
    messageDiv.appendChild(headerDiv);
    
    // Add content with markdown formatting
    const contentDiv = document.createElement('div');
    contentDiv.className = 'agent-content';
    
    // Convert markdown sections
    const formattedContent = options.content
      .replace(/^#{3}\s+(.*?)$/gm, '<h3>$1</h3>')
      .replace(/^#{2}\s+(.*?)$/gm, '<h2>$1</h2>')
      .replace(/^#{1}\s+(.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([^`]+)```/g, '<div class="pid-agent-code">$1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\| *([^|]*) *\| *([^|]*) *\| *([^|]*) *\| *([^|]*) *\|/g, 
               '<table class="pid-result-table"><tr><td>$1</td><td>$2</td><td>$3</td><td>$4</td></tr></table>')
      .replace(/<\/table><table class="pid-result-table">/g, '');
    
    contentDiv.innerHTML = formattedContent;
    messageDiv.appendChild(contentDiv);
    
    container.appendChild(messageDiv);
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }
  
  // Add agent thinking animation
  function addAgentThinking(agent) {
    const container = skillConfig.state.ui.conversationContainer;
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'pid-agent-thinking';
    thinkingDiv.className = `pid-agent-message pid-agent-message-${agent.id}`;
    
    // Create header with agent name and color
    const headerDiv = document.createElement('div');
    headerDiv.className = 'agent-header';
    
    // Add color indicator
    const colorDiv = document.createElement('div');
    colorDiv.className = 'agent-color';
    colorDiv.style.backgroundColor = agent.color;
    headerDiv.appendChild(colorDiv);
    
    // Add agent name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'agent-name';
    nameDiv.textContent = agent.name;
    headerDiv.appendChild(nameDiv);
    
    thinkingDiv.appendChild(headerDiv);
    
    // Add thinking animation
    const thinkingAnimation = document.createElement('div');
    thinkingAnimation.className = 'pid-agent-thinking-animation';
    thinkingAnimation.innerHTML = '<div></div><div></div><div></div><div></div>';
    
    const thinkingText = document.createElement('div');
    thinkingText.className = 'agent-thinking';
    thinkingText.appendChild(thinkingAnimation);
    thinkingText.appendChild(document.createTextNode(' Analyzing...'));
    
    thinkingDiv.appendChild(thinkingText);
    
    container.appendChild(thinkingDiv);
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }
  
  // Remove agent thinking animation
  function removeAgentThinking() {
    const thinkingDiv = document.getElementById('pid-agent-thinking');
    if (thinkingDiv) {
      thinkingDiv.remove();
    }
  }
  
  // Export results to CSV
  function exportAgenticResults() {
    const state = skillConfig.state;
    
    // Check if we have results
    if (!state.results || state.results.length === 0) {
      addUIMessage("No validation results available to export.", false);
      return;
    }
    
    // Create CSV content
    let csv = 'Rule,RuleText,ComplianceScore,CompliantElements,NonCompliantElements,Comments\n';
    
    // Add rows
    state.results.forEach(result => {
      // Escape fields that might contain commas
      const escapedText = `"${(result.rule_text || '').replace(/"/g, '""')}"`;
      const escapedCompliant = `"${(result.compliant_elements || []).join('; ').replace(/"/g, '""')}"`;
      const escapedNonCompliant = `"${(result.non_compliant_elements || []).join('; ').replace(/"/g, '""')}"`;
      const escapedExplanation = `"${(result.explanation || '').replace(/"/g, '""')}"`;
      
      csv += `${result.rule_id},${escapedText},${result.compliance_score},${escapedCompliant},${escapedNonCompliant},${escapedExplanation}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'pid_rule_validation_results.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addUIMessage("Validation results exported to CSV.", false);
  }
  
  // Highlight non-compliant elements in the P&ID
  function highlightNonCompliantElements(results) {
    // Collect all non-compliant elements
    const nonCompliantElements = [];
    
    results.forEach(result => {
      if (result.non_compliant_elements && result.non_compliant_elements.length > 0) {
        // For each non-compliant element, find the corresponding node ID
        result.non_compliant_elements.forEach(elementTag => {
          // Find the node with this item tag
          const nodeId = findNodeIdByItemTag(elementTag);
          if (nodeId) {
            nonCompliantElements.push(nodeId);
          }
        });
      }
    });
    
    // Highlight the elements if any were found
    if (nonCompliantElements.length > 0) {
      if (typeof window.highlightElements === 'function') {
        if (DEBUG) {
          console.log("Highlighting non-compliant elements:", nonCompliantElements);
        }
        window.highlightElements(nonCompliantElements);
        
        // Add message to chat
        addUIMessage(`Highlighted ${nonCompliantElements.length} non-compliant elements in the P&ID.`, false);
      } else {
        console.warn("highlightElements function not found");
      }
    }
  }
  
  // Find node ID by item tag
  function findNodeIdByItemTag(itemTag) {
    if (!window.xmlDoc) {
      return null;
    }
    
    // Try to find a node with this item tag
    const nodes = window.xmlDoc.getElementsByTagName("Node");
    for (let i = 0; i < nodes.length; i++) {
      const nodeData = nodes[i].getElementsByTagName("Data")[0];
      if (nodeData && nodeData.getAttribute("ItemTag") === itemTag) {
        return nodes[i].getAttribute("id");
      }
    }
    
    // Try partial matching if exact match fails
    for (let i = 0; i < nodes.length; i++) {
      const nodeData = nodes[i].getElementsByTagName("Data")[0];
      if (nodeData) {
        const nodeItemTag = nodeData.getAttribute("ItemTag");
        if (nodeItemTag && (nodeItemTag.includes(itemTag) || itemTag.includes(nodeItemTag))) {
          return nodes[i].getAttribute("id");
        }
      }
    }
    
    return null;
  }
  
  // Helper function to add messages to chat
  function addUIMessage(text, isUser) {
    if (typeof window.addUIMessage === 'function') {
      window.addUIMessage(text, isUser);
    } else {
      console.log(`[${isUser ? 'User' : 'Assistant'}] ${text}`);
    }
  }
  
  // Register the skill when the script loads
  window.addEventListener('load', function() {
    // Wait for the skill manager to initialize
    const checkSkillManager = setInterval(function() {
      if (window.skillManager) {
        clearInterval(checkSkillManager);
        window.skillManager.registerSkill(skillConfig);
        console.log("P&ID Rule-Based Analysis skill registered successfully");
      }
    }, 500);
  });
  
})();