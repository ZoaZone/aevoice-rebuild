/**
 * marketingHubBilling.ts
 *
 * Marketing Hub billing with 25% markup pricing
 * Handles email campaigns (zoazoneservices.com), WhatsApp (Twilio),
 * social media, and voice campaigns (AEVOICE)
 *
 * @route POST /functions/marketingHubBilling
 * @auth Required - User must own the client
 * @body { action, clientId, ... }
 * @returns { success: true, data }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.ts";
import { createBillingEngine } from "./lib/billingEngine.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Marketing Hub billing request started", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    /**
     * Calculate campaign costs
     */
    function calculateCampaignCosts({
      emailRecipients = 0,
      whatsappMessages = 0,
      socialMediaPosts = 0,
      voiceCallMinutes = 0,
    }: {
      emailRecipients?: number;
      whatsappMessages?: number;
      socialMediaPosts?: number;
      voiceCallMinutes?: number;
    }): {
      emailCost: number;
      whatsAppCost: number;
      socialMediaCost: number;
      voiceCost: number;
      totalPlatformCost: number;
    } {
      // Platform cost rates (these would come from actual provider pricing)
      const EMAIL_COST_PER_1000 = 1.0; // $1 per 1000 emails via zoazoneservices.com
      const WHATSAPP_COST_PER_MESSAGE = 0.005; // $0.005 per message via Twilio
      const SOCIAL_MEDIA_COST_PER_POST = 0.10; // $0.10 per post (API costs)
      const VOICE_COST_PER_MINUTE = 0.015; // $0.015 per minute via AEVOICE

      const emailCost = (emailRecipients / 1000) * EMAIL_COST_PER_1000;
      const whatsAppCost = whatsappMessages * WHATSAPP_COST_PER_MESSAGE;
      const socialMediaCost = socialMediaPosts * SOCIAL_MEDIA_COST_PER_POST;
      const voiceCost = voiceCallMinutes * VOICE_COST_PER_MINUTE;

      const totalPlatformCost = emailCost + whatsAppCost + socialMediaCost +
        voiceCost;

      return {
        emailCost,
        whatsAppCost,
        socialMediaCost,
        voiceCost,
        totalPlatformCost,
      };
    }

    /**
     * Calculate campaign billing with 25% markup
     */
    async function calculateCampaignBilling({
      clientId,
      campaignType,
      emailRecipients = 0,
      whatsappMessages = 0,
      socialMediaPosts = 0,
      voiceCallMinutes = 0,
      taxPercentage = 0,
    }: {
      clientId: string;
      campaignType: "email" | "whatsapp" | "social" | "voice" | "multi_channel";
      emailRecipients?: number;
      whatsappMessages?: number;
      socialMediaPosts?: number;
      voiceCallMinutes?: number;
      taxPercentage?: number;
    }) {
      // Validate client ownership
      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      if (user.role !== "admin" && client.user_id !== user.id) {
        throw new Error("Unauthorized: You don't own this client");
      }

      logger.info("Calculating campaign billing", {
        request_id: requestId,
        client_id: clientId,
        campaign_type: campaignType,
        email_recipients: emailRecipients,
        whatsapp_messages: whatsappMessages,
      });

      // Calculate platform costs
      const costs = calculateCampaignCosts({
        emailRecipients,
        whatsappMessages,
        socialMediaPosts,
        voiceCallMinutes,
      });

      // Calculate billing with 25% markup
      const billingEngine = createBillingEngine();
      const billingResult = billingEngine.calculateMarketingHubBilling(
        {
          emailCost: costs.emailCost,
          whatsAppCost: costs.whatsAppCost,
          socialMediaCost: costs.socialMediaCost,
          voiceCost: costs.voiceCost,
        },
        taxPercentage,
      );

      return {
        clientId,
        campaignType,
        usage: {
          emailRecipients,
          whatsappMessages,
          socialMediaPosts,
          voiceCallMinutes,
        },
        costs: billingResult.costDetails,
        billing: billingResult.breakdown,
        currency: billingEngine.getCurrency(),
        profitMargin: billingEngine.getProfitMarginPercentage(),
      };
    }

    /**
     * Record Marketing Hub usage
     */
    async function recordMarketingUsage({
      clientId,
      campaignId = null,
      campaignType,
      emailRecipients = 0,
      whatsappMessages = 0,
      socialMediaPosts = 0,
      voiceCallMinutes = 0,
      metadata = {},
    }: {
      clientId: string;
      campaignId?: string | null;
      campaignType: string;
      emailRecipients?: number;
      whatsappMessages?: number;
      socialMediaPosts?: number;
      voiceCallMinutes?: number;
      metadata?: Record<string, unknown>;
    }) {
      logger.info("Recording Marketing Hub usage", {
        request_id: requestId,
        client_id: clientId,
        campaign_type: campaignType,
      });

      // Calculate costs
      const costs = calculateCampaignCosts({
        emailRecipients,
        whatsappMessages,
        socialMediaPosts,
        voiceCallMinutes,
      });

      // Calculate billing
      const billingResult = await calculateCampaignBilling({
        clientId,
        campaignType: campaignType as
          | "email"
          | "whatsapp"
          | "social"
          | "voice"
          | "multi_channel",
        emailRecipients,
        whatsappMessages,
        socialMediaPosts,
        voiceCallMinutes,
      });

      // Store usage record
      const period = new Date().toISOString().substring(0, 7); // YYYY-MM
      const usageRecord = await base44.asServiceRole.db.query(
        `INSERT INTO marketing_hub_usage (
          client_id,
          campaign_id,
          campaign_type,
          period,
          email_recipients,
          whatsapp_messages,
          social_media_posts,
          voice_call_minutes,
          email_cost,
          whatsapp_cost,
          social_media_cost,
          voice_cost,
          total_platform_cost,
          profit_amount,
          tax_amount,
          total_amount,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        RETURNING id`,
        [
          clientId,
          campaignId,
          campaignType,
          period,
          emailRecipients,
          whatsappMessages,
          socialMediaPosts,
          voiceCallMinutes,
          costs.emailCost,
          costs.whatsAppCost,
          costs.socialMediaCost,
          costs.voiceCost,
          costs.totalPlatformCost,
          billingResult.billing.profitAmount,
          billingResult.billing.taxAmount,
          billingResult.billing.totalAmount,
          JSON.stringify(metadata),
        ],
      ).catch((error) => {
        logger.warn("Marketing Hub usage table not found - skipping record", {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      });

      const usageId = usageRecord?.rows?.[0]?.id;

      return {
        usageId,
        ...billingResult,
      };
    }

    /**
     * Get Marketing Hub usage summary
     */
    async function getMarketingUsageSummary({
      clientId,
      period,
    }: {
      clientId: string;
      period?: string;
    }) {
      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      if (user.role !== "admin" && client.user_id !== user.id) {
        throw new Error("Unauthorized: You don't own this client");
      }

      const currentPeriod = period || new Date().toISOString().substring(0, 7);

      const summary = await base44.asServiceRole.db.query(
        `SELECT 
          COUNT(*) as campaign_count,
          SUM(email_recipients) as total_email_recipients,
          SUM(whatsapp_messages) as total_whatsapp_messages,
          SUM(social_media_posts) as total_social_media_posts,
          SUM(voice_call_minutes) as total_voice_call_minutes,
          SUM(email_cost) as total_email_cost,
          SUM(whatsapp_cost) as total_whatsapp_cost,
          SUM(social_media_cost) as total_social_media_cost,
          SUM(voice_cost) as total_voice_cost,
          SUM(total_platform_cost) as total_platform_cost,
          SUM(total_amount) as total_amount
        FROM marketing_hub_usage
        WHERE client_id = $1 AND period = $2`,
        [clientId, currentPeriod],
      ).catch(() => ({
        rows: [{
          campaign_count: 0,
          total_email_recipients: 0,
          total_whatsapp_messages: 0,
          total_social_media_posts: 0,
          total_voice_call_minutes: 0,
          total_email_cost: 0,
          total_whatsapp_cost: 0,
          total_social_media_cost: 0,
          total_voice_cost: 0,
          total_platform_cost: 0,
          total_amount: 0,
        }],
      }));

      const data = summary.rows[0];

      return {
        clientId,
        period: currentPeriod,
        summary: {
          campaignCount: parseInt(data.campaign_count) || 0,
          emailRecipients: parseInt(data.total_email_recipients) || 0,
          whatsappMessages: parseInt(data.total_whatsapp_messages) || 0,
          socialMediaPosts: parseInt(data.total_social_media_posts) || 0,
          voiceCallMinutes: parseFloat(data.total_voice_call_minutes) || 0,
        },
        costs: {
          emailCost: parseFloat(data.total_email_cost) || 0,
          whatsAppCost: parseFloat(data.total_whatsapp_cost) || 0,
          socialMediaCost: parseFloat(data.total_social_media_cost) || 0,
          voiceCost: parseFloat(data.total_voice_cost) || 0,
          totalPlatformCost: parseFloat(data.total_platform_cost) || 0,
          totalAmount: parseFloat(data.total_amount) || 0,
        },
      };
    }

    /**
     * Get campaign history
     */
    async function getCampaignHistory({
      clientId,
      startDate,
      endDate,
      campaignType,
      limit = 50,
    }: {
      clientId: string;
      startDate?: string;
      endDate?: string;
      campaignType?: string;
      limit?: number;
    }) {
      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      if (user.role !== "admin" && client.user_id !== user.id) {
        throw new Error("Unauthorized: You don't own this client");
      }

      let filters = ["client_id = $1"];
      const params: (string | number)[] = [clientId];

      if (startDate) {
        params.push(startDate);
        filters.push(`period >= $${params.length}`);
      }

      if (endDate) {
        params.push(endDate);
        filters.push(`period <= $${params.length}`);
      }

      if (campaignType) {
        params.push(campaignType);
        filters.push(`campaign_type = $${params.length}`);
      }

      params.push(limit);

      const history = await base44.asServiceRole.db.query(
        `SELECT 
          id,
          campaign_id,
          campaign_type,
          period,
          email_recipients,
          whatsapp_messages,
          social_media_posts,
          voice_call_minutes,
          total_platform_cost,
          total_amount,
          metadata,
          created_at
        FROM marketing_hub_usage
        WHERE ${filters.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT $${params.length}`,
        params,
      ).catch(() => ({ rows: [] }));

      return {
        clientId,
        history: history.rows,
      };
    }

    // Route to appropriate action
    let result;
    switch (action) {
      case "calculateCampaignBilling":
        result = await calculateCampaignBilling(body);
        break;
      case "recordMarketingUsage":
        result = await recordMarketingUsage(body);
        break;
      case "getMarketingUsageSummary":
        result = await getMarketingUsageSummary(body);
        break;
      case "getCampaignHistory":
        result = await getCampaignHistory(body);
        break;
      default:
        return Response.json(
          {
            error:
              "Invalid action. Valid actions: calculateCampaignBilling, recordMarketingUsage, getMarketingUsageSummary, getCampaignHistory",
          },
          { status: 400 },
        );
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    logger.error("Marketing Hub billing failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
});
