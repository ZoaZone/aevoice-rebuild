// functions/conversationOrchestrator.js
// Production-ready orchestrator with:
// - Low latency (<2s target)
// - Session state tracking (turn count, context)
// - Semantic KB retrieval with embeddings
// - Response variation to avoid repetition
// - Guardrails and escalation detection
// - Comprehensive fallbacks
// - Analytics recording
// - Language detection for multilingual support

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { detectLanguage } from "./lib/detectLanguage.ts";
import { LatencyTracker, saveLatencyMetrics } from "./lib/infra/latencyTracker.ts";
import { globalCache } from "./lib/infra/responseCache.ts";
import type { Base44Client } from "./lib/types/index.ts";

// ==================== LATENCY BUDGETS ====================
// Strict latency control for production reliability

const LATENCY_BUDGET = {
  PHONE: {
    TOTAL: 2000, // Hard limit for phone calls
    KB_RETRIEVAL: 500, // Knowledge base must be fast
    EMBEDDING_GEN: 300, // Per embedding generation
    LLM_CALL: 1200, // AI response with tight timeout
    DB_QUERY: 200, // Database operations
  },
  WEB: {
    TOTAL: 5000, // Relaxed for web chat
    KB_RETRIEVAL: 2000,
    EMBEDDING_GEN: 800,
    LLM_CALL: 3000,
    DB_QUERY: 500,
  },
  SYSTEM: {
    TOTAL: 10000, // Internal/background operations
    KB_RETRIEVAL: 5000,
    EMBEDDING_GEN: 2000,
    LLM_CALL: 5000,
    DB_QUERY: 1000,
  },
};

/**
 * Latency guard wrapper with mode-aware timeouts
 * Enforces strict time budgets and provides graceful fallbacks
 */
async function latencyGuard<T>(
  operation: () => Promise<T>,
  config: {
    name: string;
    timeout: number;
    mode: "phone" | "web" | "system";
    fallback?: () => T | null;
    critical?: boolean; // If true, throw on timeout; if false, return fallback
  },
): Promise<T | null> {
  const startTime = Date.now();

  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`TIMEOUT: ${config.name} exceeded ${config.timeout}ms`),
            ),
          config.timeout,
        )
      ),
    ]);

    const elapsed = Date.now() - startTime;
    if (elapsed > config.timeout * 0.8) {
      console.warn(`[latencyGuard] ${config.name} near timeout`, {
        mode: config.mode,
        elapsed_ms: elapsed,
        budget_ms: config.timeout,
        utilization: (elapsed / config.timeout * 100).toFixed(1) + "%",
      });
    }

    return result;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[latencyGuard] ${config.name} failed`, {
      mode: config.mode,
      error: String(err),
      elapsed_ms: elapsed,
      budget_ms: config.timeout,
    });

    // Critical operations throw, non-critical use fallback
    if (config.critical) {
      throw err;
    }

    return config.fallback ? config.fallback() : null;
  }
}

// ==================== PRODUCTION-READY CACHING SYSTEM ====================
// Multi-tenant safe caching with proper isolation, versioning, and safety controls

interface CacheEntry<T> {
  data: T;
  ts: number;
  ttl: number;
  metadata?: {
    client_id?: string;
    language?: string;
    version?: string;
    classification?: string;
  };
}

// TYPE SAFETY FIX: Import concrete types to replace `any` in cache entries
import type { Agent, KnowledgeChunk } from "./lib/types/index.ts";
// TYPE SAFETY FIX (Phase 2A #12-13): Import OpenAI response types
import type { OpenAIEmbeddingResponse } from "./lib/types/index.ts";
// TYPE SAFETY FIX (Phase 2B #10-15): Import session and conversation types
import type {
  ConversationMessage,
  ConversationSession,
  Guardrails,
  LLMConfig,
  LLMResult,
} from "./lib/types/index.ts";

// TYPE SAFETY FIX #1-2: Replace `CacheEntry<any>` with concrete types
// - agentCache now typed as CacheEntry<Agent> for agent data
// - kbChunkCache now typed as CacheEntry<KnowledgeChunk[]> for knowledge chunks
const agentCache = new Map<string, CacheEntry<Agent>>();
const kbChunkCache = new Map<string, CacheEntry<KnowledgeChunk[]>>();
const responseCache = new Map<string, CacheEntry<string>>();

// TTL configurations (in milliseconds)
const CACHE_TTL = {
  AGENT: 300000, // 5 minutes - agents change infrequently
  KB_CHUNKS: 600000, // 10 minutes - content updates are rare
  RESPONSE_SAFE: 60000, // 1 minute - balance freshness with performance
  RESPONSE_RESTRICTED: 0, // Never cache safety-critical responses
};

/**
 * Build a secure, multi-tenant cache key
 * Prevents cross-tenant leakage and ensures proper isolation
 */
function buildCacheKey(components: {
  type: "agent" | "kb" | "response";
  client_id?: string;
  agent_id?: string;
  kb_ids?: string[];
  query?: string;
  language?: string;
  mode?: string;
  version?: string;
}): string {
  const parts: string[] = [components.type];

  // Always include tenant isolation for response caches
  if (components.type === "response" && components.client_id) {
    parts.push(`client:${components.client_id}`);
  }

  // Agent-specific key
  if (components.agent_id) {
    parts.push(`agent:${components.agent_id}`);
  }

  // KB-specific key with versioning
  if (components.kb_ids?.length) {
    const kbKey = components.kb_ids.sort().join(",");
    parts.push(`kb:${kbKey}`);
    if (components.version) {
      parts.push(`v:${components.version}`);
    }
  }

  // Query normalization (lowercase, trim, remove extra spaces)
  if (components.query) {
    const normalized = components.query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .substring(0, 100); // Limit length
    parts.push(`q:${normalized}`);
  }

  // Language awareness (critical for multilingual responses)
  if (components.language) {
    parts.push(`lang:${components.language}`);
  }

  // Mode awareness (phone vs web)
  if (components.mode) {
    parts.push(`mode:${components.mode}`);
  }

  return parts.join("|");
}

/**
 * Get cached data with TTL and metadata validation
 */
function getCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  options?: {
    validate?: (entry: CacheEntry<T>) => boolean;
  },
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check TTL
  const age = Date.now() - entry.ts;
  if (age >= entry.ttl) {
    cache.delete(key);
    return null;
  }

  // Optional validation (e.g., check client_id match)
  if (options?.validate && !options.validate(entry)) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cached data with TTL and metadata
 */
function setCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  ttl: number,
  metadata?: CacheEntry<T>["metadata"],
): void {
  cache.set(key, {
    data,
    ts: Date.now(),
    ttl,
    metadata,
  });

  // Prevent memory leaks: limit cache size per type
  const MAX_CACHE_SIZE = 1000;
  if (cache.size > MAX_CACHE_SIZE) {
    // Delete oldest entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // Remove oldest 20%
    toDelete.forEach(([k]) => cache.delete(k));
  }
}

/**
 * Invalidate cache entries by pattern
 */
function invalidateCache(
  cache: Map<string, CacheEntry<any>>,
  pattern: {
    client_id?: string;
    agent_id?: string;
    kb_ids?: string[];
  },
): number {
  let deleted = 0;
  const entries = Array.from(cache.entries());

  for (const [key, entry] of entries) {
    let shouldDelete = false;

    // Check client_id match
    if (pattern.client_id && entry.metadata?.client_id === pattern.client_id) {
      shouldDelete = true;
    }

    // Check agent_id in key
    if (pattern.agent_id && key.includes(`agent:${pattern.agent_id}`)) {
      shouldDelete = true;
    }

    // Check kb_ids in key
    if (pattern.kb_ids?.length) {
      const kbPattern = pattern.kb_ids.sort().join(",");
      if (key.includes(`kb:${kbPattern}`)) {
        shouldDelete = true;
      }
    }

    if (shouldDelete) {
      cache.delete(key);
      deleted++;
    }
  }

  return deleted;
}

// ==================== RESPONSE VARIATIONS ====================
const GREETING_VARIATIONS = [
  "Hello! Welcome to Hello Biz. How can I help you today?",
  "Hi there! Thanks for calling Hello Biz. What can I assist you with?",
  "Good day! You've reached Hello Biz. How may I help?",
];

const FOLLOWUP_VARIATIONS = [
  "Is there anything else I can help you with?",
  "What else can I assist you with today?",
  "Feel free to ask another question.",
  "I'm here if you need anything else.",
  "Do you have any other questions?",
];

const FALLBACK_VARIATIONS = [
  "I didn't quite catch that. Could you please repeat your question?",
  "Sorry, I missed that. Can you say it again?",
  "I'm having trouble understanding. Could you rephrase that?",
];

// ==================== CENTRALIZED SAFETY & ESCALATION CLASSIFIER ====================

// Default guardrails configuration
const DEFAULT_RESTRICTED_TOPICS = [
  { pattern: "legal advice", severity: "high" },
  { pattern: "medical diagnosis", severity: "high" },
  { pattern: "self-harm", severity: "critical" },
  { pattern: "suicide", severity: "critical" },
  { pattern: "financial advice", severity: "medium" },
  { pattern: "invest money", severity: "medium" },
];

const DEFAULT_ESCALATION_KEYWORDS = [
  { pattern: "speak to human", urgency: "force" },
  { pattern: "talk to person", urgency: "force" },
  { pattern: "real person", urgency: "force" },
  { pattern: "transfer me", urgency: "force" },
  { pattern: "manager", urgency: "suggest" },
  { pattern: "supervisor", urgency: "suggest" },
  { pattern: "complaint", urgency: "suggest" },
  { pattern: "refund", urgency: "suggest" },
  { pattern: "cancel", urgency: "suggest" },
  { pattern: "unsubscribe", urgency: "suggest" },
];

const FRUSTRATION_INDICATORS = [
  "this is ridiculous",
  "not helpful",
  "waste of time",
  "useless",
  "terrible service",
];

interface SafetyClassification {
  safety: "safe" | "restricted" | "unknown";
  escalation: "none" | "suggest" | "force";
  reason: string;
  confidence: number;
  metadata?: {
    matched_pattern?: string;
    severity?: string;
    urgency?: string;
    frustration_detected?: boolean;
  };
}

/**
 * Centralized classifier for safety and escalation decisions
 * Analyzes user input and conversation context to determine:
 * - Safety status (restricted topics)
 * - Escalation level (none, suggest, force)
 * - Confidence score and reasoning
 */
function classifySafetyAndEscalation(
  userInput: string,
  conversationContext: Array<{ role: string; content: string }>,
  guardrails: Record<string, unknown> = {},
  turn: number,
): SafetyClassification {
  // Default safe response
  if (!userInput) {
    return {
      safety: "safe",
      escalation: "none",
      reason: "No input provided",
      confidence: 1.0,
    };
  }

  const inputLower = userInput.toLowerCase();
  const contextText = conversationContext
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  // ========== STEP 1: CHECK RESTRICTED TOPICS (HIGHEST PRIORITY) ==========
  const restrictedTopics = [
    ...DEFAULT_RESTRICTED_TOPICS,
    ...(guardrails.restricted_topics || []).map((t: string) => ({
      pattern: t,
      severity: "medium",
    })),
  ];

  for (const topic of restrictedTopics) {
    const pattern = topic.pattern.toLowerCase();
    if (inputLower.includes(pattern)) {
      return {
        safety: "restricted",
        escalation: topic.severity === "critical" ? "force" : "none",
        reason: `Restricted topic detected: ${topic.pattern}`,
        confidence: 0.95,
        metadata: {
          matched_pattern: topic.pattern,
          severity: topic.severity,
        },
      };
    }
  }

  // ========== STEP 2: CHECK ESCALATION KEYWORDS ==========
  const escalationKeywords = [
    ...DEFAULT_ESCALATION_KEYWORDS,
    ...(guardrails.escalation_keywords || []).map((k: string) => ({
      pattern: k,
      urgency: "suggest",
    })),
  ];

  let highestUrgency: "none" | "suggest" | "force" = "none";
  let matchedKeyword = "";

  for (const keyword of escalationKeywords) {
    const pattern = keyword.pattern.toLowerCase();
    if (inputLower.includes(pattern)) {
      if (keyword.urgency === "force" || highestUrgency === "none") {
        highestUrgency = keyword.urgency;
        matchedKeyword = keyword.pattern;
      }
    }
  }

  if (highestUrgency !== "none") {
    return {
      safety: "safe",
      escalation: highestUrgency,
      reason: `Escalation keyword detected: ${matchedKeyword}`,
      confidence: 0.9,
      metadata: {
        matched_pattern: matchedKeyword,
        urgency: highestUrgency,
      },
    };
  }

  // ========== STEP 3: DETECT FRUSTRATION PATTERNS ==========
  let frustrationScore = 0;
  for (const indicator of FRUSTRATION_INDICATORS) {
    if (inputLower.includes(indicator)) {
      frustrationScore++;
    }
  }

  // Check for repeated questions (user asking same thing multiple times)
  if (turn >= 3 && conversationContext.length >= 4) {
    const recentUserMessages = conversationContext
      .filter((m) => m.role === "user")
      .slice(-3);
    const similarity = checkSimilarity(
      recentUserMessages.map((m) => m.content),
    );
    if (similarity > 0.7) {
      frustrationScore += 2; // User is repeating themselves
    }
  }

  // Suggest escalation if frustration detected
  if (frustrationScore >= 2) {
    return {
      safety: "safe",
      escalation: "suggest",
      reason: "High frustration detected in conversation",
      confidence: 0.75,
      metadata: {
        frustration_detected: true,
      },
    };
  }

  // ========== STEP 4: UNKNOWN INPUT DETECTION ==========
  // If input is very short or unclear, mark as unknown
  if (userInput.trim().length < 5) {
    return {
      safety: "unknown",
      escalation: "none",
      reason: "Input too short to classify",
      confidence: 0.5,
    };
  }

  // ========== DEFAULT: SAFE TO PROCEED ==========
  return {
    safety: "safe",
    escalation: "none",
    reason: "No safety or escalation concerns detected",
    confidence: 1.0,
  };
}

/**
 * Helper: Check similarity between messages (simple word overlap)
 */
function checkSimilarity(messages: string[]): number {
  if (messages.length < 2) return 0;

  const getWords = (text: string) => text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  const words1 = new Set(getWords(messages[0]));
  const words2 = new Set(getWords(messages[messages.length - 1]));

  const intersection = new Set(
    [...words1].filter((w) => words2.has(w)),
  );
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Build response for restricted topics
 */
function buildRestrictedTopicResponse(
  classification: SafetyClassification,
  agentName: string,
): string {
  const severity = classification.metadata?.severity;

  if (severity === "critical") {
    return "I'm not able to discuss that topic. If you're in crisis, please contact emergency services or a crisis helpline immediately. Is there something else I can help you with today?";
  }

  if (severity === "high") {
    return `I'm not qualified to provide ${classification.metadata?.matched_pattern}. For that, I recommend consulting with a licensed professional. Is there another way I can assist you?`;
  }

  // Medium severity
  return "I'm not able to help with that particular topic. Is there something else I can assist you with regarding our services?";
}

/**
 * Build response for escalations
 */
function buildEscalationResponse(
  classification: SafetyClassification,
  agentName: string,
): { text: string; shouldTransfer: boolean } {
  const urgency = classification.metadata?.urgency;
  const frustration = classification.metadata?.frustration_detected;

  if (urgency === "force") {
    return {
      text:
        "I understand you'd like to speak with someone directly. Let me transfer you to a team member who can help. Please hold.",
      shouldTransfer: true,
    };
  }

  if (frustration) {
    return {
      text:
        "I sense this may be frustrating. Would you like me to connect you with a team member who can provide more personalized assistance?",
      shouldTransfer: false, // Wait for user confirmation
    };
  }

  // Suggest escalation
  return {
    text:
      "I can certainly help with that, but if you'd prefer to speak with someone directly, I can transfer you. Would you like me to do that?",
    shouldTransfer: false,
  };
}

function getVariation(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== MAIN HANDLER ====================
Deno.serve(async (req) => {
  const startTime = Date.now();
  const BUILD_TAG = "agent-identity-overhaul-20260109";
  const requestId = crypto.randomUUID();

  // Initialize latency tracker (platform will be determined based on call source)
  const latencyTracker = new LatencyTracker(requestId, "aeva"); // Aeva for phone calls

  const log = (
    level: string,
    msg: string,
    extra: Record<string, unknown> = {},
  ) => {
    console[level === "ERROR" ? "error" : "log"](JSON.stringify({
      level,
      message: msg,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      ...extra,
    }));
  };

  try {
    if (req.method !== "POST") {
      return Response.json({
        error: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
        request_id: requestId,
      }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { agent_id, session_id, user_input, phone } = body;

    // Validate required fields
    if (!agent_id) {
      log("ERROR", "Missing agent_id", { body });
      return Response.json({
        error: "MISSING_AGENT_ID",
        message: "agent_id is required",
        request_id: requestId,
      }, { status: 400 });
    }

    if (!session_id && !phone) {
      log("ERROR", "Missing session_id and phone", { agent_id });
      return Response.json({
        error: "MISSING_SESSION_IDENTIFIER",
        message: "Either session_id or phone is required",
        request_id: requestId,
      }, { status: 400 });
    }

    // DEBUG: Agent + KB visibility
    try {
      const ag = await base44.asServiceRole.entities.Agent.filter({
        id: agent_id,
      });
      console.log("[orchestrator] agent", {
        id: agent_id,
        hasKB: Array.isArray(ag?.[0]?.knowledge_base_ids) ? ag[0].knowledge_base_ids.length : 0,
        kbIds: ag?.[0]?.knowledge_base_ids,
      });
    } catch (e) {
      const error = e as Error;
      console.warn(
        "[orchestrator] agent debug failed",
        error instanceof Error ? error.message : String(error),
      );
    }

    // Set tracker metadata
    latencyTracker.setMetadata("agentId", agent_id);
    latencyTracker.setMetadata("sessionId", session_id);
    latencyTracker.setMetadata("userInput", user_input?.substring(0, 100));

    if (!agent_id) {
      return Response.json({
        error: "MISSING_AGENT_ID",
        message: "agent_id is required.",
        request_id: requestId,
      }, { status: 400 });
    }

    log("INFO", "Orchestrator start", {
      agent_id,
      session_id,
      user_input: user_input?.substring(0, 50),
      phone_masked: phone ? maskPhone(phone) : undefined,
    });

    // ==================== 1. LOAD AGENT (with cache) ====================
    const agentCacheKey = buildCacheKey({
      type: "agent",
      agent_id,
    });

    let agent = getCached(agentCache, agentCacheKey);

    if (!agent) {
      agent = await latencyGuard(
        async () => {
          const agentResults = await base44.asServiceRole.entities.Agent.filter(
            {
              id: agent_id,
            },
          );
          return agentResults?.[0];
        },
        {
          name: "AgentQuery",
          timeout: budget.DB_QUERY,
          mode,
          critical: true, // Agent is required
        },
      );

      if (agent) {
        setCache(
          agentCache,
          agentCacheKey,
          agent,
          CACHE_TTL.AGENT, // 5 minutes
          { client_id: agent.client_id },
        );
        log("INFO", "Agent loaded from DB", { agent_name: agent.name });
      }
    } else {
      log("INFO", "Agent loaded from cache", {
        agent_name: agent.name,
        cache_age_ms: Date.now() - (agentCache.get(agentCacheKey)?.ts || 0),
      });
    }

    if (!agent) {
      log("ERROR", "Agent not found", { agent_id });
      return Response.json({
        error: "AGENT_NOT_FOUND",
        message: "Agent not found.",
        agent_id,
        request_id: requestId,
      }, { status: 404 });
    }

    log("INFO", "Agent loaded", {
      agent_id,
      phone_assistant_name: agent.phone_assistant_name || agent.name,
    });

    // Set agent metadata for latency tracking
    latencyTracker.setMetadata("clientId", agent.client_id);

    // ==================== 2. LOAD/UPDATE SESSION STATE ====================
    // TYPE SAFETY FIX (Phase 2B #15): Type session as ConversationSession
    let session: ConversationSession = {
      turn: 0,
      last_intent: null,
      context: [],
      usage_stats: {
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
      },
    };

    const sessionLoadResult = await latencyGuard(
      async () => {
        const sessionResults = await base44.asServiceRole.entities
          .ConversationSession.filter({
            id: session_id,
          });
        return sessionResults?.[0]?.state_json;
      },
      {
        name: "SessionLoad",
        timeout: budget.DB_QUERY,
        mode,
        critical: false, // Can continue with fresh session
        fallback: () => null,
      },
    );

    if (sessionLoadResult) {
      session = sessionLoadResult;
    } else {
      log("WARN", "Session load failed or timeout, using fresh state");
    }

    session.turn = (session.turn || 0) + 1;
    session.context = session.context || [];
    session.usage_stats = session.usage_stats || {
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
    };

    // Add user input to context (keep last 3 turns)
    if (user_input) {
      session.context.push({ role: "user", content: user_input });
      if (session.context.length > 6) {
        session.context = session.context.slice(-6);
      }
    }

    log("INFO", "Session state", {
      turn: session.turn,
      contextLength: session.context.length,
    });

    // Set turn metadata for latency tracking
    latencyTracker.setMetadata("turn", session.turn);

    // ==================== 2.5. CHECK RESPONSE CACHE (Quick Win) ====================
    // Check cache for common queries to reduce latency
    // IMPORTANT: Cache check happens BEFORE classification for performance,
    // but we only cache responses that passed classification previously
    if (user_input && session.turn === 1) {
      // Only use cache for first turn (greetings) to avoid session leakage
      const cacheKey = buildCacheKey({
        type: "response",
        client_id: agent.client_id, // ← Tenant isolation
        agent_id,
        query: user_input,
        language: agent.language || "en-US",
        mode: "phone", // Assume phone for now (can be passed as param)
      });

      const cachedResponse = getCached(responseCache, cacheKey, {
        validate: (entry) => {
          // Only use cache if classification was "safe"
          return entry.metadata?.classification === "safe";
        },
      });

      if (cachedResponse) {
        log("INFO", "Response cache hit (secure)", {
          user_input: user_input.substring(0, 50),
          cache_key: cacheKey.substring(0, 100),
          cache_size: responseCache.size,
        });

        // Save latency metrics (cache hit is very fast)
        const latencyMetrics = latencyTracker.getMetrics();
        saveLatencyMetrics(base44, latencyMetrics).catch((err) =>
          log("WARN", "Latency metrics save failed", { error: String(err) })
        );

        return Response.json({
          replyText: cachedResponse,
          endCall: false,
          voiceId: agent.voice_id,
          metadata: {
            turn: session.turn,
            latency_ms: Date.now() - startTime,
            cached: true,
            cache_key_hash: cacheKey.substring(0, 50),
          },
        });
      }
    }

    // ==================== 3. SAFETY & ESCALATION CLASSIFICATION ====================
    // Centralized decision point - runs BEFORE KB retrieval and LLM call
    const classification = classifySafetyAndEscalation(
      user_input,
      session.context || [],
      agent.guardrails,
      session.turn,
    );

    log("INFO", "Safety classification", {
      safety: classification.safety,
      escalation: classification.escalation,
      reason: classification.reason,
      confidence: classification.confidence,
    });

    // Handle restricted topics
    if (classification.safety === "restricted") {
      const phoneName = agent.phone_assistant_name || agent.name || "Assistant";
      const replyText = buildRestrictedTopicResponse(classification, phoneName);

      log("WARN", "Restricted topic blocked", {
        pattern: classification.metadata?.matched_pattern,
        severity: classification.metadata?.severity,
      });

      return Response.json({
        replyText,
        endCall: false,
        transfer: classification.escalation === "force", // Transfer for critical topics
        metadata: {
          turn: session.turn,
          classification: "restricted",
          severity: classification.metadata?.severity,
          confidence: classification.confidence,
        },
      });
    }

    // Handle forced escalations (user explicitly requested human)
    if (classification.escalation === "force") {
      const phoneName = agent.phone_assistant_name || agent.name || "Assistant";
      const escalationResponse = buildEscalationResponse(
        classification,
        phoneName,
      );

      log("INFO", "Forced escalation triggered", {
        pattern: classification.metadata?.matched_pattern,
        urgency: classification.metadata?.urgency,
      });

      return Response.json({
        replyText: escalationResponse.text,
        endCall: false,
        transfer: escalationResponse.shouldTransfer,
        metadata: {
          turn: session.turn,
          classification: "escalation_force",
          urgency: classification.metadata?.urgency,
          confidence: classification.confidence,
        },
      });
    }

    // Store suggested escalation in session for later use
    if (classification.escalation === "suggest") {
      session.escalation_suggested = true;
      session.escalation_reason = classification.reason;
      log("INFO", "Escalation suggested (soft)", {
        reason: classification.reason,
        frustration: classification.metadata?.frustration_detected,
      });
      // Continue to LLM - don't block, but flag for response generation
    }

    // ==================== 4. LANGUAGE DETECTION ====================
    let detectedLanguage = agent.language || "en-US";
    let voiceId = agent.voice_id;

    if (user_input && agent.auto_language_detection && session.turn > 1) {
      // Detect language from caller's replies (not on first turn, as that's typically the greeting)
      try {
        const langCode: string = detectLanguage(user_input);
        // Map franc 3-letter codes to locale codes
        const langMap: Record<string, string> = {
          "eng": "en-US",
          "spa": "es-ES",
          "fra": "fr-FR",
          "deu": "de-DE",
          "hin": "hi-IN",
          "tel": "te-IN",
          "tam": "ta-IN",
          "por": "pt-BR",
          "ita": "it-IT",
          "jpn": "ja-JP",
          "cmn": "zh-CN",
          "ara": "ar-SA",
          "kor": "ko-KR",
        };

        const mappedLanguage = langMap[langCode] || detectedLanguage;

        // Only change language if it's supported by the agent
        if (
          agent.supported_languages?.includes(mappedLanguage) ||
          mappedLanguage !== detectedLanguage
        ) {
          detectedLanguage = mappedLanguage;

          // Update voice for the detected language
          const voiceMap: Record<string, string> = {
            "en-US": agent.voice_id || "", // Keep default for English
            "es-ES": "jBpfuIE2acCO8z3wKNLl", // Sofia (ElevenLabs)
            "fr-FR": "pFZP5JQG7iQjIQuC4Bku", // Marie
            "hi-IN": "nPczCjzI2devNBz1zQrb", // Priya
            "te-IN": "nPczCjzI2devNBz1zQrb", // Priya
            "ta-IN": "nPczCjzI2devNBz1zQrb", // Priya
          };

          voiceId = voiceMap[detectedLanguage] || agent.voice_id || "";

          // Store language preference in session
          session.detected_language = detectedLanguage;

          log("INFO", "Language detected", {
            language: detectedLanguage,
            voice_id: voiceId,
            from_code: langCode,
          });
        }
      } catch (err) {
        log("WARN", "Language detection failed", { error: String(err) });
      }
    }

    // ==================== 5. KB RETRIEVAL (parallel with cache) ====================
    let kbContext = "";
    let kbLatencyMs = 0;

    // Check if agent has knowledge base (non-blocking warning)
    if (!agent.knowledge_base_ids || agent.knowledge_base_ids.length === 0) {
      log("WARN", "⚠️ Agent has no KB - will use generic responses", {
        agent_id,
        agent_name: agent.name,
      });
      // DON'T RETURN ERROR - LET CALL CONTINUE WITHOUT KB
    }

    const kbPromise = (async () => {
      const kbStart = Date.now();
      try {
        // Check KB IDs exist before querying (non-blocking)
        if (
          !agent.knowledge_base_ids || agent.knowledge_base_ids.length === 0
        ) {
          log("WARN", "⚠️ Agent has no KB - skipping retrieval", {
            agent_id,
            agent_name: agent.name,
            kb_ids: agent.knowledge_base_ids,
          });
          return "";
        }

        log("INFO", "✅ Agent has KB", {
          agent_id,
          kb_ids: agent.knowledge_base_ids,
          kb_count: agent.knowledge_base_ids.length,
        });

        // FORCE QUERY: Even on greeting, use business info query to get context
        const queryText = user_input || "business information";

        // Wrap KB retrieval with latency guard
        kbContext = await latencyGuard(
          () =>
            retrieveKbContext(base44, {
              knowledge_base_ids: agent.knowledge_base_ids || [],
              user_query: queryText,
              mode, // Pass mode for internal timeout decisions
            }),
          {
            name: "KbRetrieval",
            timeout: budget.KB_RETRIEVAL,
            mode,
            critical: false, // Can continue without KB
            fallback: () => "",
          },
        ) || "";

        kbLatencyMs = Date.now() - kbStart;

        log("INFO", "✅ KB context retrieved", {
          kbLatencyMs,
          contextLength: kbContext?.length || 0,
          contextPreview: kbContext?.substring(0, 100) || "(empty)",
        });
      } catch (err) {
        const error = err as Error;
        log("ERROR", "❌ KB retrieval failed", {
          error: String(error),
          stack: error instanceof Error ? error.stack : "",
          agent_kb_ids: agent?.knowledge_base_ids,
          query: user_input || "business information",
        });
      }
      return kbContext;
    })();

    // ==================== 5. BUILD SYSTEM PROMPT ====================
    const llmConfig = agent.llm_config || {};

    const phoneName = agent.phone_assistant_name || agent.name || "Assistant";
    let systemPrompt = agent.system_prompt ||
      `You are ${phoneName}, the AI voice assistant for this business.

CRITICAL RULES FOR VOICE CALLS:
1. Keep responses SHORT - 1-2 sentences maximum (this is a phone call!)
2. Be conversational and natural - sound human
3. Never repeat yourself or use filler phrases
4. If you don't know something, say "I don't have that information" honestly
5. Listen to what the caller actually asked and answer specifically

Your role: Help callers with their questions about the business.`;

    // Add turn-aware context
    if (session.turn === 1) {
      systemPrompt += "\n\nThis is the START of the call. Give a warm but brief welcome.";
    } else if (session.turn > 5) {
      systemPrompt += "\n\nThis call has been going for a while. Be extra concise.";
    }

    // Wait for KB context
    kbContext = await kbPromise;

    // Fast-path fallback for phone mode: If KB retrieval timed out and we're on phone, skip expensive fallback
    if ((!kbContext || kbContext.trim().length < 50) && mode === "phone") {
      const remainingBudget = budget.TOTAL - (Date.now() - startTime);

      if (remainingBudget < 500) {
        // Not enough time for fallback - skip to LLM
        log("WARN", "Phone mode + low budget - skipping KB fallback", {
          remaining_ms: remainingBudget,
          context_length: kbContext?.length || 0,
        });
      } else {
        // Try quick fallback with remaining budget
        log("WARN", "KB context too short, trying quick fallback", {
          contextLength: kbContext?.length || 0,
          remaining_ms: remainingBudget,
        });

        const fallbackContext = await latencyGuard(
          async () => {
            const kbIds = Array.isArray(agent.knowledge_base_ids) ? agent.knowledge_base_ids : [];
            if (kbIds.length === 0) return "";

            const queryText = user_input || "business information";
            const results = [];

            // Only try first KB in phone mode to save time
            const kbId = kbIds[0];
            const r = await base44.functions.invoke("kbRetrieval", {
              knowledge_base_id: kbId,
              query: queryText,
              top_k: 2, // Reduced from 3 for speed
            });

            if (r?.data?.success && Array.isArray(r.data.chunks)) {
              results.push(
                ...r.data.chunks.map((c: any) => c.content).filter(Boolean),
              );
            }

            return results.length > 0 ? results.join("\n\n---\n\n") : "";
          },
          {
            name: "KbFallback",
            timeout: Math.min(remainingBudget - 200, 400), // Reserve 200ms for LLM setup
            mode,
            critical: false,
            fallback: () => "",
          },
        );

        if (fallbackContext) {
          kbContext = fallbackContext;
          log("INFO", "✅ Quick fallback successful", {
            chunks: fallbackContext.split("---").length,
            contextLength: fallbackContext.length,
          });
        }
      }
    } else if (!kbContext || kbContext.trim().length < 50) {
      // Web mode or enough budget - try full fallback
      log("WARN", "KB context too short, trying fallback", {
        contextLength: kbContext?.length || 0,
      });

      const fallbackContext = await latencyGuard(
        async () => {
          const kbIds = Array.isArray(agent.knowledge_base_ids) ? agent.knowledge_base_ids : [];
          if (kbIds.length === 0) return "";

          const queryText = user_input || "business information";
          const results = [];
          console.log("[orchestrator] kbRetrieval fallback", {
            kbIds,
            query: queryText,
          });

          for (const kbId of kbIds) {
            const r = await base44.functions.invoke("kbRetrieval", {
              knowledge_base_id: kbId,
              query: queryText,
              top_k: 3,
            });
            if (r?.data?.success && Array.isArray(r.data.chunks)) {
              results.push(
                ...r.data.chunks.map((c: any) => c.content).filter(Boolean),
              );
            }
          }

          return results.length > 0 ? results.join("\n\n---\n\n") : "";
        },
        {
          name: "KbFallbackFull",
          timeout: budget.KB_RETRIEVAL * 0.8, // 80% of original budget
          mode,
          critical: false,
          fallback: () => "",
        },
      );

      if (fallbackContext) {
        kbContext = fallbackContext;
        log("INFO", "✅ kbRetrieval fallback used", {
          chunks: fallbackContext.split("---").length,
          contextLength: fallbackContext.length,
        });
      } else {
        log("WARN", "❌ kbRetrieval fallback failed or timed out");
      }
    }

    // ==================== 6. CALL LLM (with tight timeout) ====================
    let replyText = "";
    let llmFailed = false;
    const llmStart = Date.now();
    latencyTracker.markAiProcessingStart(); // Track AI processing start

    // Calculate remaining budget for LLM
    const elapsedSoFar = Date.now() - startTime;
    const remainingBudget = budget.TOTAL - elapsedSoFar;
    const llmTimeout = Math.min(
      llmConfig.timeout_ms || budget.LLM_CALL,
      Math.max(remainingBudget - 200, 500), // Reserve 200ms, minimum 500ms
    );

    log("INFO", "LLM budget calculated", {
      total_budget: budget.TOTAL,
      elapsed_ms: elapsedSoFar,
      remaining_ms: remainingBudget,
      llm_timeout: llmTimeout,
      mode,
    });

    // Add language instruction to system prompt if not English
    if (detectedLanguage !== "en-US" && session.detected_language) {
      systemPrompt +=
        `\n\nIMPORTANT: Respond in ${detectedLanguage} language. The caller is speaking in this language.`;
    }

    try {
      log("INFO", "Calling LLM", {
        model: llmConfig.model || "gpt-4o-mini",
        timeout: llmTimeout,
        hasKbContext: !!kbContext,
      });

      const llmResult = await latencyGuard(
        () =>
          callLLM({
            systemPrompt,
            kbContext,
            userInput: user_input || "Hello",
            conversationHistory: session.context.slice(-4), // Last 2 turns for context
            model: llmConfig.model || "gpt-4o-mini",
            temperature: llmConfig.temperature ?? 0.7,
            maxTokens: llmConfig.max_tokens ?? 100, // Keep short for voice
            base44,
          }),
        {
          name: "LlmCall",
          timeout: llmTimeout,
          mode,
          critical: false, // Can use fallback
          fallback: () => null,
        },
      );

      if (llmResult) {
        replyText = (llmResult?.content || "").trim();
        const llmUsage = llmResult?.usage ||
          { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        // Accumulate usage stats in session
        session.usage_stats.total_prompt_tokens += llmUsage.prompt_tokens;
        session.usage_stats.total_completion_tokens += llmUsage.completion_tokens;
        session.usage_stats.total_tokens += llmUsage.total_tokens;

        log("INFO", "LLM response", {
          replyLength: replyText.length,
          preview: replyText.substring(0, 50),
          promptTokens: llmUsage.prompt_tokens,
          completionTokens: llmUsage.completion_tokens,
          totalTokens: llmUsage.total_tokens,
        });
      } else {
        llmFailed = true;
        log("WARN", "LLM returned null (timeout or error)");
      }

      latencyTracker.markAiProcessingComplete(); // Track AI processing complete
    } catch (err) {
      llmFailed = true;
      latencyTracker.markAiProcessingComplete(); // Track even on failure
      log("ERROR", "LLM error", { error: String(err) });
    }

    const llmLatencyMs = Date.now() - llmStart;

    // ==================== 7. SMART FALLBACKS ====================
    if (!replyText) {
      if (llmFailed && kbContext) {
        // LLM failed but we have KB context - use it
        replyText = `Based on our information: ${
          kbContext.substring(0, 150)
        }... Would you like more details?`;
      } else if (session.turn === 1) {
        replyText = getVariation(GREETING_VARIATIONS);
      } else {
        replyText = getVariation(FALLBACK_VARIATIONS);
      }
      log("WARN", "Using fallback reply", {
        llmFailed,
        turn: session.turn,
        hasKb: !!kbContext,
      });
    }

    // Add reply to session context
    session.context.push({ role: "assistant", content: replyText });

    // ==================== 7.5. CACHE SUCCESSFUL RESPONSE (Quick Win) ====================
    // Cache responses for common queries to improve future latency
    // ONLY cache first-turn, safe, non-personalized responses
    if (
      replyText &&
      user_input &&
      !llmFailed &&
      session.turn === 1 && // Only first turn to avoid session leakage
      classification.safety === "safe" && // Only safe responses
      classification.escalation === "none" // No escalation suggested
    ) {
      const cacheKey = buildCacheKey({
        type: "response",
        client_id: agent.client_id, // ← Tenant isolation
        agent_id,
        query: user_input,
        language: detectedLanguage,
        mode: "phone",
      });

      setCache(
        responseCache,
        cacheKey,
        replyText,
        CACHE_TTL.RESPONSE_SAFE, // 1 minute
        {
          client_id: agent.client_id,
          language: detectedLanguage,
          classification: "safe",
        },
      );

      log("INFO", "Response cached (secure)", {
        cache_key: cacheKey.substring(0, 100),
        ttl_ms: CACHE_TTL.RESPONSE_SAFE,
        cache_size: responseCache.size,
      });
    }

    // NEVER cache restricted or escalated responses
    // Note: classification.safety is 'safe' | 'unknown', escalation check is sufficient
    if (
      classification.escalation !== "none"
    ) {
      log("INFO", "Response NOT cached (safety-critical)", {
        safety: classification.safety,
        escalation: classification.escalation,
      });
    }

    // Set response metadata for latency tracking
    latencyTracker.setMetadata("responseLength", replyText.length);
    latencyTracker.setMetadata("hasKbContext", !!kbContext);
    latencyTracker.setMetadata("model", llmConfig.model || "gpt-4o-mini");

    // ==================== 8. SAVE SESSION STATE (async, don't wait) ====================
    base44.asServiceRole.entities.ConversationSession.update(session_id, {
      state_json: session,
      updated_date: new Date().toISOString(),
    }).catch((err: unknown) => log("WARN", "Session save failed", { error: String(err) }));

    // ==================== 9. RECORD ANALYTICS (async, don't wait) ====================
    recordAnalytics(base44, {
      session_id,
      agent_id,
      client_id: agent.client_id,
      turn: session.turn,
      llm_ms: llmLatencyMs,
      kb_ms: kbLatencyMs,
      total_ms: Date.now() - startTime,
      fallback_used: !replyText || llmFailed,
      has_kb: !!kbContext,
    }).catch((err) => log("WARN", "Analytics save failed", { error: String(err) }));

    // ==================== 10. RETURN RESPONSE ====================
    const totalLatencyMs = Date.now() - startTime;

    // Save latency metrics to database (async, don't wait)
    const latencyMetrics = latencyTracker.getMetrics();
    saveLatencyMetrics(base44, latencyMetrics).catch((err) =>
      log("WARN", "Latency metrics save failed", { error: String(err) })
    );

    // Log latency summary
    latencyTracker.logSummary();

    log("INFO", "Orchestrator complete", {
      totalLatencyMs,
      llmLatencyMs,
      kbLatencyMs,
      turn: session.turn,
      replyLength: replyText.length,
    });

    return Response.json({
      replyText,
      endCall: false,
      voiceId: voiceId, // Include voice ID for language-specific TTS
      metadata: {
        turn: session.turn,
        latency_ms: totalLatencyMs,
        llm_ms: llmLatencyMs,
        kb_ms: kbLatencyMs,
        detected_language: detectedLanguage,
        agent_id,
        assistant_name: phoneName,
      },
    });
  } catch (err) {
    const error = err as Error;
    log("ERROR", "Fatal error", {
      error: String(err),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      replyText: "I apologize, I'm having technical difficulties. Please try again.",
      endCall: false,
    });
  }
});

// ==================== HELPERS ====================
function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return "unknown";
  return phone.substring(0, 3) + "****" + phone.slice(-2);
}

// ==================== KB RETRIEVAL WITH EMBEDDINGS ====================
// TYPE SAFETY FIX (Phase 2B #16): Type function parameters
async function retrieveKbContext(
  base44: Base44Client,
  {
    knowledge_base_ids,
    user_query,
    mode = "web",
  }: {
    knowledge_base_ids: string[];
    user_query: string;
    mode?: "phone" | "web" | "system";
  },
): Promise<string> {
  if (!knowledge_base_ids?.length || !user_query) {
    return "";
  }

  const validMode: "PHONE" | "WEB" | "SYSTEM" =
    mode && ["phone", "web", "system"].includes(mode.toLowerCase())
      ? (mode.toUpperCase() as "PHONE" | "WEB" | "SYSTEM")
      : "WEB";
  const budget = LATENCY_BUDGET[validMode];

  try {
    // Check cache first with versioning support
    const cacheKey = buildCacheKey({
      type: "kb",
      kb_ids: knowledge_base_ids,
      // TODO: Add version from KB entity when available
      // version: kb.version or kb.updated_at hash
    });

    let allChunks = getCached(kbChunkCache, cacheKey);

    if (!allChunks) {
      allChunks = [];
      for (const kbId of knowledge_base_ids) {
        try {
          const chunks = await base44.asServiceRole.entities.KnowledgeChunk
            .filter({
              knowledge_base_id: kbId,
            });
          if (chunks?.length) {
            allChunks = allChunks.concat(chunks);
          }
        } catch (err) {
          console.warn(`KB ${kbId} load failed:`, err);
        }
      }
      if (allChunks.length) {
        // Cache KB chunks with longer TTL (10 minutes)
        setCache(
          kbChunkCache,
          cacheKey,
          allChunks,
          CACHE_TTL.KB_CHUNKS,
          {
            version: "1", // TODO: Use actual KB version
          },
        );
        console.log("[orchestrator] KB chunks cached", {
          kb_count: knowledge_base_ids.length,
          chunk_count: allChunks.length,
          cache_key: cacheKey.substring(0, 80),
        });
      }
    } else {
      console.log("[orchestrator] KB chunks from cache", {
        chunk_count: allChunks.length,
        cache_age_ms: Date.now() - (kbChunkCache.get(cacheKey)?.ts || 0),
      });
    }

    if (!allChunks.length) return "";

    // Try semantic search with embeddings if available
    const chunksWithEmbeddings = allChunks.filter((c) => c.embedding && c.embedding.length > 0);

    if (chunksWithEmbeddings.length > 0) {
      // Generate query embedding with timeout
      const queryEmbedding = await latencyGuard(
        () => generateEmbedding(user_query),
        {
          name: "EmbeddingGeneration",
          timeout: budget.EMBEDDING_GEN,
          mode,
          critical: false, // Can fallback to keyword matching
          fallback: () => null,
        },
      );

      if (queryEmbedding?.length) {
        const scored = chunksWithEmbeddings
          .map((chunk) => ({
            chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding || []),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        if (scored.length && scored[0].score > 0.7) {
          return scored.map((s) => s.chunk.content).join("\n\n---\n\n");
        }
      }
    }

    // Fallback to keyword matching
    const queryLower = user_query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter((w) => w.length > 3);

    const scored = allChunks
      .map((chunk) => {
        const contentLower = (chunk.content || "").toLowerCase();
        const score = keywords.reduce(
          (sum, kw) => sum + (contentLower.includes(kw) ? 1 : 0),
          0,
        );
        return { chunk, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length) {
      return scored.map((s) => s.chunk.content).join("\n\n---\n\n");
    }

    // Return first few chunks as general context
    return allChunks.slice(0, 3).map((c) => c.content).join("\n\n---\n\n");
  } catch (err) {
    console.error("KB retrieval error:", err);
    return "";
  }
}

// ==================== EMBEDDING GENERATION ====================
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY || !text) return null;

  try {
    // Use AbortController for cancellation support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s max

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000), // Limit input length
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    const error = err as Error;
    if (error.name === "AbortError") {
      console.warn("Embedding generation aborted (timeout)");
    } else {
      console.warn("Embedding generation failed:", error);
    }
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ==================== LLM CALL ====================
// ==================== ANALYTICS RECORDING ====================
async function recordAnalytics(
  base44: Base44Client,
  metrics: Record<string, unknown>,
): Promise<void> {
  try {
    // Update session with metrics
    if (metrics.session_id) {
      const sessions = await base44.asServiceRole.entities.ConversationSession
        .filter({
          session_token: metrics.session_id,
        });

      if (sessions?.[0]) {
        const existing = sessions[0].metrics || {};
        await base44.asServiceRole.entities.ConversationSession.update(
          sessions[0].id,
          {
            metrics: {
              total_latency_ms: (existing.total_latency_ms || 0) +
                metrics.total_ms,
              avg_llm_ms: metrics.llm_ms,
              avg_kb_ms: metrics.kb_ms,
              fallback_count: (existing.fallback_count || 0) +
                (metrics.fallback_used ? 1 : 0),
              error_count: existing.error_count || 0,
            },
            last_interaction_at: new Date().toISOString(),
          },
        );
      }
    }
  } catch (err) {
    console.warn("Analytics recording failed:", err);
  }
}

// ==================== LLM CALL ====================
async function callLLM({
  systemPrompt,
  kbContext,
  userInput,
  conversationHistory,
  model,
  temperature,
  maxTokens,
  base44,
}: {
  systemPrompt: string;
  kbContext: string;
  userInput: string;
  conversationHistory: ConversationMessage[];
  model: string;
  temperature: number;
  maxTokens: number;
  base44: Base44Client;
}) {
  if (!base44) throw new Error("Base44 client required for integrated LLM");

  const history = (conversationHistory || [])
    .map((m: ConversationMessage) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `${systemPrompt}\n\nKNOWLEDGE BASE CONTEXT:\n${
    kbContext || "(none)"
  }\n\nCONVERSATION HISTORY:\n${history}\n\nUSER:\n${userInput || "Hello"}\n\nAssistant:`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });

  const content = typeof result === "string" ? result : (result?.content || "");
  return {
    content,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}
