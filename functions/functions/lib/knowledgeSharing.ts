// Knowledge Sharing Logic for Multi-Agent Architecture
// This module provides functionality for agent-specific knowledge management and sharing

import { KnowledgeScope } from "./knowledgeConfig.ts";
import { logger } from "./infra/logger.js";
import type { Base44Client, Metadata } from "./types/index.ts";

/**
 * Knowledge chunk with agent-specific metadata
 */
export interface AgentKnowledgeChunk {
  id: string;
  knowledge_base_id: string;
  content: string;
  title?: string;
  source_type: string;
  source_ref?: string;
  embedding?: number[];
  metadata?: Metadata;

  // Multi-agent fields
  agent_id?: string; // Owner agent (null for shared/global)
  scope?: string; // 'private', 'shared', 'global'
  shared_with_agents?: string[]; // Array of agent IDs that can access this chunk
}

/**
 * Query knowledge chunks for a specific agent with proper scoping
 *
 * Priority order:
 * 1. Agent's private chunks
 * 2. Chunks shared with this agent
 * 3. Global chunks (if includeGlobal is true)
 *
 * @param base44 - Base44 client instance
 * @param agentId - The agent requesting knowledge
 * @param knowledgeBaseIds - Array of knowledge base IDs to search
 * @param includeGlobal - Whether to include global/shared chunks
 * @returns Array of knowledge chunks accessible by the agent
 */
export async function getAgentKnowledgeChunks(
  base44: Base44Client,
  agentId: string,
  knowledgeBaseIds: string[],
  includeGlobal: boolean = true,
): Promise<AgentKnowledgeChunk[]> {
  // Validate agent exists
  if (!agentId) {
    logger.error("getAgentKnowledgeChunks called with empty agentId");
    throw new Error("agentId is required");
  }

  // Validate that the agent exists
  const agents = await base44.asServiceRole.entities.Agent.filter({
    id: agentId,
  });
  if (agents.length === 0) {
    logger.error("Agent not found when querying knowledge chunks", {
      agent_id: agentId,
    });
    throw new Error(`Agent with ID ${agentId} not found`);
  }

  if (!knowledgeBaseIds || knowledgeBaseIds.length === 0) {
    logger.warn("getAgentKnowledgeChunks called with empty knowledgeBaseIds", {
      agent_id: agentId,
    });
    return [];
  }

  const allChunks: AgentKnowledgeChunk[] = [];

  for (const kbId of knowledgeBaseIds) {
    try {
      const chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
        knowledge_base_id: kbId,
      });

      if (chunks.length === 0) {
        logger.info("No chunks found for knowledge base", {
          knowledge_base_id: kbId,
          agent_id: agentId,
        });
      }

      for (const chunk of chunks) {
        const scope = chunk.scope || KnowledgeScope.GLOBAL;
        const chunkAgentId = chunk.agent_id;
        const sharedWith = chunk.shared_with_agents || [];

        // Include if:
        // 1. No agent_id set (legacy/global chunks)
        // 2. Chunk is owned by this agent
        // 3. Chunk is shared and agent is in shared list
        // 4. Chunk is global and includeGlobal is true

        if (!chunkAgentId) {
          // Legacy chunk or explicitly global
          if (includeGlobal) {
            allChunks.push(chunk);
          }
        } else if (chunkAgentId === agentId) {
          // Agent's own chunks (private or shared)
          allChunks.push(chunk);
        } else if (
          scope === KnowledgeScope.SHARED && sharedWith.includes(agentId)
        ) {
          // Shared with this agent
          allChunks.push(chunk);
        } else if (scope === KnowledgeScope.GLOBAL && includeGlobal) {
          // Global chunk accessible by all agents
          allChunks.push(chunk);
        }
      }
    } catch (error) {
      logger.error("Failed to retrieve chunks for knowledge base", {
        knowledge_base_id: kbId,
        agent_id: agentId,
        error: error.message,
      });
      // Continue processing other KBs even if one fails
    }
  }

  logger.info("Knowledge chunk retrieval completed", {
    agent_id: agentId,
    total_chunks: allChunks.length,
    knowledge_base_count: knowledgeBaseIds.length,
  });

  return allChunks;
}

/**
 * Add knowledge chunk with agent ownership
 *
 * @param base44 - Base44 client instance
 * @param knowledgeBaseId - Knowledge base ID
 * @param agentId - Owner agent ID (optional, null for global)
 * @param content - Chunk content
 * @param options - Additional options (scope, title, etc.)
 * @returns Created knowledge chunk
 */
export async function addAgentKnowledgeChunk(
  base44: Base44Client,
  knowledgeBaseId: string,
  agentId: string | null,
  content: string,
  options: {
    scope?: string;
    title?: string;
    sourceType?: string;
    sourceRef?: string;
    sharedWithAgents?: string[];
    metadata?: Record<string, any>;
  } = {},
): Promise<AgentKnowledgeChunk> {
  const scope = options.scope ||
    (agentId ? KnowledgeScope.PRIVATE : KnowledgeScope.GLOBAL);

  const chunkData = {
    knowledge_base_id: knowledgeBaseId,
    content,
    title: options.title,
    source_type: options.sourceType || "manual",
    source_ref: options.sourceRef,
    agent_id: agentId,
    scope,
    shared_with_agents: options.sharedWithAgents || [],
    metadata: options.metadata || {},
  };

  return await base44.asServiceRole.entities.KnowledgeChunk.create(chunkData);
}

/**
 * Share knowledge chunks with other agents
 *
 * @param base44 - Base44 client instance
 * @param chunkIds - Array of chunk IDs to share
 * @param targetAgentIds - Array of agent IDs to share with
 * @returns Number of chunks successfully updated
 */
export async function shareKnowledgeWithAgents(
  base44: Base44Client,
  chunkIds: string[],
  targetAgentIds: string[],
): Promise<number> {
  let updatedCount = 0;

  for (const chunkId of chunkIds) {
    try {
      // Fetch current chunk
      const chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
        id: chunkId,
      });

      if (chunks.length === 0) continue;

      const chunk = chunks[0];
      const currentShared = chunk.shared_with_agents || [];

      // Merge with existing shared agents (avoid duplicates)
      const newShared = [...new Set([...currentShared, ...targetAgentIds])];

      // Update chunk with new sharing list and set scope to shared
      await base44.asServiceRole.entities.KnowledgeChunk.update(chunkId, {
        scope: KnowledgeScope.SHARED,
        shared_with_agents: newShared,
      });

      updatedCount++;
    } catch (error) {
      logger.error("Failed to share chunk", {
        chunk_id: chunkId,
        error: error.message,
      });
    }
  }

  return updatedCount;
}

/**
 * Unshare knowledge chunks from specific agents
 *
 * @param base44 - Base44 client instance
 * @param chunkIds - Array of chunk IDs to unshare
 * @param targetAgentIds - Array of agent IDs to remove from sharing
 * @returns Number of chunks successfully updated
 */
export async function unshareKnowledgeFromAgents(
  base44: Base44Client,
  chunkIds: string[],
  targetAgentIds: string[],
): Promise<number> {
  let updatedCount = 0;

  for (const chunkId of chunkIds) {
    try {
      const chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
        id: chunkId,
      });

      if (chunks.length === 0) continue;

      const chunk = chunks[0];
      const currentShared = chunk.shared_with_agents || [];

      // Remove target agents from shared list
      const newShared = currentShared.filter((id: string) => !targetAgentIds.includes(id));

      // If no more agents shared with, revert to private
      const newScope = newShared.length > 0 ? KnowledgeScope.SHARED : KnowledgeScope.PRIVATE;

      await base44.asServiceRole.entities.KnowledgeChunk.update(chunkId, {
        scope: newScope,
        shared_with_agents: newShared,
      });

      updatedCount++;
    } catch (error) {
      logger.error("Failed to unshare chunk", {
        chunk_id: chunkId,
        error: error.message,
      });
    }
  }

  return updatedCount;
}

/**
 * Get all agents that have access to a specific knowledge base
 *
 * @param base44 - Base44 client instance
 * @param knowledgeBaseId - Knowledge base ID
 * @returns Array of agent IDs with access
 */
export async function getAgentsWithKnowledgeAccess(
  base44: Base44Client,
  knowledgeBaseId: string,
): Promise<string[]> {
  // Get all chunks in this KB
  const chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
    knowledge_base_id: knowledgeBaseId,
  });

  const agentIds = new Set<string>();

  for (const chunk of chunks) {
    // Add owner agent
    if (chunk.agent_id) {
      agentIds.add(chunk.agent_id);
    }

    // Add shared agents
    if (chunk.shared_with_agents && Array.isArray(chunk.shared_with_agents)) {
      chunk.shared_with_agents.forEach((id: string) => agentIds.add(id));
    }
  }

  return Array.from(agentIds);
}

/**
 * Get knowledge statistics for an agent
 *
 * @param base44 - Base44 client instance
 * @param agentId - Agent ID
 * @param knowledgeBaseIds - Array of knowledge base IDs
 * @returns Statistics object
 */
export async function getAgentKnowledgeStats(
  base44: Base44Client,
  agentId: string,
  knowledgeBaseIds: string[],
): Promise<{
  totalChunks: number;
  ownChunks: number;
  sharedChunks: number;
  globalChunks: number;
}> {
  const chunks = await getAgentKnowledgeChunks(
    base44,
    agentId,
    knowledgeBaseIds,
    true,
  );

  let ownChunks = 0;
  let sharedChunks = 0;
  let globalChunks = 0;

  for (const chunk of chunks) {
    if (chunk.agent_id === agentId) {
      ownChunks++;
    } else if (chunk.scope === KnowledgeScope.SHARED) {
      sharedChunks++;
    } else {
      globalChunks++;
    }
  }

  return {
    totalChunks: chunks.length,
    ownChunks,
    sharedChunks,
    globalChunks,
  };
}
