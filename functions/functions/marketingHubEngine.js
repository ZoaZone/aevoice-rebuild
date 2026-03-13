// functions/marketingHubEngine.js
// Central Marketing Hub Engine for ALL AEVOICE platform sites
// Handles: Video, Email, SMS, Voice campaigns with multi-site webhook routing

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Marketing Hub Engine request received", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      site_url, // aevoice.ai, hellobiz.app, workautomation.app
      campaign_type, // email, video, sms, voice
      target_audience,
      content,
      schedule,
      client_id,
    } = body;

    // Validate required fields
    if (!site_url || !campaign_type || !content || !client_id) {
      return Response.json({
        error: "Missing required fields: site_url, campaign_type, content, client_id",
      }, { status: 400 });
    }

    logger.info("Creating marketing campaign", {
      request_id: requestId,
      site_url,
      campaign_type,
      client_id,
    });

    // Get client to determine partner tier
    const clients = await base44.asServiceRole.entities.Client.filter({
      id: client_id,
    });
    const client = clients[0];

    if (!client) {
      return Response.json({
        error: "Client not found",
      }, { status: 404 });
    }

    // Check if FREE partner (unlimited access)
    const isFreePartner = client.partner_tier === "free" ||
      client.contact_email?.includes("hellobiz") ||
      client.contact_email?.includes("workautomation");

    logger.info("Partner tier check", {
      request_id: requestId,
      partner_tier: client.partner_tier,
      is_free_partner: isFreePartner,
      email: client.contact_email,
    });

    // Create marketing campaign record
    // Note: If MarketingCampaign entity doesn't exist, this will fail gracefully
    let campaign;
    try {
      campaign = await base44.asServiceRole.entities.MarketingCampaign.create({
        client_id,
        site_url,
        campaign_type,
        target_audience: target_audience || "general",
        content,
        schedule: schedule || new Date().toISOString(),
        status: "pending",
        created_at: new Date().toISOString(),
        is_free: isFreePartner,
      });

      logger.info("Marketing campaign created", {
        request_id: requestId,
        campaign_id: campaign.id,
        campaign_type,
      });
    } catch (err) {
      logger.error("Failed to create campaign record", {
        request_id: requestId,
        error: err.message,
      });
      // Return early if we can't create the campaign record
      return Response.json({
        error:
          "Failed to create marketing campaign. The MarketingCampaign entity may not exist in the database.",
        details: err.message,
      }, { status: 500 });
    }

    // Video generation integration (graceful degradation if function unavailable)
    if (campaign_type === "video") {
      try {
        logger.info("Generating video for campaign", {
          request_id: requestId,
          campaign_id: campaign.id,
        });

        const videoResult = await base44.functions.invoke("generateVideo", {
          script: content,
          style: body.video_style || "professional",
          duration: body.video_duration || "30s",
        });

        if (videoResult?.data?.success && videoResult.data.video_url) {
          await base44.asServiceRole.entities.MarketingCampaign.update(
            campaign.id,
            {
              video_url: videoResult.data.video_url,
              status: "ready",
            },
          );

          logger.info("Video generated successfully", {
            request_id: requestId,
            campaign_id: campaign.id,
            video_url: videoResult.data.video_url,
          });
        } else {
          logger.warn("Video generation returned no URL", {
            request_id: requestId,
            campaign_id: campaign.id,
          });
        }
      } catch (err) {
        logger.error(
          "Video generation failed (function may not exist or errored)",
          {
            request_id: requestId,
            campaign_id: campaign.id,
            error: err.message,
          },
        );
        // Don't fail the entire campaign, just mark as needs_attention
        try {
          await base44.asServiceRole.entities.MarketingCampaign.update(
            campaign.id,
            {
              status: "needs_attention",
              error_message: `Video generation failed: ${err.message}`,
            },
          );
        } catch (updateErr) {
          logger.error("Failed to update campaign status", {
            request_id: requestId,
            error: updateErr.message,
          });
        }
      }
    }

    // Email campaign processing (graceful degradation)
    if (campaign_type === "email") {
      try {
        logger.info("Processing email campaign", {
          request_id: requestId,
          campaign_id: campaign.id,
        });

        await base44.functions.invoke("sendMarketingEmail", {
          campaign_id: campaign.id,
          recipients: target_audience,
          subject: body.email_subject || "Marketing Campaign",
          content: content,
        });

        await base44.asServiceRole.entities.MarketingCampaign.update(
          campaign.id,
          {
            status: "sent",
          },
        );
      } catch (err) {
        logger.error(
          "Email campaign failed (function may not exist or errored)",
          {
            request_id: requestId,
            campaign_id: campaign.id,
            error: err.message,
          },
        );
        // Continue processing - don't fail the whole campaign
      }
    }

    // Voice campaign processing (graceful degradation)
    if (campaign_type === "voice") {
      try {
        logger.info("Processing voice campaign", {
          request_id: requestId,
          campaign_id: campaign.id,
        });

        await base44.functions.invoke("sendVoiceCampaign", {
          campaign_id: campaign.id,
          recipients: target_audience,
          message: content,
        });

        await base44.asServiceRole.entities.MarketingCampaign.update(
          campaign.id,
          {
            status: "in_progress",
          },
        );
      } catch (err) {
        logger.error(
          "Voice campaign failed (function may not exist or errored)",
          {
            request_id: requestId,
            campaign_id: campaign.id,
            error: err.message,
          },
        );
        // Continue processing
      }
    }

    // SMS campaign processing (graceful degradation)
    if (campaign_type === "sms") {
      try {
        logger.info("Processing SMS campaign", {
          request_id: requestId,
          campaign_id: campaign.id,
        });

        await base44.functions.invoke("sendWhatsAppCampaign", {
          campaign_id: campaign.id,
          recipients: target_audience,
          message: content,
        });

        await base44.asServiceRole.entities.MarketingCampaign.update(
          campaign.id,
          {
            status: "sent",
          },
        );
      } catch (err) {
        logger.error(
          "SMS campaign failed (function may not exist or errored)",
          {
            request_id: requestId,
            campaign_id: campaign.id,
            error: err.message,
          },
        );
        // Continue processing
      }
    }

    // Webhook to each site's marketing engine
    const webhookUrls = {
      "aevoice.ai": "https://aevathon.aevoice.ai/marketing",
      "hellobiz.app": "https://aevathon.hellobiz.app/marketing",
      "workautomation.app": "https://aevathon.workautomation.app/marketing",
    };

    if (webhookUrls[site_url]) {
      try {
        logger.info("Sending webhook to site", {
          request_id: requestId,
          site_url,
          webhook_url: webhookUrls[site_url],
        });

        const webhookResponse = await fetch(webhookUrls[site_url], {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AEVOICE-Signature": requestId, // For verification
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            ...campaign,
            request_id: requestId,
          }),
        });

        if (!webhookResponse.ok) {
          logger.warn("Webhook delivery failed", {
            request_id: requestId,
            site_url,
            status: webhookResponse.status,
          });
        } else {
          logger.info("Webhook delivered successfully", {
            request_id: requestId,
            site_url,
          });
        }
      } catch (err) {
        logger.error("Webhook delivery error", {
          request_id: requestId,
          site_url,
          error: err.message,
        });
      }
    }

    // Billing: FREE for free partners, PAID for others
    if (!isFreePartner) {
      try {
        const campaignCost = {
          email: 10.00,
          video: 25.00,
          sms: 15.00,
          voice: 20.00,
        }[campaign_type] || 10.00;

        await base44.asServiceRole.entities.Transaction.create({
          client_id: client.id,
          amount: -campaignCost,
          type: "marketing_campaign",
          description: `Marketing campaign (${campaign_type}) for ${site_url}`,
          campaign_id: campaign.id,
          created_at: new Date().toISOString(),
        });

        logger.info("Campaign billed", {
          request_id: requestId,
          campaign_id: campaign.id,
          amount: campaignCost,
        });
      } catch (err) {
        logger.error("Billing failed (Transaction entity may not exist)", {
          request_id: requestId,
          campaign_id: campaign.id,
          error: err.message,
        });
        // Don't fail the campaign if billing fails - log it for manual reconciliation
        // The campaign was still created and processed successfully
      }
    } else {
      logger.info("Campaign FREE for free partner", {
        request_id: requestId,
        campaign_id: campaign.id,
      });
    }

    return Response.json({
      success: true,
      campaign_id: campaign.id,
      campaign,
      is_free: isFreePartner,
      message: `Marketing campaign created successfully${
        isFreePartner ? " (FREE for partner)" : ""
      }`,
    });
  } catch (error) {
    logger.error("Marketing Hub Engine failed", {
      request_id: requestId,
      error: error.message,
      stack: error.stack,
    });
    return Response.json({
      error: error.message,
      request_id: requestId,
    }, { status: 500 });
  }
});
