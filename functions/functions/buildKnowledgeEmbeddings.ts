// functions/buildKnowledgeEmbeddings.js

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { generateEmbeddingsBatch } from "./lib/ai/embeddingClient.js";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { knowledge_base_id, force_rebuild = false } = body;

    if (!knowledge_base_id) {
      return Response.json({ error: "knowledge_base_id is required" }, {
        status: 400,
      });
    }

    logger.info("Building embeddings for KB", {
      request_id: requestId,
      kb_id: knowledge_base_id,
      user_email: user.email,
    });

    // Fetch KB
    const kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({
      id: knowledge_base_id,
    });

    if (kbs.length === 0) {
      return Response.json({ error: "Knowledge base not found" }, {
        status: 404,
      });
    }

    const kb = kbs[0];

    // Update KB status
    await base44.asServiceRole.entities.KnowledgeBase.update(kb.id, {
      status: "processing",
    });

    // Fetch chunks
    const chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
      knowledge_base_id: kb.id,
    });

    if (chunks.length === 0) {
      await base44.asServiceRole.entities.KnowledgeBase.update(kb.id, {
        status: "active",
        chunk_count: 0,
        total_words: 0,
      });
      return Response.json({
        success: true,
        message: "No chunks to embed",
        chunks_processed: 0,
      });
    }

    // Filter chunks that need embedding and have valid content
    const chunksToEmbed = force_rebuild
      ? chunks.filter((c) => c.content && c.content.trim().length > 0)
      : chunks.filter((c) =>
        c.content &&
        c.content.trim().length > 0 &&
        (!c.embedding || c.embedding.length === 0)
      );

    logger.info("Chunks filtered for embedding", {
      request_id: requestId,
      total_chunks: chunks.length,
      chunks_to_embed: chunksToEmbed.length,
      chunks_without_content: chunks.filter((c) =>
        !c.content || c.content.trim().length === 0
      ).length,
    });

    if (chunksToEmbed.length === 0) {
      await base44.asServiceRole.entities.KnowledgeBase.update(kb.id, {
        status: "active",
      });
      return Response.json({
        success: true,
        message: "All chunks already have embeddings",
        chunks_processed: 0,
      });
    }

    // Generate embeddings in batches
    const texts = chunksToEmbed.map((c) => c.content);
    const embeddings = await generateEmbeddingsBatch(texts, 50);

    // Update chunks with embeddings
    let successCount = 0;
    let errorCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < chunksToEmbed.length; i++) {
      const chunk = chunksToEmbed[i];
      const embeddingResult = embeddings[i];

      if (embeddingResult && embeddingResult.embedding) {
        try {
          await base44.asServiceRole.entities.KnowledgeChunk.update(chunk.id, {
            embedding: embeddingResult.embedding,
            embedding_model: embeddingResult.model || "text-embedding-3-small",
            last_embedding_at: now,
          });
          successCount++;
        } catch (err) {
          logger.error("Failed to update chunk embedding", {
            chunk_id: chunk.id,
            error: err.message,
          });
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }

    // Calculate total words
    const totalWords = chunks.reduce((sum, c) => {
      return sum + (c.content ? c.content.split(/\s+/).length : 0);
    }, 0);

    // Update KB with final stats
    await base44.asServiceRole.entities.KnowledgeBase.update(kb.id, {
      status: errorCount === chunksToEmbed.length ? "error" : "active",
      chunk_count: chunks.length,
      total_words: totalWords,
      last_synced_at: now,
    });

    logger.info("Embeddings build completed", {
      request_id: requestId,
      kb_id: knowledge_base_id,
      chunks_processed: successCount,
      errors: errorCount,
    });

    return Response.json({
      success: true,
      chunks_processed: successCount,
      chunks_failed: errorCount,
      total_chunks: chunks.length,
      total_words: totalWords,
    });
  } catch (error) {
    logger.error("Build embeddings failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    console.error("Error building knowledge embeddings:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
      requestId: requestId,
      knowledgeBaseId: knowledge_base_id,
    });

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
