import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  console.log("[InboundWebhook] Request received:", {
    method: req.method,
    url: req.url,
  });

  try {
    if (req.method === "OPTIONS") {
      console.log("[InboundWebhook] Handling OPTIONS request");
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }
    if (req.method !== "POST") {
      console.warn("[InboundWebhook] Invalid method:", req.method);
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id") || "";
    const providedSecret = url.searchParams.get("secret") ||
      req.headers.get("x-aevoice-secret") || "";

    console.log("[InboundWebhook] Request params:", {
      clientId,
      hasSecret: !!providedSecret,
    });

    const base44 = createClientFromRequest(req);

    if (!clientId) {
      console.warn("[InboundWebhook] Missing client_id");
      return Response.json({ error: "client_id is required" }, { status: 400 });
    }

    // Validate secret against client.settings.inbound_webhook_secret if set
    console.log("[InboundWebhook] Fetching client:", clientId);
    const clients = await base44.asServiceRole.entities.Client.filter({
      id: clientId,
    });
    const client = clients?.[0];

    if (!client) {
      console.warn("[InboundWebhook] Client not found:", clientId);
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    console.log("[InboundWebhook] Client found:", {
      id: client.id,
      hasWebhookSecret: !!client.settings?.inbound_webhook_secret,
    });

    // Auto-generate per-client secret if missing
    if (
      client && (!client.settings || !client.settings.inbound_webhook_secret)
    ) {
      console.log(
        "[InboundWebhook] Generating new webhook secret for client:",
        clientId,
      );
      const newSecret = crypto.randomUUID().replace(/-/g, "") +
        Math.random().toString(36).slice(2, 10);
      await base44.asServiceRole.entities.Client.update(clientId, {
        settings: {
          ...(client.settings || {}),
          inbound_webhook_secret: newSecret,
        },
      });
      client.settings = {
        ...(client.settings || {}),
        inbound_webhook_secret: newSecret,
      };
      console.log("[InboundWebhook] Webhook secret generated successfully");
    }
    const expected = client?.settings?.inbound_webhook_secret || null;
    if (expected && providedSecret !== expected) {
      console.warn("[InboundWebhook] Invalid webhook secret provided");
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let payload;
    try {
      payload = await req.json();
      console.log("[InboundWebhook] Payload received:", {
        hasPayload: !!payload,
      });
    } catch (err) {
      console.error("[InboundWebhook] Failed to parse JSON payload:", err);
      payload = null;
    }

    // Store in CRMWebhookLog (if exists) or DebugLog fallback
    try {
      if (payload) {
        console.log(
          "[InboundWebhook] Storing webhook log for client:",
          clientId,
        );
        await base44.asServiceRole.entities.CRMWebhookLog.create({
          client_id: clientId,
          payload,
          headers: Object.fromEntries(req.headers.entries()),
          status: "received",
        });
        console.log("[InboundWebhook] Webhook log stored successfully");
      }
    } catch (logError) {
      console.error(
        "[InboundWebhook] Failed to store CRMWebhookLog, trying DebugLog:",
        logError,
      );
      try {
        await base44.asServiceRole.entities.DebugLog.create({
          source: "inboundWebhook",
          message: "payload",
          data: payload,
          client_id: clientId,
        });
        console.log("[InboundWebhook] Payload stored in DebugLog");
      } catch (debugError) {
        console.error(
          "[InboundWebhook] Failed to store in DebugLog:",
          debugError,
        );
      }
    }

    console.log("[InboundWebhook] Request processed successfully");
    return Response.json({ success: true });
  } catch (error) {
    console.error("[InboundWebhook] Unhandled error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
