import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

/*
 * CREDIT DISTRIBUTION SYSTEM
 *
 * This function handles automatic credit allocation to backend services
 * based on subscription payments. Called by stripeWebhook after successful payments.
 *
 * COST BREAKDOWN PER MINUTE ($0.15/credit):
 * - OpenAI GPT-4o-mini: ~$0.02 (conversation logic)
 * - ElevenLabs TTS: ~$0.04 (voice synthesis)
 * - Whisper STT: ~$0.01 (transcription)
 * - Platform overhead: ~$0.02 (infrastructure)
 * - Profit margin: ~$0.06
 *
 * NOTE: Actual API prepayment to OpenAI/ElevenLabs is NOT automatic.
 * These services use pay-as-you-go billing from your API keys.
 * This system tracks internal credits for usage limits.
 */

// Credit allocation per plan
// AEVA Plans - Create these in Stripe Dashboard:
// - Aeva Mini: $100/mo, 300 credits
// - Aeva Micro: $35/mo, pay-as-you-go
// - Aeva Medium: $250/mo, 1666 credits
// - Aeva Mega: $1000+/mo, 7000+ credits (custom configurator)
// - Aeva Recording Add-on: $25/mo (for Mini/Micro/Medium)

const planCredits = {
  "aeva-mini": {
    credits: 300,
    openaiAllocation: 100,
    elevenLabsAllocation: 150,
    twilioAllocation: 50,
  },
  "aeva-micro": {
    credits: 0,
    openaiAllocation: 0,
    elevenLabsAllocation: 0,
    twilioAllocation: 0,
  }, // Pay as you go
  "aeva-medium": {
    credits: 1666,
    openaiAllocation: 555,
    elevenLabsAllocation: 833,
    twilioAllocation: 278,
  },
  "aeva-mega": {
    credits: 7000,
    openaiAllocation: 2333,
    elevenLabsAllocation: 3500,
    twilioAllocation: 1167,
  },
};

/*
 * RECORDING ADD-ON COST ANALYSIS
 * ==============================
 * Your cost per recorded minute: ~$0.01
 *   - Whisper transcription: $0.006/min
 *   - Storage: $0.001/min
 *   - Processing: $0.003/min
 *
 * Pricing:
 *   - Regular ($50/mo): Profit if < 5,000 min recorded
 *   - Mega ($100/mo): Profit if < 10,000 min recorded
 *
 * Typical usage:
 *   - Beginner (300 min): Cost $3, Charge $50 = $47 profit
 *   - Enterprise (1666 min): Cost $17, Charge $50 = $33 profit
 *   - Mega (7000 min): Cost $70, Charge $100 = $30 profit
 */

// Cost per service per minute (for tracking)
const serviceCosts = {
  openai: 0.02, // GPT-4o-mini per minute
  elevenlabs: 0.04, // TTS per minute
  whisper: 0.01, // STT per minute
  twilio: 0.02, // Telephony per minute (avg)
  platform: 0.02, // Infrastructure
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, clientId, planType, credits, multiplier = 1 } = body;

    if (action === "allocateCredits") {
      // Get or create usage counter for client
      const counters = await base44.asServiceRole.entities.UsageCounter.filter({
        client_id: clientId,
      });

      const allocation = planCredits[planType] || planCredits["aeva-micro"];
      const totalCredits = (allocation.credits || credits) * multiplier;

      if (counters?.[0]) {
        // Update existing counter
        await base44.asServiceRole.entities.UsageCounter.update(
          counters[0].id,
          {
            total_minutes_allocated: (counters[0].total_minutes_allocated || 0) + totalCredits,
            openai_credits: (counters[0].openai_credits || 0) +
              (allocation.openaiAllocation * multiplier),
            elevenlabs_credits: (counters[0].elevenlabs_credits || 0) +
              (allocation.elevenLabsAllocation * multiplier),
            twilio_credits: (counters[0].twilio_credits || 0) +
              (allocation.twilioAllocation * multiplier),
            last_allocation_date: new Date().toISOString(),
          },
        );
      } else {
        // Create new counter
        await base44.asServiceRole.entities.UsageCounter.create({
          client_id: clientId,
          total_minutes_allocated: totalCredits,
          minutes_used: 0,
          openai_credits: allocation.openaiAllocation * multiplier,
          elevenlabs_credits: allocation.elevenLabsAllocation * multiplier,
          twilio_credits: allocation.twilioAllocation * multiplier,
          openai_used: 0,
          elevenlabs_used: 0,
          twilio_used: 0,
          last_allocation_date: new Date().toISOString(),
        });
      }

      // Update wallet balance
      const wallets = await base44.asServiceRole.entities.Wallet.filter({
        owner_id: clientId,
      });
      if (wallets?.[0]) {
        await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
          credits_balance: (wallets[0].credits_balance || 0) + totalCredits,
          last_topped_up_at: new Date().toISOString(),
        });
      }

      return Response.json({
        success: true,
        allocated: {
          totalCredits,
          openai: allocation.openaiAllocation * multiplier,
          elevenlabs: allocation.elevenLabsAllocation * multiplier,
          twilio: allocation.twilioAllocation * multiplier,
        },
      });
    }

    if (action === "deductUsage") {
      // Called after each call to deduct from appropriate service pools
      const { minutes, services } = body;

      const counters = await base44.asServiceRole.entities.UsageCounter.filter({
        client_id: clientId,
      });

      if (!counters?.[0]) {
        return Response.json({ error: "No usage counter found" }, {
          status: 404,
        });
      }

      const counter = counters[0];
      const updates = {
        minutes_used: (counter.minutes_used || 0) + minutes,
      };

      // Deduct from each service used
      if (services?.openai) {
        updates.openai_used = (counter.openai_used || 0) + services.openai;
      }
      if (services?.elevenlabs) {
        updates.elevenlabs_used = (counter.elevenlabs_used || 0) +
          services.elevenlabs;
      }
      if (services?.twilio) {
        updates.twilio_used = (counter.twilio_used || 0) + services.twilio;
      }

      await base44.asServiceRole.entities.UsageCounter.update(
        counter.id,
        updates,
      );

      // Also deduct from wallet
      const wallets = await base44.asServiceRole.entities.Wallet.filter({
        owner_id: clientId,
      });
      if (wallets?.[0]) {
        await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
          credits_balance: Math.max(
            0,
            (wallets[0].credits_balance || 0) - minutes,
          ),
        });
      }

      return Response.json({
        success: true,
        remaining: counter.total_minutes_allocated - updates.minutes_used,
      });
    }

    if (action === "getUsageStatus") {
      const counters = await base44.asServiceRole.entities.UsageCounter.filter({
        client_id: clientId,
      });

      if (!counters?.[0]) {
        return Response.json({
          allocated: 0,
          used: 0,
          remaining: 0,
          services: {},
        });
      }

      const counter = counters[0];
      return Response.json({
        allocated: counter.total_minutes_allocated || 0,
        used: counter.minutes_used || 0,
        remaining: (counter.total_minutes_allocated || 0) -
          (counter.minutes_used || 0),
        services: {
          openai: {
            allocated: counter.openai_credits || 0,
            used: counter.openai_used || 0,
          },
          elevenlabs: {
            allocated: counter.elevenlabs_credits || 0,
            used: counter.elevenlabs_used || 0,
          },
          twilio: {
            allocated: counter.twilio_credits || 0,
            used: counter.twilio_used || 0,
          },
        },
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Credit distribution failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
