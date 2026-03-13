// functions/sipWebhook.js
// AEVOICE SIP Webhook - Handles incoming calls from SIP providers (BSNL Wings, etc.)
// Architecture: SIP → Webhook → Agent Orchestrator → TTS Response

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { findSipAccountByDid, normalizeNumber } from "./telephony/didUtils.ts";

// ===================== CONSTANTS =====================
const APP_ID = "692b24a5bac54e3067972063";

// Static SIP DID routing for BSNL (digits-only keys)
const SIP_ACCOUNTS = {
  // AEVOICE.ai Admin/Main assistant
  "914024001355": { assistant_name: "AEVOICE.ai Admin/Main assistant" },
  "04024001355": { assistant_name: "AEVOICE.ai Admin/Main assistant" },
  // Vet N Pet assistant
  "914023186215": { assistant_name: "Vet N Pet assistant" },
  "04023186215": { assistant_name: "Vet N Pet assistant" },
};

// ===================== SIP ACCOUNT CACHE =====================
const sipAccountCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

// ===================== ENTRYPOINT =====================
Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  const log = (level, msg, data = {}) => {
    console[level]?.(JSON.stringify({
      request_id: requestId,
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      ...data,
      message: msg,
    }));
  };

  // Health check
  if (req.method === "GET") {
    return Response.json({
      status: "healthy",
      service: "AEVOICE SIP Webhook",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let base44;
  try {
    base44 = createClientFromRequest(req);
    log("info", "Base44 client initialized for SIP webhook");
  } catch (err) {
    log("error", "Failed to init Base44 client", { error: err.message });
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }

  let body;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.json().catch(() => ({}));
    }
  } catch (err) {
    log("error", "Failed to parse request body", { error: err.message });
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract SIP call parameters (adapt based on your SIP provider's format)
  const {
    sip_account_id,
    sip_username,
    sip_domain,
    caller_number,
    callee_number,
    call_id,
    speech_text,
    event_type, // 'call_start', 'speech_input', 'call_end'
  } = body;

  log("info", "SIP webhook received", {
    event_type,
    sip_username: maskValue(sip_username),
    caller: maskValue(caller_number),
    callee: maskValue(callee_number),
    call_id,
    has_speech: !!speech_text,
  });

  // ===================== ROUTE RESOLUTION =====================
  const route = await resolveSipRoute(base44, {
    sip_username,
    sip_domain,
    sip_account_id,
    callee_number,
  }, log);

  if (!route) {
    log("error", "No SIP route configured", { sip_username, sip_domain });
    return Response.json({
      response_text: "This SIP account is not configured. Please contact support.",
      action: "hangup",
    });
  }

  log("info", "SIP route resolved", {
    client_id: route.client_id,
    agent_id: route.agent_id,
  });

  // ===================== HANDLE EVENTS =====================

  // Event: Call Start - Return greeting
  if (event_type === "call_start" || !speech_text) {
    log("info", "SIP call started, returning greeting");

    // Create call session
    try {
      await base44.asServiceRole.entities.CallSession.create({
        client_id: route.client_id,
        agent_id: route.agent_id,
        telephony_account_id: route.telephony_account_id,
        provider_call_id: call_id || `sip_${Date.now()}`,
        direction: "inbound",
        from_number: caller_number || sip_username,
        to_number: callee_number || sip_domain,
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
    } catch (err) {
      log("warn", "Failed to create call session", { error: err.message });
    }

    return Response.json({
      response_text: route.greeting,
      action: "gather_speech",
      language: "en-US",
      timeout_seconds: 5,
    });
  }

  // Event: Speech Input - Process with orchestrator
  if (event_type === "speech_input" || speech_text) {
    log("info", "Processing SIP speech input", {
      speech_preview: (speech_text || "").substring(0, 50),
    });

    let replyText = "";
    try {
      const orchResponse = await base44.functions.invoke(
        "conversationOrchestrator",
        {
          tenant_id: route.client_id,
          agent_id: route.agent_id,
          session_id: call_id,
          user_input: speech_text,
          call_sid: call_id,
          from_number: caller_number,
          to_number: callee_number,
        },
      );

      if (orchResponse?.data?.replyText) {
        replyText = orchResponse.data.replyText.trim();
      }
    } catch (err) {
      log("error", "Orchestrator call failed", { error: err.message });
    }

    // Guarantee non-empty reply
    if (!replyText) {
      replyText = `I heard: ${
        (speech_text || "").substring(0, 100)
      }. Let me help you with that. Could you provide more details?`;
    }

    log("info", "SIP speech processed", {
      reply_length: replyText.length,
      latency_ms: Date.now() - startTime,
    });

    return Response.json({
      response_text: replyText,
      action: "gather_speech",
      language: "en-US",
      timeout_seconds: 5,
      continue_conversation: true,
    });
  }

  // Event: Call End
  if (event_type === "call_end") {
    log("info", "SIP call ended");

    // Update call session
    try {
      const sessions = await base44.asServiceRole.entities.CallSession.filter({
        provider_call_id: call_id,
      });
      if (sessions?.[0]) {
        await base44.asServiceRole.entities.CallSession.update(sessions[0].id, {
          status: "completed",
          ended_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      log("warn", "Failed to update call session", { error: err.message });
    }

    return Response.json({
      response_text: "Thank you for calling. Goodbye!",
      action: "hangup",
    });
  }

  // Default response
  return Response.json({
    response_text: "How can I help you today?",
    action: "gather_speech",
  });
});

// ===================== SIP ROUTE RESOLUTION =====================
async function resolveSipRoute(
  base44,
  { sip_username, sip_domain, sip_account_id, callee_number },
  log,
) {
  const cacheKey = (callee_number && `did:${normalizeNumber(callee_number)}`) ||
    sip_account_id || `${sip_username}@${sip_domain}`;
  const now = Date.now();

  // Check cache
  const cached = sipAccountCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    log("info", "Cache hit for SIP route");
    return cached;
  }

  // First, check static SIP DID routing map
  if (callee_number) {
    const mapEntry = findSipAccountByDid(callee_number, SIP_ACCOUNTS);
    if (mapEntry?.assistant_name) {
      try {
        const agents = await base44.asServiceRole.entities.Agent.filter({
          name: mapEntry.assistant_name,
        });
        if (agents?.[0]) {
          const agent = agents[0];
          const greeting = agent.greeting_message ||
            `Welcome to ${agent.name}. How can I help you?`;
          const route = {
            client_id: agent.client_id,
            agent_id: agent.id,
            telephony_account_id: undefined,
            greeting,
            timestamp: now,
          };
          sipAccountCache.set(cacheKey, route);
          log("info", "SIP DID route resolved via static map", {
            callee_number,
            normalized: normalizeNumber(callee_number),
            agent_id: agent.id,
          });
          return route;
        } else {
          log("warn", "Assistant not found for DID", {
            callee_number,
            assistant_name: mapEntry.assistant_name,
          });
        }
      } catch (err) {
        log("error", "Failed to resolve assistant for DID", {
          error: err.message,
        });
      }
    }
  }

  try {
    // Query TelephonyAccount by SIP credentials
    let accounts = [];

    if (sip_account_id) {
      accounts = await base44.asServiceRole.entities.TelephonyAccount.filter({
        id: sip_account_id,
      });
    } else if (sip_username) {
      // Try to find by SIP username in config
      const allAccounts = await base44.asServiceRole.entities.TelephonyAccount
        .filter({
          provider: "bsnl_wings",
        });
      accounts = (allAccounts || []).filter((a) => a.config?.sip_username === sip_username);
    }

    if (!accounts || accounts.length === 0) {
      log("warn", "No TelephonyAccount found for SIP", {
        sip_username,
        sip_domain,
      });
      return null;
    }

    const account = accounts[0];

    // Get associated phone number and agent
    const phoneNumbers = await base44.asServiceRole.entities.PhoneNumber.filter(
      {
        telephony_account_id: account.id,
      },
    );

    if (!phoneNumbers || phoneNumbers.length === 0) {
      log("warn", "No PhoneNumber linked to TelephonyAccount", {
        account_id: account.id,
      });
      return null;
    }

    const phoneNumber = phoneNumbers[0];

    // Get agent for greeting
    let greeting = "Hello! How can I help you today?";
    if (phoneNumber.agent_id) {
      try {
        const agents = await base44.asServiceRole.entities.Agent.filter({
          id: phoneNumber.agent_id,
        });
        if (agents?.[0]) {
          greeting = agents[0].greeting_message ||
            `Welcome to ${agents[0].name}. How can I help you?`;
        }
      } catch (err) {
        log("warn", "Failed to load agent", { error: err.message });
      }
    }

    const route = {
      client_id: account.client_id,
      agent_id: phoneNumber.agent_id,
      telephony_account_id: account.id,
      greeting,
      timestamp: now,
    };

    sipAccountCache.set(cacheKey, route);
    log("info", "SIP route cached", { client_id: route.client_id });
    return route;
  } catch (err) {
    log("error", "SIP route resolution failed", { error: err.message });
    return null;
  }
}

// ===================== HELPERS =====================
function maskValue(value) {
  if (!value || value.length < 6) return "***";
  return value.substring(0, 3) + "****" + value.substring(value.length - 2);
}
