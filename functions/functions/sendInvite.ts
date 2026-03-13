// functions/sendInvite.js
// Send invitation email via SendGrid
// Deployed: 2025-12-28

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { sendEmailWithHierarchy } from "./lib/emailService.js";
import { ONBOARDING_URL } from "./lib/envConfig.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check - allow admins and partners
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: "Unauthorized" }, {
        status: 401,
      });
    }

    const isAdmin = user.role === "admin";
    const isPartner = !!user.partner_id;

    if (!isAdmin && !isPartner) {
      return Response.json({
        success: false,
        error: "Unauthorized - Admin or Partner access required",
      }, { status: 403 });
    }

    const { email, account_type, category } = await req.json();

    if (!email || !account_type) {
      return Response.json({
        success: false,
        error: "Email and Account Type are required",
      }, { status: 400 });
    }

    // Check if there's already a pending invite for this email
    const existingInvites = await base44.asServiceRole.entities.Invitation
      .filter({
        email: email.toLowerCase(),
        status: "pending",
      });

    let code;
    let invite;

    if (existingInvites.length > 0) {
      // Resend existing code
      invite = existingInvites[0];
      code = invite.code;
      console.log(`Resending existing invite to ${email} with code ${code}`);
    } else {
      // Generate new code
      code = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create Invitation
      invite = await base44.asServiceRole.entities.Invitation.create({
        email: email.toLowerCase(),
        code,
        account_type,
        category: category || "General",
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString(), // 30 days
      });
      console.log(`Created new invite for ${email} with code ${code}`);
    }

    // Send Email via SendGrid API
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY not found");
      return Response.json({
        success: false,
        error: "Email service not configured",
      }, { status: 500 });
    }

    const onboardingUrl = ONBOARDING_URL;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0e4166, #1a5a8a); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; }
    .code-box { background: #f0f9ff; border: 2px solid #0e4166; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .code { color: #0e4166; font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 0; font-family: monospace; }
    .button { display: inline-block; background: #0e4166; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to AEVOICE! 🎉</h1>
  </div>
  <div class="content">
    <p>Hi there!</p>
    <p>You've been invited to join <strong>AEVOICE</strong> as a <strong>${account_type}</strong>.</p>
    
    <div class="code-box">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your Invitation Code:</p>
      <p class="code">${code}</p>
    </div>

    <h3>How to Activate:</h3>
    <ol>
      <li>Click the button below to go to the activation page</li>
      <li>Sign in or create an account using this email: <strong>${email}</strong></li>
      <li>Enter your invitation code: <strong>${code}</strong></li>
      <li>Complete the setup wizard</li>
    </ol>

    <div style="text-align: center;">
      <a href="${onboardingUrl}" class="button">Activate My Account →</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      <strong>Important:</strong> Make sure to sign up with this exact email address (${email}) to activate your account.
    </p>
  </div>
  <div class="footer">
    <p>Questions? Reply to this email or contact care@aevoice.ai</p>
    <p>© 2024 AEVOICE. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const { ok } = await sendEmailWithHierarchy(req, {
      to: email,
      subject: "🎉 Welcome to AEVOICE - Your Invitation Code Inside!",
      body: html,
      from_name: "AEVOICE Team",
      from_email: "care@aevoice.ai",
      marketing: false,
      metadata: { type: "invite" },
    });

    if (ok) {
      return Response.json({
        success: true,
        code,
        message: `Invitation sent to ${email}`,
      });
    } else {
      return Response.json({
        success: false,
        error: "Failed to send email. Please try again.",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("sendInvite error:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, {
      status: 500,
    });
  }
});
