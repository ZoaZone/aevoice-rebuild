import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

// Environment and security configuration
const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";
const ASTERISK_WEBHOOK_SECRET = Deno.env.get("ASTERISK_WEBHOOK_SECRET");

// Require webhook secret in production
if (ENV === "production" && !ASTERISK_WEBHOOK_SECRET) {
  logger.error("FATAL: ASTERISK_WEBHOOK_SECRET is required in production");
  throw new Error(
    "ASTERISK_WEBHOOK_SECRET environment variable required in production",
  );
}

function normalizeNumber(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // Always return +<digits> for consistency
  return `+${digits}`;
}

async function findPhoneNumberForInbound(base44, to, from) {
  // Try to resolve by destination number first (most reliable)
  try {
    if (to) {
      const toNorm = normalizeNumber(to);
      if (toNorm) {
        const byE164 = await base44.asServiceRole.entities.PhoneNumber.filter({
          number_e164: toNorm,
        });
        if (byE164 && byE164.length > 0) return byE164[0];
      }

      // If looks like SIP user@host or already prefixed with sip:
      if (to.includes("@")) {
        const sipCandidate = to.startsWith("sip:") ? to : `sip:${to}`;
        try {
          const bySip = await base44.asServiceRole.entities.PhoneNumber.filter({
            sip_address: sipCandidate,
          });
          if (bySip && bySip.length > 0) return bySip[0];
        } catch (_) { /* ignore */ }
      }
    }
  } catch (e) {
    console.warn('[asteriskWebhook] PhoneNumber match by "to" failed', e);
  }

  // As a fallback, try matching by caller number (rare but helpful in some setups)
  try {
    const fromNorm = normalizeNumber(from);
    if (fromNorm) {
      const byFrom = await base44.asServiceRole.entities.PhoneNumber.filter({
        number_e164: fromNorm,
      });
      if (byFrom && byFrom.length > 0) return byFrom[0];
    }
  } catch (e) {
    console.warn('[asteriskWebhook] PhoneNumber match by "from" failed', e);
  }

  return null;
}

async function findAgentByIdOrName(base44, agentParam) {
  if (!agentParam) return null;
  // Try by ID first
  try {
    const byId = await base44.asServiceRole.entities.Agent.filter({
      id: agentParam,
    });
    if (byId && byId.length > 0) return byId[0];
  } catch (_) { /* ignore */ }

  // Then try by name (exact match)
  try {
    const byName = await base44.asServiceRole.entities.Agent.filter({
      name: agentParam,
    });
    if (byName && byName.length > 0) return byName[0];
  } catch (_) { /* ignore */ }

  return null;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    // CORS / preflight
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Asterisk-Token",
        },
      });
    }

    const base44 = createClientFromRequest(req);

    // Extract parameters from query (Asterisk typically uses GET with query string)
    const params = url.searchParams;
    let from = params.get("from") || "";
    let to = params.get("to") || "";
    let agent = params.get("agent") || undefined;
    let provider_call_id = params.get("provider_call_id") || undefined;
    let jsonBody = null;

    // If POST with JSON, allow overriding from body
    if (req.method === "POST") {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try {
          jsonBody = await req.json();
          from = jsonBody.from ?? from;
          to = jsonBody.to ?? to;
          agent = jsonBody.agent ?? agent;
          provider_call_id = jsonBody.provider_call_id ?? provider_call_id;
        } catch (_) { /* ignore JSON errors */ }
      }
    }

    // Shared-secret check (required in production)
    const expected = ASTERISK_WEBHOOK_SECRET;
    if (expected) {
      const qp = params.get("token") || params.get("key") ||
        params.get("secret");
      const authHeader = req.headers.get("authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;
      const headerToken = req.headers.get("x-asterisk-token") || bearer;
      const bodyToken = (jsonBody && (jsonBody.token || jsonBody.secret)) ||
        null;
      const provided = qp || headerToken || bodyToken;

      if (provided !== expected) {
        logger.error("Asterisk webhook unauthorized", {
          request_id: requestId,
          has_token: !!provided,
        });
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    logger.info("Asterisk webhook received", {
      request_id: requestId,
      from,
      to,
      agent,
      provider_call_id,
    });

    const normalizedFrom = normalizeNumber(from) || from || "";
    const normalizedTo = normalizeNumber(to) || to || "";
    const providerCallId = provider_call_id || `asterisk_${Date.now()}`;

    // 1) Resolve PhoneNumber (best effort)
    const phoneNumber = await findPhoneNumberForInbound(
      base44,
      to || normalizedTo,
      from || normalizedFrom,
    );

    if (!phoneNumber) {
      console.warn("[asteriskWebhook] No matching phone number", {
        from,
        normalizedFrom,
        to,
        normalizedTo,
      });
    }

    // 2) Resolve agent
    let agentEntity = null;
    if (phoneNumber?.agent_id) {
      try {
        const a = await base44.asServiceRole.entities.Agent.filter({
          id: phoneNumber.agent_id,
        });
        if (a && a.length > 0) agentEntity = a[0];
      } catch (_) { /* ignore */ }
    }
    if (!agentEntity && agent) {
      agentEntity = await findAgentByIdOrName(base44, agent);
    }

    if (!agentEntity) {
      console.error("[asteriskWebhook] No agent resolved", {
        agent,
        phoneNumber: phoneNumber?.id,
      });
      return Response.json({
        status: "ok",
        session_id: null,
        reason: "agent_not_found",
      }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // 3) Resolve client & telephony account
    const clientId = phoneNumber?.client_id || agentEntity.client_id || null;
    const telephonyAccountId = phoneNumber?.telephony_account_id || null;

    if (!clientId) {
      console.warn(
        "[asteriskWebhook] No client_id resolved; proceeding without client",
      );
    }

    // 4) Create CallSession (service role; webhook context has no end-user auth)
    const startedAt = new Date().toISOString();

    const sessionPayload = {
      client_id: clientId,
      agent_id: agentEntity.id,
      telephony_account_id: telephonyAccountId,
      phone_number_id: phoneNumber?.id || undefined,
      provider_call_id: providerCallId,
      direction: "inbound",
      status: "in_progress",
      started_at: startedAt,
      from_number: normalizedFrom || from || "",
      to_number: normalizedTo || to || "",
    };

    const session = await base44.asServiceRole.entities.CallSession.create(
      sessionPayload,
    );

    console.log("[asteriskWebhook] session created", {
      session_id: session.id,
      agent_id: session.agent_id,
      client_id: session.client_id,
      from_number: session.from_number,
    });

    return Response.json({ status: "ok", session_id: session.id }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("[asteriskWebhook] error", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error) || "internal_error",
    }, {
      status: 500,
    });
  }
});
