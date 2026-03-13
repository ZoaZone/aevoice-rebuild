// lib/context/loadClientContext.js

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "../infra/logger.js";

/**
 * Custom error classes for better error handling
 */
export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Loads the authenticated client context from the request.
 * Returns { user, client, plan, wallet, base44 }
 */
export async function loadClientContext(req) {
  const base44 = createClientFromRequest(req);

  // Authenticate user
  let user;
  try {
    user = await base44.auth.me();
  } catch (err) {
    logger.warn("Authentication failed", { error: err.message });
    throw new AuthenticationError("Please sign in to continue");
  }

  if (!user || !user.email) {
    throw new AuthenticationError("Invalid user session");
  }

  // Load client for user
  const clients = await base44.asServiceRole.entities.Client.filter({
    contact_email: user.email,
  });

  if (clients.length === 0) {
    logger.warn("No client found for user", { email: user.email });
    throw new AuthorizationError(
      "No active account found. Please complete onboarding.",
    );
  }

  const client = clients[0];

  // Load wallet (optional)
  let wallet = null;
  try {
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      owner_id: client.id,
    });
    wallet = wallets[0] || null;
  } catch (err) {
    logger.debug("Wallet not found", { client_id: client.id });
  }

  // Load subscription/plan (optional)
  let plan = null;
  try {
    const subscriptions = await base44.asServiceRole.entities.Subscription
      .filter({
        client_id: client.id,
        status: "active",
      });
    if (subscriptions.length > 0 && subscriptions[0].plan_id) {
      const plans = await base44.asServiceRole.entities.Plan.filter({
        id: subscriptions[0].plan_id,
      });
      plan = plans[0] || null;
    }
  } catch (err) {
    logger.debug("Plan not found", { client_id: client.id });
  }

  logger.info("Client context loaded", {
    user_email: user.email,
    client_id: client.id,
    has_wallet: !!wallet,
    has_plan: !!plan,
  });

  return { user, client, wallet, plan, base44 };
}

/**
 * Loads an agent by ID with ownership verification.
 */
export async function loadAgent(base44, agentId, clientId) {
  if (!agentId) {
    throw new Error("Agent ID is required");
  }

  const agents = await base44.asServiceRole.entities.Agent.filter({
    id: agentId,
  });

  if (agents.length === 0) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const agent = agents[0];

  // Verify ownership - agent must belong to this client
  if (agent.client_id !== clientId) {
    logger.warn("Agent access denied", {
      agent_id: agentId,
      client_id: clientId,
    });
    throw new AuthorizationError("Access to this agent is not permitted");
  }

  return agent;
}

/**
 * Loads knowledge bases by IDs with ownership verification.
 */
export async function loadKnowledgeBases(base44, kbIds, clientId) {
  if (!kbIds || kbIds.length === 0) {
    return [];
  }

  const knowledgeBases = [];

  for (const kbId of kbIds) {
    try {
      const kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({
        id: kbId,
      });

      if (kbs.length > 0) {
        const kb = kbs[0];
        // Allow access only if owned by the same client (no shared fallbacks)
        if (kb.client_id === clientId) {
          knowledgeBases.push(kb);
        } else {
          logger.debug("KB access skipped (not owned)", {
            kb_id: kbId,
            client_id: clientId,
          });
        }
      }
    } catch (err) {
      logger.warn("Failed to load KB", { kb_id: kbId, error: err.message });
    }
  }

  return knowledgeBases;
}
