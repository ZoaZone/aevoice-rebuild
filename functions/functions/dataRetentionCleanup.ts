// functions/dataRetentionCleanup.ts
// GDPR-compliant data retention cleanup
// Scheduled to run daily to delete expired data based on retention policies

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow system cron jobs (no auth) or admin users
    if (user && user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    logger.info("Data retention cleanup started", {
      request_id: requestId,
      triggered_by: user?.email || "system",
    });

    // Get all retention policies
    const policies = await base44.asServiceRole.entities.DataRetentionPolicy
      .filter({
        auto_delete: true,
      });

    const results = [];
    let totalDeleted = 0;

    for (const policy of policies) {
      const { data_type, retention_days } = policy;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retention_days);
      const cutoffIso = cutoffDate.toISOString();

      logger.info(`Processing retention policy: ${data_type}`, {
        request_id: requestId,
        retention_days,
        cutoff_date: cutoffIso,
      });

      let deleted = 0;

      try {
        // Delete expired data based on type
        switch (data_type) {
          case "conversations": {
            const expired = await base44.asServiceRole.entities.Conversation
              .filter({
                created_at: { lt: cutoffIso },
              });
            for (const conv of expired) {
              await base44.asServiceRole.entities.Conversation.delete(conv.id);
              deleted++;
            }
            break;
          }

          case "call_sessions": {
            const expired = await base44.asServiceRole.entities.CallSession
              .filter({
                created_at: { lt: cutoffIso },
              });
            for (const session of expired) {
              await base44.asServiceRole.entities.CallSession.delete(
                session.id,
              );
              deleted++;
            }
            break;
          }

          case "error_logs": {
            // Query error logs and delete old ones
            const query = `
              DELETE FROM error_logs 
              WHERE created_at < $1 
              RETURNING id
            `;
            const result = await base44.asServiceRole.sql(query, [cutoffIso]);
            deleted = result.length;
            break;
          }

          case "latency_metrics": {
            const expired = await base44.asServiceRole.entities.LatencyMetric
              .filter({
                created_date: { lt: cutoffIso },
              });
            for (const metric of expired) {
              await base44.asServiceRole.entities.LatencyMetric.delete(
                metric.id,
              );
              deleted++;
            }
            break;
          }

          case "webhook_logs": {
            const expired = await base44.asServiceRole.entities.CRMWebhookLog
              .filter({
                timestamp: { lt: cutoffIso },
              });
            for (const log of expired) {
              await base44.asServiceRole.entities.CRMWebhookLog.delete(log.id);
              deleted++;
            }
            break;
          }

          case "user_sessions": {
            // Delete expired user sessions
            const query = `
              DELETE FROM user_sessions 
              WHERE created_at < $1 
              RETURNING id
            `;
            const result = await base44.asServiceRole.sql(query, [cutoffIso]);
            deleted = result.length;
            break;
          }

          case "analytics": {
            const expired = await base44.asServiceRole.entities.WidgetAnalytics
              .filter({
                date: { lt: cutoffIso },
              });
            for (const analytic of expired) {
              await base44.asServiceRole.entities.WidgetAnalytics.delete(
                analytic.id,
              );
              deleted++;
            }
            break;
          }

          default:
            logger.warn(`Unknown data type: ${data_type}`, {
              request_id: requestId,
            });
        }

        // Log deletion
        if (deleted > 0) {
          await base44.asServiceRole.entities.DataDeletionLog.create({
            data_type,
            deletion_reason: "retention_policy",
            records_deleted: deleted,
            deleted_before_date: cutoffIso,
            request_id: requestId,
            requested_by: user?.id || "system",
            metadata: {
              retention_days,
              policy_id: policy.id,
            },
            created_at: new Date().toISOString(),
          });

          logger.info(`Deleted expired ${data_type}`, {
            request_id: requestId,
            data_type,
            records_deleted: deleted,
            cutoff_date: cutoffIso,
          });
        }

        results.push({
          data_type,
          records_deleted: deleted,
          cutoff_date: cutoffIso,
          status: "success",
        });

        totalDeleted += deleted;
      } catch (error) {
        logger.error(`Failed to delete ${data_type}`, {
          request_id: requestId,
          data_type,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : "",
        });

        results.push({
          data_type,
          records_deleted: 0,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Data retention cleanup completed", {
      request_id: requestId,
      total_deleted: totalDeleted,
      policies_processed: policies.length,
    });

    return Response.json({
      success: true,
      total_deleted: totalDeleted,
      policies_processed: policies.length,
      results,
      request_id: requestId,
    });
  } catch (error) {
    logger.error("Data retention cleanup failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error) || "Internal server error",
      },
      { status: 500 },
    );
  }
});
