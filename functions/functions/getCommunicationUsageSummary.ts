// functions/getCommunicationUsageSummary.js
// Returns billing/usage summary for communications

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonError({
      error_code: "METHOD_NOT_ALLOWED",
      error: "Method not allowed",
    }, 405);
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return jsonError({
        error_code: "UNAUTHORIZED",
        error: "Authentication required",
      }, 401);
    }

    // Get client
    const clients = await base44.entities.Client.filter({
      contact_email: user.email,
    });
    const client = clients[0];

    if (!client) {
      return jsonError(
        { error_code: "NO_CLIENT", error: "No client found" },
        404,
      );
    }

    // Parse date range from query params or body
    let from, to;
    if (req.method === "GET") {
      const url = new URL(req.url);
      from = url.searchParams.get("from");
      to = url.searchParams.get("to");
    } else {
      const body = await req.json();
      from = body.from;
      to = body.to;
    }

    // Fetch usage records
    const usage = await base44.entities.CommunicationUsage.filter({
      client_id: client.id,
    });

    // Filter by date if provided
    let filteredUsage = usage;
    if (from || to) {
      filteredUsage = usage.filter((u) => {
        const sentAt = new Date(u.sent_at || u.created_date);
        if (from && sentAt < new Date(from)) return false;
        if (to && sentAt > new Date(to)) return false;
        return true;
      });
    }

    // Calculate summary
    const summary = {
      total_cost: 0,
      total_count: filteredUsage.length,
      email: { count: 0, cost: 0 },
      sms: { count: 0, cost: 0 },
      voice: { count: 0, cost: 0, total_minutes: 0 },
      whatsapp: { count: 0, cost: 0 },
    };

    for (const u of filteredUsage) {
      const t = u.type || "email";
      const cost = u.total_cost || 0;

      summary.total_cost += cost;

      if (!summary[t]) {
        summary[t] = { count: 0, cost: 0 };
      }

      summary[t].count++;
      summary[t].cost += cost;

      // Track voice minutes
      if (t === "voice" && u.duration_seconds) {
        summary.voice.total_minutes += Math.ceil(u.duration_seconds / 60);
      }
    }

    logger.info("Usage summary fetched", {
      request_id: requestId,
      client_id: client.id,
      total_count: summary.total_count,
    });

    return new Response(
      JSON.stringify({ success: true, summary, request_id: requestId }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    logger.error("getCommunicationUsageSummary failed", {
      request_id: requestId,
      error: err.message,
    });

    return jsonError({ error_code: "INTERNAL_ERROR", error: err.message }, 500);
  }
});

function jsonError(body, status = 400) {
  return new Response(JSON.stringify({ success: false, ...body }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
