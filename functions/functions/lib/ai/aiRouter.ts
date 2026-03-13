// lib/ai/aiRouter.js
// Multi-provider AI routing based on plan, query complexity, and agent config

import { logger } from "../infra/logger.js";

// Plan-based model availability
const PLAN_DEFAULTS = {
  free: {
    defaultModel: "gpt-4o-mini",
    allow: ["gpt-4o-mini"],
  },
  starter: {
    defaultModel: "gpt-4o-mini",
    allow: ["gpt-4o-mini"],
  },
  standard: {
    defaultModel: "gpt-4o-mini",
    allow: ["gpt-4o-mini", "gpt-4o"],
  },
  premium: {
    defaultModel: "gpt-4o",
    allow: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  },
  enterprise: {
    defaultModel: "gpt-4o",
    allow: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  },
  default: {
    defaultModel: "gpt-4o-mini",
    allow: ["gpt-4o-mini"],
  },
};

/**
 * Select the best model for a request based on plan, agent config, and query characteristics
 */
export function selectModelForRequest({
  plan = "default",
  agentModel = null,
  message = "",
  hasKbContext = false,
  intent = "general",
}) {
  const planConfig = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.default;

  // 1. Agent-specific override if allowed by plan
  if (agentModel && planConfig.allow.includes(agentModel)) {
    logger.debug("Using agent-specified model", { model: agentModel, plan });
    return agentModel;
  }

  const messageLength = message.length;

  // 2. Simple FAQ/short support query -> use fast model
  if (messageLength < 120 && intent === "support") {
    return "gpt-4o-mini";
  }

  // 3. Complex reasoning or long messages -> use better model if available
  if (messageLength > 400 || intent === "reasoning") {
    if (planConfig.allow.includes("gpt-4-turbo")) {
      return "gpt-4-turbo";
    }
    if (planConfig.allow.includes("gpt-4o")) {
      return "gpt-4o";
    }
  }

  // 4. Knowledge-heavy queries might benefit from better models
  if (hasKbContext && planConfig.allow.includes("gpt-4o")) {
    return "gpt-4o";
  }

  // 5. Default model per plan
  return planConfig.defaultModel;
}

/**
 * Get intent from agent type
 */
export function getIntentFromAgentType(agentType) {
  const intentMap = {
    support: "support",
    sales: "sales",
    receptionist: "general",
    appointment: "general",
    general: "general",
  };
  return intentMap[agentType] || "general";
}

/**
 * Check if a model is allowed for a plan
 */
export function isModelAllowedForPlan(model, plan) {
  const planConfig = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.default;
  return planConfig.allow.includes(model);
}
