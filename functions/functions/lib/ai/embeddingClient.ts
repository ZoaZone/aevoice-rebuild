// lib/ai/embeddingClient.js

import OpenAI from "npm:openai@4.28.0";
import { logger } from "../infra/logger.js";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required for embedding");
  }

  const cleanText = text.trim().slice(0, 8000); // Max ~8k chars

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanText,
    });

    return {
      embedding: response.data[0].embedding,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err) {
    logger.error("Embedding generation failed", { error: err.message });
    throw err;
  }
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddingsBatch(texts, batchSize = 100) {
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const results = [];
  const batches = [];

  // Split into batches
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const cleanBatch = batch.map((t) => (t || "").trim().slice(0, 8000));

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: cleanBatch,
      });

      for (let i = 0; i < response.data.length; i++) {
        results.push({
          embedding: response.data[i].embedding,
          model: EMBEDDING_MODEL,
          index: response.data[i].index,
        });
      }
    } catch (err) {
      logger.error("Batch embedding failed", {
        error: err.message,
        batchSize: batch.length,
      });
      // Fill with nulls for failed batch
      for (let i = 0; i < batch.length; i++) {
        results.push(null);
      }
    }
  }

  return results;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL };
