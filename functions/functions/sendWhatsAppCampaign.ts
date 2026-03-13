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

    const { campaign_id, contact_ids, message, phone_number_id, user_consent } = await req
      .json();

    if (!campaign_id || !message || !phone_number_id) {
      return Response.json({
        error: "Missing required fields: campaign_id, message, phone_number_id",
      }, { status: 400 });
    }

    // NEW: Check user consent for marketing charges
    if (!user_consent) {
      return Response.json({
        error: "User consent required",
        message:
          "You must consent to WhatsApp marketing charges. Costs include Twilio fees plus AI processing markup.",
        requires_consent: true,
      }, { status: 402 }); // 402 Payment Required
    }

    logger.info("WhatsApp campaign started", {
      request_id: requestId,
      campaign_id,
      user_email: user.email,
    });

    // Get phone number details
    const phoneNumber = await base44.entities.PhoneNumber.get(phone_number_id);
    if (!phoneNumber) {
      return Response.json({ error: "Phone number not found" }, {
        status: 404,
      });
    }

    // Get contacts to send to
    let recipients = [];
    if (contact_ids && contact_ids.length > 0) {
      // Send to specific contacts
      for (const contactId of contact_ids) {
        const contact = await base44.asServiceRole.entities.MarketingContact
          .get(contactId);
        if (contact && contact.phone && contact.whatsapp_subscribed) {
          recipients.push(contact);
        }
      }
    } else {
      // Send to all whatsapp-subscribed contacts
      const allContacts = await base44.asServiceRole.entities.MarketingContact
        .list();
      recipients = allContacts.filter((c) => c.whatsapp_subscribed && c.phone);
    }

    if (recipients.length === 0) {
      return Response.json({
        error: "No valid WhatsApp recipients found",
        message: "Make sure contacts have phone numbers and are WhatsApp subscribed",
      }, { status: 400 });
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioAccountSid || !twilioAuthToken) {
      return Response.json({
        error: "Twilio credentials not configured. Please contact support.",
      }, { status: 500 });
    }

    // Get campaign for client_id
    const campaign = await base44.asServiceRole.entities.MarketingCampaign.get(
      campaign_id,
    );
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    const sentMessages = [];
    const failedMessages = [];
    let totalProviderCost = 0;
    let totalChargedAmount = 0;

    // Send WhatsApp messages via Twilio
    for (const recipient of recipients) {
      try {
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": "Basic " +
                btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: `whatsapp:${phoneNumber.number_e164}`,
              To: `whatsapp:${recipient.phone}`,
              Body: message,
            }),
          },
        );

        const result = await twilioResponse.json();

        if (twilioResponse.ok) {
          // Twilio WhatsApp pricing: ~$0.005 per message (conversation-based pricing)
          const providerCost = 0.005;
          const chargedAmount = providerCost * 1.2; // 20% markup for platform

          totalProviderCost += providerCost;
          totalChargedAmount += chargedAmount;

          sentMessages.push({
            contact_id: recipient.id,
            contact_name: recipient.full_name,
            phone: recipient.phone,
            message_sid: result.sid,
          });

          // Track communication usage
          try {
            await base44.asServiceRole.entities.CommunicationUsage.create({
              client_id: campaign.client_id,
              campaign_id: campaign_id,
              contact_id: recipient.id,
              channel: "whatsapp",
              direction: "outbound",
              status: "sent",
              message_id: result.sid,
              message_snippet: message.substring(0, 100),
              provider: "twilio",
              provider_cost: providerCost,
              charged_amount: chargedAmount,
              sent_at: new Date().toISOString(),
              metadata: { phone_number_id },
            });
          } catch (usageError) {
            logger.error("Failed to track communication usage", {
              request_id: requestId,
              error: usageError.message,
            });
          }
        } else {
          failedMessages.push({
            contact_id: recipient.id,
            phone: recipient.phone,
            error: result.message || "Unknown error",
          });
        }
      } catch (error) {
        failedMessages.push({
          contact_id: recipient.id,
          phone: recipient.phone,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update campaign stats and costs
    await base44.asServiceRole.entities.MarketingCampaign.update(campaign_id, {
      status: "completed",
      sent_at: new Date().toISOString(),
      actual_cost: totalChargedAmount,
      stats: {
        sent: sentMessages.length,
        delivered: sentMessages.length,
        failed: failedMessages.length,
        total: recipients.length,
      },
    });

    logger.info("WhatsApp campaign completed", {
      request_id: requestId,
      campaign_id,
      sent: sentMessages.length,
      failed: failedMessages.length,
      total_cost: totalChargedAmount,
    });

    return Response.json({
      success: true,
      sent_count: sentMessages.length,
      failed_count: failedMessages.length,
      total_cost: totalChargedAmount.toFixed(4),
      sent_messages: sentMessages,
      failed_messages: failedMessages.slice(0, 10), // Limit errors in response
    });
  } catch (error) {
    logger.error("WhatsApp campaign error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
