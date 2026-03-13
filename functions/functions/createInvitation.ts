// functions/createInvitation.js
// Clean Production Version — 2025-12-28

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const ALLOWED_ACCOUNT_TYPES = [
  "business",
  "agency",
  "partner",
  "free_partner",
  "agent",
  "paid_subscription",
  "affiliate",
];

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // --- CORS ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = user.role === "admin";

    // Only admins and partners can create invitations
    if (!isAdmin && !user.partner_id) {
      return Response.json(
        { success: false, error: "Unauthorized to create invitations" },
        { status: 403 },
      );
    }

    const body = await req.json();
    let {
      email,
      account_type,
      category,
      partner_id,
      campaign_id,
      expires_in_days,
      max_uses,
      // New schema (backward-compatible)
      role,
      partnerType,
      sendWelcomeEmail,
      customMessage,
    } = body;

    // Map new schema -> legacy fields
    const PARTNER_TYPE_MAP = {
      free: "free_partner",
      paid: "paid_subscription",
      reseller: "partner",
    };
    if (!account_type && partnerType) {
      const key = String(partnerType).toLowerCase();
      account_type = PARTNER_TYPE_MAP[key] || "business";
    }
    // Optional: role can influence account_type when not specified
    if (!account_type && role) {
      const r = String(role).toLowerCase();
      if (r === "partner") account_type = "partner";
      else if (r === "admin") account_type = "business";
    }
    // Defaults
    account_type = account_type || "business";
    category = category || "General";

    // --- VALIDATION ---
    if (!email) {
      return Response.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { success: false, error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (account_type && !ALLOWED_ACCOUNT_TYPES.includes(account_type)) {
      return Response.json(
        {
          success: false,
          error: `Invalid account_type. Must be one of: ${ALLOWED_ACCOUNT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // --- DUPLICATE GUARD (pending, not expired) ---
    const pendingSameEmail = await base44.asServiceRole.entities.Invitation
      .filter({ email, status: "pending" });
    if (Array.isArray(pendingSameEmail) && pendingSameEmail.length > 0) {
      const nowISO = new Date().toISOString();
      const active = pendingSameEmail.find((i) => !i.expires_at || i.expires_at > nowISO);
      if (active) {
        return Response.json(
          {
            success: false,
            error: "An active invitation already exists for this email.",
          },
          { status: 409 },
        );
      }
    }

    // --- UNIQUE CODE GENERATION ---
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = generateCode();
    let attempts = 0;

    while (attempts < 10) {
      const existing = await base44.asServiceRole.entities.Invitation.filter({
        code,
      });
      if (!existing || existing.length === 0) break;
      code = generateCode();
      attempts++;
    }

    if (attempts >= 10) {
      return Response.json(
        {
          success: false,
          error: "Failed to generate unique code. Please try again.",
        },
        { status: 500 },
      );
    }

    // --- EXPIRATION DATE ---
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 30));

    // --- PARTNER ASSIGNMENT ---
    const finalPartnerId = !isAdmin && user.partner_id ? user.partner_id : partner_id;

    // --- CREATE INVITATION ---
    const invitation = await base44.asServiceRole.entities.Invitation.create({
      email,
      code,
      account_type: account_type || "business",
      category: category || "General",
      status: "pending",
      expires_at: expiresAt.toISOString(),
      metadata: {
        partner_id: finalPartnerId || null,
        campaign_id: campaign_id || null,
        max_uses: max_uses || 1,
        use_count: 0,
        created_by: user.id,
        created_by_email: user.email,
        created_at: new Date().toISOString(),
      },
    });

    // --- AUDIT LOG ---
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        actor_email: user.email,
        action: "invitation_created",
        entity_type: "Invitation",
        entity_id: invitation.id,
        changes: {
          code: invitation.code,
          email: invitation.email,
          account_type: invitation.account_type,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log failed", { error: auditErr.message });
    }

    // --- SEND EMAIL (SendGrid) ---
    try {
      const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

      if (SENDGRID_API_KEY) {
        const onboardingUrl = "https://aevoice.ai/Onboarding";

        const emailData = {
          personalizations: [
            {
              to: [{ email }],
              subject: "🎉 Welcome to AEVOICE - Your Invitation Code Inside!",
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
<p>You've been invited to join <strong>AEVOICE</strong> as a <strong>${
                account_type || "business"
              }</strong>.</p>
${customMessage ? `<p style="margin-top:10px; color:#333;">${customMessage}</p>` : ""}

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
`,
            },
          ],
        };

        const sgResponse = await fetch(
          "https://api.sendgrid.com/v3/mail/send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailData),
          },
        );

        if (!sgResponse.ok) {
          console.warn("SendGrid error:", await sgResponse.text());
        }
      } else {
        console.warn("SENDGRID_API_KEY not configured");
      }
    } catch (emailErr) {
      console.warn("Failed to send invitation email", {
        error: emailErr.message,
      });
    }

    // Optionally send a different welcome email template
    if (sendWelcomeEmail && SENDGRID_API_KEY) {
      // no-op placeholder: email already sent above. Could branch templates by sendWelcomeEmail flag
    }

    // --- SUCCESS RESPONSE ---
    return Response.json(
      {
        success: true,
        invitation,
        message: "Invitation created successfully",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("createInvitation failed", {
      request_id: requestId,
      error: err.message,
    });

    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
});
