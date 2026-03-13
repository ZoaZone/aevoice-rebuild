// Knowledge Base Configuration Constants
// This file contains configuration for knowledge chunk limits and management

/**
 * Maximum number of knowledge chunks per agent/knowledge base
 *
 * Tiered limits based on plan type:
 * - Regular plans: 100 chunks (200,000 characters at 2000 chars/chunk)
 * - White glove plans: 500 chunks (1,000,000 characters)
 * - Free partners: UNLIMITED (matching unlimited credits)
 */
export const MAX_KNOWLEDGE_CHUNKS = {
  REGULAR: 100,
  WHITE_GLOVE: 500,
  FREE_PARTNER: -1, // -1 means unlimited
  DEFAULT: 100, // Default for all plans unless specified
};

/**
 * Knowledge chunk size in characters
 * Optimal size for semantic search and embedding generation
 */
export const KNOWLEDGE_CHUNK_SIZE = 2000;

/**
 * Knowledge scope types for multi-agent architecture
 */
export enum KnowledgeScope {
  PRIVATE = "private", // Only accessible by the owning agent
  SHARED = "shared", // Accessible by multiple agents in the account
  GLOBAL = "global", // Accessible by all agents in the account
}

/**
 * Get the maximum chunk limit for a given plan type
 * @param planType - The plan type identifier
 * @returns Maximum number of chunks allowed (-1 for unlimited)
 */
export function getMaxChunksForPlan(planType?: string): number {
  if (!planType) return MAX_KNOWLEDGE_CHUNKS.DEFAULT;

  const planTypeLower = planType.toLowerCase();

  if (planTypeLower.includes("free") || planTypeLower.includes("partner")) {
    return MAX_KNOWLEDGE_CHUNKS.FREE_PARTNER;
  }

  if (planTypeLower.includes("white") || planTypeLower.includes("glove")) {
    return MAX_KNOWLEDGE_CHUNKS.WHITE_GLOVE;
  }

  return MAX_KNOWLEDGE_CHUNKS.REGULAR;
}

/**
 * Check if chunk limit should be enforced
 * @param planType - The plan type identifier
 * @param currentChunkCount - Current number of chunks
 * @returns true if more chunks can be added, false if limit reached
 */
export function canAddMoreChunks(
  planType: string | undefined,
  currentChunkCount: number,
): boolean {
  const maxChunks = getMaxChunksForPlan(planType);

  // -1 means unlimited
  if (maxChunks === -1) return true;

  return currentChunkCount < maxChunks;
}

/**
 * Get remaining chunks available
 * @param planType - The plan type identifier
 * @param currentChunkCount - Current number of chunks
 * @returns Number of chunks that can still be added (-1 for unlimited)
 */
export function getRemainingChunks(
  planType: string | undefined,
  currentChunkCount: number,
): number {
  const maxChunks = getMaxChunksForPlan(planType);

  if (maxChunks === -1) return -1; // Unlimited

  return Math.max(0, maxChunks - currentChunkCount);
}
