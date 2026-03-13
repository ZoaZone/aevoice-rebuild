// functions/getLastDebugInfo.js
// Retrieve debug info for Agent Testing Sandbox

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

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return jsonError({
        error_code: "UNAUTHORIZED",
        error: "Authentication required",
      }, 401);
    }

    // Get client for the user
    const clients = await base44.entities.Client.filter({
      contact_email: user.email,
    });
    const client = clients[0];

    if (!client) {
      return jsonError({
        error_code: "NO_CLIENT",
        error: "No client found for user",
      }, 404);
    }

    // Parse request - support both GET query params and POST body
    let targetRequestId;

    if (req.method === "GET") {
      const url = new URL(req.url);
      targetRequestId = url.searchParams.get("request_id");
    } else if (req.method === "POST") {
      const body = await req.json();
      targetRequestId = body.request_id;
    }

    if (!targetRequestId) {
      return jsonError({
        error_code: "INVALID_REQUEST",
        error: "request_id is required",
      }, 400);
    }

    // Fetch debug log
    const logs = await base44.asServiceRole.entities.DebugLog.filter({
      request_id: targetRequestId,
      client_id: client.id,
    });

    if (!logs.length) {
      return jsonError({
        error_code: "NOT_FOUND",
        error: "No debug info found for this request",
      }, 404);
    }

    const latest = logs[logs.length - 1];

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        debug: latest.payload,
        agent_id: latest.agent_id,
        created_at: latest.created_at,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    logger.error("getLastDebugInfo failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonError({
      error_code: "INTERNAL_ERROR",
      error: "Failed to fetch debug info",
    }, 500);
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
