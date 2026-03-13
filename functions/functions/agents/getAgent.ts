import { logger } from "../lib/infra/logger.js";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

export async function getAgentById(base44, agentId) {
  if (!agentId) return null;
  const list = await base44.asServiceRole.entities.Agent.filter({
    id: agentId,
  });
  const agent = list?.[0] || null;
  return agent;
}

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { agent_id } = await req.json();
    if (!agent_id) {
      return Response.json({
        error: "MISSING_AGENT_ID",
        message: "agent_id is required.",
      }, { status: 400 });
    }
    const agent = await getAgentById(base44, agent_id);
    if (!agent) {
      return Response.json({
        error: "AGENT_NOT_FOUND",
        message: "Agent not found.",
        agent_id,
      }, { status: 404 });
    }
    const named = ensureAgentNames(agent);
    return Response.json({ success: true, agent: named });
  } catch (e) {
    return Response.json({ error: "INTERNAL_ERROR", message: e.message }, {
      status: 500,
    });
  }
});
