/*
 * conversation-manager.js
 * 
 * Manages conversation history, token counting, and question limiting
 * for the P&ID Chat interface.
 */

// Conversation management configuration
const MAX_QUESTIONS = 5;
const MAX_MESSAGES = 10;
const MAX_TOKENS = 128000;
const MAX_RESPONSE_TOKENS = 4096;
const PROMPT_MAX_TOKENS = MAX_TOKENS - MAX_RESPONSE_TOKENS;

// Conversation state
let messages = [];
let questionCount = 0;

// Initialize the conversation manager
function initConversationManager() {
  // Reset state
  messages = [];
  questionCount = 0;
  
  console.log("Conversation manager initialized");
  console.log(`Max questions: ${MAX_QUESTIONS}`);
  console.log(`Max messages: ${MAX_MESSAGES}`);
  console.log(`Max tokens: ${PROMPT_MAX_TOKENS} (prompt) + ${MAX_RESPONSE_TOKENS} (response)`);
  
  // Add a system message if needed
  // messages.push({ role: "system", content: "Initial system message" });
}

// Add a message to the conversation history
function addMessage(role, content) {
  // Check if content is a JSON string (for image messages)
  if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
    try {
      // Try to parse as JSON
      const parsedContent = JSON.parse(content);
      
      // If it has image content format it properly
      if (parsedContent && parsedContent.content && Array.isArray(parsedContent.content)) {
        // It's a multimodal message with image, add it directly
        messages.push({ role, content: parsedContent.content });
      } else {
        // It's a regular JSON message (like AI responses in JSON format)
        messages.push({ role, content });
      }
    } catch (e) {
      // If parsing fails, treat as regular text
      messages.push({ role, content });
    }
  } else {
    // Add the new message as regular text
    messages.push({ role, content });
  }
  
  // Increment question count if user message
  if (role === "user") {
    questionCount++;
  }
  
  // Enforce max message limit
  while (messages.length > MAX_MESSAGES) {
    messages.shift();
  }
  
  // Count tokens and enforce token limit
  let tokenCount = numTokensFromMessages(messages);
  while (tokenCount > PROMPT_MAX_TOKENS && messages.length > 1) {
    // Remove oldest message
    messages.shift();
    // Recalculate token count
    tokenCount = numTokensFromMessages(messages);
  }
  
  return {
    questionCount,
    messageCount: messages.length,
    tokenCount
  };
}

// Check if question limit reached
function hasReachedQuestionLimit() {
  return questionCount >= MAX_QUESTIONS;
}

// Count tokens in messages (approximation)
function numTokensFromMessages(messages) {
  // A rough approximation: ~4 characters per token for English
  // Plus extra tokens for message formatting
  const TOKENS_PER_MESSAGE = 4;
  const CHARS_PER_TOKEN = 4;
  const IMAGE_TOKENS = 250; // Approximate tokens for an image
  
  let totalTokens = 0;
  
  messages.forEach(message => {
    if (typeof message.content === 'string') {
      // Text content
      const contentTokens = Math.ceil(message.content.length / CHARS_PER_TOKEN);
      const roleTokens = Math.ceil(message.role.length / CHARS_PER_TOKEN);
      totalTokens += TOKENS_PER_MESSAGE + contentTokens + roleTokens;
    } else if (Array.isArray(message.content)) {
      // Handle multimodal content (text + images)
      let messageTokens = TOKENS_PER_MESSAGE;
      
      // Add tokens for each content item
      message.content.forEach(item => {
        if (item.type === 'text') {
          messageTokens += Math.ceil((item.text || '').length / CHARS_PER_TOKEN);
        } else if (item.type === 'image_url') {
          messageTokens += IMAGE_TOKENS;
        }
      });
      
      totalTokens += messageTokens;
    }
  });
  
  return totalTokens;
}

// Reset the conversation
function resetConversation() {
  messages = [];
  questionCount = 0;
  return { questionCount, messageCount: messages.length };
}

// Get current conversation state
function getConversationState() {
  return {
    messages: [...messages], // Return a copy, not the original
    questionCount,
    messageCount: messages.length,
    tokenCount: numTokensFromMessages(messages),
    remainingQuestions: MAX_QUESTIONS - questionCount,
    hasReachedLimit: questionCount >= MAX_QUESTIONS
  };
}

// Get messages for API call
function getMessagesForAPI() {
  return [...messages]; // Return a copy, not the original
}

// Export the conversation manager
window.conversationManager = {
  init: initConversationManager,
  addMessage,
  resetConversation,
  hasReachedQuestionLimit,
  getConversationState,
  getMessagesForAPI,
  MAX_QUESTIONS,
  MAX_MESSAGES,
  MAX_TOKENS,
  MAX_RESPONSE_TOKENS,
  PROMPT_MAX_TOKENS
};
