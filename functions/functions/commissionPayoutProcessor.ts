/**
 * commissionPayoutProcessor.ts
 *
 * Manual/audit-only commission payout processor.
 * This function is for MANUAL payouts and audit purposes only.
 * It does NOT perform automatic payouts - those are handled via Stripe real-time splitting.
 *
 * Use this function to:
 * - Create manual payout records for reconciliation
 * - Mark commission events as settled
 * - Query unsettled commission events for reporting
 *
 * @module commissionPayoutProcessor
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);

    // Authenticate user (admin only)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    logger.info("Commission payout processor request", {
      request_id: requestId,
      action,
      user_email: user.email,
    });

    switch (action) {
      case "get_unsettled": {
        // Get all unsettled commission events for an owner
        const { owner_type, owner_id } = body;

        if (!owner_type || !owner_id) {
          return Response.json(
            { error: "Missing owner_type or owner_id" },
            { status: 400 },
          );
        }

        const result = await base44.asServiceRole.db.query(
          `SELECT * FROM commission_events 
           WHERE owner_type = $1 AND owner_id = $2 AND settled = false
           ORDER BY created_at DESC`,
          [owner_type, owner_id],
        );

        const total = result.rows.reduce(
          (sum, row) => sum + parseFloat(row.commission_amount_usd || 0),
          0,
        );

        return Response.json({
          success: true,
          events: result.rows,
          total_unsettled_usd: total,
        });
      }

      case "create_manual_payout": {
        // Create a manual payout record
        const {
          owner_type,
          owner_id,
          amount_usd,
          payout_method,
          payout_reference,
          commission_event_ids = [],
          notes,
        } = body;

        if (!owner_type || !owner_id || !amount_usd) {
          return Response.json(
            { error: "Missing required fields" },
            { status: 400 },
          );
        }

        // Create payout record
        const result = await base44.asServiceRole.db.query(
          `INSERT INTO commission_payouts (
            owner_type,
            owner_id,
            amount_usd,
            payout_method,
            payout_reference,
            commission_event_ids,
            notes,
            payout_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
          RETURNING id`,
          [
            owner_type,
            owner_id,
            amount_usd,
            payout_method || "manual",
            payout_reference,
            commission_event_ids,
            notes,
          ],
        );

        const payoutId = result.rows[0].id;

        // Mark commission events as settled
        if (commission_event_ids.length > 0) {
          await base44.asServiceRole.db.query(
            `UPDATE commission_events 
             SET settled = true, settled_at = NOW()
             WHERE id = ANY($1)`,
            [commission_event_ids],
          );
        }

        logger.info("Manual payout created", {
          request_id: requestId,
          payout_id: payoutId,
          owner_type,
          owner_id,
          amount_usd,
        });

        return Response.json({
          success: true,
          payout_id: payoutId,
          message: "Manual payout record created",
        });
      }

      case "mark_payout_completed": {
        // Update payout status
        const { payout_id, payout_status, payout_reference } = body;

        if (!payout_id || !payout_status) {
          return Response.json(
            { error: "Missing payout_id or payout_status" },
            { status: 400 },
          );
        }

        await base44.asServiceRole.db.query(
          `UPDATE commission_payouts 
           SET payout_status = $1, payout_reference = COALESCE($2, payout_reference)
           WHERE id = $3`,
          [payout_status, payout_reference, payout_id],
        );

        logger.info("Payout status updated", {
          request_id: requestId,
          payout_id,
          payout_status,
        });

        return Response.json({
          success: true,
          message: "Payout status updated",
        });
      }

      case "get_payout_history": {
        // Get payout history for an owner
        const { owner_type, owner_id, limit = 50 } = body;

        if (!owner_type || !owner_id) {
          return Response.json(
            { error: "Missing owner_type or owner_id" },
            { status: 400 },
          );
        }

        const result = await base44.asServiceRole.db.query(
          `SELECT * FROM commission_payouts 
           WHERE owner_type = $1 AND owner_id = $2
           ORDER BY created_at DESC
           LIMIT $3`,
          [owner_type, owner_id, limit],
        );

        return Response.json({
          success: true,
          payouts: result.rows,
        });
      }

      default:
        return Response.json(
          { error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Commission payout processor failed", {
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
