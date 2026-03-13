// functions/crmWebhookRetryWorker.js
// Retry failed webhook deliveries with exponential backoff

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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can trigger retry worker
    if (!user || user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();

    // Find webhooks that need retry
    const webhooks = await base44.asServiceRole.entities.CRMWebhook.filter({
      active: true,
    });

    // Filter for webhooks with pending retries
    const webhooksToRetry = webhooks.filter((wh) => {
      if (!wh.next_retry_at) return false;
      if (new Date(wh.next_retry_at) > new Date(nowIso)) return false;
      if ((wh.retry_attempts || 0) >= (wh.max_retries || 3)) return false;
      return true;
    });

    logger.info("Webhook retry worker started", {
      request_id: requestId,
      webhooks_to_retry: webhooksToRetry.length,
    });

    const results = [];

    for (const wh of webhooksToRetry) {
      try {
        // Get the last failed log to retry
        const logs = await base44.asServiceRole.entities.CRMWebhookLog.filter({
          webhook_id: wh.id,
          status: "failed",
        });

        if (logs.length === 0) {
          // Mark as no retry needed
          await base44.asServiceRole.entities.CRMWebhook.update(wh.id, {
            next_retry_at: null,
          });
          continue;
        }

        // Get the most recent failed log
        const lastLog = logs.sort((a, b) =>
          new Date(b.timestamp || b.created_date) -
          new Date(a.timestamp || a.created_date)
        )[0];

        if (!lastLog.request_payload) {
          continue;
        }

        const start = Date.now();

        // Execute webhook with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), (wh.timeout_seconds || 10) * 1000);

        let res;
        try {
          res = await fetch(wh.target_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(wh.headers || {}),
            },
            body: JSON.stringify(lastLog.request_payload),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeout);
          throw new Error(`Network error: ${fetchErr.message}`);
        }

        clearTimeout(timeout);

        const duration = Date.now() - start;
        const bodyText = await res.text().catch(() => "");

        // Log the retry attempt
        await base44.asServiceRole.entities.CRMWebhookLog.create({
          webhook_id: wh.id,
          client_id: wh.client_id,
          event_type: lastLog.event_type,
          status: res.ok ? "success" : "failed",
          request_payload: lastLog.request_payload,
          response_code: res.status,
          response_body: bodyText.slice(0, 4000),
          attempt_number: (wh.retry_attempts || 0) + 1,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        });

        // Update webhook status
        const newRetryAttempts = (wh.retry_attempts || 0) + 1;
        const updateData = {
          retry_attempts: newRetryAttempts,
          last_triggered: new Date().toISOString(),
        };

        if (res.ok) {
          updateData.success_count = (wh.success_count || 0) + 1;
          updateData.next_retry_at = null; // Clear retry
        } else {
          updateData.failure_count = (wh.failure_count || 0) + 1;
          // Schedule next retry with backoff
          if (newRetryAttempts < (wh.max_retries || 3)) {
            updateData.next_retry_at = new Date(
              Date.now() + computeBackoffMs(newRetryAttempts),
            ).toISOString();
          } else {
            updateData.next_retry_at = null; // Max retries reached
          }
        }

        await base44.asServiceRole.entities.CRMWebhook.update(
          wh.id,
          updateData,
        );

        results.push({
          webhook_id: wh.id,
          status: res.ok ? "success" : "failed",
          attempt: newRetryAttempts,
          response_code: res.status,
        });

        logger.info("Webhook retry completed", {
          webhook_id: wh.id,
          status: res.ok ? "success" : "failed",
          duration_ms: duration,
        });
      } catch (err) {
        logger.error("Webhook retry failed", {
          webhook_id: wh.id,
          error: err.message,
        });

        // Update failure count
        await base44.asServiceRole.entities.CRMWebhook.update(wh.id, {
          retry_attempts: (wh.retry_attempts || 0) + 1,
          failure_count: (wh.failure_count || 0) + 1,
          next_retry_at: new Date(
            Date.now() + computeBackoffMs((wh.retry_attempts || 0) + 1),
          ).toISOString(),
        });

        results.push({
          webhook_id: wh.id,
          status: "error",
          error: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        retried: results.length,
        results,
        request_id: requestId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    logger.error("crmWebhookRetryWorker failed", {
      request_id: requestId,
      error: err.message,
    });

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

function computeBackoffMs(attempt) {
  const base = 60_000; // 1 minute
  const factor = Math.min(attempt, 5);
  return base * factor * (1 + Math.random() * 0.1); // Add jitter
}
