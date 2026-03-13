// functions/updateInvitation.js

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    logger.info("Update invitation request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitation_id, updates } = await req.json();

    const updated = await base44.asServiceRole.entities.Invitation.update(
      invitation_id,
      updates,
    );

    return Response.json(
      {
        success: true,
        invitation: updated,
        message: "Invitation updated successfully",
      },
      { status: 200 },
    );
  } catch (err) {
    logger.error("Update invitation failed", {
      request_id: requestId,
      error: err.message,
      stack: err.stack,
    });
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
});
