// functions/twilioWebhook.js
// AEVOICE Twilio Webhook – Production-Ready
// FIX: Use app domain URL (aevoice.base44.app) instead of functions-api.base44.com
// The functions-api.base44.com endpoint returns 502 for external calls

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { verifyTwilioSignature } from "./utils/verifyTwilio.ts";
import { WEBHOOK_BASE_URL } from "./lib/envConfig.ts";

// TYPE SAFETY FIX (Phase 2A #4-5): Import Twilio webhook types
import type { TwilioWebhookData } from "./lib/types/index.ts";

// -------------------- CONFIG --------------------
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";

if (ENV === "production" && !TWILIO_AUTH_TOKEN) {
  console.error("FATAL: TWILIO_AUTH_TOKEN is required in production");
  throw new Error(
    "TWILIO_AUTH_TOKEN environment variable required in production",
  );
}

// -------------------- TEMPORARY HARD-CODED ROUTING --------------------
function resolveRoute(toPhone) {
  const routes = {
    "+12566998899": {
      client_id: "6952a0d95da22ae8f046eef1",
      agent_id: "6952a0d9d8ab4792804319c3",
      greeting: "Hello! Welcome to Hello Biz. How can I help you today?",
    },
  };
  return routes[toPhone] || null;
}

// -------------------- HELPERS --------------------
function escapeXml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

// -------------------- MAIN HANDLER --------------------
Deno.serve(async (req) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Extract app ID from request header or environment
  const appId = req.headers.get("x-app-id") || Deno.env.get("BASE44_APP_ID");

  const log = (level, message, extra = {}) => {
    console[level === "error" ? "error" : "log"](
      JSON.stringify({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        level,
        message,
        ...extra,
      }),
    );
  };

  // Wrap everything in try-catch to prevent 502 errors
  try {
    // Health check
    if (req.method === "GET") {
      return twiml("<Response><Say>AEVOICE webhook OK</Say></Response>");
    }

    if (req.method !== "POST") {
      return twiml("<Response><Say>Method not allowed</Say></Response>", 405);
    }

    // Verify Twilio signature (skip in development)
    if (ENV === "production" && TWILIO_AUTH_TOKEN) {
      const isValid = await verifyTwilioSignature(req, TWILIO_AUTH_TOKEN);
      if (!isValid) {
        log("error", "Invalid Twilio signature", {});
        return twiml(
          "<Response><Say>Unauthorized request</Say></Response>",
          403,
        );
      }
      log("info", "Twilio signature verified", {});
    }

    // Parse Twilio formData
    let form: FormData;
    try {
      form = await req.formData();
    } catch (parseErr) {
      log("error", "FormData parse error", { error: parseErr.message });
      return twiml(
        "<Response><Say>Invalid request format</Say></Response>",
        400,
      );
    }

    // TYPE SAFETY FIX #6: Convert FormData to typed TwilioWebhookData
    const twilioData: Partial<TwilioWebhookData> = {
      To: form.get("To") as string || "",
      From: form.get("From") as string || "",
      CallSid: form.get("CallSid") as string || "",
      CallStatus: form.get("CallStatus") as TwilioWebhookData["CallStatus"],
      CallDuration: form.get("CallDuration") as string,
      Duration: form.get("Duration") as string,
      SpeechResult: form.get("SpeechResult") as string,
    };

    const toPhone = twilioData.To || "";
    const fromPhone = twilioData.From || "";
    const callSid = twilioData.CallSid || "";
    const speech = twilioData.SpeechResult || "";

    log("info", "Incoming Twilio webhook", {
      toPhone,
      fromPhone: fromPhone.substring(0, 6) + "****",
      callSid,
      hasSpeech: !!speech,
      speechPreview: speech ? speech.substring(0, 50) : null,
    });

    // Handle Twilio call status updates (end of call)
    // TYPE SAFETY FIX #7-8: Use typed callStatus from TwilioWebhookData
    const callStatus = (twilioData.CallStatus || "").toLowerCase();
    const callDuration = Number(
      twilioData.CallDuration || twilioData.Duration || 0,
    );
    if (
      callStatus &&
      ["completed", "no-answer", "busy", "failed"].includes(callStatus)
    ) {
      const base44 = createClientFromRequest(req);
      try {
        const route = resolveRoute(toPhone);
        await base44.asServiceRole.functions.invoke("updateCallSession", {
          call_sid: callSid,
          updates: {
            ended_at: new Date().toISOString(),
            status: callStatus === "completed"
              ? "completed"
              : (callStatus === "no-answer"
                ? "no_answer"
                : (callStatus === "busy" ? "busy" : "failed")),
            ...(callDuration ? { duration_seconds: callDuration } : {}),
          },
        });
        console.log("✅ Saving call to history (status update)", {
          callSid,
          agentId: route?.agent_id || null,
          duration: callDuration || 0,
          status: callStatus,
        });
      } catch (e) {
        console.error(
          "[twilioWebhook] ❌ status update failed",
          e.message,
          e.stack,
        );
      }
      // Respond with empty TwiML for status callbacks
      return twiml("<Response></Response>");
    }

    // The action URL for <Gather> - MUST use app domain, not functions-api
    const actionUrl = `${WEBHOOK_BASE_URL(appId)}/twilioWebhook`;

    // -------------------- STEP 1: FIRST HIT (no speech yet) --------------------
    if (!speech) {
      const route = resolveRoute(toPhone);

      if (!route || !route.agent_id) {
        log("warn", "Missing agent routing for number", { toPhone });
        return twiml(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">This number is not configured to a specific assistant. Please contact support.</Say>
  <Hangup/>
</Response>`,
        );
      }

      // Resolve owner email for RLS visibility (CRITICAL for Call History)
      let ownerEmail = undefined;
      try {
        const base44 = createClientFromRequest(req);
        const [agents, clients] = await Promise.all([
          base44.asServiceRole.entities.Agent.filter({ id: route.agent_id }),
          base44.asServiceRole.entities.Client.filter({ id: route.client_id }),
        ]);
        // PRIORITY: Use client's contact_email first (owner), then agent's created_by as fallback
        ownerEmail = clients?.[0]?.contact_email || agents?.[0]?.created_by ||
          undefined;

        log("info", "Resolved owner for RLS", {
          client_id: route.client_id,
          agent_id: route.agent_id,
          ownerEmail: ownerEmail ? ownerEmail.substring(0, 5) + "***" : "NONE",
        });
      } catch (err) {
        log("error", "Failed to resolve owner email", { error: err.message });
      }

      // Create conversation session for this call
      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.ConversationSession.create({
          id: callSid, // Use CallSid as session ID
          session_token: callSid,
          agent_id: route.agent_id,
          client_id: route.client_id,
          channel: "voice",
          status: "active",
          state_json: { turn: 0, context: [] },
          metadata: {
            from_number: fromPhone,
            to_number: toPhone,
            call_sid: callSid,
          },
          ...(ownerEmail ? { created_by: ownerEmail } : {}),
        });
        log("info", "Session created", { session_id: callSid });
      } catch (sessionErr) {
        log("warn", "Session creation failed (may already exist)", {
          error: sessionErr.message,
        });
      }

      // Create CallSession for Call History (if not exists)
      try {
        const base44 = createClientFromRequest(req);
        const existing = await base44.asServiceRole.entities.CallSession.filter(
          { provider_call_id: callSid },
        );
        if (existing.length === 0) {
          const callSessionData = {
            client_id: route.client_id,
            agent_id: route.agent_id,
            provider_call_id: callSid,
            direction: "inbound",
            from_number: fromPhone,
            to_number: toPhone,
            started_at: new Date().toISOString(),
            status: "in_progress",
            ...(ownerEmail ? { created_by: ownerEmail } : {}),
          };

          // Warn if no created_by (RLS issue)
          if (!ownerEmail) {
            log(
              "warn",
              "⚠️ CallSession created WITHOUT created_by - may not be visible in UI!",
              {
                callSid,
                client_id: route.client_id,
              },
            );
          }

          await base44.asServiceRole.entities.CallSession.create(
            callSessionData,
          );
          console.log("✅ Saving call to history", {
            callSid,
            agentId: route.agent_id,
            duration: 0,
            hasCreatedBy: !!ownerEmail,
          });
          log("info", "CallSession created", {
            callSid,
            hasCreatedBy: !!ownerEmail,
            client_id: route.client_id,
          });
        } else {
          log("info", "CallSession already exists", { callSid });
        }
      } catch (e) {
        log("error", "CallSession create failed", {
          error: e.message,
          stack: e.stack,
          callSid,
          client_id: route.client_id,
        });
      }

      // Create/ensure CallLog for recording + transcript pipeline
      try {
        const base44 = createClientFromRequest(req);
        const logs = await base44.asServiceRole.entities.CallLog.filter({
          twilio_call_sid: callSid,
        });
        if (logs.length === 0) {
          const callLogData = {
            client_id: route.client_id,
            agent_id: route.agent_id,
            twilio_call_sid: callSid,
            from_number: fromPhone,
            to_number: toPhone,
            direction: "inbound",
            status: "in_progress",
            started_at: new Date().toISOString(),
            ...(ownerEmail ? { created_by: ownerEmail } : {}),
          };

          // Warn if no created_by (RLS issue)
          if (!ownerEmail) {
            log(
              "warn",
              "⚠️ CallLog created WITHOUT created_by - may not be visible in UI!",
              {
                callSid,
                client_id: route.client_id,
              },
            );
          }

          await base44.asServiceRole.entities.CallLog.create(callLogData);
          log("info", "CallLog created", {
            callSid,
            hasCreatedBy: !!ownerEmail,
            client_id: route.client_id,
          });
        } else {
          log("info", "CallLog already exists", { callSid });
        }
      } catch (e) {
        log("error", "CallLog ensure failed", {
          error: e.message,
          stack: e.stack,
          callSid,
          client_id: route.client_id,
        });
      }

      // Build greeting from agent + client names (no platform defaults)
      let assistantName = "Assistant";
      let businessName = "our business";
      try {
        const base44 = createClientFromRequest(req);
        const [agents, clients] = await Promise.all([
          base44.asServiceRole.entities.Agent.filter({ id: route.agent_id }),
          base44.asServiceRole.entities.Client.filter({ id: route.client_id }),
        ]);
        if (agents?.[0]) {
          assistantName = agents[0].phone_assistant_name || agents[0].name;
        }
        if (clients?.[0]) businessName = clients[0].name || businessName;
      } catch (_) {}
      const greeting = escapeXml(
        `Hi, this is ${assistantName} from ${businessName}. ${
          route.greeting || "How can I help you today?"
        }`,
      );

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${actionUrl}" method="POST" timeout="5" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">${greeting}</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. Please call back later. Goodbye!</Say>
  <Hangup/>
</Response>`;

      log("info", "STEP 1 complete - greeting sent", { actionUrl });
      return twiml(xml);
    }

    // -------------------- STEP 2: SUBSEQUENT HITS (has speech) --------------------
    const route = resolveRoute(toPhone);

    if (!route || !route.agent_id) {
      return twiml(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Configuration error: missing assistant.</Say>
  <Hangup/>
</Response>`,
      );
    }

    log("info", "Routing call", { agent_id: route.agent_id });

    // Call conversation orchestrator
    let reply = "";
    try {
      const orchUrl = `${WEBHOOK_BASE_URL(appId)}/conversationOrchestrator`;

      log("info", "Calling orchestrator", {
        orchUrl,
        speech: speech.substring(0, 50),
      });

      // SECURITY FIX: Add 5-second timeout to prevent phone calls hanging indefinitely
      // Phone context requires fast response; orchestrator should have own timeout logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const orchResp = await fetch(orchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: route.agent_id,
            session_id: callSid,
            user_input: speech,
            phone: fromPhone,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        log("info", "Orchestrator response", {
          status: orchResp.status,
          ok: orchResp.ok,
        });

        if (orchResp.ok) {
          const data = await orchResp.json();
          reply = (data.replyText || data.reply_text || "").trim();
          log("info", "Got reply from orchestrator", {
            replyLength: reply.length,
          });
        } else {
          const errorText = await orchResp.text();
          log("error", "Orchestrator non-OK response", {
            status: orchResp.status,
            body: errorText.substring(0, 200),
          });
        }
      } catch (fetchError) {
        // SECURITY FIX: Handle timeout and network errors gracefully
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          log("error", "Orchestrator request timed out (5s)", {
            agent_id: route.agent_id,
            session_id: callSid,
          });
          reply =
            "I apologize, but I'm having trouble processing your request right now. Please try again.";
        } else {
          log("error", "Orchestrator fetch failed", {
            error: fetchError.message,
          });
          throw fetchError;
        }
      }
    } catch (err) {
      log("error", "Orchestrator call failed", {
        error: err.message,
        stack: err.stack,
      });
    }

    // Fallback if no reply
    if (!reply) {
      reply = "I'm sorry, I didn't quite get that. Could you please repeat your question?";
    }

    const safeReply = escapeXml(reply);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${safeReply}</Say>
  <Gather input="speech" action="${actionUrl}" method="POST" timeout="5" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="Polly.Joanna">Thank you for calling Hello Biz. Goodbye!</Say>
  <Hangup/>
</Response>`;

    log("info", "STEP 2 complete - reply sent", {
      replyLength: safeReply.length,
    });
    return twiml(xml);
  } catch (globalErr) {
    // Global catch to prevent any 502 errors
    console.error("CRITICAL ERROR:", globalErr.message, globalErr.stack);
    return twiml(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`,
    );
  }
});
