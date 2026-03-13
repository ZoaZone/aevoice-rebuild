import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { verifyHmacRequest } from "./utils/verifyHmac.ts";
import { ensureTenantOwnership } from "./utils/tenantValidation.ts";
import { isUrlAllowedForTenant } from "./utils/urlAllowlist.ts";

// Validate mandatory secrets in production
const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";
const FLOWSYNC_TRIGGER_SECRET = Deno.env.get("FLOWSYNC_TRIGGER_SECRET");
const FLOWSYNC_API_KEY = Deno.env.get("FLOWSYNC_API_KEY");

if (ENV === "production") {
  if (!FLOWSYNC_TRIGGER_SECRET && !FLOWSYNC_API_KEY) {
    logger.error(
      "FATAL: FLOWSYNC_TRIGGER_SECRET or FLOWSYNC_API_KEY required in production",
    );
    throw new Error(
      "FLOWSYNC_TRIGGER_SECRET or FLOWSYNC_API_KEY environment variable is required in production",
    );
  }
}

// Parse CORS allowed origins
const ALLOWED_ORIGINS = Deno.env.get("FLOWSYNC_ALLOWED_ORIGINS")?.split(",").map((o) => o.trim()) ||
  [];

// Validate CORS configuration in production
if (ENV === "production" && ALLOWED_ORIGINS.length === 0) {
  logger.error(
    "FATAL: FLOWSYNC_ALLOWED_ORIGINS must be configured in production",
  );
  throw new Error(
    "FLOWSYNC_ALLOWED_ORIGINS environment variable is required in production for security",
  );
}

/**
 * Get CORS headers based on allowlist
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Flowsync-Signature, X-Flowsync-Timestamp",
  };

  // If origin is in allowlist, set it; otherwise omit or set to null
  if (
    origin && ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)
  ) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else if (ALLOWED_ORIGINS.length === 0 && ENV !== "production") {
    // No allowlist configured - default to wildcard (development mode only)
    headers["Access-Control-Allow-Origin"] = "*";
  }
  // In production with no matching origin, we don't set CORS headers, which will cause browser to reject

  return headers;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("Origin");

  try {
    logger.info("FlowSync trigger received", { request_id: requestId, origin });

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: getCorsHeaders(origin) },
      );
    }

    const base44 = createClientFromRequest(req);

    // Authentication: HMAC signature (preferred) or Bearer token (fallback for server-to-server)
    let isAuthenticated = false;
    let serviceToken: string | null = null;

    // Try HMAC verification first (preferred)
    if (FLOWSYNC_TRIGGER_SECRET) {
      isAuthenticated = await verifyHmacRequest(
        req,
        "FLOWSYNC_TRIGGER_SECRET",
        "X-Flowsync",
      );
      if (isAuthenticated) {
        logger.info("FlowSync trigger authenticated via HMAC", {
          request_id: requestId,
        });
        // For HMAC auth, check if there's a service token in the body
        const tempBody = await req.clone().json().catch(() => ({}));
        serviceToken = tempBody.service_token || null;
      }
    }

    // Fallback to user authentication
    let user = null;
    if (!isAuthenticated) {
      user = await base44.auth.me().catch(() => null);
      if (user) {
        isAuthenticated = true;
        logger.info("FlowSync trigger authenticated via user session", {
          request_id: requestId,
          user_id: user.id,
        });
      }
    }

    // If still not authenticated, reject
    if (!isAuthenticated) {
      logger.error("FlowSync trigger unauthorized", { request_id: requestId });
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: getCorsHeaders(origin) },
      );
    }

    // HMAC verification for FlowSync triggers
    const flowsyncSecret = Deno.env.get("FLOWSYNC_TRIGGER_SECRET");
    const deploymentEnv = Deno.env.get("DEPLOYMENT_ENV") || "development";

    let bodyText = "";
    if (flowsyncSecret) {
      bodyText = await req.text();
      const hmacResult = await verifyHmacRequest({
        secret: flowsyncSecret,
        request: req,
        signatureHeader: "x-flowsync-signature",
        timestampHeader: "x-flowsync-timestamp",
        body: bodyText,
        requestId,
      });

      if (!hmacResult.isValid) {
        logger.warn("FlowSync trigger HMAC verification failed", {
          request_id: requestId,
          error: hmacResult.error,
        });
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (deploymentEnv === "production") {
      logger.error("FLOWSYNC_TRIGGER_SECRET not configured in production", {
        request_id: requestId,
      });
      return Response.json({ error: "Service misconfigured" }, { status: 500 });
    } else {
      // No HMAC secret configured, read body normally
      bodyText = await req.text();
    }

    // Parse body after HMAC verification or reading
    const body = JSON.parse(bodyText || "{}");
    const { action, payload = {} } = body;

    // Helper: upsert SreeSettings with tenant validation
    const upsertSreeSettings = async (tenantId, flags) => {
      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      const existing = await base44.entities.SreeSettings.filter({ tenantId })
        .catch(() => []);
      if (existing[0]) {
        return base44.entities.SreeSettings.update(existing[0].id, {
          ...existing[0],
          ...flags,
        });
      }
      return base44.entities.SreeSettings.create({ tenantId, ...flags });
    };

    if (action === "helloBizSignup") {
      // 1-6 from spec
      const { tenantId, websiteUrl, kbFiles = [] } = payload;
      if (!tenantId) {
        return Response.json(
          { error: "tenantId required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      // Validate websiteUrl if provided
      if (websiteUrl) {
        const tenant = await base44.asServiceRole.entities.Client.findById(
          tenantId,
        );
        if (!isUrlAllowedForTenant(websiteUrl, tenant)) {
          logger.error("URL not allowed for tenant", {
            request_id: requestId,
            tenant_id: tenantId,
            url: websiteUrl,
          });
          return Response.json(
            {
              error:
                "URL not allowed for this tenant. Please add the domain to your client settings.",
            },
            { status: 400, headers: getCorsHeaders(origin) },
          );
        }
      }

      await upsertSreeSettings(tenantId, {
        enableSreeWeb: true,
        enableSreeDemo: true,
      });
      let kbId = null;
      if (websiteUrl) {
        // URL allowlist validation
        const urlCheck = isUrlAllowedForTenant(
          websiteUrl,
          tenantCheck.client,
          requestId,
        );
        if (!urlCheck.isAllowed) {
          logger.warn("helloBizSignup: URL not allowed for tenant", {
            request_id: requestId,
            tenant_id: tenantId,
            url: websiteUrl,
            error: urlCheck.error,
          });
          return Response.json({ error: urlCheck.error }, { status: 403 });
        }

        const res = await base44.asServiceRole.functions.invoke(
          "sreeAutoScanService",
          {
            action: "scanWebsite",
            url: websiteUrl,
            tenantId,
            includeSitemap: true,
            crawlDepth: 2,
            maxPages: 30,
          },
        );
        kbId = res.data?.kb_id || null;
      }
      for (const f of kbFiles) {
        // SECURITY FIX: Log document upload failures instead of silently swallowing
        await base44.asServiceRole.functions.invoke("uploadDocument", {
          file_url: f.file_url,
          knowledge_base_id: kbId,
          file_name: f.name,
          mime_type: f.mime_type,
        }).catch((err) => {
          console.error("[flowsyncTriggers] Document upload failed", {
            tenant_id: tenantId,
            file_name: f.name,
            error: err?.message || String(err),
          });
        });
      }

      // SECURITY FIX: Log demo seed failures instead of silently swallowing
      await base44.asServiceRole.functions.invoke("sreeAutoScanService", {
        action: "seedDemo",
        tenantId,
      }).catch((err) => {
        console.error("[flowsyncTriggers] Demo seed failed (service role)", {
          tenant_id: tenantId,
          error: err?.message || String(err),
        });
      });

      // Set CORS header if origin is allowed
      const responseHeaders = {};
      if (isOriginAllowed && origin) {
        responseHeaders["Access-Control-Allow-Origin"] = origin;
      }

      // SECURITY FIX: Log demo seed failures instead of silently swallowing
      await base44.functions.invoke("sreeAutoScanService", {
        action: "seedDemo",
        tenantId,
      }).catch((err) => {
        console.error("[flowsyncTriggers] Demo seed failed (user role)", {
          tenant_id: tenantId,
          error: err?.message || String(err),
        });
      });
      return Response.json(
        { success: true, kb_id: kbId },
        { headers: getCorsHeaders(origin) },
      );
    }

    if (action === "workflowCreate") {
      const { tenantId, flow } = payload;
      if (!tenantId || !flow) {
        return Response.json(
          { error: "tenantId and flow required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      const created = await base44.entities.SreeSuggestedFlows.create({
        tenantId,
        flowJSON: flow,
        createdAt: new Date().toISOString(),
      });
      return Response.json(
        { success: true, flow_id: created.id },
        { headers: getCorsHeaders(origin) },
      );
    }

    if (action === "planUpgrade") {
      const { tenantId, flags = {} } = payload;
      if (!tenantId) {
        return Response.json(
          { error: "tenantId required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      await upsertSreeSettings(tenantId, flags);
      return Response.json(
        { success: true },
        { headers: getCorsHeaders(origin) },
      );
    }

    // WorkAutomation endpoints
    if (action === "automation.sree.createAssistant") {
      const {
        tenantId,
        name = "Sree Assistant",
        system_prompt = "You are Sree.",
      } = payload;
      if (!tenantId) {
        return Response.json(
          { error: "tenantId required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      const agent = await base44.entities.Agent.create({
        client_id: tenantId,
        name,
        system_prompt,
        agent_type: "general",
        status: "active",
        widget_bot_name: "Sree",
      });
      return Response.json(
        { success: true, agent },
        { headers: getCorsHeaders(origin) },
      );
    }

    if (action === "automation.sree.scanWebsite") {
      const { tenantId, url } = payload;
      if (!tenantId || !url) {
        return Response.json(
          { error: "tenantId and url required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      // Validate URL allowlist
      const tenant = await base44.asServiceRole.entities.Client.findById(
        tenantId,
      );
      if (!isUrlAllowedForTenant(url, tenant)) {
        logger.error("URL not allowed for tenant", {
          request_id: requestId,
          tenant_id: tenantId,
          url,
        });
        return Response.json(
          {
            error:
              "URL not allowed for this tenant. Please add the domain to your client settings.",
          },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      const res = await base44.functions.invoke("sreeAutoScanService", {
        action: "scanWebsite",
        url,
        tenantId,
      });
      return Response.json(
        res.data || { success: true },
        { headers: getCorsHeaders(origin) },
      );
    }

    if (action === "automation.sree.createFlow") {
      const { tenantId, flow } = payload;
      if (!tenantId || !flow) {
        return Response.json(
          { error: "tenantId and flow required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      const created = await base44.entities.SreeSuggestedFlows.create({
        tenantId,
        flowJSON: flow,
        createdAt: new Date().toISOString(),
      });
      return Response.json(
        { success: true, flow_id: created.id },
        { headers: getCorsHeaders(origin) },
      );
    }

    if (action === "automation.sree.uploadKB") {
      const {
        tenantId,
        file_url,
        file_name = "kb",
        mime_type = "application/pdf",
        knowledge_base_id,
      } = payload;
      if (!tenantId || !file_url) {
        return Response.json(
          { error: "tenantId and file_url required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      const res = await base44.functions.invoke("uploadDocument", {
        file_url,
        knowledge_base_id,
        file_name,
        mime_type,
      });
      return Response.json(
        res.data || { success: true },
        { headers: getCorsHeaders(origin) },
      );
    }

    if (action === "automation.sree.launchDemo") {
      const { tenantId } = payload;
      if (!tenantId) {
        return Response.json(
          { error: "tenantId required" },
          { status: 400, headers: getCorsHeaders(origin) },
        );
      }

      // Validate tenant ownership
      await ensureTenantOwnership(base44, user, tenantId, serviceToken);

      await base44.functions.invoke("sreeAutoScanService", {
        action: "seedDemo",
        tenantId,
      }).catch(() => {});
      return Response.json(
        { success: true },
        { headers: getCorsHeaders(origin) },
      );
    }

    return Response.json(
      { error: "Unknown action" },
      { status: 400, headers: getCorsHeaders(origin) },
    );
  } catch (error) {
    logger.error("FlowSync trigger failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: getCorsHeaders(origin) },
    );
  }
});
