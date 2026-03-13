/**
 * Unified Inbound Webhook Handler
 * Handles incoming calls from any telephony provider
 * Routes to appropriate provider adapter for processing
 *
 * @route POST /functions/telephony/handleInboundCall
 * @auth Public (validated via webhook signatures)
 * @body Varies by provider
 * @returns Provider-specific response
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { providerManager } from "./telephony/lib/ProviderManager.ts";
import type { InboundCallWebhook } from "./telephony/lib/types.ts";
import { normalizePhoneNumber, parseSIPAddress } from "./telephony/lib/utils.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const url = new URL(req.url);

  try {
    logger.info("Inbound webhook received", {
      request_id: requestId,
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    });

    // Handle CORS for webhooks
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const base44 = createClientFromRequest(req);

    // Parse request body based on content type
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.text();
    }

    // Identify provider from request
    const providerId = identifyProvider(url, req.headers, body);

    if (!providerId) {
      logger.error("Could not identify provider", {
        request_id: requestId,
        headers: Object.fromEntries(req.headers.entries()),
      });
      return Response.json({ error: "Provider not identified" }, {
        status: 400,
      });
    }

    logger.info("Provider identified", {
      request_id: requestId,
      provider_id: providerId,
    });

    // Get provider from manager
    const provider = providerManager.getProvider(providerId);

    if (!provider) {
      logger.error("Provider not found in manager", {
        request_id: requestId,
        provider_id: providerId,
      });
      return Response.json({ error: "Provider not registered" }, {
        status: 404,
      });
    }

    // Normalize webhook to standard format
    const normalizedWebhook = normalizeWebhook(providerId, body, req.headers);

    // Process call through provider
    const call = await provider.receiveCall(normalizedWebhook);

    // Find or create phone number record
    const phoneNumber = await findPhoneNumber(base44, normalizedWebhook.to);

    if (!phoneNumber) {
      logger.warn("No phone number found for inbound call", {
        request_id: requestId,
        to: normalizedWebhook.to,
      });
    }

    // Get agent for this phone number
    const agentId = phoneNumber?.agent_id;
    const clientId = phoneNumber?.client_id;

    if (!agentId) {
      logger.error("No agent configured for phone number", {
        request_id: requestId,
        phone_number: normalizedWebhook.to,
      });

      return Response.json({
        status: "no_agent",
        message: "This number is not configured with an agent",
      });
    }

    // Create call session
    const callSession = await base44.asServiceRole.entities.CallSession.create({
      client_id: clientId,
      agent_id: agentId,
      phone_number_id: phoneNumber?.id,
      telephony_account_id: phoneNumber?.telephony_account_id,
      provider_call_id: call.provider_call_id,
      provider_id: provider.id,
      provider_type: provider.type,
      direction: "inbound",
      from_number: call.from,
      to_number: call.to,
      status: call.status,
      started_at: call.started_at,
    });

    logger.info("Inbound call session created", {
      request_id: requestId,
      call_session_id: callSession.id,
      agent_id: agentId,
    });

    // Return provider-specific response
    return Response.json({
      status: "ok",
      session_id: callSession.id,
      agent_id: agentId,
    }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    logger.error("Inbound webhook handler failed", {
      request_id: requestId,
      error: error.message,
      stack: error.stack,
    });

    return Response.json(
      { error: error.message || "Internal error" },
      { status: 500 },
    );
  }
});

/**
 * Identify provider from request
 */
function identifyProvider(
  url: URL,
  headers: Headers,
  body: any,
): string | null {
  // Check for explicit provider ID in query params
  const providerIdParam = url.searchParams.get("provider_id");
  if (providerIdParam) {
    return providerIdParam;
  }

  // Check for provider identifier in path
  const pathMatch = url.pathname.match(/\/provider\/([^\/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Detect based on headers (Twilio has specific headers)
  const twilioSignature = headers.get("x-twilio-signature");
  if (twilioSignature) {
    return "twilio";
  }

  // Detect based on body structure (GoIP has specific fields)
  if (body.line !== undefined && body.gsm_status !== undefined) {
    return "goip";
  }

  // Detect SIP-based providers
  if (body.sip_username || body.sip_domain) {
    return "bsnl_sip";
  }

  return null;
}

/**
 * Normalize webhook data to standard format
 */
function normalizeWebhook(
  providerId: string,
  body: any,
  headers: Headers,
): InboundCallWebhook {
  const webhook: InboundCallWebhook = {
    provider: providerId,
    provider_call_id: "",
    from: "",
    to: "",
    timestamp: new Date().toISOString(),
    raw_payload: body,
  };

  // Normalize based on provider
  switch (providerId) {
    case "twilio":
      webhook.provider_call_id = body.CallSid || body.call_sid;
      webhook.from = body.From || body.from;
      webhook.to = body.To || body.to;
      break;

    case "goip":
      webhook.provider_call_id = body.call_id || `goip_${Date.now()}`;
      webhook.from = body.caller_number || body.from;
      webhook.to = body.callee_number || body.to;
      break;

    case "bsnl_sip":
      webhook.provider_call_id = body.call_id || `bsnl_${Date.now()}`;
      webhook.from = body.caller_number || body.from;
      webhook.to = body.callee_number || body.to;
      break;

    case "asterisk":
      webhook.provider_call_id = body.provider_call_id ||
        `asterisk_${Date.now()}`;
      webhook.from = body.from || "";
      webhook.to = body.to || "";
      break;

    default:
      // Generic extraction
      webhook.provider_call_id = body.call_id || body.callSid ||
        `${providerId}_${Date.now()}`;
      webhook.from = body.from || body.caller || body.From || "";
      webhook.to = body.to || body.called || body.To || "";
  }

  return webhook;
}

/**
 * Find phone number in database
 */
async function findPhoneNumber(base44: any, toNumber: string) {
  try {
    // Normalize number
    const normalized = normalizePhoneNumber(toNumber);

    // Try exact match first
    const byE164 = await base44.asServiceRole.entities.PhoneNumber.filter({
      number_e164: normalized,
    });

    if (byE164 && byE164.length > 0) {
      return byE164[0];
    }

    // Try SIP address match
    if (toNumber.includes("@")) {
      const sipAddress = toNumber.startsWith("sip:") ? toNumber : `sip:${toNumber}`;
      const bySip = await base44.asServiceRole.entities.PhoneNumber.filter({
        sip_address: sipAddress,
      });

      if (bySip && bySip.length > 0) {
        return bySip[0];
      }
    }

    return null;
  } catch (error) {
    logger.error("Failed to find phone number", {
      to_number: toNumber,
      error: error.message,
    });
    return null;
  }
}
