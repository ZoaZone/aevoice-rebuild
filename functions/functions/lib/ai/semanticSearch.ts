// lib/ai/semanticSearch.js

import { logger } from "../infra/logger.js";
import { cosineSimilarity, generateEmbedding } from "./embeddingClient.js";
import { getAgentKnowledgeChunks } from "../knowledgeSharing.ts";

/**
 * Performs semantic search across knowledge bases using embeddings.
 * Falls back to keyword matching if embeddings unavailable.
 * Supports agent-specific knowledge filtering.
 */
export async function semanticSearch({
  query,
  knowledgeBases,
  base44 = null,
  limit = 6,
  minScore = 0.7,
  useEmbeddings = true,
  agentId = null, // NEW: Agent ID for filtered search
  includeGlobal = true, // NEW: Include global/shared knowledge
}) {
  if (!query || !knowledgeBases || knowledgeBases.length === 0) {
    return { chunks: [], method: "none" };
  }

  const allChunks = [];
  let method = "keyword";

  // Try embedding-based search first
  if (useEmbeddings && base44) {
    try {
      const queryEmbedding = await generateEmbedding(query);

      // Get knowledge base IDs
      const kbIds = knowledgeBases.map((kb) => kb.id);

      // Use agent-specific filtering if agentId provided
      let chunks;
      if (agentId) {
        chunks = await getAgentKnowledgeChunks(
          base44,
          agentId,
          kbIds,
          includeGlobal,
        );
      } else {
        // Legacy: get all chunks from all KBs
        chunks = [];
        for (const kb of knowledgeBases) {
          const kbChunks = await base44.asServiceRole.entities.KnowledgeChunk
            .filter({
              knowledge_base_id: kb.id,
            });
          chunks.push(...kbChunks);
        }
      }

      for (const chunk of chunks) {
        // Use stored embedding if available
        if (chunk.embedding && chunk.embedding.length > 0) {
          const score = cosineSimilarity(
            queryEmbedding.embedding,
            chunk.embedding,
          );

          if (score >= minScore) {
            allChunks.push({
              content: chunk.content,
              title: chunk.title || "Knowledge",
              kb_id: chunk.knowledge_base_id,
              chunk_id: chunk.id,
              agent_id: chunk.agent_id,
              scope: chunk.scope,
              score,
              method: "embedding",
            });
          }
        } else {
          // Fallback to keyword for chunks without embeddings
          const score = calculateKeywordScore(query, chunk.content);
          if (score >= minScore) {
            allChunks.push({
              content: chunk.content,
              title: chunk.title || "Knowledge",
              kb_id: chunk.knowledge_base_id,
              chunk_id: chunk.id,
              agent_id: chunk.agent_id,
              scope: chunk.scope,
              score,
              method: "keyword",
            });
          }
        }
      }

      method = allChunks.some((c) => c.method === "embedding") ? "embedding" : "keyword";
    } catch (embeddingErr) {
      logger.warn("Embedding search failed, falling back to keyword", {
        error: embeddingErr.message,
      });
      // Fall through to keyword search
    }
  }

  // Keyword fallback if no embedding results
  if (allChunks.length === 0 && base44) {
    method = "keyword";

    // Get knowledge base IDs
    const kbIds = knowledgeBases.map((kb) => kb.id);

    // Use agent-specific filtering if agentId provided
    let chunks;
    if (agentId) {
      chunks = await getAgentKnowledgeChunks(
        base44,
        agentId,
        kbIds,
        includeGlobal,
      );
    } else {
      // Legacy: get all chunks from all KBs
      chunks = [];
      for (const kb of knowledgeBases) {
        try {
          const kbChunks = await base44.asServiceRole.entities.KnowledgeChunk
            .filter({
              knowledge_base_id: kb.id,
            });
          chunks.push(...kbChunks);
        } catch (err) {
          logger.warn("Failed to search KB", {
            kb_id: kb.id,
            error: err.message,
          });
        }
      }
    }

    for (const chunk of chunks) {
      const score = calculateKeywordScore(query, chunk.content);

      if (score >= minScore * 0.8) { // Lower threshold for keyword
        allChunks.push({
          content: chunk.content,
          title: chunk.title || "Knowledge",
          kb_id: chunk.knowledge_base_id,
          chunk_id: chunk.id,
          agent_id: chunk.agent_id,
          scope: chunk.scope,
          score,
          method: "keyword",
        });
      }
    }
  }

  // Also search FAQ data if available
  for (const kb of knowledgeBases) {
    if (kb.faqs && Array.isArray(kb.faqs)) {
      for (const faq of kb.faqs) {
        const faqText = `${faq.question} ${faq.answer}`;
        const score = calculateKeywordScore(query, faqText);

        if (score >= minScore * 0.8) {
          allChunks.push({
            content: `Q: ${faq.question}\nA: ${faq.answer}`,
            title: "FAQ",
            kb_id: kb.id,
            score: score + 0.1, // Slight boost for FAQ matches
            method: "faq",
          });
        }
      }
    }
  }

  // Sort by score and limit
  const sortedChunks = allChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  logger.debug("Semantic search completed", {
    query_length: query.length,
    kb_count: knowledgeBases.length,
    results_count: sortedChunks.length,
    method,
  });

  return {
    chunks: sortedChunks,
    method,
    totalSearched: allChunks.length,
  };
}

/**
 * Keyword-based relevance scoring
 */
function calculateKeywordScore(query, content) {
  if (!query || !content) return 0;

  const queryWords = query.toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const contentLower = content.toLowerCase();

  let matchCount = 0;
  let phraseBonus = 0;

  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      matchCount++;
    }
  }

  // Boost for exact phrase match
  if (contentLower.includes(query.toLowerCase())) {
    phraseBonus = 0.3;
  }

  // Boost for multiple consecutive words
  for (let i = 0; i < queryWords.length - 1; i++) {
    const bigram = `${queryWords[i]} ${queryWords[i + 1]}`;
    if (contentLower.includes(bigram)) {
      phraseBonus += 0.1;
    }
  }

  const baseScore = queryWords.length > 0 ? matchCount / queryWords.length : 0;
  return Math.min(1, baseScore + phraseBonus);
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "and",
  "but",
  "if",
  "or",
  "because",
  "until",
  "while",
  "this",
  "that",
  "these",
  "those",
  "what",
]);
