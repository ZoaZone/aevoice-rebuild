import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { verifyHmacRequest } from "./utils/verifyHmac.ts";

// Validate mandatory secrets in production
const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";
const HELLOBIZ_JWT_SECRET = Deno.env.get("HELLOBIZ_JWT_SECRET");

if (ENV === "production" && !HELLOBIZ_JWT_SECRET) {
  logger.error("FATAL: HELLOBIZ_JWT_SECRET is required in production");
  throw new Error(
    "HELLOBIZ_JWT_SECRET environment variable is required in production",
  );
}

// Parse CORS allowed origins
const ALLOWED_ORIGINS = Deno.env.get("FLOWSYNC_ALLOWED_ORIGINS")?.split(",").map((o) => o.trim()) ||
  [];

/**
 * Get CORS headers based on allowlist
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Hellobiz-Signature, X-Hellobiz-Timestamp, X-Hellobiz-Token",
  };

  // If origin is in allowlist, set it; otherwise omit or set to null
  if (
    origin && ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)
  ) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else if (ALLOWED_ORIGINS.length === 0) {
    // No allowlist configured - default to wildcard (development mode)
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("Origin");

  try {
    logger.info("FlowSync hook received", { request_id: requestId, origin });

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: getCorsHeaders(origin) },
      );
    }

    const base44 = createClientFromRequest(req);

    // HMAC signature verification (required in production)
    const isHmacValid = await verifyHmacRequest(
      req,
      "HELLOBIZ_JWT_SECRET",
      "X-Hellobiz",
    );

    if (!isHmacValid) {
      // Fallback to legacy token auth for backward compatibility (warn in logs)
      const secret = HELLOBIZ_JWT_SECRET;
      const token = req.headers.get("x-hellobiz-token") ||
        req.headers.get("authorization")?.replace("Bearer ", "");

      if (!secret || token !== secret) {
        logger.error("HelloBiz hook unauthorized", {
          request_id: requestId,
          has_hmac: false,
          has_token: !!token,
        });
        return Response.json(
          { error: "Unauthorized" },
          { status: 401, headers: getCorsHeaders(origin) },
        );
      }

      logger.warn("HelloBiz hook using legacy token auth (deprecated)", {
        request_id: requestId,
      });
    }

    let bodyText = "";
    if (helloBizSecret) {
      bodyText = await req.text();
      const hmacResult = await verifyHmacRequest({
        secret: helloBizSecret,
        request: req,
        signatureHeader: "x-hellobiz-signature",
        timestampHeader: "x-hellobiz-timestamp",
        body: bodyText,
        requestId,
      });

      if (!hmacResult.isValid) {
        logger.warn("HelloBiz hook HMAC verification failed", {
          request_id: requestId,
          error: hmacResult.error,
        });
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      // No HMAC secret configured, read body normally
      bodyText = await req.text();
    }

    // Parse body after HMAC verification or reading
    const body = JSON.parse(bodyText || "{}");
    const { event, data } = body;

    // Store event for debugging
    // SECURITY FIX: Log debug log creation failures instead of silently swallowing
    await base44.asServiceRole.entities.DebugLog.create({
      source: "flowsync",
      level: "info",
      message: event || "unknown",
      metadata: data || body,
      created_at: new Date().toISOString(),
    }).catch((err) => {
      console.error("[flowsyncHooks] DebugLog creation failed", {
        event,
        error: err?.message || String(err),
      });
    });

    // Basic router: emit automations or updates if needed later
    return Response.json(
      { success: true },
      { headers: getCorsHeaders(origin) },
    );
  } catch (e) {
    logger.error("FlowSync hook failed", {
      request_id: requestId,
      error: e.message,
    });
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(origin) },
    );
  }
});
