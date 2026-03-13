import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("CRM webhook request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);

    const { event_type, data, client_id, agent_id, channel } = await req.json();

    let assistant_name = undefined;
    try {
      if (agent_id) {
        const agents = await base44.asServiceRole.entities.Agent.filter({
          id: agent_id,
        });
        const agent = agents?.[0];
        if (agent) {
          assistant_name = channel === "phone"
            ? (agent.phone_assistant_name || agent.name)
            : (agent.widget_bot_name || agent.name);
        }
      }
    } catch (_) {}

    if (!event_type || !client_id) {
      return Response.json({ error: "event_type and client_id required" }, {
        status: 400,
      });
    }

    // Get active webhooks for this event type
    const webhooks = await base44.asServiceRole.entities.CRMWebhook.filter({
      client_id,
      event_type,
      active: true,
    });

    const results = [];

    for (const webhook of webhooks) {
      try {
        // Prepare payload with signature
        const timestamp = Date.now();
        const payload = {
          event_type,
          timestamp,
          data,
          agent_id,
          client_id,
          channel,
          assistant_name,
        };

        // Create signature (HMAC SHA256)
        const encoder = new TextEncoder();
        const keyData = encoder.encode(webhook.secret_key);
        const messageData = encoder.encode(JSON.stringify(payload));

        const key = await crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );

        const signature = await crypto.subtle.sign("HMAC", key, messageData);
        const signatureHex = Array.from(new Uint8Array(signature))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Send webhook
        const response = await fetch(webhook.target_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signatureHex,
            "X-Webhook-Timestamp": timestamp.toString(),
            ...(webhook.headers || {}),
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          await base44.asServiceRole.entities.CRMWebhook.update(webhook.id, {
            last_triggered: new Date().toISOString(),
            success_count: (webhook.success_count || 0) + 1,
          });
          results.push({ webhook_id: webhook.id, success: true });
        } else {
          await base44.asServiceRole.entities.CRMWebhook.update(webhook.id, {
            failure_count: (webhook.failure_count || 0) + 1,
          });
          results.push({
            webhook_id: webhook.id,
            success: false,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        await base44.asServiceRole.entities.CRMWebhook.update(webhook.id, {
          failure_count: (webhook.failure_count || 0) + 1,
        });
        results.push({
          webhook_id: webhook.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json({
      success: true,
      webhooks_sent: results.length,
      results,
      agent_id,
      client_id,
      channel,
    });
  } catch (error) {
    logger.error("CRM webhook failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
