// functions/callAnalytics.js
// AEVOICE Call Analytics & Metrics Service
//
// Provides:
// - Calls per day/tenant
// - Containment rate
// - LLM cost per tenant
// - KB retrieval latency
// - Error rates
// - Token usage

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

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

  const { tenant_id, date_from, date_to, agent_id } = body;

  if (!tenant_id) {
    return Response.json({ error: "tenant_id is required" }, { status: 400 });
  }

  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }

  try {
    // ===================== FETCH CALL SESSIONS =====================
    const filter = { client_id: tenant_id };
    if (agent_id) filter.agent_id = agent_id;

    const callSessions = await base44.asServiceRole.entities.CallSession.filter(
      filter,
    );

    // Filter by date range if provided
    let filteredSessions = callSessions || [];
    if (date_from || date_to) {
      const from = date_from ? new Date(date_from) : new Date(0);
      const to = date_to ? new Date(date_to) : new Date();

      filteredSessions = filteredSessions.filter((s) => {
        const sessionDate = new Date(s.started_at || s.created_date);
        return sessionDate >= from && sessionDate <= to;
      });
    }

    // ===================== COMPUTE METRICS =====================
    const totalCalls = filteredSessions.length;

    // Calls by status
    const statusCounts = {};
    filteredSessions.forEach((s) => {
      const status = s.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Calls by outcome
    const outcomeCounts = {};
    filteredSessions.forEach((s) => {
      const outcome = s.outcome || "no_outcome";
      outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
    });

    // Containment rate (calls handled without transfer)
    const containedCalls = filteredSessions.filter((s) =>
      s.status === "completed" && s.outcome !== "transferred"
    ).length;
    const containmentRate = totalCalls > 0 ? (containedCalls / totalCalls) * 100 : 0;

    // Average duration
    const totalDuration = filteredSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    // Calls per day
    const callsByDay = {};
    filteredSessions.forEach((s) => {
      const date = new Date(s.started_at || s.created_date).toISOString().split("T")[0];
      callsByDay[date] = (callsByDay[date] || 0) + 1;
    });

    // Token usage (from usage_stats)
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    filteredSessions.forEach((s) => {
      if (s.usage_stats) {
        totalTokensIn += s.usage_stats.llm_tokens_in || 0;
        totalTokensOut += s.usage_stats.llm_tokens_out || 0;
      }
    });

    // Estimated cost (rough estimate: $0.002 per 1K tokens)
    const estimatedCost = ((totalTokensIn + totalTokensOut) / 1000) * 0.002;

    // Sentiment breakdown
    const sentimentCounts = {};
    filteredSessions.forEach((s) => {
      const sentiment = s.sentiment || "neutral";
      sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
    });

    // Calls by agent
    const callsByAgent = {};
    filteredSessions.forEach((s) => {
      const aid = s.agent_id || "unknown";
      callsByAgent[aid] = (callsByAgent[aid] || 0) + 1;
    });

    // Error rate
    const errorCalls = filteredSessions.filter((s) =>
      s.status === "failed" || s.status === "error"
    ).length;
    const errorRate = totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0;

    return Response.json({
      success: true,
      tenant_id,
      date_range: {
        from: date_from || "all_time",
        to: date_to || "now",
      },
      metrics: {
        total_calls: totalCalls,
        total_duration_minutes: Math.round(totalDuration / 60),
        avg_duration_seconds: Math.round(avgDuration),
        containment_rate: Math.round(containmentRate * 10) / 10,
        error_rate: Math.round(errorRate * 10) / 10,
        tokens: {
          total_in: totalTokensIn,
          total_out: totalTokensOut,
          estimated_cost_usd: Math.round(estimatedCost * 100) / 100,
        },
      },
      breakdown: {
        by_status: statusCounts,
        by_outcome: outcomeCounts,
        by_sentiment: sentimentCounts,
        by_agent: callsByAgent,
        by_day: Object.entries(callsByDay).map(([date, count]) => ({
          date,
          count,
        }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
