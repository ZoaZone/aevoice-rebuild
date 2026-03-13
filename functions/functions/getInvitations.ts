// functions/getInvitations.js

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    logger.info("Get invitations request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await req.json();

    const invitations = await base44.asServiceRole.entities.Invitation.filter({
      status,
    });

    return Response.json(
      {
        success: true,
        invitations,
      },
      { status: 200 },
    );
  } catch (err) {
    logger.error("Get invitations failed", {
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
