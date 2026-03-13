// Pure helper utilities for Agent functions (no Deno.serve here)

export function validateAgentHasKB(agent) {
  const kb = Array.isArray(agent?.knowledge_base_ids) ? agent.knowledge_base_ids : [];
  if (!kb.length) {
    const err = new Error("This agent has no knowledge base attached.");
    err.code = "AGENT_MISSING_KB";
    throw err;
  }
}

export function ensureAgentNames(agent) {
  return {
    ...agent,
    widget_bot_name: agent?.widget_bot_name || agent?.name || "Assistant",
    phone_assistant_name: agent?.phone_assistant_name || agent?.name ||
      "Assistant",
  };
}
