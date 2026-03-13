import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { sendEmailWithHierarchy } from "./lib/emailService.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      to,
      subject,
      body,
      from_name = "AEVOICE",
      from_email = "care@aevoice.ai",
      campaign_id,
      contact_id,
      include_unsubscribe = true,
    } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({
        error: "Missing required fields: to, subject, body",
      }, { status: 400 });
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    // Build unsubscribe footer
    const unsubscribeFooter = include_unsubscribe
      ? `
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">
        You received this email from ${from_name}.<br>
        <a href="mailto:care@aevoice.ai?subject=Unsubscribe&body=Please%20unsubscribe%20me%20from%20marketing%20emails.%20Email:%20${
        encodeURIComponent(to)
      }" style="color: #999;">Unsubscribe</a> | 
        <a href="https://aevoice.ai" style="color: #999;">AEVOICE</a> | 
        <a href="mailto:care@aevoice.ai" style="color: #999;">Contact Us</a>
      </p>
    `
      : "";

    // Wrap body in HTML template if not already HTML
    const isHtml = body.trim().toLowerCase().startsWith("<!doctype") ||
      body.trim().toLowerCase().startsWith("<html");
    const htmlBody = isHtml ? body : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    a { color: #0e4166; }
  </style>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    ${body}
    ${unsubscribeFooter}
  </div>
</body>
</html>
    `;

    // Unified hierarchy send (Base44 primary, SendGrid fallback)
    const { ok, results } = await sendEmailWithHierarchy(req, {
      to,
      subject,
      body: htmlBody,
      from_name,
      from_email,
      marketing: true,
      metadata: { campaign_id, contact_id },
    });

    // Update contact last_contacted if provided
    if (ok && contact_id) {
      try {
        await base44.asServiceRole.entities.MarketingContact.update(
          contact_id,
          {
            last_contacted_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        console.warn("Could not update contact:", e.message);
      }
    }

    return Response.json({ success: ok, results });
  } catch (error) {
    console.error("Failed to send marketing email:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
