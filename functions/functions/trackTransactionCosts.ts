/**
 * trackTransactionCosts.ts
 *
 * Core function for tracking transaction costs and calculating NET profit splits.
 * Implements the cost accounting formula:
 *
 * Net Profit = Gross Sale - (AI_LLM_Cost + Voice_TTS_Cost + Telephony_Cost + Platform_Overhead)
 * Platform_Overhead = Gross_Sale × 0.10 (10%)
 * Agency Share (75%) = Net Profit × 0.75
 * Platform Share (25%) = Net Profit × 0.25
 *
 * @module trackTransactionCosts
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Track transaction costs started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    /**
     * Record transaction costs and calculate NET profit split
     */
    async function recordTransactionCost({
      transactionType,
      transactionDate = new Date().toISOString(),
      agencyId = null,
      clientId,
      agentId = null,
      referenceType = null,
      referenceId = null,
      grossSaleAmount,
      aiLlmCost = 0,
      voiceTtsCost = 0,
      telephonyCost = 0,
      platformOverheadPercentage = 10.0,
      agencySharePercentage = 75.0,
      byollmApplied = false,
      usageDetails = {},
      notes = null,
    }: {
      transactionType: string;
      transactionDate?: string;
      agencyId?: string | null;
      clientId: string;
      agentId?: string | null;
      referenceType?: string | null;
      referenceId?: string | null;
      grossSaleAmount: number;
      aiLlmCost?: number;
      voiceTtsCost?: number;
      telephonyCost?: number;
      platformOverheadPercentage?: number;
      agencySharePercentage?: number;
      byollmApplied?: boolean;
      usageDetails?: Record<string, unknown>;
      notes?: string | null;
    }) {
      // Validate required fields
      if (!transactionType || !clientId || grossSaleAmount === undefined) {
        throw new Error(
          "Missing required fields: transactionType, clientId, grossSaleAmount",
        );
      }

      // Validate numeric fields
      if (
        grossSaleAmount < 0 || aiLlmCost < 0 || voiceTtsCost < 0 ||
        telephonyCost < 0
      ) {
        throw new Error("Cost amounts cannot be negative");
      }

      // Calculate platform overhead amount
      const platformOverheadAmount = (grossSaleAmount * platformOverheadPercentage) / 100;

      // Calculate total operating costs
      const totalOperatingCosts = aiLlmCost + voiceTtsCost + telephonyCost +
        platformOverheadAmount;

      // Calculate NET profit
      const netProfit = grossSaleAmount - totalOperatingCosts;

      // Calculate split amounts
      const platformSharePercentage = 100 - agencySharePercentage;
      const agencyShareAmount = (netProfit * agencySharePercentage) / 100;
      const platformShareAmount = (netProfit * platformSharePercentage) / 100;

      logger.info("Recording transaction cost", {
        request_id: requestId,
        transaction_type: transactionType,
        agency_id: agencyId,
        client_id: clientId,
        gross_sale: grossSaleAmount,
        ai_cost: aiLlmCost,
        voice_cost: voiceTtsCost,
        telephony_cost: telephonyCost,
        overhead_amount: platformOverheadAmount,
        total_costs: totalOperatingCosts,
        net_profit: netProfit,
        agency_share: agencyShareAmount,
        platform_share: platformShareAmount,
        byollm_applied: byollmApplied,
      });

      // Insert transaction cost record
      const result = await base44.asServiceRole.db.query(
        `INSERT INTO transaction_costs (
          transaction_date,
          transaction_type,
          agency_id,
          client_id,
          agent_id,
          reference_type,
          reference_id,
          gross_sale_amount,
          ai_llm_cost,
          voice_tts_cost,
          telephony_cost,
          platform_overhead_percentage,
          platform_overhead_amount,
          total_operating_costs,
          net_profit,
          agency_share_percentage,
          agency_share_amount,
          platform_share_percentage,
          platform_share_amount,
          byollm_applied,
          usage_details,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id`,
        [
          transactionDate,
          transactionType,
          agencyId,
          clientId,
          agentId,
          referenceType,
          referenceId,
          grossSaleAmount,
          aiLlmCost,
          voiceTtsCost,
          telephonyCost,
          platformOverheadPercentage,
          platformOverheadAmount,
          totalOperatingCosts,
          netProfit,
          agencySharePercentage,
          agencyShareAmount,
          platformSharePercentage,
          platformShareAmount,
          byollmApplied,
          JSON.stringify(usageDetails),
          notes,
        ],
      );

      const transactionCostId = result.rows[0].id;

      logger.info("Transaction cost recorded successfully", {
        request_id: requestId,
        transaction_cost_id: transactionCostId,
        net_profit: netProfit,
        agency_share: agencyShareAmount,
      });

      return {
        id: transactionCostId,
        grossSaleAmount,
        totalOperatingCosts,
        netProfit,
        agencyShareAmount,
        platformShareAmount,
        breakdown: {
          aiLlmCost,
          voiceTtsCost,
          telephonyCost,
          platformOverheadAmount,
        },
      };
    }

    /**
     * Get cost summary for an agency
     */
    async function getAgencyCostSummary({
      agencyId,
      startDate = null,
      endDate = null,
    }: {
      agencyId: string;
      startDate?: string | null;
      endDate?: string | null;
    }) {
      logger.info("Getting agency cost summary", {
        request_id: requestId,
        agency_id: agencyId,
        start_date: startDate,
        end_date: endDate,
      });

      let dateFilter = "";
      const params: (string | null)[] = [agencyId];

      if (startDate) {
        params.push(startDate);
        dateFilter += ` AND transaction_date >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        dateFilter += ` AND transaction_date <= $${params.length}`;
      }

      // Get aggregated summary
      const summaryResult = await base44.asServiceRole.db.query(
        `SELECT 
          COUNT(*) AS transaction_count,
          SUM(gross_sale_amount) AS total_gross,
          SUM(ai_llm_cost) AS total_ai_cost,
          SUM(voice_tts_cost) AS total_voice_cost,
          SUM(telephony_cost) AS total_telephony_cost,
          SUM(platform_overhead_amount) AS total_overhead,
          SUM(total_operating_costs) AS total_costs,
          SUM(net_profit) AS total_net_profit,
          SUM(agency_share_amount) AS total_agency_share,
          SUM(platform_share_amount) AS total_platform_share,
          COUNT(CASE WHEN byollm_applied THEN 1 END) AS byollm_count
        FROM transaction_costs
        WHERE agency_id = $1${dateFilter}`,
        params,
      );

      const summary = summaryResult.rows[0];

      // Get recent transactions
      const transactionsResult = await base44.asServiceRole.db.query(
        `SELECT 
          id,
          transaction_date,
          transaction_type,
          client_id,
          agent_id,
          gross_sale_amount,
          ai_llm_cost,
          voice_tts_cost,
          telephony_cost,
          platform_overhead_amount,
          total_operating_costs,
          net_profit,
          agency_share_amount,
          byollm_applied
        FROM transaction_costs
        WHERE agency_id = $1${dateFilter}
        ORDER BY transaction_date DESC
        LIMIT 50`,
        params,
      );

      return {
        agencyId,
        summary: {
          transactionCount: parseInt(summary.transaction_count) || 0,
          totalGross: parseFloat(summary.total_gross) || 0,
          totalAiCost: parseFloat(summary.total_ai_cost) || 0,
          totalVoiceCost: parseFloat(summary.total_voice_cost) || 0,
          totalTelephonyCost: parseFloat(summary.total_telephony_cost) || 0,
          totalOverhead: parseFloat(summary.total_overhead) || 0,
          totalCosts: parseFloat(summary.total_costs) || 0,
          totalNetProfit: parseFloat(summary.total_net_profit) || 0,
          totalAgencyShare: parseFloat(summary.total_agency_share) || 0,
          totalPlatformShare: parseFloat(summary.total_platform_share) || 0,
          byollmCount: parseInt(summary.byollm_count) || 0,
        },
        recentTransactions: transactionsResult.rows,
      };
    }

    /**
     * Get cost summary for a client
     */
    async function getClientCostSummary({
      clientId,
      startDate = null,
      endDate = null,
    }: {
      clientId: string;
      startDate?: string | null;
      endDate?: string | null;
    }) {
      logger.info("Getting client cost summary", {
        request_id: requestId,
        client_id: clientId,
        start_date: startDate,
        end_date: endDate,
      });

      let dateFilter = "";
      const params: (string | null)[] = [clientId];

      if (startDate) {
        params.push(startDate);
        dateFilter += ` AND transaction_date >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        dateFilter += ` AND transaction_date <= $${params.length}`;
      }

      const summaryResult = await base44.asServiceRole.db.query(
        `SELECT 
          COUNT(*) AS transaction_count,
          SUM(gross_sale_amount) AS total_gross,
          SUM(ai_llm_cost) AS total_ai_cost,
          SUM(voice_tts_cost) AS total_voice_cost,
          SUM(telephony_cost) AS total_telephony_cost,
          SUM(platform_overhead_amount) AS total_overhead,
          SUM(total_operating_costs) AS total_costs,
          SUM(net_profit) AS total_net_profit
        FROM transaction_costs
        WHERE client_id = $1${dateFilter}`,
        params,
      );

      const summary = summaryResult.rows[0];

      return {
        clientId,
        summary: {
          transactionCount: parseInt(summary.transaction_count) || 0,
          totalGross: parseFloat(summary.total_gross) || 0,
          totalAiCost: parseFloat(summary.total_ai_cost) || 0,
          totalVoiceCost: parseFloat(summary.total_voice_cost) || 0,
          totalTelephonyCost: parseFloat(summary.total_telephony_cost) || 0,
          totalOverhead: parseFloat(summary.total_overhead) || 0,
          totalCosts: parseFloat(summary.total_costs) || 0,
          totalNetProfit: parseFloat(summary.total_net_profit) || 0,
        },
      };
    }

    /**
     * Get all cost data for admin view
     */
    async function getAdminCostSummary({
      startDate = null,
      endDate = null,
      agencyId = null,
      limit = 100,
    }: {
      startDate?: string | null;
      endDate?: string | null;
      agencyId?: string | null;
      limit?: number;
    }) {
      logger.info("Getting admin cost summary", {
        request_id: requestId,
        start_date: startDate,
        end_date: endDate,
        agency_id: agencyId,
      });

      let filters = [];
      const params: (string | null | number)[] = [];

      if (startDate) {
        params.push(startDate);
        filters.push(`transaction_date >= $${params.length}`);
      }

      if (endDate) {
        params.push(endDate);
        filters.push(`transaction_date <= $${params.length}`);
      }

      if (agencyId) {
        params.push(agencyId);
        filters.push(`agency_id = $${params.length}`);
      }

      const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

      // Get platform-wide summary
      const summaryResult = await base44.asServiceRole.db.query(
        `SELECT 
          COUNT(*) AS transaction_count,
          COUNT(DISTINCT agency_id) AS agency_count,
          COUNT(DISTINCT client_id) AS client_count,
          SUM(gross_sale_amount) AS total_gross,
          SUM(ai_llm_cost) AS total_ai_cost,
          SUM(voice_tts_cost) AS total_voice_cost,
          SUM(telephony_cost) AS total_telephony_cost,
          SUM(platform_overhead_amount) AS total_overhead,
          SUM(total_operating_costs) AS total_costs,
          SUM(net_profit) AS total_net_profit,
          SUM(agency_share_amount) AS total_agency_share,
          SUM(platform_share_amount) AS total_platform_share,
          COUNT(CASE WHEN byollm_applied THEN 1 END) AS byollm_count
        FROM transaction_costs
        ${whereClause}`,
        params,
      );

      const summary = summaryResult.rows[0];

      // Get agency breakdown
      params.push(limit);
      const agencyBreakdownResult = await base44.asServiceRole.db.query(
        `SELECT 
          agency_id,
          COUNT(*) AS transaction_count,
          SUM(gross_sale_amount) AS total_gross,
          SUM(total_operating_costs) AS total_costs,
          SUM(net_profit) AS total_net_profit,
          SUM(agency_share_amount) AS total_agency_share
        FROM transaction_costs
        ${whereClause}
        GROUP BY agency_id
        ORDER BY SUM(gross_sale_amount) DESC
        LIMIT $${params.length}`,
        params,
      );

      return {
        summary: {
          transactionCount: parseInt(summary.transaction_count) || 0,
          agencyCount: parseInt(summary.agency_count) || 0,
          clientCount: parseInt(summary.client_count) || 0,
          totalGross: parseFloat(summary.total_gross) || 0,
          totalAiCost: parseFloat(summary.total_ai_cost) || 0,
          totalVoiceCost: parseFloat(summary.total_voice_cost) || 0,
          totalTelephonyCost: parseFloat(summary.total_telephony_cost) || 0,
          totalOverhead: parseFloat(summary.total_overhead) || 0,
          totalCosts: parseFloat(summary.total_costs) || 0,
          totalNetProfit: parseFloat(summary.total_net_profit) || 0,
          totalAgencyShare: parseFloat(summary.total_agency_share) || 0,
          totalPlatformShare: parseFloat(summary.total_platform_share) || 0,
          byollmCount: parseInt(summary.byollm_count) || 0,
        },
        agencyBreakdown: agencyBreakdownResult.rows,
      };
    }

    // Route to appropriate action
    let result;
    switch (action) {
      case "recordTransactionCost":
        result = await recordTransactionCost(body);
        break;
      case "getAgencyCostSummary":
        result = await getAgencyCostSummary(body);
        break;
      case "getClientCostSummary":
        result = await getClientCostSummary(body);
        break;
      case "getAdminCostSummary":
        result = await getAdminCostSummary(body);
        break;
      default:
        return Response.json(
          {
            error:
              "Invalid action. Valid actions: recordTransactionCost, getAgencyCostSummary, getClientCostSummary, getAdminCostSummary",
          },
          { status: 400 },
        );
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    logger.error("Track transaction costs failed", {
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
