import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Usage tracking request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Record usage after a call ends
    async function recordCallUsage({ callSessionId }) {
      const calls = await base44.entities.CallSession.filter({
        id: callSessionId,
      });

      if (!calls || calls.length === 0) {
        throw new Error("Call session not found");
      }

      const call = calls[0];
      const durationSeconds = call.duration_seconds || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);

      // Get or create usage counter for current period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split(
        "T",
      )[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split(
        "T",
      )[0];

      let usageCounters = await base44.entities.UsageCounter.filter({
        client_id: call.client_id,
        period_start: periodStart,
      });

      let usageCounter;

      if (!usageCounters || usageCounters.length === 0) {
        // Create new usage counter for this period
        usageCounter = await base44.entities.UsageCounter.create({
          client_id: call.client_id,
          period_start: periodStart,
          period_end: periodEnd,
          total_calls: 1,
          total_call_seconds: durationSeconds,
          total_call_minutes: durationMinutes,
          inbound_calls: call.direction === "inbound" ? 1 : 0,
          outbound_calls: call.direction === "outbound" ? 1 : 0,
          total_llm_tokens: call.usage_stats?.llm_tokens_in +
              call.usage_stats?.llm_tokens_out || 0,
          total_tts_chars: call.usage_stats?.tts_chars || 0,
          total_asr_seconds: call.usage_stats?.asr_seconds || 0,
          outcomes: { [call.outcome || "no_outcome"]: 1 },
        });
      } else {
        // Update existing usage counter
        usageCounter = usageCounters[0];
        const outcomes = usageCounter.outcomes || {};
        outcomes[call.outcome || "no_outcome"] = (outcomes[call.outcome || "no_outcome"] || 0) + 1;

        await base44.entities.UsageCounter.update(usageCounter.id, {
          total_calls: (usageCounter.total_calls || 0) + 1,
          total_call_seconds: (usageCounter.total_call_seconds || 0) +
            durationSeconds,
          total_call_minutes: (usageCounter.total_call_minutes || 0) +
            durationMinutes,
          inbound_calls: (usageCounter.inbound_calls || 0) +
            (call.direction === "inbound" ? 1 : 0),
          outbound_calls: (usageCounter.outbound_calls || 0) +
            (call.direction === "outbound" ? 1 : 0),
          total_llm_tokens: (usageCounter.total_llm_tokens || 0) +
            (call.usage_stats?.llm_tokens_in || 0) +
            (call.usage_stats?.llm_tokens_out || 0),
          total_tts_chars: (usageCounter.total_tts_chars || 0) +
            (call.usage_stats?.tts_chars || 0),
          total_asr_seconds: (usageCounter.total_asr_seconds || 0) +
            (call.usage_stats?.asr_seconds || 0),
          outcomes,
        });
      }

      // Check if this triggers overage billing
      const minutesCheck = await base44.functions.invoke("planLimits", {
        action: "checkMinutesUsage",
        clientId: call.client_id,
      });

      const { usedMinutes, includedMinutes, overagePrice } = minutesCheck.data;

      // If overage, deduct from wallet
      if (usedMinutes > includedMinutes) {
        const overageMinutesThisCall = Math.min(
          durationMinutes,
          usedMinutes - includedMinutes,
        );
        const overageCost = overageMinutesThisCall * overagePrice;

        // Get client's agency wallet
        const clients = await base44.entities.Client.filter({
          id: call.client_id,
        });
        const client = clients?.[0];

        if (client) {
          const wallets = await base44.entities.Wallet.filter({
            owner_type: "agency",
            owner_id: client.agency_id,
          });

          const wallet = wallets?.[0];

          if (wallet && wallet.credits_balance >= overageCost) {
            // Deduct from wallet
            await base44.entities.Wallet.update(wallet.id, {
              credits_balance: wallet.credits_balance - overageCost,
            });

            // Record transaction
            await base44.entities.Transaction.create({
              wallet_id: wallet.id,
              type: "usage",
              amount: -overageCost,
              balance_after: wallet.credits_balance - overageCost,
              description: `Overage: ${overageMinutesThisCall} min @ $${overagePrice}/min`,
              reference_type: "call_session",
              reference_id: callSessionId,
            });
          }
        }
      }

      return {
        recorded: true,
        callId: callSessionId,
        durationMinutes,
        usageStatus: minutesCheck.data,
      };
    }

    // Get usage summary for a client
    async function getUsageSummary({ clientId, periodStart }) {
      const start = periodStart ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString().split("T")[0];

      const usageCounters = await base44.entities.UsageCounter.filter({
        client_id: clientId,
        period_start: start,
      });

      const usage = usageCounters?.[0] || {
        total_calls: 0,
        total_call_minutes: 0,
        inbound_calls: 0,
        outbound_calls: 0,
        outcomes: {},
      };

      // Get plan limits
      const minutesCheck = await base44.functions.invoke("planLimits", {
        action: "checkMinutesUsage",
        clientId,
      });

      return {
        period: start,
        usage,
        limits: minutesCheck.data,
      };
    }

    // Get usage across all clients for an agency
    async function getAgencyUsageSummary({ agencyId }) {
      const clients = await base44.entities.Client.filter({
        agency_id: agencyId,
      });

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split(
        "T",
      )[0];

      let totalCalls = 0;
      let totalMinutes = 0;
      const clientUsage = [];

      for (const client of clients || []) {
        const usageCounters = await base44.entities.UsageCounter.filter({
          client_id: client.id,
          period_start: periodStart,
        });

        const usage = usageCounters?.[0];
        if (usage) {
          totalCalls += usage.total_calls || 0;
          totalMinutes += usage.total_call_minutes || 0;
          clientUsage.push({
            clientId: client.id,
            clientName: client.name,
            calls: usage.total_calls || 0,
            minutes: usage.total_call_minutes || 0,
          });
        }
      }

      return {
        agencyId,
        period: periodStart,
        totalCalls,
        totalMinutes,
        clientCount: clients?.length || 0,
        clientUsage,
      };
    }

    let result;
    switch (action) {
      case "recordCallUsage":
        result = await recordCallUsage(body);
        break;
      case "getUsageSummary":
        result = await getUsageSummary(body);
        break;
      case "getAgencyUsageSummary":
        result = await getAgencyUsageSummary(body);
        break;
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    logger.error("Usage tracking failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
