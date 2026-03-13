// functions/kbHealthCheck.js
// AEVOICE Knowledge Base Health Check Service
//
// Checks:
// - Embedding coverage
// - Stale chunks (not updated recently)
// - Content quality
// - Retrieval performance

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

  const { knowledge_base_id } = body;

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

    // Get all chunks
    const chunks = await base44.entities.KnowledgeChunk.filter({
      knowledge_base_id,
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate health metrics
    let chunksWithEmbedding = 0;
    let staleChunks = 0;
    let emptyChunks = 0;
    let shortChunks = 0;
    let totalTokens = 0;
    const issues = [];

    for (const chunk of chunks) {
      // Check embedding
      if (
        chunk.embedding && Array.isArray(chunk.embedding) &&
        chunk.embedding.length > 0
      ) {
        chunksWithEmbedding++;
      }

      // Check staleness
      const updatedAt = new Date(chunk.updated_date || chunk.created_date);
      if (updatedAt < thirtyDaysAgo) {
        staleChunks++;
      }

      // Check content quality
      const content = chunk.content || "";
      if (!content.trim()) {
        emptyChunks++;
        issues.push({ type: "empty_chunk", chunk_id: chunk.id });
      } else if (content.length < 50) {
        shortChunks++;
      }

      // Token count
      totalTokens += chunk.token_count || Math.ceil(content.length / 4);
    }

    // Calculate scores
    const embeddingCoverage = chunks.length > 0
      ? Math.round((chunksWithEmbedding / chunks.length) * 100)
      : 0;

    const freshnessScore = chunks.length > 0
      ? Math.round(((chunks.length - staleChunks) / chunks.length) * 100)
      : 100;

    const contentQualityScore = chunks.length > 0
      ? Math.round(
        ((chunks.length - emptyChunks - shortChunks) / chunks.length) * 100,
      )
      : 0;

    // Overall health status
    let healthStatus = "healthy";
    if (embeddingCoverage < 50 || contentQualityScore < 50) {
      healthStatus = "error";
    } else if (
      embeddingCoverage < 80 || freshnessScore < 50 || contentQualityScore < 80
    ) {
      healthStatus = "warning";
    }

    // Add issues based on scores
    if (embeddingCoverage < 80) {
      issues.push({
        type: "low_embedding_coverage",
        message: `Only ${embeddingCoverage}% of chunks have embeddings`,
        severity: embeddingCoverage < 50 ? "error" : "warning",
      });
    }

    if (staleChunks > chunks.length * 0.3) {
      issues.push({
        type: "stale_content",
        message: `${staleChunks} chunks haven't been updated in 30+ days`,
        severity: "warning",
      });
    }

    if (emptyChunks > 0) {
      issues.push({
        type: "empty_content",
        message: `${emptyChunks} chunks have no content`,
        severity: "error",
      });
    }

    // Recommendations
    const recommendations = [];
    if (embeddingCoverage < 100) {
      recommendations.push("Run re-indexing to generate missing embeddings");
    }
    if (staleChunks > 0) {
      recommendations.push("Consider updating or removing stale content");
    }
    if (chunks.length === 0) {
      recommendations.push("Add content to your knowledge base");
    }
    if (shortChunks > chunks.length * 0.2) {
      recommendations.push("Consider merging or expanding short chunks");
    }

    // Update KB with health info
    await base44.entities.KnowledgeBase.update(knowledge_base_id, {
      health_status: healthStatus,
      health_details: {
        last_check: now.toISOString(),
        embedding_coverage: embeddingCoverage,
        stale_chunks: staleChunks,
        errors: issues.filter((i) => i.severity === "error").slice(0, 5),
      },
    });

    return Response.json({
      success: true,
      knowledge_base_id,
      health_status: healthStatus,
      metrics: {
        total_chunks: chunks.length,
        chunks_with_embedding: chunksWithEmbedding,
        embedding_coverage: embeddingCoverage,
        stale_chunks: staleChunks,
        empty_chunks: emptyChunks,
        short_chunks: shortChunks,
        total_tokens: totalTokens,
        freshness_score: freshnessScore,
        content_quality_score: contentQualityScore,
      },
      issues: issues.slice(0, 10),
      recommendations,
    });
  } catch (err) {
    console.error("Health check error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
