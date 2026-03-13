// functions/sendAlert.ts
// Unified alerting function for Slack and PagerDuty
// Integrates with existing error logging to send real-time alerts

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

interface AlertPayload {
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, any>;
  component?: string;
  request_id?: string;
}

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
    const payload: AlertPayload = await req.json();

    const {
      severity,
      title,
      message,
      metadata = {},
      component = "AEVOICE",
      request_id = requestId,
    } = payload;

    // Validate severity
    if (!["info", "warning", "error", "critical"].includes(severity)) {
      return Response.json(
        { error: "Invalid severity. Use: info, warning, error, critical" },
        { status: 400 },
      );
    }

    logger.info("Alert triggered", {
      request_id,
      severity,
      title,
      component,
    });

    const results: Record<string, any> = {
      slack: null,
      pagerduty: null,
    };

    // 1. Send Slack alert
    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (slackWebhookUrl) {
      try {
        const slackColor = {
          info: "#36a64f", // Green
          warning: "#ff9800", // Orange
          error: "#f44336", // Red
          critical: "#9c27b0", // Purple
        }[severity];

        const slackPayload = {
          username: "AEVOICE Alert Bot",
          icon_emoji: ":rotating_light:",
          attachments: [
            {
              color: slackColor,
              title: `[${severity.toUpperCase()}] ${title}`,
              text: message,
              fields: [
                {
                  title: "Component",
                  value: component,
                  short: true,
                },
                {
                  title: "Request ID",
                  value: request_id,
                  short: true,
                },
                ...Object.entries(metadata).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                })),
              ],
              footer: "AEVOICE AI Platform",
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        };

        const slackResponse = await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload),
        });

        if (!slackResponse.ok) {
          throw new Error(`Slack API error: ${slackResponse.statusText}`);
        }

        results.slack = { success: true, sent_at: new Date().toISOString() };
        logger.info("Slack alert sent", { request_id, severity, title });
      } catch (error) {
        logger.error("Slack alert failed", {
          request_id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.slack = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else {
      results.slack = {
        success: false,
        error: "SLACK_WEBHOOK_URL not configured",
      };
    }

    // 2. Send PagerDuty alert (only for error and critical)
    const pagerdutyApiKey = Deno.env.get("PAGERDUTY_API_KEY");
    const pagerdutyServiceKey = Deno.env.get("PAGERDUTY_SERVICE_KEY");

    if (
      pagerdutyApiKey &&
      pagerdutyServiceKey &&
      (severity === "error" || severity === "critical")
    ) {
      try {
        const pdPayload = {
          routing_key: pagerdutyServiceKey,
          event_action: "trigger",
          dedup_key: request_id,
          payload: {
            summary: `${title}: ${message}`,
            severity: severity === "critical" ? "critical" : "error",
            source: component,
            component: component,
            custom_details: {
              request_id,
              ...metadata,
            },
          },
        };

        const pdResponse = await fetch(
          "https://events.pagerduty.com/v2/enqueue",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Token token=${pagerdutyApiKey}`,
            },
            body: JSON.stringify(pdPayload),
          },
        );

        if (!pdResponse.ok) {
          const errorText = await pdResponse.text();
          throw new Error(`PagerDuty API error: ${errorText}`);
        }

        const pdResult = await pdResponse.json();
        results.pagerduty = {
          success: true,
          dedup_key: pdResult.dedup_key,
          sent_at: new Date().toISOString(),
        };
        logger.info("PagerDuty alert sent", { request_id, severity, title });
      } catch (error) {
        logger.error("PagerDuty alert failed", {
          request_id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.pagerduty = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else if (severity === "error" || severity === "critical") {
      results.pagerduty = {
        success: false,
        error: "PagerDuty not configured (PAGERDUTY_API_KEY or PAGERDUTY_SERVICE_KEY missing)",
      };
    } else {
      results.pagerduty = {
        success: false,
        error: "PagerDuty only triggered for error/critical severity",
      };
    }

    // Store alert in database
    try {
      await base44.asServiceRole.entities.Alert.create({
        severity,
        title,
        message,
        component,
        request_id,
        metadata: {
          ...metadata,
          slack_sent: results.slack?.success || false,
          pagerduty_sent: results.pagerduty?.success || false,
        },
        resolved: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn("Failed to store alert in database", {
        request_id,
        error: err.message,
      });
    }

    const atLeastOneSuccess = results.slack?.success ||
      results.pagerduty?.success;

    return Response.json({
      success: atLeastOneSuccess,
      alert: {
        severity,
        title,
        message,
        component,
        request_id,
      },
      delivery: results,
    });
  } catch (error) {
    logger.error("Alert sending failed", {
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
