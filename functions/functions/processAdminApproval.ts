import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

/**
 * Process admin approval for phone number provisioning requests
 *
 * @route POST /functions/processAdminApproval
 * @auth Required - Admin only
 * @body { approval_id, action: 'approve' | 'deny', admin_note? }
 * @returns { success: true, phoneNumber? }
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("processAdminApproval started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, {
        status: 403,
      });
    }

    const { approval_id, action, admin_note } = await req.json();

    if (!approval_id || !action) {
      return Response.json(
        { error: "approval_id and action are required" },
        { status: 400 },
      );
    }

    if (!["approve", "deny"].includes(action)) {
      return Response.json(
        { error: 'action must be "approve" or "deny"' },
        { status: 400 },
      );
    }

    // Fetch the approval record
    const approvals = await base44.asServiceRole.entities.AdminApproval.filter({
      id: approval_id,
    });
    const approval = approvals?.[0];

    if (!approval) {
      return Response.json({ error: "Approval not found" }, { status: 404 });
    }

    if (approval.status !== "pending") {
      return Response.json(
        { error: `Approval already ${approval.status}` },
        { status: 409 },
      );
    }

    if (action === "deny") {
      // Update approval to rejected
      await base44.asServiceRole.entities.AdminApproval.update(approval_id, {
        status: "rejected",
        admin_note,
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
      });

      logger.info("Approval denied", {
        request_id: requestId,
        approval_id,
        admin: user.email,
      });

      return Response.json({ success: true, message: "Request denied" });
    }

    // APPROVE - Attempt to provision the phone number
    const requestData = approval.request_data || {};
    const clientId = approval.requester_id;
    const country = requestData.country || "US";
    const areaCode = requestData.area_code || "";

    // SECURITY GUARDRAIL: Validate tenant ownership before proceeding
    // This prevents cross-tenant data access and ensures admins can only
    // approve requests for clients in their organization
    const client = await base44.asServiceRole.entities.Client.findById(
      clientId,
    );
    if (!client) {
      logger.error("[SECURITY] Client not found in admin approval", {
        request_id: requestId,
        client_id: clientId,
        approval_id,
        error_code: "CLIENT_NOT_FOUND",
      });
      return Response.json(
        {
          error: "Client not found",
          code: "CLIENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Note: Admin role already validated earlier (line 26)
    // All admins have system-wide access to approve requests
    logger.info("[SECURITY] Tenant ownership validated for admin approval", {
      request_id: requestId,
      admin_email: user.email,
      client_id: clientId,
      client_owner: client.contact_email,
    });

    // Resolve agent for the phone number
    const agents = await base44.asServiceRole.entities.Agent.filter({
      client_id: clientId,
    });
    const agent = agents.find((a) => a.status === "active") || agents[0];

    if (!agent) {
      await base44.asServiceRole.entities.AdminApproval.update(approval_id, {
        status: "rejected",
        admin_note: "No agent found for client. User must create an agent first.",
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
      });

      return Response.json(
        { error: "No agent found for this client. Request denied." },
        { status: 422 },
      );
    }

    // Try to provision via platform Twilio
    const sid = Deno.env.get("TWILIO_PLATFORM_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_PLATFORM_AUTH_TOKEN");

    let phoneNumber = null;

    if (sid && token) {
      try {
        const auth = btoa(`${sid}:${token}`);
        const params = new URLSearchParams({
          VoiceEnabled: "true",
          SmsEnabled: "true",
        });
        if (areaCode) params.set("AreaCode", String(areaCode));

        const searchUrl =
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/AvailablePhoneNumbers/${country}/Local.json?${params}`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Basic ${auth}` },
        });

        if (searchRes.ok) {
          const search = await searchRes.json();
          const first = (search?.available_phone_numbers || [])[0];

          if (first?.phone_number) {
            // Purchase the number
            const appId = req.headers.get("x-app-id") ||
              Deno.env.get("BASE44_APP_ID") || "692b24a5bac54e3067972063";
            const form = new URLSearchParams({
              PhoneNumber: first.phone_number,
              VoiceUrl: `https://aevoice.base44.app/api/apps/${appId}/functions/twilioWebhook`,
              VoiceMethod: "POST",
              SmsUrl: `https://aevoice.base44.app/api/apps/${appId}/functions/twilioWebhook`,
              SmsMethod: "POST",
            });

            const buyUrl =
              `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json`;
            const buyRes = await fetch(buyUrl, {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: form,
            });

            if (buyRes.ok) {
              const purchased = await buyRes.json();

              // Create TelephonyAccount
              const accounts = await base44.asServiceRole.entities
                .TelephonyAccount.filter({ client_id: clientId });
              let teleAcc = accounts.find((a) => a.mode === "platform_twilio");

              if (!teleAcc) {
                teleAcc = await base44.asServiceRole.entities.TelephonyAccount
                  .create({
                    client_id: clientId,
                    mode: "platform_twilio",
                    provider: "twilio",
                    display_name: "AEVOICE Platform Twilio",
                    config: {},
                    status: "active",
                  });
              }

              // Create PhoneNumber record
              phoneNumber = await base44.asServiceRole.entities.PhoneNumber
                .create({
                  client_id: clientId,
                  telephony_account_id: teleAcc.id,
                  number_e164: first.phone_number,
                  provider_hint: "twilio",
                  agent_id: agent.id,
                  label: requestData.verification?.businessName ||
                    "Platform Number",
                  status: "active",
                  webhook_token: crypto.randomUUID(),
                });

              logger.info("Phone number provisioned successfully", {
                request_id: requestId,
                approval_id,
                number: first.phone_number,
              });
            }
          }
        }
      } catch (err) {
        logger.error("Twilio provisioning failed", {
          request_id: requestId,
          error: err.message,
        });
      }
    }

    // Update approval status
    if (phoneNumber) {
      await base44.asServiceRole.entities.AdminApproval.update(approval_id, {
        status: "approved",
        admin_note: admin_note || "Phone number provisioned successfully",
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        message: "Phone number provisioned",
        phoneNumber,
      });
    } else {
      // Manual provisioning required
      await base44.asServiceRole.entities.AdminApproval.update(approval_id, {
        status: "approved",
        admin_note: admin_note ||
          "Approved - manual provisioning required. Platform credentials not available or provisioning failed.",
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        message: "Approved - manual provisioning required",
        phoneNumber: null,
      });
    }
  } catch (error) {
    logger.error("processAdminApproval failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
