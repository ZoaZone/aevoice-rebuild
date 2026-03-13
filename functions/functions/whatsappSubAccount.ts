/**
 * whatsappSubAccount.ts
 *
 * Twilio WhatsApp sub-account management with 25% markup pricing
 * Users create sub-accounts with their own credentials under the main Twilio account
 *
 * @route POST /functions/whatsappSubAccount
 * @auth Required - User must own the client
 * @body { action, clientId, ... }
 * @returns { success: true, data }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.ts";
import { createBillingEngine } from "./lib/billingEngine.ts";

// Note: In production, use Twilio SDK for actual sub-account creation
// For now, we'll simulate the structure

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("WhatsApp sub-account request started", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const userRes = await base44.auth.me();
    const user = userRes.data as { id: string; role: string; email?: string } | null;

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    /**
     * Create WhatsApp sub-account under main Twilio account
     */
    async function createWhatsAppSubAccount({
      clientId,
      businessName,
      contactEmail,
      contactPhone,
      userTwilioAccountSid = null,
      userTwilioAuthToken = null,
      usePlatformAccount = true,
    }: {
      clientId: string;
      businessName: string;
      contactEmail: string;
      contactPhone: string;
      userTwilioAccountSid?: string | null;
      userTwilioAuthToken?: string | null;
      usePlatformAccount?: boolean;
    }) {
      // Validate client ownership
      const clientRes = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      const client = clientRes?.data as { id: string; user_id?: string } | null;
      if (!client) {
        throw new Error("Client not found");
      }

      // Verify user owns the client (or is admin)
      if (user.role !== "admin" && client.user_id !== user.id) {
        throw new Error("Unauthorized: You don't own this client");
      }

      logger.info("Creating WhatsApp sub-account", {
        request_id: requestId,
        client_id: clientId,
        business_name: businessName,
        use_platform_account: usePlatformAccount,
      });

      // Check if sub-account already exists
      const existingAccounts = await base44.asServiceRole.entities
        .TelephonyAccount.filter({
          client_id: clientId,
          provider: "twilio_whatsapp",
        });

      if (existingAccounts && existingAccounts.length > 0) {
        throw new Error("WhatsApp sub-account already exists for this client");
      }

      let subAccountConfig: Record<string, unknown>;

      if (usePlatformAccount) {
        // User wants to use platform's main Twilio account
        // Platform manages credentials, user just pays with 25% markup
        subAccountConfig = {
          mode: "platform_managed",
          business_name: businessName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          twilio_main_account: true,
          // In production: Create actual Twilio sub-account here
          // const twilioClient = twilio(MAIN_ACCOUNT_SID, MAIN_AUTH_TOKEN);
          // const subAccount = await twilioClient.api.accounts.create({
          //   friendlyName: `WhatsApp Sub - ${businessName}`
          // });
          // sub_account_sid: subAccount.sid,
          sub_account_sid: `AC${crypto.randomUUID().replace(/-/g, "").substring(0, 32)}`, // Simulated
          pricing_model: "usage_based_25_percent_markup",
        };
      } else {
        // User provides their own Twilio credentials
        if (!userTwilioAccountSid || !userTwilioAuthToken) {
          throw new Error(
            "User Twilio credentials required when not using platform account",
          );
        }

        // In production: Validate user's Twilio credentials
        // const twilioClient = twilio(userTwilioAccountSid, userTwilioAuthToken);
        // await twilioClient.api.accounts(userTwilioAccountSid).fetch();

        subAccountConfig = {
          mode: "user_credentials",
          business_name: businessName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          account_sid: userTwilioAccountSid,
          // auth_token stored encrypted by Base44
          pricing_model: "direct_passthrough",
        };
      }

      // Create TelephonyAccount for WhatsApp
      const telephonyAccount = await base44.asServiceRole.entities
        .TelephonyAccount.create({
          client_id: clientId,
          mode: usePlatformAccount ? "platform_twilio" : "byo_twilio",
          provider: "twilio_whatsapp",
          display_name: `WhatsApp - ${businessName}`,
          config: subAccountConfig,
          status: "active",
        });

      // Store user credentials if provided (encrypted)
      if (!usePlatformAccount && userTwilioAuthToken) {
        await base44.asServiceRole.entities.IntegrationConfig.create({
          client_id: clientId,
          integration_type: "twilio_whatsapp",
          provider: "twilio",
          config: {
            account_sid: userTwilioAccountSid,
            mode: "user_credentials",
          },
          credentials: {
            auth_token: userTwilioAuthToken, // Base44 encrypts this
          },
          status: "active",
        });
      }

      logger.info("WhatsApp sub-account created successfully", {
        request_id: requestId,
        telephony_account_id: telephonyAccount.id,
        mode: subAccountConfig.mode,
      });

      return {
        telephonyAccountId: telephonyAccount.id,
        subAccountSid: subAccountConfig.sub_account_sid || userTwilioAccountSid,
        mode: subAccountConfig.mode,
        pricingModel: subAccountConfig.pricing_model,
        businessName,
      };
    }

    /**
     * Calculate WhatsApp usage billing with 25% markup
     */
    async function calculateWhatsAppBilling({
      clientId,
      usageData,
      taxPercentage = 0,
    }: {
      clientId: string;
      usageData: {
        messagesent: number;
        conversationsStarted: number;
        twilioNetCost: number;
      };
      taxPercentage?: number;
    }) {
      logger.info("Calculating WhatsApp billing", {
        request_id: requestId,
        client_id: clientId,
        twilio_net_cost: usageData.twilioNetCost,
      });

      const billingEngine = createBillingEngine();
      const breakdown = billingEngine.calculateWhatsAppBilling(
        usageData.twilioNetCost,
        taxPercentage,
      );

      return {
        clientId,
        period: new Date().toISOString().substring(0, 7), // YYYY-MM
        usage: {
          messagesSent: usageData.messagesent,
          conversationsStarted: usageData.conversationsStarted,
        },
        costs: {
          twilioNetCost: usageData.twilioNetCost,
          profitAmount: breakdown.profitAmount,
          subtotal: breakdown.subtotal,
          taxAmount: breakdown.taxAmount,
          totalAmount: breakdown.totalAmount,
        },
        breakdown,
        currency: billingEngine.getCurrency(),
        profitMargin: billingEngine.getProfitMarginPercentage(),
      };
    }

    /**
     * Record WhatsApp usage for billing
     */
    async function recordWhatsAppUsage({
      clientId,
      messagesSent,
      conversationsStarted,
      twilioNetCost,
      metadata = {},
    }: {
      clientId: string;
      messagesSent: number;
      conversationsStarted: number;
      twilioNetCost: number;
      metadata?: Record<string, unknown>;
    }) {
      logger.info("Recording WhatsApp usage", {
        request_id: requestId,
        client_id: clientId,
        messages_sent: messagesSent,
        twilio_net_cost: twilioNetCost,
      });

      // Calculate billing with 25% markup
      const billingResult = await calculateWhatsAppBilling({
        clientId,
        usageData: {
          messagesent: messagesSent,
          conversationsStarted,
          twilioNetCost,
        },
      });

      // Store usage record
      const period = new Date().toISOString().substring(0, 7); // YYYY-MM
      const usageRecord = await base44.asServiceRole.db.query(
        `INSERT INTO whatsapp_usage (
          client_id,
          period,
          messages_sent,
          conversations_started,
          twilio_net_cost,
          profit_amount,
          tax_amount,
          total_amount,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id`,
        [
          clientId,
          period,
          messagesSent,
          conversationsStarted,
          twilioNetCost,
          billingResult.costs.profitAmount,
          billingResult.costs.taxAmount,
          billingResult.costs.totalAmount,
          JSON.stringify(metadata),
        ],
      ).catch((error: unknown) => {
        // If table doesn't exist, log warning and continue
        logger.warn("WhatsApp usage table not found - skipping record", {
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
     * Get WhatsApp sub-account details
     */
    async function getWhatsAppSubAccount({ clientId }: { clientId: string }) {
      const clientRes = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      const client = clientRes?.data as { id: string; user_id?: string } | null;
      if (!client) {
        throw new Error("Client not found");
      }

      // Verify user owns the client (or is admin)
      if (user.role !== "admin" && client.user_id !== user.id) {
        throw new Error("Unauthorized: You don't own this client");
      }

      const accounts = await base44.asServiceRole.entities.TelephonyAccount
        .filter({
          client_id: clientId,
          provider: "twilio_whatsapp",
        });

      if (!accounts || accounts.length === 0) {
        return null;
      }

      const account = accounts[0];

      // Get usage summary
      const period = new Date().toISOString().substring(0, 7);
      const usageSummary = await base44.asServiceRole.db.query(
        `SELECT 
          SUM(messages_sent) as total_messages,
          SUM(conversations_started) as total_conversations,
          SUM(twilio_net_cost) as total_net_cost,
          SUM(total_amount) as total_charged
        FROM whatsapp_usage
        WHERE client_id = $1 AND period = $2`,
        [clientId, period],
      ).catch(() => ({
        rows: [{
          total_messages: 0,
          total_conversations: 0,
          total_net_cost: 0,
          total_charged: 0,
        }],
      }));

      const summary = usageSummary.rows[0];

      return {
        telephonyAccountId: account.id,
        businessName: account.config?.business_name,
        mode: account.config?.mode,
        pricingModel: account.config?.pricing_model,
        status: account.status,
        currentPeriodUsage: {
          period,
          messagesSent: parseInt(summary.total_messages) || 0,
          conversationsStarted: parseInt(summary.total_conversations) || 0,
          netCost: parseFloat(summary.total_net_cost) || 0,
          totalCharged: parseFloat(summary.total_charged) || 0,
        },
      };
    }

    /**
     * Get usage history
     */
    async function getWhatsAppUsageHistory({
      clientId,
      startDate,
      endDate,
      limit = 100,
    }: {
      clientId: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }) {
      const clientRes = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      const client = clientRes?.data as { id: string; user_id?: string } | null;
      if (!client) {
        throw new Error("Client not found");
      }

      // Verify user owns the client (or is admin)
      if (user.role !== "admin" && client.user_id !== user.id) {
        throw new Error("Unauthorized: You don't own this client");
      }

      let dateFilter = "";
      const params: (string | number)[] = [clientId];

      if (startDate) {
        params.push(startDate);
        dateFilter += ` AND period >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        dateFilter += ` AND period <= $${params.length}`;
      }

      params.push(limit);

      const history = await base44.asServiceRole.db.query(
        `SELECT 
          period,
          messages_sent,
          conversations_started,
          twilio_net_cost,
          profit_amount,
          tax_amount,
          total_amount,
          metadata,
          created_at
        FROM whatsapp_usage
        WHERE client_id = $1${dateFilter}
        ORDER BY period DESC
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
      case "createWhatsAppSubAccount":
        result = await createWhatsAppSubAccount(body);
        break;
      case "calculateWhatsAppBilling":
        result = await calculateWhatsAppBilling(body);
        break;
      case "recordWhatsAppUsage":
        result = await recordWhatsAppUsage(body);
        break;
      case "getWhatsAppSubAccount":
        result = await getWhatsAppSubAccount(body);
        break;
      case "getWhatsAppUsageHistory":
        result = await getWhatsAppUsageHistory(body);
        break;
      default:
        return Response.json(
          {
            error:
              "Invalid action. Valid actions: createWhatsAppSubAccount, calculateWhatsAppBilling, recordWhatsAppUsage, getWhatsAppSubAccount, getWhatsAppUsageHistory",
          },
          { status: 400 },
        );
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    logger.error("WhatsApp sub-account operation failed", {
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