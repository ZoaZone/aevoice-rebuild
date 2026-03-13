/**
 * Sree NLU Engine — Advanced Natural Language Understanding
 * Handles intent recognition, entity extraction, sentiment,
 * and multi-turn conversation state.
 */

// ─── Intent taxonomy ───────────────────────────────────────────────────────
const INTENTS = [
  { id: "query_knowledge",   patterns: [/tell me|what is|explain|describe|how does/i], entities: ["topic"] },
  { id: "create_agent",      patterns: [/create|make|build|new agent/i], entities: ["agent_name","type"] },
  { id: "check_status",      patterns: [/status|health|check|monitor|running/i], entities: ["service"] },
  { id: "navigate",          patterns: [/go to|open|navigate|show me|take me/i], entities: ["page"] },
  { id: "fix_error",         patterns: [/fix|repair|broken|error|issue|fail/i], entities: [] },
  { id: "schedule",          patterns: [/schedule|book|appointment|remind/i], entities: ["datetime","person"] },
  { id: "analytics",         patterns: [/analytics|report|stats|metrics|calls|usage/i], entities: ["period"] },
  { id: "configure",         patterns: [/config|setting|set up|setup|change|update/i], entities: ["item"] },
  { id: "help",              patterns: [/help|how to|guide|tutorial|what can/i], entities: [] },
  { id: "greeting",          patterns: [/^(hi|hello|hey|good morning|good afternoon|howdy)/i], entities: [] },
  { id: "farewell",          patterns: [/bye|goodbye|see you|thanks|thank you/i], entities: [] },
];

const PAGE_MAP = {
  dashboard: "Dashboard", agents: "Agents", "knowledge base": "Knowledge",
  knowledge: "Knowledge", "phone numbers": "PhoneNumbers", analytics: "Analytics",
  billing: "Billing", settings: "Settings", crm: "CRM", "call history": "CallHistory",
  workflows: "AIWorkflowBuilder", channels: "Channels",
};

// ─── Sentiment (simple lexicon) ─────────────────────────────────────────────
const POS = ["great","awesome","love","perfect","excellent","good","thanks","helpful"];
const NEG = ["bad","terrible","broken","wrong","hate","problem","issue","fail","error","slow"];

function detectSentiment(text) {
  const t = text.toLowerCase();
  const pos = POS.filter(w => t.includes(w)).length;
  const neg = NEG.filter(w => t.includes(w)).length;
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  return "neutral";
}

// ─── Entity extractor ────────────────────────────────────────────────────────
function extractEntities(text, entityTypes) {
  const entities = {};
  if (entityTypes.includes("page")) {
    for (const [k, v] of Object.entries(PAGE_MAP)) {
      if (text.toLowerCase().includes(k)) { entities.page = v; break; }
    }
  }
  if (entityTypes.includes("datetime")) {
    const m = text.match(/\b(\d{1,2}[:\-]\d{2}|\d{1,2}(am|pm)?|today|tomorrow|monday|tuesday|wednesday|thursday|friday)\b/i);
    if (m) entities.datetime = m[0];
  }
  if (entityTypes.includes("topic")) {
    const m = text.match(/(?:about|regarding|on|for)\s+([a-z\s]{3,30})/i);
    if (m) entities.topic = m[1].trim();
  }
  if (entityTypes.includes("agent_name")) {
    const m = text.match(/(?:named?|called?)\s+['"]?([a-z\s]{2,30})['"]?/i);
    if (m) entities.agent_name = m[1].trim();
  }
  return entities;
}

// ─── Main NLU function ───────────────────────────────────────────────────────
export function analyzeIntent(text, conversationHistory = []) {
  if (!text?.trim()) return { intent: "unknown", confidence: 0, entities: {}, sentiment: "neutral" };

  let topIntent = null;
  let topScore = 0;

  for (const intent of INTENTS) {
    for (const pat of intent.patterns) {
      if (pat.test(text)) {
        const score = 1.0;
        if (score > topScore) { topScore = score; topIntent = intent; }
        break;
      }
    }
  }

  // Context boost from recent history
  if (conversationHistory.length > 0 && topIntent) {
    const lastIntent = conversationHistory[conversationHistory.length - 1]?.intent;
    if (lastIntent === topIntent.id) topScore = Math.min(topScore + 0.15, 1.0);
  }

  const entities = topIntent ? extractEntities(text, topIntent.entities) : {};
  const sentiment = detectSentiment(text);

  return {
    intent: topIntent?.id || "unknown",
    confidence: topScore,
    entities,
    sentiment,
    raw: text,
  };
}

// ─── Conversation State Manager ──────────────────────────────────────────────
class ConversationStateManager {
  constructor() {
    this._states = new Map(); // sessionId → state
  }

  getState(sessionId = "default") {
    if (!this._states.has(sessionId)) {
      this._states.set(sessionId, {
        sessionId,
        history: [],           // { role, content, intent, ts }
        currentTopic: null,
        pendingSlots: {},       // slots awaiting fill
        turnCount: 0,
        lastActivity: Date.now(),
        contextWindow: [],      // last 6 turns for LLM
        flags: {},
      });
    }
    return this._states.get(sessionId);
  }

  addTurn(sessionId, role, content, nlu = {}) {
    const state = this.getState(sessionId);
    const turn = { role, content, intent: nlu.intent, entities: nlu.entities, sentiment: nlu.sentiment, ts: Date.now() };
    state.history.push(turn);
    state.contextWindow = state.history.slice(-6);
    state.turnCount++;
    state.lastActivity = Date.now();
    if (nlu.intent && nlu.intent !== "unknown") state.currentTopic = nlu.intent;
    // Merge entities into pending slots
    Object.assign(state.pendingSlots, nlu.entities || {});
    return state;
  }

  buildContextString(sessionId) {
    const state = this.getState(sessionId);
    return state.contextWindow
      .map(t => `${t.role === "user" ? "User" : "Sree"}: ${t.content}`)
      .join("\n");
  }

  clearSession(sessionId = "default") {
    this._states.delete(sessionId);
  }
}

export const conversationState = new ConversationStateManager();