// functions/getLatencyMetrics.ts
// API endpoint to retrieve and analyze latency metrics

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.ts";
import { calculatePercentiles } from "./lib/infra/latencyTracker.ts";
import type { LatencyMetric } from "./lib/types/index.ts";

interface QueryParams {
  platform?: "sri" | "aeva" | "all";
  startDate?: string;
  endDate?: string;
  agentId?: string;
  clientId?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return jsonError({ error: "Method not allowed" }, 405);
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return jsonError({ error: "Authentication required" }, 401);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const params: QueryParams = {
      platform: (url.searchParams.get("platform") as any) || "all",
      startDate: url.searchParams.get("start_date") ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Default: last 24 hours
      endDate: url.searchParams.get("end_date") || new Date().toISOString(),
      agentId: url.searchParams.get("agent_id") || undefined,
      clientId: url.searchParams.get("client_id") || undefined,
      limit: parseInt(url.searchParams.get("limit") || "1000"),
    };

    logger.info("Latency metrics query", {
      request_id: requestId,
      params,
    });

    // Build filter
    const filter: Record<string, unknown> = {
      created_date: {
        $gte: params.startDate,
        $lte: params.endDate,
      },
    };

    if (params.platform !== "all") {
      filter.platform = params.platform;
    }

    if (params.agentId) {
      filter.agent_id = params.agentId;
    }

    if (params.clientId) {
      filter.client_id = params.clientId;
    }

    // Fetch metrics
    const metrics = await base44.asServiceRole.entities.LatencyMetric.filter(
      filter,
    );

    if (!metrics || metrics.length === 0) {
      return Response.json({
        success: true,
        data: {
          count: 0,
          metrics: [],
          summary: null,
        },
      });
    }

    // Calculate summary statistics
    const sriMetrics = metrics.filter((m: LatencyMetric) => m.platform === "sri");
    const aevaMetrics = metrics.filter((m: LatencyMetric) => m.platform === "aeva");

    const calculateStats = (platformMetrics: LatencyMetric[]) => {
      if (platformMetrics.length === 0) return null;

      const totalLatencies = platformMetrics.map(
        (m) => m.latencies?.totalResponseTime || 0,
      );
      const sttLatencies = platformMetrics
        .filter((m) => m.latencies?.stt)
        .map((m) => m.latencies.stt);
      const aiLatencies = platformMetrics
        .filter((m) => m.latencies?.aiProcessing)
        .map((m) => m.latencies.aiProcessing);
      const ttsLatencies = platformMetrics
        .filter((m) => m.latencies?.tts)
        .map((m) => m.latencies.tts);

      const totalPercentiles = calculatePercentiles(totalLatencies);
      const avgTotal = totalLatencies.reduce((a, b) => a + b, 0) /
        totalLatencies.length;

      return {
        count: platformMetrics.length,
        totalResponseTime: {
          avg: Math.round(avgTotal),
          p50: totalPercentiles.p50,
          p95: totalPercentiles.p95,
          p99: totalPercentiles.p99,
          min: Math.min(...totalLatencies),
          max: Math.max(...totalLatencies),
        },
        stt: sttLatencies.length > 0
          ? {
            avg: Math.round(
              sttLatencies.reduce((a, b) => a + b, 0) / sttLatencies.length,
            ),
            ...calculatePercentiles(sttLatencies),
          }
          : null,
        aiProcessing: aiLatencies.length > 0
          ? {
            avg: Math.round(
              aiLatencies.reduce((a, b) => a + b, 0) / aiLatencies.length,
            ),
            ...calculatePercentiles(aiLatencies),
          }
          : null,
        tts: ttsLatencies.length > 0
          ? {
            avg: Math.round(
              ttsLatencies.reduce((a, b) => a + b, 0) / ttsLatencies.length,
            ),
            ...calculatePercentiles(ttsLatencies),
          }
          : null,
        meetsTarget: {
          p50Below150: totalPercentiles.p50 < 150,
          p95Below200: totalPercentiles.p95 < 200,
          p99Below300: totalPercentiles.p99 < 300,
        },
      };
    };

    const summary = {
      overall: calculateStats(metrics),
      sri: sriMetrics.length > 0 ? calculateStats(sriMetrics) : null,
      aeva: aevaMetrics.length > 0 ? calculateStats(aevaMetrics) : null,
    };

    // Return top N most recent metrics along with summary
    const recentMetrics = metrics
      .sort(
        (a: LatencyMetric, b: LatencyMetric) =>
          new Date(b.created_date).getTime() -
          new Date(a.created_date).getTime(),
      )
      .slice(0, Math.min(params.limit || 100, 100));

    logger.info("Latency metrics retrieved", {
      request_id: requestId,
      count: metrics.length,
      sri_count: sriMetrics.length,
      aeva_count: aevaMetrics.length,
    });

    return Response.json({
      success: true,
      data: {
        count: metrics.length,
        summary,
        metrics: recentMetrics,
        query: params,
      },
    });
  } catch (error) {
    logger.error("Failed to retrieve latency metrics", {
      request_id: requestId,
      error: (error as Error).message,
    });

    return jsonError(
      { error: "Failed to retrieve latency metrics" },
      500,
    );
  }
});

function jsonError(body: Record<string, unknown>, status = 400) {
  return new Response(JSON.stringify({ success: false, ...body }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
