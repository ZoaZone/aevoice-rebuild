import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

// Cost estimation constants (in USD)
const COST_PER_1K_PROMPT_TOKENS = 0.00015; // gpt-4o-mini default
const COST_PER_1K_COMPLETION_TOKENS = 0.0006;
const COST_PER_MINUTE_TELEPHONY = 0.015; // Twilio average
const COST_PER_CHARACTER_TTS = 0.00003; // ElevenLabs average

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const { call_sid, updates } = await req.json();

    logger.info("Update call session started", {
      request_id: requestId,
      call_sid,
    });

    // Find call session by provider_call_id
    const sessions = await base44.asServiceRole.entities.CallSession.filter({
      provider_call_id: call_sid,
    });

    if (sessions.length === 0) {
      logger.warn("Call session not found", {
        request_id: requestId,
        call_sid,
      });

      return Response.json({
        success: false,
        error: "Call session not found",
      }, { status: 404 });
    }

    const session = sessions[0];

    // Calculate duration if ended_at is provided
    if (updates.ended_at && session.started_at) {
      const start = new Date(session.started_at);
      const end = new Date(updates.ended_at);
      updates.duration_seconds = Math.floor((end - start) / 1000);
      // Default status to completed if not provided
      if (!updates.status) updates.status = "completed";
      console.log("Saving call to history", {
        callSid: call_sid,
        agentId: session.agent_id,
        duration: updates.duration_seconds,
      });
    }

    await base44.asServiceRole.entities.CallSession.update(session.id, updates);

    // Also update CallLog if present
    try {
      const logs = await base44.asServiceRole.entities.CallLog.filter({
        twilio_call_sid: call_sid,
      });
      if (logs.length > 0) {
        await base44.asServiceRole.entities.CallLog.update(logs[0].id, {
          status: updates.status || logs[0].status,
          ended_at: updates.ended_at,
          duration_seconds: updates.duration_seconds,
          agent_id: session.agent_id,
        });
      }
    } catch (e) {
      console.warn("[updateCallSession] CallLog update failed", e.message);
    }

    // If call has ended, track costs asynchronously
    if (updates.ended_at && session.client_id) {
      // Don't wait for cost tracking - do it async
      trackCallCosts(base44, session, updates, requestId).catch((error) => {
        logger.error("Cost tracking failed (non-blocking)", {
          request_id: requestId,
          call_session_id: session.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Update call session error", {
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

/**
 * Track costs for a completed call (async, non-blocking)
 */
async function trackCallCosts(base44, session, updates, requestId) {
  try {
    // Get the conversation session to extract usage stats
    const conversationSessions = await base44.asServiceRole.entities
      .ConversationSession.filter({
        agent_id: session.agent_id,
        session_token: session.id,
      });

    let usageStats = {
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
    };

    if (conversationSessions?.[0]?.state_json?.usage_stats) {
      usageStats = conversationSessions[0].state_json.usage_stats;
    }

    // Calculate AI LLM cost
    const aiLlmCost = (usageStats.total_prompt_tokens / 1000) * COST_PER_1K_PROMPT_TOKENS +
      (usageStats.total_completion_tokens / 1000) *
        COST_PER_1K_COMPLETION_TOKENS;

    // Calculate telephony cost (duration in minutes)
    const durationMinutes = (updates.duration_seconds || 0) / 60;
    const telephonyCost = durationMinutes * COST_PER_MINUTE_TELEPHONY;

    // Estimate TTS cost (rough estimate based on reply length)
    // Assume ~150 chars per assistant response, estimate based on turns
    const estimatedChars = (usageStats.total_completion_tokens || 0) * 4; // rough token to char
    const voiceTtsCost = estimatedChars * COST_PER_CHARACTER_TTS;

    // Get client's agency_id
    const clients = await base44.asServiceRole.entities.Client.filter({
      id: session.client_id,
    });

    const agencyId = clients?.[0]?.agency_id || null;

    logger.info("Tracking call costs", {
      request_id: requestId,
      call_session_id: session.id,
      ai_llm_cost: aiLlmCost,
      voice_tts_cost: voiceTtsCost,
      telephony_cost: telephonyCost,
      prompt_tokens: usageStats.total_prompt_tokens,
      completion_tokens: usageStats.total_completion_tokens,
    });

    // Call trackTransactionCosts function
    await base44.asServiceRole.functions.invoke("trackTransactionCosts", {
      action: "recordTransactionCost",
      transactionType: "call",
      transactionDate: updates.ended_at,
      agencyId,
      clientId: session.client_id,
      agentId: session.agent_id,
      referenceType: "call_session",
      referenceId: session.id,
      grossSaleAmount: 0, // Calls are part of subscription, not direct sale
      aiLlmCost,
      voiceTtsCost,
      telephonyCost,
      usageDetails: {
        call_sid: session.provider_call_id,
        duration_seconds: updates.duration_seconds,
        prompt_tokens: usageStats.total_prompt_tokens,
        completion_tokens: usageStats.total_completion_tokens,
        total_tokens: usageStats.total_tokens,
      },
      notes: `Call cost tracking for ${session.provider_call_id}`,
    });

    logger.info("Call costs tracked successfully", {
      request_id: requestId,
      call_session_id: session.id,
    });
  } catch (error) {
    logger.error("Track call costs error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    throw error;
  }
}
