// lib/ai/conversationMemory.js

import { logger } from "../infra/logger.js";

/**
 * Append a turn to conversation history
 */
export async function appendTurn(
  base44,
  sessionId,
  role,
  content,
  metadata = {},
) {
  if (!sessionId || !role || !content) {
    logger.warn("Missing required fields for conversation turn");
    return null;
  }

  try {
    const turn = await base44.asServiceRole.entities.ConversationTurn.create({
      session_id: sessionId,
      role,
      content: content.slice(0, 10000), // Limit content size
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });

    return turn;
  } catch (err) {
    logger.error("Failed to append conversation turn", {
      session_id: sessionId,
      error: err.message,
    });
    return null;
  }
}

/**
 * Get recent conversation history
 */
export async function getRecentHistory(base44, sessionId, limit = 10) {
  if (!sessionId) return [];

  try {
    const turns = await base44.asServiceRole.entities.ConversationTurn.filter({
      session_id: sessionId,
    });

    // Sort by created_date and take last N
    const sorted = turns
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .slice(-limit);

    return sorted.map((t) => ({
      role: t.role,
      content: t.content,
    }));
  } catch (err) {
    logger.warn("Failed to get conversation history", {
      session_id: sessionId,
      error: err.message,
    });
    return [];
  }
}

/**
 * Get or create a conversation session
 */
export async function getOrCreateSession(
  base44,
  sessionToken,
  agentId,
  clientId,
  language = "en",
) {
  if (!sessionToken) {
    sessionToken = crypto.randomUUID();
  }

  try {
    // Check for existing session
    const existing = await base44.asServiceRole.entities.ConversationSession
      .filter({
        session_token: sessionToken,
      });

    if (existing.length > 0) {
      // Update last interaction
      await base44.asServiceRole.entities.ConversationSession.update(
        existing[0].id,
        {
          last_interaction_at: new Date().toISOString(),
        },
      );
      return existing[0];
    }

    // Create new session
    const session = await base44.asServiceRole.entities.ConversationSession
      .create({
        session_token: sessionToken,
        agent_id: agentId,
        agency_id: clientId,
        language,
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      });

    return session;
  } catch (err) {
    logger.error("Failed to get/create session", {
      session_token: sessionToken,
      error: err.message,
    });
    return { id: sessionToken, session_token: sessionToken };
  }
}

/**
 * Get memory facts for a user
 */
export async function getMemoryForUser(base44, clientId, userKey, limit = 10) {
  if (!clientId || !userKey) return [];

  try {
    const facts = await base44.asServiceRole.entities.MemoryFact.filter({
      client_id: clientId,
      user_key: userKey,
    });

    // Filter expired facts and sort by importance
    const now = new Date();
    const validFacts = facts
      .filter((f) => !f.expires_at || new Date(f.expires_at) > now)
      .sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        return (importanceOrder[b.importance] || 0) -
          (importanceOrder[a.importance] || 0);
      })
      .slice(0, limit);

    return validFacts;
  } catch (err) {
    logger.warn("Failed to get memory facts", {
      client_id: clientId,
      user_key: userKey,
      error: err.message,
    });
    return [];
  }
}

/**
 * Save a memory fact
 */
export async function saveMemoryFact(
  base44,
  clientId,
  agentId,
  userKey,
  fact,
  options = {},
) {
  if (!clientId || !userKey || !fact) return null;

  try {
    const memoryFact = await base44.asServiceRole.entities.MemoryFact.create({
      client_id: clientId,
      agent_id: agentId,
      user_key: userKey,
      fact: fact.slice(0, 500),
      importance: options.importance || "medium",
      category: options.category || "other",
      source_session_id: options.sessionId,
      expires_at: options.expiresAt,
    });

    logger.info("Memory fact saved", {
      client_id: clientId,
      user_key: userKey,
      category: options.category,
    });

    return memoryFact;
  } catch (err) {
    logger.error("Failed to save memory fact", {
      client_id: clientId,
      error: err.message,
    });
    return null;
  }
}

/**
 * Format memory for prompt injection
 */
export function formatMemoryForPrompt(facts) {
  if (!facts || facts.length === 0) return "";

  const lines = facts.map((f) => `- ${f.fact}`);
  return `USER MEMORY:\n${lines.join("\n")}`;
}
