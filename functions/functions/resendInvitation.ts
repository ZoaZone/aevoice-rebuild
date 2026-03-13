// functions/resendInvitation.js

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    logger.info("Resend invitation request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitation_id } = await req.json();

    const invitation = await base44.asServiceRole.entities.Invitation.get(
      invitation_id,
    );

    if (!invitation) {
      return Response.json(
        { success: false, error: "Invitation not found" },
        { status: 404 },
      );
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    if (SENDGRID_API_KEY) {
      const onboardingUrl = "https://aevoice.ai/Onboarding";

      const emailData = {
        personalizations: [
          {
            to: [{ email: invitation.email }],
            subject: "Your AEVOICE Invitation Code",
          },
        ],
        from: {
          email: "care@aevoice.ai",
          name: "AEVOICE Team",
        },
        content: [
          {
            type: "text/html",
            value: `
<html>
<body>
<p>Your invitation code:</p>
<h2>${invitation.code}</h2>
<a href="${onboardingUrl}">Activate Account</a>
</body>
</html>`,
          },
        ],
      };

      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });
    }

    return Response.json(
      { success: true, message: "Invitation resent successfully" },
      { status: 200 },
    );
  } catch (err) {
    logger.error("Resend invitation failed", {
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
