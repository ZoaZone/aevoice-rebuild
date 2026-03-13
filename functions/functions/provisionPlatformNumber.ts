import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Provision platform number request started", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const {
      client_id,
      country = "US",
      area_code = "",
      agent_id,
      verification = {},
      accept_terms,
    } = await req.json();
    if (!client_id) {
      return Response.json({ error: "client_id is required" }, { status: 400 });
    }
    if (!accept_terms) {
      return Response.json({ error: "Terms must be accepted" }, {
        status: 400,
      });
    }

    // Verify client ownership or admin
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

    // Resolve target agent: prefer provided agent_id, else first active
    let agent;
    if (agent_id) {
      const list = await base44.asServiceRole.entities.Agent.filter({
        id: agent_id,
        client_id,
      });
      agent = list?.[0] || null;
    }
    if (!agent) {
      const agents = await base44.asServiceRole.entities.Agent.filter({
        client_id,
      });
      agent = agents.find((a) => a.status === "active") || agents[0];
    }
    if (!agent) {
      return Response.json({
        error: "No agent found. Please create an agent first.",
      }, { status: 422 });
    }

    // Try auto-provision via platform Twilio credentials if present
    const sid = Deno.env.get("TWILIO_PLATFORM_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_PLATFORM_AUTH_TOKEN");

    if (sid && token) {
      const auth = btoa(`${sid}:${token}`);
      const params = new URLSearchParams({
        VoiceEnabled: "true",
        SmsEnabled: "true",
      });
      if (area_code) params.set("AreaCode", String(area_code));
      const searchUrl =
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/AvailablePhoneNumbers/${country}/Local.json?${params}`;

      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!searchRes.ok) {
        // Fallback to admin approval when platform Twilio search fails
        const approval = await base44.asServiceRole.entities.AdminApproval
          .create({
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
              verification,
              error: "twilio_search_failed",
            },
          });
        return Response.json({
          status: "queued",
          approval_id: approval.id,
          reason: "platform_twilio_search_failed",
        });
      }
      const search = await searchRes.json();
      const first = (search?.available_phone_numbers || [])[0];
      if (!first?.phone_number) {
        return Response.json({
          error: "No numbers available for the selected region",
        }, { status: 422 });
      }

      // Configure webhook
      const appId = req.headers.get("x-app-id") ||
        Deno.env.get("BASE44_APP_ID") || "692b24a5bac54e3067972063";
      const form = new URLSearchParams({
        PhoneNumber: first.phone_number,
        VoiceUrl: `https://aevoice.base44.app/api/apps/${appId}/functions/twilioWebhook`,
        VoiceMethod: "POST",
        SmsUrl: `https://aevoice.base44.app/api/apps/${appId}/functions/twilioWebhook`,
        SmsMethod: "POST",
      });

      const buyUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json`;
      const buyRes = await fetch(buyUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      });
      if (!buyRes.ok) {
        // Fallback to admin approval when platform Twilio purchase fails
        const approval = await base44.asServiceRole.entities.AdminApproval
          .create({
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
              verification,
              error: "twilio_purchase_failed",
            },
          });
        return Response.json({
          status: "queued",
          approval_id: approval.id,
          reason: "platform_twilio_purchase_failed",
        });
      }
      const purchased = await buyRes.json();

      // Ensure TelephonyAccount (platform-managed)
      const accounts = await base44.asServiceRole.entities.TelephonyAccount
        .filter({ client_id });
      let teleAcc = accounts.find((a) => a.mode === "platform_twilio");
      if (!teleAcc) {
        teleAcc = await base44.asServiceRole.entities.TelephonyAccount.create({
          client_id,
          mode: "platform_twilio",
          provider: "twilio",
          display_name: "AEVOICE Managed",
          config: { account_sid: sid },
          status: "active",
        });
      }

      const phone = await base44.asServiceRole.entities.PhoneNumber.create({
        client_id,
        telephony_account_id: teleAcc.id,
        agent_id: agent.id,
        number_e164: purchased.phone_number,
        label: `AEVOICE - ${purchased.friendly_name || purchased.phone_number}`,
        capabilities: ["voice", "sms"],
        status: "active",
        provider_number_id: purchased.sid,
        webhook_token: crypto.randomUUID(),
      });

      return Response.json({ status: "allocated", phoneNumber: phone });
    }

    // Fallback: queue an approval if platform credentials are not configured
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
        verification,
      },
    });

    return Response.json({
      status: "queued",
      approval_id: approval.id,
      reason: "platform_credentials_missing",
    });
  } catch (error) {
    logger.error("Provision platform number failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
