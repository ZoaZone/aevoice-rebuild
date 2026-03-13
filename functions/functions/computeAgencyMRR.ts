/**
 * computeAgencyMRR.ts
 *
 * Daily worker to compute agency MRR (Monthly Recurring Revenue) by summing
 * active subscription values for all clients belonging to each agency.
 * Updates the agencies.mrr column and automatically adjusts tier based on MRR,
 * respecting any tier_override settings.
 *
 * @module computeAgencyMRR
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

// MRR thresholds for automatic tier assignment
const TIER_THRESHOLDS = {
  starter: 0, // $0 - $999/mo
  growth: 1000, // $1,000 - $9,999/mo
  elite: 10000, // $10,000+/mo
};

/**
 * Calculate MRR for a subscription based on billing cycle
 */
function calculateMRR(amount: number, billingCycle: string): number {
  switch (billingCycle) {
    case "monthly":
      return amount;
    case "yearly":
    case "annual":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    default:
      return amount; // Default to treating as monthly
  }
}

/**
 * Determine tier based on MRR
 */
function determineTier(mrr: number): string {
  if (mrr >= TIER_THRESHOLDS.elite) {
    return "elite";
  } else if (mrr >= TIER_THRESHOLDS.growth) {
    return "growth";
  } else {
    return "starter";
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);

    logger.info("Agency MRR computation started", {
      request_id: requestId,
    });

    // Get all agencies
    const agenciesResult = await base44.asServiceRole.db.query(
      `SELECT id, mrr, tier, settings FROM agencies`,
    );

    const agencies = agenciesResult.rows;
    let updatedCount = 0;
    let tierChanges = 0;

    for (const agency of agencies) {
      try {
        // Get all clients for this agency
        const clientsResult = await base44.asServiceRole.db.query(
          `SELECT id FROM clients WHERE agency_id = $1`,
          [agency.id],
        );

        if (clientsResult.rows.length === 0) {
          // No clients, set MRR to 0
          await base44.asServiceRole.db.query(
            `UPDATE agencies SET mrr = 0 WHERE id = $1`,
            [agency.id],
          );
          continue;
        }

        const clientIds = clientsResult.rows.map((row) => row.id);

        // Get active subscriptions for these clients
        const subsResult = await base44.asServiceRole.db.query(
          `SELECT amount, billing_cycle 
           FROM subscriptions 
           WHERE client_id = ANY($1) AND status = 'active'`,
          [clientIds],
        );

        // Calculate total MRR
        let totalMRR = 0;
        for (const sub of subsResult.rows) {
          const amount = parseFloat(sub.amount || 0);
          totalMRR += calculateMRR(amount, sub.billing_cycle || "monthly");
        }

        // Round to 2 decimal places
        totalMRR = Math.round(totalMRR * 100) / 100;

        // Check for tier override in settings
        const settings = agency.settings || {};
        const tierOverride = settings.tier_override;

        // Determine new tier
        let newTier = agency.tier || "starter";

        if (!tierOverride) {
          // No override, calculate tier based on MRR
          newTier = determineTier(totalMRR);

          if (newTier !== agency.tier) {
            tierChanges++;
          }
        }

        // Update agency MRR and tier
        await base44.asServiceRole.db.query(
          `UPDATE agencies 
           SET mrr = $1, tier = $2, updated_at = NOW()
           WHERE id = $3`,
          [totalMRR, newTier, agency.id],
        );

        updatedCount++;

        logger.info("Agency MRR updated", {
          request_id: requestId,
          agency_id: agency.id,
          mrr: totalMRR,
          tier: newTier,
          tier_changed: newTier !== agency.tier,
          tier_override: !!tierOverride,
        });
      } catch (error) {
        logger.error("Failed to update agency MRR", {
          request_id: requestId,
          agency_id: agency.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with next agency
      }
    }

    const durationMs = Date.now() - startTime;

    logger.info("Agency MRR computation completed", {
      request_id: requestId,
      duration_ms: durationMs,
      total_agencies: agencies.length,
      updated_count: updatedCount,
      tier_changes: tierChanges,
    });

    return Response.json({
      success: true,
      total_agencies: agencies.length,
      updated_count: updatedCount,
      tier_changes: tierChanges,
      duration_ms: durationMs,
    });
  } catch (error) {
    logger.error("Agency MRR computation failed", {
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
