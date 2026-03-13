/**
 * commissionWorker.ts
 *
 * Audit-only worker to create commission_events from Stripe webhook events.
 * This does NOT perform automatic payouts - it only creates audit trail records.
 *
 * @module commissionWorker
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";
import {
  computeAffiliateCommission,
  computeAgencyCommission,
  estimateCosts,
} from "./commissionService.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      event_type,
      source = "stripe",
      source_id,
      owner_type,
      owner_id,
      gross_amount_usd,
      plan_type,
      metadata = {},
    } = body;

    logger.info("Commission worker processing event", {
      request_id: requestId,
      event_type,
      owner_type,
      owner_id,
      gross_amount_usd,
    });

    // Validate required fields
    if (
      !event_type || !owner_type || !owner_id || gross_amount_usd === undefined
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Estimate costs (will be reconciled later with actual usage)
    const { llmCostUsd, otherCostsUsd } = estimateCosts(
      plan_type || "default",
      gross_amount_usd,
    );

    let commissionData;

    if (owner_type === "agency") {
      // Fetch agency details to get tier and BYOLLM status
      const agencyResult = await base44.asServiceRole.db.query(
        `SELECT tier, byollm_enabled, co_brand_opt_in FROM agencies WHERE id = $1`,
        [owner_id],
      );

      if (agencyResult.rows.length === 0) {
        logger.warn("Agency not found", { owner_id });
        return Response.json(
          { error: "Agency not found" },
          { status: 404 },
        );
      }

      const agency = agencyResult.rows[0];

      commissionData = computeAgencyCommission({
        grossAmountUsd: gross_amount_usd,
        llmCostUsd,
        otherCostsUsd,
        tier: agency.tier || "starter",
        byollmApplied: agency.byollm_enabled || false,
        coBrandOptIn: agency.co_brand_opt_in || false,
      });
    } else if (owner_type === "affiliate") {
      // Fetch affiliate details to get tier and commission rate
      const affiliateResult = await base44.asServiceRole.db.query(
        `SELECT tier, commission_rate FROM affiliates WHERE id = $1`,
        [owner_id],
      );

      if (affiliateResult.rows.length === 0) {
        logger.warn("Affiliate not found", { owner_id });
        return Response.json(
          { error: "Affiliate not found" },
          { status: 404 },
        );
      }

      const affiliate = affiliateResult.rows[0];

      commissionData = computeAffiliateCommission({
        grossAmountUsd: gross_amount_usd,
        llmCostUsd,
        otherCostsUsd,
        tier: affiliate.tier || "bronze",
        customRate: affiliate.commission_rate,
      });
    } else {
      return Response.json(
        { error: "Invalid owner_type" },
        { status: 400 },
      );
    }

    // Create commission event record (audit only, not a payout)
    const result = await base44.asServiceRole.db.query(
      `INSERT INTO commission_events (
        event_type,
        source,
        source_id,
        owner_type,
        owner_id,
        gross_amount_usd,
        llm_cost_usd,
        other_costs_usd,
        net_profit_usd,
        commission_rate_percent,
        commission_amount_usd,
        co_brand_bonus_percent,
        byollm_applied,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        event_type,
        source,
        source_id,
        owner_type,
        owner_id,
        gross_amount_usd,
        llmCostUsd,
        otherCostsUsd,
        commissionData.netProfitUsd,
        commissionData.commissionRate,
        commissionData.commissionAmountUsd,
        commissionData.coBrandBonus || 0,
        commissionData.byollmApplied || false,
        JSON.stringify(metadata),
      ],
    );

    const eventId = result.rows[0].id;

    logger.info("Commission event created", {
      request_id: requestId,
      event_id: eventId,
      owner_type,
      owner_id,
      commission_amount_usd: commissionData.commissionAmountUsd,
    });

    return Response.json({
      success: true,
      event_id: eventId,
      commission_amount_usd: commissionData.commissionAmountUsd,
      message: "Commission event recorded (audit only, no automatic payout)",
    });
  } catch (error) {
    logger.error("Commission worker failed", {
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
