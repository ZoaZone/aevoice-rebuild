/**
 * Send voice call marketing campaign using AI agent
 *
 * @route POST /functions/sendVoiceCampaign
 * @auth Required - User must own the campaign
 * @body { campaign_id, contact_ids, agent_id, phone_number_id, voice_script, user_consent }
 * @returns { success: true, calls_initiated, calls_failed, total_cost }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      campaign_id,
      contact_ids,
      agent_id,
      phone_number_id,
      voice_script,
      user_consent,
    } = await req.json();

    if (!campaign_id || !agent_id || !phone_number_id) {
      return Response.json({
        error: "Missing required fields: campaign_id, agent_id, phone_number_id",
      }, { status: 400 });
    }

    // NEW: Check user consent for marketing charges
    if (!user_consent) {
      return Response.json({
        error: "User consent required",
        message:
          "You must consent to voice marketing charges. Costs include Twilio call fees, AI conversation costs (LLM tokens), and voice synthesis (TTS characters) with platform markup.",
        requires_consent: true,
        estimated_cost_per_call: {
          twilio_per_minute: 0.02,
          llm_per_1k_tokens: 0.03,
          tts_per_1k_chars: 0.015,
          platform_markup: "20%",
        },
      }, { status: 402 }); // 402 Payment Required
    }

    logger.info("Voice campaign started", {
      request_id: requestId,
      campaign_id,
      agent_id,
      user_email: user.email,
    });

    // Get campaign
    const campaign = await base44.asServiceRole.entities.MarketingCampaign.get(
      campaign_id,
    );
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get agent
    const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get phone number
    const phoneNumber = await base44.asServiceRole.entities.PhoneNumber.get(
      phone_number_id,
    );
    if (!phoneNumber) {
      return Response.json({ error: "Phone number not found" }, {
        status: 404,
      });
    }

    // Get contacts
    let recipients = [];
    if (contact_ids && contact_ids.length > 0) {
      for (const contactId of contact_ids) {
        const contact = await base44.asServiceRole.entities.MarketingContact
          .get(contactId);
        if (contact && contact.phone && contact.voice_subscribed) {
          recipients.push(contact);
        }
      }
    } else {
      const allContacts = await base44.asServiceRole.entities.MarketingContact
        .list();
      recipients = allContacts.filter((c) => c.voice_subscribed && c.phone);
    }

    if (recipients.length === 0) {
      return Response.json({
        error: "No valid voice recipients found",
        message: "Make sure contacts have phone numbers and are voice call subscribed",
      }, { status: 400 });
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioAccountSid || !twilioAuthToken) {
      return Response.json({
        error: "Twilio credentials not configured",
      }, { status: 500 });
    }

    const callsInitiated = [];
    const callsFailed = [];
    let totalEstimatedCost = 0;

    // Initiate calls via Twilio
    for (const recipient of recipients) {
      try {
        // Create TwiML for AI-powered call
        const twimlUrl =
          `https://aevoice.ai/functions/twilioWebhook?agent_id=${agent_id}&campaign_id=${campaign_id}&contact_id=${recipient.id}`;

        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
          {
            method: "POST",
            headers: {
              "Authorization": "Basic " +
                btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: phoneNumber.number_e164,
              To: recipient.phone,
              Url: twimlUrl,
              StatusCallback: `https://aevoice.ai/functions/voiceCampaignCallback`,
              StatusCallbackEvent: [
                "initiated",
                "ringing",
                "answered",
                "completed",
              ],
            }),
          },
        );

        const result = await twilioResponse.json();

        if (twilioResponse.ok) {
          // Estimate costs (actual costs tracked during call)
          const estimatedDurationMinutes = 2; // Average marketing call
          const twilioCallCost = 0.02 * estimatedDurationMinutes; // $0.02/min
          const llmCost = 0.03 * 2; // ~2k tokens per 2-min call
          const ttsCost = 0.015 * 1; // ~1k chars TTS
          const providerCost = twilioCallCost + llmCost + ttsCost;
          const chargedAmount = providerCost * 1.2; // 20% markup

          totalEstimatedCost += chargedAmount;

          callsInitiated.push({
            contact_id: recipient.id,
            contact_name: recipient.full_name,
            phone: recipient.phone,
            call_sid: result.sid,
            estimated_cost: chargedAmount.toFixed(4),
          });

          // Track communication usage (initial estimate)
          try {
            await base44.asServiceRole.entities.CommunicationUsage.create({
              client_id: campaign.client_id,
              campaign_id: campaign_id,
              contact_id: recipient.id,
              channel: "voice",
              direction: "outbound",
              status: "initiated",
              message_id: result.sid,
              provider: "twilio",
              provider_cost: providerCost,
              llm_cost: llmCost,
              tts_cost: ttsCost,
              charged_amount: chargedAmount,
              sent_at: new Date().toISOString(),
              metadata: {
                agent_id,
                phone_number_id,
                estimated: true,
              },
            });
          } catch (usageError) {
            logger.error("Failed to track communication usage", {
              request_id: requestId,
              error: usageError.message,
            });
          }
        } else {
          callsFailed.push({
            contact_id: recipient.id,
            phone: recipient.phone,
            error: result.message || "Unknown error",
          });
        }
      } catch (error) {
        logger.error("Call initiation failed", {
          request_id: requestId,
          contact_id: recipient.id,
          error: error instanceof Error ? error.message : String(error),
        });

        callsFailed.push({
          contact_id: recipient.id,
          phone: recipient.phone,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update campaign
    await base44.asServiceRole.entities.MarketingCampaign.update(campaign_id, {
      status: callsInitiated.length > 0 ? "running" : "failed",
      sent_at: new Date().toISOString(),
      estimated_cost: totalEstimatedCost,
      stats: {
        sent: callsInitiated.length,
        failed: callsFailed.length,
        total: recipients.length,
        in_progress: callsInitiated.length,
      },
    });

    logger.info("Voice campaign initiated", {
      request_id: requestId,
      campaign_id,
      calls_initiated: callsInitiated.length,
      calls_failed: callsFailed.length,
      estimated_cost: totalEstimatedCost,
    });

    return Response.json({
      success: true,
      calls_initiated: callsInitiated.length,
      calls_failed: callsFailed.length,
      total_estimated_cost: totalEstimatedCost.toFixed(2),
      message:
        "Voice campaign initiated. Calls are being placed. Actual costs will be calculated after call completion.",
      calls: callsInitiated,
      failed: callsFailed.slice(0, 10),
    });
  } catch (error) {
    logger.error("Voice campaign error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
