/**
 * payHelloBizSync.ts
 *
 * Synchronizes financial data between AEVOICE and Pay.hellobiz.app
 * Automates accounting entries, transaction recording, and financial reporting
 *
 * @route POST /functions/payHelloBizSync
 * @auth Service role or admin only
 * @body { action, ... }
 * @returns { success: true, data }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.ts";
import { createPayHelloBizClient } from "./lib/payHelloBizClient.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Pay.hellobiz.app sync started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin or service role can sync
    if (user && user.role !== "admin") {
      return Response.json({ error: "Unauthorized - Admin only" }, {
        status: 403,
      });
    }

    const body = await req.json();
    const { action } = body;

    const payClient = createPayHelloBizClient();

    /**
     * Sync usage costs to Pay.hellobiz.app
     */
    async function syncUsageCosts({
      clientId,
      period,
    }: {
      clientId: string;
      period: string;
    }) {
      logger.info("Syncing usage costs", {
        request_id: requestId,
        client_id: clientId,
        period,
      });

      // Get client and agency info
      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      // Get transaction costs for the period
      const startDate = `${period}-01`;
      const endDate = new Date(period + "-01");
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split("T")[0];

      const costs = await base44.asServiceRole.db.query(
        `SELECT 
          SUM(gross_sale_amount) as gross_revenue,
          SUM(ai_llm_cost) as ai_llm_cost,
          SUM(voice_tts_cost) as voice_tts_cost,
          SUM(telephony_cost) as telephony_cost,
          SUM(platform_overhead_amount) as platform_overhead_cost,
          SUM(total_operating_costs) as total_cost,
          SUM(net_profit) as net_profit,
          SUM(agency_share_amount) as agency_share,
          SUM(platform_share_amount) as platform_share
        FROM transaction_costs
        WHERE client_id = $1 
        AND transaction_date >= $2 
        AND transaction_date < $3`,
        [clientId, startDate, endDateStr],
      );

      const costData = costs.rows[0];

      if (!costData || parseFloat(costData.gross_revenue) === 0) {
        logger.info("No costs to sync for period", {
          client_id: clientId,
          period,
        });
        return {
          clientId,
          period,
          message: "No costs to sync",
          synced: false,
        };
      }

      // Sync to Pay.hellobiz.app
      const syncResult = await payClient.syncUsageCosts({
        clientId,
        agencyId: client.agency_id || undefined,
        period,
        costs: {
          aiLlmCost: parseFloat(costData.ai_llm_cost) || 0,
          voiceTtsCost: parseFloat(costData.voice_tts_cost) || 0,
          telephonyCost: parseFloat(costData.telephony_cost) || 0,
          platformOverheadCost: parseFloat(costData.platform_overhead_cost) ||
            0,
          totalCost: parseFloat(costData.total_cost) || 0,
        },
        revenue: {
          grossRevenue: parseFloat(costData.gross_revenue) || 0,
          netProfit: parseFloat(costData.net_profit) || 0,
          agencyShare: parseFloat(costData.agency_share) || 0,
          platformShare: parseFloat(costData.platform_share) || 0,
        },
      });

      logger.info("Usage costs synced successfully", {
        request_id: requestId,
        sync_id: syncResult.syncId,
      });

      return {
        clientId,
        period,
        syncId: syncResult.syncId,
        synced: true,
        costs: {
          totalCost: parseFloat(costData.total_cost),
          netProfit: parseFloat(costData.net_profit),
        },
      };
    }

    /**
     * Sync all clients for a period
     */
    async function syncAllClients({
      period,
      limit = 100,
    }: {
      period: string;
      limit?: number;
    }) {
      logger.info("Syncing all clients", {
        request_id: requestId,
        period,
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
          const result = await syncUsageCosts({
            clientId: client.id,
            period,
          });

          results.push({
            clientId: client.id,
            clientName: client.name,
            status: "success",
            result,
          });

          if (result.synced) {
            successCount++;
          }
        } catch (error) {
          logger.error("Failed to sync client", {
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
     * Create accounting entry in Pay.hellobiz.app
     */
    async function createAccountingEntry({
      clientId,
      date,
      type,
      category,
      amount,
      description,
      metadata = {},
    }: {
      clientId: string;
      date: string;
      type: "income" | "expense" | "asset" | "liability";
      category: string;
      amount: number;
      description: string;
      metadata?: Record<string, unknown>;
    }) {
      logger.info("Creating accounting entry", {
        request_id: requestId,
        client_id: clientId,
        type,
        amount,
      });

      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      const result = await payClient.createAccountingEntry({
        date,
        type,
        category,
        amount,
        description,
        clientId,
        agencyId: client.agency_id || undefined,
        metadata,
      });

      return {
        entryId: result.entryId,
        clientId,
        type,
        amount,
        description,
      };
    }

    /**
     * Generate invoice via Pay.hellobiz.app
     */
    async function generateInvoice({
      clientId,
      issueDate,
      dueDate,
      items,
      metadata = {},
    }: {
      clientId: string;
      issueDate: string;
      dueDate: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
      }>;
      metadata?: Record<string, unknown>;
    }) {
      logger.info("Generating invoice", {
        request_id: requestId,
        client_id: clientId,
      });

      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const tax = subtotal * 0.0; // Configure tax as needed
      const total = subtotal + tax;

      const result = await payClient.generateInvoice({
        clientId,
        agencyId: client.agency_id || undefined,
        issueDate,
        dueDate,
        items,
        subtotal,
        tax,
        total,
        status: "draft",
        metadata,
      });

      return {
        invoiceNumber: result.invoiceNumber,
        invoiceUrl: result.invoiceUrl,
        clientId,
        total,
      };
    }

    /**
     * Get financial dashboard from Pay.hellobiz.app
     */
    async function getFinancialDashboard({
      clientId,
      period,
    }: {
      clientId: string;
      period?: string;
    }) {
      logger.info("Getting financial dashboard", {
        request_id: requestId,
        client_id: clientId,
      });

      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      const dashboard = await payClient.getDashboardSummary({
        clientId,
        agencyId: client.agency_id || undefined,
        period,
      });

      return {
        clientId,
        period,
        ...dashboard,
      };
    }

    /**
     * Generate financial report
     */
    async function generateFinancialReport({
      clientId,
      reportType,
      startDate,
      endDate,
    }: {
      clientId: string;
      reportType:
        | "income_statement"
        | "balance_sheet"
        | "cash_flow"
        | "profit_loss";
      startDate: string;
      endDate: string;
    }) {
      logger.info("Generating financial report", {
        request_id: requestId,
        client_id: clientId,
        report_type: reportType,
      });

      const client = await base44.asServiceRole.entities.Client.findById(
        clientId,
      );
      if (!client) {
        throw new Error("Client not found");
      }

      const report = await payClient.generateFinancialReport(
        reportType,
        startDate,
        endDate,
        {
          clientId,
          agencyId: client.agency_id || undefined,
        },
      );

      return {
        clientId,
        ...report,
      };
    }

    // Route to appropriate action
    let result;
    switch (action) {
      case "syncUsageCosts":
        result = await syncUsageCosts(body);
        break;
      case "syncAllClients":
        result = await syncAllClients(body);
        break;
      case "createAccountingEntry":
        result = await createAccountingEntry(body);
        break;
      case "generateInvoice":
        result = await generateInvoice(body);
        break;
      case "getFinancialDashboard":
        result = await getFinancialDashboard(body);
        break;
      case "generateFinancialReport":
        result = await generateFinancialReport(body);
        break;
      default:
        return Response.json(
          {
            error:
              "Invalid action. Valid actions: syncUsageCosts, syncAllClients, createAccountingEntry, generateInvoice, getFinancialDashboard, generateFinancialReport",
          },
          { status: 400 },
        );
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    logger.error("Pay.hellobiz.app sync failed", {
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
