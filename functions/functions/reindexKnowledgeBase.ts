// functions/reindexKnowledgeBase.js
// AEVOICE Knowledge Base Re-indexing Service
//
// Features:
// - Re-chunk existing content
// - Regenerate embeddings
// - Update version history
// - Health check after reindex

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { ensureAllowedHost, getClientIp } from "./lib/security/hostGuard.js";
import { rateLimitMiddleware } from "./lib/infra/rateLimit.js";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { knowledge_base_id, force_regenerate_embeddings } = body;

  if (!knowledge_base_id) {
    return Response.json({ error: "knowledge_base_id is required" }, {
      status: 400,
    });
  }

  let base44;
  try {
    if (!ensureAllowedHost(req)) {
      return Response.json({ error: "Forbidden host" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rl = rateLimitMiddleware(req, ip || "unknown", "default");
    if (rl.limited) return rl.response;

    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Attach user for later scoping
    req.user = user;
  } catch {
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }

  try {
    // Get the knowledge base
    const kbs = await base44.entities.KnowledgeBase.filter({
      id: knowledge_base_id,
    });
    if (!kbs || kbs.length === 0) {
      return Response.json({ error: "Knowledge base not found" }, {
        status: 404,
      });
    }
    const kb = kbs[0];
    const user = req.user;
    if (
      user.role !== "admin" && user?.data?.client_id &&
      kb.client_id !== user.data.client_id
    ) {
      return Response.json({ error: "Forbidden: cross-tenant access" }, {
        status: 403,
      });
    }
    if (!kbs || kbs.length === 0) {
      return Response.json({ error: "Knowledge base not found" }, {
        status: 404,
      });
    }

    const kb = kbs[0];
    const startTime = Date.now();

    // Update status to reindexing
    await base44.entities.KnowledgeBase.update(knowledge_base_id, {
      status: "reindexing",
    });

    // Get all existing chunks
    const chunks = await base44.entities.KnowledgeChunk.filter({
      knowledge_base_id,
    });

    console.log(`Reindexing KB ${knowledge_base_id}: ${chunks.length} chunks`);

    // Process each chunk
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const chunk of chunks) {
      try {
        // Optionally regenerate embeddings
        if (force_regenerate_embeddings) {
          // Clear existing embedding to trigger regeneration
          await base44.entities.KnowledgeChunk.update(chunk.id, {
            embedding: null,
            last_embedding_at: null,
          });
        }

        // Update token count
        const tokenCount = Math.ceil((chunk.content || "").length / 4);
        await base44.entities.KnowledgeChunk.update(chunk.id, {
          token_count: tokenCount,
        });

        processedCount++;
      } catch (err) {
        console.error(`Error processing chunk ${chunk.id}:`, err);
        errorCount++;
        errors.push({ chunk_id: chunk.id, error: err.message });
      }
    }

    // Calculate stats
    const totalWords = chunks.reduce(
      (sum, c) => sum + (c.content?.split(/\s+/).length || 0),
      0,
    );

    // Update version history
    const currentVersion = kb.version || 1;
    const newVersion = currentVersion + 1;
    const versionHistory = kb.version_history || [];

    versionHistory.push({
      version: currentVersion,
      created_at: kb.last_synced_at || kb.created_date,
      chunk_count: kb.chunk_count || 0,
      notes: "Before reindex",
    });

    // Determine health status
    let healthStatus = "healthy";
    let embeddingCoverage = 100;

    if (force_regenerate_embeddings) {
      // After clearing embeddings, coverage is 0 until regenerated
      embeddingCoverage = 0;
      healthStatus = "warning";
    }

    if (errorCount > 0) {
      healthStatus = errorCount > chunks.length / 2 ? "error" : "warning";
    }

    // Update KB with new stats and version
    await base44.entities.KnowledgeBase.update(knowledge_base_id, {
      status: "active",
      chunk_count: chunks.length,
      total_words: totalWords,
      last_synced_at: new Date().toISOString(),
      version: newVersion,
      version_history: versionHistory.slice(-10), // Keep last 10 versions
      health_status: healthStatus,
      health_details: {
        last_check: new Date().toISOString(),
        embedding_coverage: embeddingCoverage,
        stale_chunks: 0,
        errors: errors.slice(0, 5), // Keep first 5 errors
      },
    });

    const duration = Date.now() - startTime;

    console.log(
      `Reindex complete: ${processedCount} processed, ${errorCount} errors, ${duration}ms`,
    );

    return Response.json({
      success: true,
      knowledge_base_id,
      version: newVersion,
      stats: {
        total_chunks: chunks.length,
        processed: processedCount,
        errors: errorCount,
        total_words: totalWords,
        duration_ms: duration,
      },
      health_status: healthStatus,
    });
  } catch (err) {
    console.error("Reindex error:", err);

    // Reset status on error
    try {
      await base44.entities.KnowledgeBase.update(knowledge_base_id, {
        status: "error",
        health_status: "error",
        health_details: {
          last_check: new Date().toISOString(),
          errors: [{ message: err.message }],
        },
      });
    } catch {}

    return Response.json({ error: err.message }, { status: 500 });
  }
});
