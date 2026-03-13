/**
 * processUsageBilling.ts
 *
 * Processes usage-based billing for WhatsApp, Marketing Hub, and other services
 * Integrates with Stripe auto-debit for payment collection
 *
 * @route POST /functions/processUsageBilling
 * @auth Service role or admin only
 * @body { action, clientId, period, ... }
 * @returns { success: true, data }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import Stripe from "npm:stripe@14.18.0";
import { logger } from "./lib/infra/logger.ts";
import { createBillingEngine } from "./lib/billingEngine.js";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") || "");

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Usage billing processing started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin or service role can trigger billing
    if (user && user.role !== "admin") {
      return Response.json({ error: "Unauthorized - Admin only" }, {
        status: 403,
      });
    }

    const body = await req.json();
    const { action } = body;

    /**
     * Process monthly usage billing for a client
     */
    async function processMonthlyBilling({
      clientId,
      period, // Format: YYYY-MM
      taxPercentage = 0,
      dryRun = false,
    }: {
      clientId: string;
      period: string;
      taxPercentage?: number;
      dryRun?: boolean;
    }) {
      logger.info("Processing monthly billing", {
        request_id: requestId,
        client_id: clientId,
        period,
        dry_run: dryRun,
      });

      // Get client
      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      // Get WhatsApp usage
      const whatsappUsage = await base44.asServiceRole.db.query(
        `SELECT 
          SUM(messages_sent) as messages_sent,
          SUM(conversations_started) as conversations_started,
          SUM(twilio_net_cost) as twilio_net_cost
        FROM whatsapp_usage
        WHERE client_id = $1 AND period = $2`,
        [clientId, period],
      ).catch(() => ({
        rows: [{
          messages_sent: 0,
          conversations_started: 0,
          twilio_net_cost: 0,
        }],
      }));

      const whatsappData = whatsappUsage.rows[0];

      // Get Marketing Hub usage (if table exists)
      const marketingUsage = await base44.asServiceRole.db.query(
        `SELECT 
          SUM(email_cost) as email_cost,
          SUM(whatsapp_cost) as whatsapp_cost,
          SUM(social_media_cost) as social_media_cost,
          SUM(voice_cost) as voice_cost
        FROM marketing_hub_usage
        WHERE client_id = $1 AND period = $2`,
        [clientId, period],
      ).catch(() => ({
        rows: [{
          email_cost: 0,
          whatsapp_cost: 0,
          social_media_cost: 0,
          voice_cost: 0,
        }],
      }));

      const marketingData = marketingUsage.rows[0];

      // Calculate total usage costs
      const usageCosts = {
        twilioWhatsAppCost: parseFloat(whatsappData.twilio_net_cost) || 0,
        emailCampaignCost: parseFloat(marketingData.email_cost) || 0,
        voiceCampaignCost: parseFloat(marketingData.voice_cost) || 0,
        socialMediaCost: parseFloat(marketingData.social_media_cost) || 0,
      };

      // Calculate billing with 25% markup
      const billingEngine = createBillingEngine();
      const billingResult = billingEngine.calculatePeriodBilling(
        usageCosts,
        taxPercentage,
      );

      logger.info("Billing calculation complete", {
        request_id: requestId,
        client_id: clientId,
        platform_cost: billingResult.usageDetails.totalPlatformCost,
        total_amount: billingResult.breakdown.totalAmount,
      });

      // Skip actual billing if dry run
      if (dryRun) {
        return {
          clientId,
          period,
          dryRun: true,
          usage: {
            whatsapp: {
              messagesSent: parseInt(whatsappData.messages_sent) || 0,
              conversationsStarted: parseInt(whatsappData.conversations_started) || 0,
            },
            marketing: {
              emailCost: usageCosts.emailCampaignCost,
              voiceCost: usageCosts.voiceCampaignCost,
              socialMediaCost: usageCosts.socialMediaCost,
            },
          },
          billing: billingResult,
          message: "Dry run - no charge created",
        };
      }

      // Check if billing already processed for this period
      const existingBilling = await base44.asServiceRole.db.query(
        `SELECT id FROM usage_billing
        WHERE client_id = $1 AND period = $2`,
        [clientId, period],
      ).catch(() => ({ rows: [] }));

      if (existingBilling.rows.length > 0) {
        throw new Error(`Billing already processed for period ${period}`);
      }

      // Get or create Stripe customer
      let stripeCustomerId = client.metadata?.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: client.contact_email,
          name: client.name,
          metadata: {
            client_id: clientId,
            platform: "aevoice",
          },
        });

        stripeCustomerId = customer.id;

        // Update client with Stripe customer ID
        await base44.asServiceRole.entities.Client.update(clientId, {
          metadata: {
            ...client.metadata,
            stripe_customer_id: stripeCustomerId,
          },
        });
      }

      // Create Stripe invoice for usage billing
      const amountInCents = Math.round(
        billingResult.breakdown.totalAmount * 100,
      );

      if (amountInCents > 0) {
        // Create invoice item
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          amount: amountInCents,
          currency: "usd",
          description: `Usage billing for ${period}`,
          metadata: {
            client_id: clientId,
            period,
            platform_cost: billingResult.usageDetails.totalPlatformCost
              .toString(),
            profit_amount: billingResult.breakdown.profitAmount.toString(),
          },
        });

        // Create and finalize invoice
        const invoice = await stripe.invoices.create({
          customer: stripeCustomerId,
          auto_advance: true, // Auto-finalize
          collection_method: "charge_automatically", // Auto-debit
          metadata: {
            client_id: clientId,
            period,
            billing_type: "usage",
          },
        });

        // Finalize invoice (triggers auto-payment)
        await stripe.invoices.finalizeInvoice(invoice.id);

        logger.info("Stripe invoice created", {
          request_id: requestId,
          invoice_id: invoice.id,
          amount: amountInCents / 100,
        });

        // Store billing record
        await base44.asServiceRole.db.query(
          `INSERT INTO usage_billing (
            client_id,
            period,
            platform_cost,
            profit_amount,
            tax_amount,
            total_amount,
            stripe_invoice_id,
            usage_details,
            status,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            clientId,
            period,
            billingResult.usageDetails.totalPlatformCost,
            billingResult.breakdown.profitAmount,
            billingResult.breakdown.taxAmount,
            billingResult.breakdown.totalAmount,
            invoice.id,
            JSON.stringify(billingResult.usageDetails),
            "invoiced",
          ],
        ).catch((error) => {
          logger.warn("Usage billing table not found - skipping record", {
            error: error instanceof Error ? error.message : String(error),
          });
        });

        return {
          clientId,
          period,
          billing: billingResult,
          stripe: {
            invoiceId: invoice.id,
            invoiceUrl: invoice.hosted_invoice_url,
            amountDue: invoice.amount_due / 100,
            status: invoice.status,
          },
        };
      } else {
        logger.info("No usage charges for period", {
          request_id: requestId,
          client_id: clientId,
          period,
        });

        return {
          clientId,
          period,
          billing: billingResult,
          message: "No usage charges for this period",
        };
      }
    }

    /**
     * Process billing for all clients in a period
     */
    async function processBillingForAllClients({
      period,
      taxPercentage = 0,
      dryRun = false,
      limit = 100,
    }: {
      period: string;
      taxPercentage?: number;
      dryRun?: boolean;
      limit?: number;
    }) {
      logger.info("Processing billing for all clients", {
        request_id: requestId,
        period,
        dry_run: dryRun,
        limit,
      });

      // Get all active clients
      const clients = await base44.asServiceRole.entities.Client.filter({
        status: "active",
      });

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const client of clients.slice(0, limit)) {
        try {
          const result = await processMonthlyBilling({
            clientId: client.id,
            period,
            taxPercentage,
            dryRun,
          });

          results.push({
            clientId: client.id,
            clientName: client.name,
            status: "success",
            result,
          });

          successCount++;
        } catch (error) {
          logger.error("Failed to process billing for client", {
            client_id: client.id,
            error: error instanceof Error ? error.message : String(error),
          });

          results.push({
            clientId: client.id,
            clientName: client.name,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          });

          failureCount++;
        }
      }

      return {
        period,
        processed: results.length,
        successCount,
        failureCount,
        results,
      };
    }

    /**
     * Get billing status for a client
     */
    async function getBillingStatus({
      clientId,
      period,
    }: {
      clientId: string;
      period?: string;
    }) {
      const currentPeriod = period || new Date().toISOString().substring(0, 7);

      const billingRecords = await base44.asServiceRole.db.query(
        `SELECT * FROM usage_billing
        WHERE client_id = $1 AND period = $2`,
        [clientId, currentPeriod],
      ).catch(() => ({ rows: [] }));

      if (billingRecords.rows.length === 0) {
        return {
          clientId,
          period: currentPeriod,
          status: "not_processed",
          message: "Billing not yet processed for this period",
        };
      }

      const billing = billingRecords.rows[0];

      return {
        clientId,
        period: currentPeriod,
        status: billing.status,
        platformCost: parseFloat(billing.platform_cost),
        profitAmount: parseFloat(billing.profit_amount),
        taxAmount: parseFloat(billing.tax_amount),
        totalAmount: parseFloat(billing.total_amount),
        stripeInvoiceId: billing.stripe_invoice_id,
        usageDetails: billing.usage_details,
        createdAt: billing.created_at,
      };
    }

    // Route to appropriate action
    let result;
    switch (action) {
      case "processMonthlyBilling":
        result = await processMonthlyBilling(body);
        break;
      case "processBillingForAllClients":
        result = await processBillingForAllClients(body);
        break;
      case "getBillingStatus":
        result = await getBillingStatus(body);
        break;
      default:
        return Response.json(
          {
            error:
              "Invalid action. Valid actions: processMonthlyBilling, processBillingForAllClients, getBillingStatus",
          },
          { status: 400 },
        );
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    logger.error("Usage billing processing failed", {
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
