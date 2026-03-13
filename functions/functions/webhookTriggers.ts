// functions/webhookTriggers.js
// AEVOICE Webhook Event System
//
// Allows clients to register webhook URLs that get triggered on:
// - call_started
// - call_ended
// - intent_detected
// - lead_captured
// - appointment_booked
// - agent_transfer

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const EVENT_TYPES = [
  "call_started",
  "call_ended",
  "intent_detected",
  "lead_captured",
  "appointment_booked",
  "agent_transfer",
  "error_occurred",
];

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

  const { event_type, payload, client_id } = body;

  if (!event_type || !EVENT_TYPES.includes(event_type)) {
    return Response.json({
      error: `Invalid event_type. Must be one of: ${EVENT_TYPES.join(", ")}`,
    }, { status: 400 });
  }

  if (!client_id) {
    return Response.json({ error: "client_id is required" }, { status: 400 });
  }

  let base44;
  try {
    base44 = createClientFromRequest(req);
  } catch {
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }

  try {
    // Get webhook configurations for this client
    const webhooks = await base44.asServiceRole.entities.IntegrationConfig
      .filter({
        client_id,
        integration_type: "webhook",
        is_enabled: true,
      });

    if (!webhooks || webhooks.length === 0) {
      return Response.json({
        success: true,
        message: "No webhooks configured for this client",
        triggers_sent: 0,
      });
    }

    const results = [];
    const errors = [];

    for (const webhook of webhooks) {
      const config = webhook.config || {};
      const events = config.events || [];

      // Check if this webhook listens for this event type
      if (!events.includes(event_type) && events.length > 0) {
        continue;
      }

      const webhookUrl = config.url;
      if (!webhookUrl) {
        errors.push({ webhook_id: webhook.id, error: "No URL configured" });
        continue;
      }

      // Prepare webhook payload
      const webhookPayload = {
        event_type,
        timestamp: new Date().toISOString(),
        client_id,
        data: payload,
      };

      // Add signature if secret is configured
      let headers = {
        "Content-Type": "application/json",
        "User-Agent": "AEVOICE-Webhook/1.0",
      };

      if (config.secret) {
        // Simple HMAC signature
        const signature = await generateSignature(
          JSON.stringify(webhookPayload),
          config.secret,
        );
        headers["X-AEVOICE-Signature"] = signature;
      }

      // Send webhook request
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        results.push({
          webhook_id: webhook.id,
          url: webhookUrl,
          status: response.status,
          success: response.ok,
        });

        console.log(
          `Webhook sent: ${event_type} -> ${webhookUrl} [${response.status}]`,
        );
      } catch (err) {
        errors.push({
          webhook_id: webhook.id,
          url: webhookUrl,
          error: err.message,
        });
        console.error(`Webhook failed: ${webhookUrl}`, err);
      }
    }

    return Response.json({
      success: true,
      event_type,
      triggers_sent: results.length,
      results,
      errors,
    });
  } catch (err) {
    console.error("Webhook trigger error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});

// ===================== SIGNATURE GENERATION =====================
async function generateSignature(payload, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
