import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { ensureAllowedHost, getClientIp, getPublicBaseUrl } from "./lib/security/hostGuard.js";
import { rateLimitMiddleware } from "./lib/infra/rateLimit.js";

Deno.serve(async (req) => {
  try {
    if (!ensureAllowedHost(req, { requireAevoice: true })) {
      return Response.json({ error: "Forbidden host" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rl = rateLimitMiddleware(req, ip || "unknown", "default");
    if (rl.limited) return rl.response;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { account_sid, auth_token, phone_number, client_id, agent_id } = body || {};

    const sid = account_sid || Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = auth_token || Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!sid || !token || !phone_number || !client_id) {
      return Response.json({
        error:
          "Missing required parameters (ensure TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN are set or provide credentials)",
      }, { status: 400 });
    }

    // SECURITY GUARDRAIL: Verify Client Ownership with enhanced validation
    // This prevents users from purchasing numbers for clients they don't own
    // and ensures proper tenant isolation across the platform
    const client = await base44.asServiceRole.entities.Client.findById(
      client_id,
    );

    if (!client) {
      console.error("[SECURITY][purchaseTwilioNumber] Client not found", {
        client_id,
        user_id: user.id,
        user_email: user.email,
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

    // SECURITY GUARDRAIL: Validate user owns the client (or is admin)
    // Check both contact_email and user_id for comprehensive ownership validation
    const isOwner = client.contact_email === user.email;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      console.error(
        "[SECURITY][purchaseTwilioNumber] Unauthorized purchase attempt",
        {
          user_email: user.email,
          user_id: user.id,
          client_id,
          client_owner: client.contact_email,
          error_code: "UNAUTHORIZED_CLIENT_ACCESS",
        },
      );
      return Response.json({
        error: "Unauthorized: You do not own this client account",
        code: "UNAUTHORIZED_CLIENT_ACCESS",
      }, { status: 403 });
    }

    // SECURITY GUARDRAIL: Ownership validated - proceeding with purchase
    console.log("[SECURITY][purchaseTwilioNumber] Ownership validated", {
      user_id: user.id,
      client_id,
      is_owner: isOwner,
      is_admin: isAdmin,
    });

    // Purchase number from Twilio
    const auth = btoa(`${sid}:${token}`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json`;

    // Get App ID dynamically or fallback
    const appId = req.headers.get("x-app-id") ||
      Deno.env.get("BASE44_APP_ID") || "";
    const formData = new URLSearchParams({
      PhoneNumber: phone_number,
      VoiceUrl: `${getPublicBaseUrl(req)}/api/apps/${appId}/functions/twilioWebhook`,
      VoiceMethod: "POST",
      SmsUrl: `${getPublicBaseUrl(req)}/api/apps/${appId}/functions/twilioWebhook`,
      SmsMethod: "POST",
    });

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const code = error?.code;
      let message = error instanceof Error ? error.message : String(error) || "Purchase failed";
      if (code === 21631) message = "Address SID required for this country";
      if (code === 21649) message = "Bundle SID required for compliance";
      return Response.json({ error: message, code }, {
        status: response.status,
      });
    }

    const purchasedNumber = await response.json();

    // Create TelephonyAccount if not exists (Use Service Role to bypass strict RLS)
    const existingAccounts = await base44.asServiceRole.entities
      .TelephonyAccount.filter({ client_id });
    let telephonyAccount;

    if (existingAccounts.length === 0) {
      telephonyAccount = await base44.asServiceRole.entities.TelephonyAccount
        .create({
          client_id,
          mode: "byo_twilio",
          provider: "twilio",
          display_name: "My Twilio Account",
          config: {
            account_sid: sid,
            ...(token ? { auth_token: token } : {}),
          },
          status: "active",
        });
    } else {
      telephonyAccount = existingAccounts[0];
    }

    // Create PhoneNumber entity (Use Service Role)
    const phoneNumberRecord = await base44.asServiceRole.entities.PhoneNumber
      .create({
        client_id,
        telephony_account_id: telephonyAccount.id,
        agent_id,
        number_e164: purchasedNumber.phone_number,
        label: `Twilio - ${purchasedNumber.friendly_name}`,
        capabilities: ["voice", "sms"],
        status: "active",
        provider_number_id: purchasedNumber.sid,
        webhook_token: Math.random().toString(36).substring(7),
        created_by: user.email, // Maintain audit trail
      });

    return Response.json({
      success: true,
      phoneNumber: phoneNumberRecord,
      twilio_sid: purchasedNumber.sid,
    });
  } catch (error) {
    console.error(
      "[ERROR][purchaseTwilioNumber] Error purchasing Twilio number",
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "",
        phoneNumber: phone_number,
        accountSid: account_sid,
        clientId: client_id,
      },
    );
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
