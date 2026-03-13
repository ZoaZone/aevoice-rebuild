// functions/getCacheStats.ts
// API endpoint to retrieve response cache statistics and manage cache

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.ts";
import { globalCache } from "./lib/infra/responseCache.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return jsonError({ error: "Authentication required" }, 401);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "stats", "clear", "clear_agent"
    const agentId = url.searchParams.get("agent_id");

    // GET - Get cache statistics
    if (req.method === "GET") {
      const stats = globalCache.getStats();

      logger.info("Cache stats retrieved", {
        request_id: requestId,
        stats,
      });

      return Response.json({
        success: true,
        data: {
          stats,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // POST - Cleanup expired entries
    if (req.method === "POST" && action === "cleanup") {
      globalCache.cleanup();

      const stats = globalCache.getStats();

      logger.info("Cache cleanup performed", {
        request_id: requestId,
        stats,
      });

      return Response.json({
        success: true,
        message: "Cache cleanup completed",
        data: { stats },
      });
    }

    // DELETE - Clear cache
    if (req.method === "DELETE") {
      if (agentId) {
        // Clear cache for specific agent
        globalCache.clearAgent(agentId);

        logger.info("Agent cache cleared", {
          request_id: requestId,
          agent_id: agentId,
        });

        return Response.json({
          success: true,
          message: `Cache cleared for agent ${agentId}`,
          data: { stats: globalCache.getStats() },
        });
      } else {
        // Clear all cache
        globalCache.clear();

        logger.info("Global cache cleared", {
          request_id: requestId,
        });

        return Response.json({
          success: true,
          message: "All cache cleared",
          data: { stats: globalCache.getStats() },
        });
      }
    }

    return jsonError({ error: "Invalid action" }, 400);
  } catch (error) {
    logger.error("Failed to process cache request", {
      request_id: requestId,
      error: (error as Error).message,
    });

    return jsonError(
      { error: "Failed to process cache request" },
      500,
    );
  }
});

function jsonError(body: any, status = 400) {
  return new Response(JSON.stringify({ success: false, ...body }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
