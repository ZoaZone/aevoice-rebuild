import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Request platform number started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { client_id, country = "US", area_code = "" } = await req.json();

    if (!client_id) {
      return Response.json({ error: "client_id is required" }, { status: 400 });
    }

    // Validate client ownership or admin override
    const clients = await base44.asServiceRole.entities.Client.filter({
      id: client_id,
    });
    const client = clients?.[0];
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }
    if (client.contact_email !== user.email && user.role !== "admin") {
      return Response.json({ error: "Forbidden: You do not own this client" }, {
        status: 403,
      });
    }

    // Create an AdminApproval request for platform number provisioning
    const approval = await base44.asServiceRole.entities.AdminApproval.create({
      type: "phone_number",
      requester_type: "client",
      requester_id: client_id,
      requester_email: user.email,
      requester_name: user.full_name || user.email,
      status: "pending",
      priority: "normal",
      request_data: {
        mode: "platform_twilio",
        country,
        area_code,
      },
    });

    return Response.json({ success: true, approval_id: approval.id });
  } catch (error) {
    logger.error("Request platform number failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
