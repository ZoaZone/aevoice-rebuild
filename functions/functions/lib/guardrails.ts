// functions/lib/guardrails.js
// AEVOICE Guardrails - Content safety and escalation detection

// Default restricted topics (can be overridden per agent)
const DEFAULT_RESTRICTED_TOPICS = [
  "legal advice",
  "medical diagnosis",
  "self-harm",
  "suicide",
  "violence",
  "illegal activities",
];

// Default escalation keywords
const DEFAULT_ESCALATION_KEYWORDS = [
  "speak to human",
  "talk to person",
  "real person",
  "manager",
  "supervisor",
  "complaint",
  "sue",
  "lawyer",
  "cancel my account",
  "refund",
];

/**
 * Check if user input contains restricted topics
 * @param {string} input - User input text
 * @param {string[]} customRestricted - Optional custom restricted topics
 * @returns {{ blocked: boolean, reason: string | null }}
 */
export function checkRestrictedTopics(input, customRestricted = []) {
  if (!input) return { blocked: false, reason: null };

  const restricted = [...DEFAULT_RESTRICTED_TOPICS, ...customRestricted];
  const inputLower = input.toLowerCase();

  for (const topic of restricted) {
    if (inputLower.includes(topic.toLowerCase())) {
      return {
        blocked: true,
        reason: `restricted_topic:${topic}`,
      };
    }
  }

  return { blocked: false, reason: null };
}

/**
 * Check if user input triggers escalation
 * @param {string} input - User input text
 * @param {string[]} customKeywords - Optional custom escalation keywords
 * @returns {{ escalate: boolean, keyword: string | null }}
 */
export function checkEscalation(input, customKeywords = []) {
  if (!input) return { escalate: false, keyword: null };

  const keywords = [...DEFAULT_ESCALATION_KEYWORDS, ...customKeywords];
  const inputLower = input.toLowerCase();

  for (const keyword of keywords) {
    if (inputLower.includes(keyword.toLowerCase())) {
      return {
        escalate: true,
        keyword,
      };
    }
  }

  return { escalate: false, keyword: null };
}

/**
 * Sanitize LLM output for safety
 * @param {string} output - LLM response text
 * @returns {string} Sanitized output
 */
export function sanitizeOutput(output) {
  if (!output) return "";

  // Remove potential PII patterns (basic)
  let sanitized = output;

  // Mask SSN-like patterns
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED]");

  // Mask credit card-like patterns
  sanitized = sanitized.replace(
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    "[REDACTED]",
  );

  return sanitized;
}

/**
 * Get safe fallback response for restricted content
 * @param {string} reason - Reason for blocking
 * @returns {string} Safe fallback response
 */
export function getSafeResponse(reason) {
  if (reason?.startsWith("restricted_topic:")) {
    return "I'm not able to help with that topic. Is there something else I can assist you with?";
  }
  return "I'm sorry, I can't help with that request. Please let me know if there's something else I can do for you.";
}

/**
 * Get escalation response
 * @returns {string} Escalation message
 */
export function getEscalationResponse() {
  return "I understand you'd like to speak with someone directly. Let me transfer you to a team member who can better assist you. Please hold for a moment.";
}

export default {
  checkRestrictedTopics,
  checkEscalation,
  sanitizeOutput,
  getSafeResponse,
  getEscalationResponse,
};
