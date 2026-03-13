import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { ensureAllowedHost, getClientIp } from "./lib/security/hostGuard.js";
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

    const { account_sid, auth_token, area_code, country = "US", limit = 20 } = await req.json()
      .catch(() => ({}));

    const sid = account_sid || Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = auth_token || Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!sid || !token) {
      return Response.json({
        error:
          "Missing Twilio credentials (set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN or provide in request)",
      }, { status: 400 });
    }

    // Search Twilio for available numbers
    const auth = btoa(`${sid}:${token}`);
    const params = new URLSearchParams({
      VoiceEnabled: "true",
      SmsEnabled: "true",
    });
    if (area_code) params.set("AreaCode", String(area_code));
    params.set("PageSize", String(limit));

    const twilioUrl =
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/AvailablePhoneNumbers/${country}/Local.json?${params}`;

    const response = await fetch(twilioUrl, {
      headers: {
        "Authorization": `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({
        error: error instanceof Error ? error.message : String(error) || "Twilio API error",
      }, {
        status: response.status,
      });
    }

    const data = await response.json();

    return Response.json({
      success: true,
      numbers: (data.available_phone_numbers || []).slice(0, limit),
    });
  } catch (error) {
    console.error("Error searching Twilio numbers:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error) || "Internal server error",
    }, { status: 500 });
  }
});
