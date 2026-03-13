// Agent Knowledge Management API
// Provides endpoints for managing agent-specific knowledge chunks

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import {
  addAgentKnowledgeChunk,
  getAgentKnowledgeChunks,
  getAgentKnowledgeStats,
  getAgentsWithKnowledgeAccess,
  shareKnowledgeWithAgents,
  unshareKnowledgeFromAgents,
} from "./lib/knowledgeSharing.ts";
import { KnowledgeScope } from "./lib/knowledgeConfig.ts";
import type {
  AddChunkRequest,
  Base44Client,
  GetAccessListRequest,
  GetAgentChunksRequest,
  GetStatsRequest,
  ShareKnowledgeRequest,
  UnshareKnowledgeRequest,
} from "./lib/types/index.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    logger.info("Agent knowledge management request", {
      request_id: requestId,
      action,
      user_email: user.email,
    });

    // Route to appropriate handler
    switch (action) {
      case "add_chunk":
        return await handleAddChunk(base44, body, requestId);

      case "share_knowledge":
        return await handleShareKnowledge(base44, body, requestId);

      case "unshare_knowledge":
        return await handleUnshareKnowledge(base44, body, requestId);

      case "get_agent_chunks":
        return await handleGetAgentChunks(base44, body, requestId);

      case "get_stats":
        return await handleGetStats(base44, body, requestId);

      case "get_access_list":
        return await handleGetAccessList(base44, body, requestId);

      default:
        return Response.json({
          error: "Invalid action",
          valid_actions: [
            "add_chunk",
            "share_knowledge",
            "unshare_knowledge",
            "get_agent_chunks",
            "get_stats",
            "get_access_list",
          ],
        }, { status: 400 });
    }
  } catch (error) {
    logger.error("Agent knowledge management failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});

/**
 * Add a new knowledge chunk with agent ownership
 */
async function handleAddChunk(
  base44: Base44Client,
  body: AddChunkRequest,
  requestId: string,
) {
  const {
    knowledge_base_id,
    agent_id,
    content,
    title,
    scope,
    source_type,
    source_ref,
    shared_with_agents,
    metadata,
  } = body;

  if (!knowledge_base_id || !content) {
    return Response.json({
      error: "knowledge_base_id and content are required",
    }, { status: 400 });
  }

  logger.info("Adding agent knowledge chunk", {
    request_id: requestId,
    kb_id: knowledge_base_id,
    agent_id: agent_id || "global",
    scope: scope || "auto",
  });

  const chunk = await addAgentKnowledgeChunk(
    base44,
    knowledge_base_id,
    agent_id || null,
    content,
    {
      scope,
      title,
      sourceType: source_type,
      sourceRef: source_ref,
      sharedWithAgents: shared_with_agents,
      metadata,
    },
  );

  return Response.json({
    success: true,
    chunk_id: chunk.id,
    scope: chunk.scope,
    message: "Knowledge chunk added successfully",
  });
}

/**
 * Share knowledge chunks with other agents
 */
async function handleShareKnowledge(
  base44: Base44Client,
  body: ShareKnowledgeRequest,
  requestId: string,
) {
  const { chunk_ids, target_agent_ids } = body;

  if (!chunk_ids || !Array.isArray(chunk_ids) || chunk_ids.length === 0) {
    return Response.json({
      error: "chunk_ids array is required",
    }, { status: 400 });
  }

  if (
    !target_agent_ids || !Array.isArray(target_agent_ids) ||
    target_agent_ids.length === 0
  ) {
    return Response.json({
      error: "target_agent_ids array is required",
    }, { status: 400 });
  }

  logger.info("Sharing knowledge chunks", {
    request_id: requestId,
    chunk_count: chunk_ids.length,
    target_agents: target_agent_ids.length,
  });

  const updatedCount = await shareKnowledgeWithAgents(
    base44,
    chunk_ids,
    target_agent_ids,
  );

  return Response.json({
    success: true,
    chunks_updated: updatedCount,
    message: `${updatedCount} chunks shared with ${target_agent_ids.length} agents`,
  });
}

/**
 * Unshare knowledge chunks from specific agents
 */
async function handleUnshareKnowledge(
  base44: Base44Client,
  body: UnshareKnowledgeRequest,
  requestId: string,
) {
  const { chunk_ids, target_agent_ids } = body;

  if (!chunk_ids || !Array.isArray(chunk_ids) || chunk_ids.length === 0) {
    return Response.json({
      error: "chunk_ids array is required",
    }, { status: 400 });
  }

  if (
    !target_agent_ids || !Array.isArray(target_agent_ids) ||
    target_agent_ids.length === 0
  ) {
    return Response.json({
      error: "target_agent_ids array is required",
    }, { status: 400 });
  }

  logger.info("Unsharing knowledge chunks", {
    request_id: requestId,
    chunk_count: chunk_ids.length,
    target_agents: target_agent_ids.length,
  });

  const updatedCount = await unshareKnowledgeFromAgents(
    base44,
    chunk_ids,
    target_agent_ids,
  );

  return Response.json({
    success: true,
    chunks_updated: updatedCount,
    message: `${updatedCount} chunks unshared from ${target_agent_ids.length} agents`,
  });
}

/**
 * Get knowledge chunks accessible by an agent
 */
async function handleGetAgentChunks(
  base44: Base44Client,
  body: GetAgentChunksRequest,
  requestId: string,
) {
  const { agent_id, knowledge_base_ids, include_global } = body;

  if (!agent_id) {
    return Response.json({
      error: "agent_id is required",
    }, { status: 400 });
  }

  if (!knowledge_base_ids || !Array.isArray(knowledge_base_ids)) {
    return Response.json({
      error: "knowledge_base_ids array is required",
    }, { status: 400 });
  }

  logger.info("Getting agent knowledge chunks", {
    request_id: requestId,
    agent_id,
    kb_count: knowledge_base_ids.length,
  });

  const chunks = await getAgentKnowledgeChunks(
    base44,
    agent_id,
    knowledge_base_ids,
    include_global !== false,
  );

  return Response.json({
    success: true,
    chunks: chunks.map((c) => ({
      id: c.id,
      content: c.content,
      title: c.title,
      kb_id: c.knowledge_base_id,
      agent_id: c.agent_id,
      scope: c.scope,
      shared_with: c.shared_with_agents,
      source_type: c.source_type,
    })),
    total_chunks: chunks.length,
  });
}

/**
 * Get knowledge statistics for an agent
 */
async function handleGetStats(
  base44: Base44Client,
  body: GetStatsRequest,
  requestId: string,
) {
  const { agent_id, knowledge_base_ids } = body;

  if (!agent_id) {
    return Response.json({
      error: "agent_id is required",
    }, { status: 400 });
  }

  if (!knowledge_base_ids || !Array.isArray(knowledge_base_ids)) {
    return Response.json({
      error: "knowledge_base_ids array is required",
    }, { status: 400 });
  }

  logger.info("Getting agent knowledge stats", {
    request_id: requestId,
    agent_id,
  });

  const stats = await getAgentKnowledgeStats(
    base44,
    agent_id,
    knowledge_base_ids,
  );

  return Response.json({
    success: true,
    agent_id,
    stats,
  });
}

/**
 * Get list of agents with access to a knowledge base
 */
async function handleGetAccessList(
  base44: Base44Client,
  body: GetAccessListRequest,
  requestId: string,
) {
  const { knowledge_base_id } = body;

  if (!knowledge_base_id) {
    return Response.json({
      error: "knowledge_base_id is required",
    }, { status: 400 });
  }

  logger.info("Getting knowledge access list", {
    request_id: requestId,
    kb_id: knowledge_base_id,
  });

  const agentIds = await getAgentsWithKnowledgeAccess(
    base44,
    knowledge_base_id,
  );

  // Fetch agent details
  const agents = [];
  for (const agentId of agentIds) {
    try {
      const agentList = await base44.asServiceRole.entities.Agent.filter({
        id: agentId,
      });
      if (agentList.length > 0) {
        agents.push({
          id: agentList[0].id,
          name: agentList[0].name,
          agent_type: agentList[0].agent_type,
        });
      }
    } catch (err) {
      logger.warn("Could not fetch agent details", {
        agent_id: agentId,
        error: err.message,
      });
    }
  }

  return Response.json({
    success: true,
    knowledge_base_id,
    agents,
    total_agents: agents.length,
  });
}
