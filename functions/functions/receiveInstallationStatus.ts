import { createClient } from "npm:@base44/sdk@0.8.6";
import { createHmac } from "node:crypto";
import { logger } from "./lib/infra/logger.js";

const base44 = createClient();
const FLOWSYNC_SECRET = Deno.env.get("FLOWSYNC_TRIGGER_SECRET");

if (!FLOWSYNC_SECRET) {
  logger.error("FLOWSYNC_TRIGGER_SECRET environment variable is required");
  throw new Error("FLOWSYNC_TRIGGER_SECRET must be set");
}

function verifyHmacSignature(payload, signature, timestamp) {
  const hmac = createHmac("sha256", FLOWSYNC_SECRET);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest("hex");

  // Check signature match
  if (signature !== expectedSignature) {
    return false;
  }

  // Check timestamp (prevent replay attacks - allow 5 min window)
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();
  const timeDiff = Math.abs(now - requestTime);

  if (timeDiff > 5 * 60 * 1000) { // 5 minutes
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    // Extract installation ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const installationId = pathParts[pathParts.indexOf("installation") + 1];

    if (!installationId) {
      return Response.json({ error: "Installation ID required" }, {
        status: 400,
      });
    }

    const body = await req.json();
    const signature = req.headers.get("X-FlowSync-Signature");
    const timestamp = req.headers.get("X-FlowSync-Timestamp");

    // Verify HMAC signature
    if (!verifyHmacSignature(body, signature, timestamp)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { step, status, message, progress_percent } = body;

    // Fetch current installation
    const installations = await base44.asServiceRole.entities
      .InstallationService.filter({ id: installationId });
    const installation = installations[0];

    if (!installation) {
      return Response.json({ error: "Installation not found" }, {
        status: 404,
      });
    }

    // Add progress update
    const progressUpdates = installation.progress_updates || [];
    progressUpdates.push({
      step,
      status,
      message,
      progress_percent,
      timestamp: new Date().toISOString(),
    });

    // Update installation
    await base44.asServiceRole.entities.InstallationService.update(
      installationId,
      {
        status: status === "completed" ? "completed" : "in_progress",
        progress_updates: progressUpdates,
      },
    );

    return Response.json({
      success: true,
      message: "Status update received",
    });
  } catch (error) {
    console.error("Error receiving installation status:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
