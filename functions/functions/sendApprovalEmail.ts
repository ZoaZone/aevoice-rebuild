import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { sendEmailWithHierarchy } from "./lib/emailService.js";
import { AFFILIATE_PORTAL_URL, AGENCY_PORTAL_URL } from "./lib/envConfig.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, agency_name, affiliate_name, type, referral_code } = await req.json();

    let subject = "";
    let body = "";

    if (type === "agency_approved") {
      subject = "✅ Your Agency Registration Has Been Approved!";
      body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #0e4166, #1a5a8a); color: white; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0;">Welcome to AEVOICE!</h1>
    </div>
    
    <div style="padding: 30px; background: #f9fafb;">
      <h2 style="color: #0e4166;">Congratulations, ${agency_name}!</h2>
      <p>Your agency registration has been approved. You can now access your dashboard and start building amazing voice solutions!</p>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Connect your Stripe account to receive 85% of client payments</li>
        <li>Customize your white-label branding</li>
        <li>Add your first client</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${AGENCY_PORTAL_URL}" style="background: #0e4166; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Agency Portal</a>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">
        <a href="mailto:care@aevoice.ai?subject=Unsubscribe" style="color: #999;">Unsubscribe</a> | 
        <a href="https://aevoice.ai" style="color: #999;">AEVOICE</a>
      </p>
      </div>
      </div>
      </body>
      </html>
      `;
    } else if (type === "agency_rejected") {
      subject = "Agency Registration Status Update";
      body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Agency Registration Update</h2>
    <p>Thank you for your interest in becoming an AEVOICE agency partner.</p>
    <p>Unfortunately, we are unable to approve your application at this time.</p>
  </div>
</body>
</html>
      `;
    } else if (type === "affiliate_approved") {
      subject = "🎉 Welcome to the AEVOICE Affiliate Program!";
      body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #0e4166, #1a5a8a); color: white; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0;">You're Now an AEVOICE Affiliate!</h1>
    </div>
    
    <div style="padding: 30px; background: #f9fafb;">
      <h2 style="color: #0e4166;">Welcome, ${affiliate_name}!</h2>
      <p>Your affiliate application has been approved! Start earning commissions by referring clients to AEVOICE.</p>
      
      <div style="background: #f0f9ff; border: 2px solid #0e4166; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; color: #666;">Your Unique Referral Code:</p>
        <h1 style="color: #0e4166; margin: 0; font-size: 28px; letter-spacing: 4px;">${referral_code}</h1>
      </div>
      
      <p><strong>Commission Structure:</strong></p>
      <ul>
        <li>15% recurring commission on all referred subscriptions</li>
        <li>Track your earnings in real-time</li>
        <li>Monthly payouts via Stripe</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${AFFILIATE_PORTAL_URL}" style="background: #0e4166; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Affiliate Dashboard</a>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">
        <a href="mailto:care@aevoice.ai?subject=Unsubscribe" style="color: #999;">Unsubscribe</a> | 
        <a href="https://aevoice.ai" style="color: #999;">AEVOICE</a>
      </p>
      </div>
      </div>
      </body>
      </html>
      `;
    }

    const { ok } = await sendEmailWithHierarchy(req, {
      to: email,
      subject,
      body,
      from_name: "AEVOICE Team",
      from_email: "care@aevoice.ai",
      marketing: false,
      metadata: { type },
    });

    if (ok) {
      return Response.json({ success: true });
    } else {
      return Response.json({
        error: "Failed to send approval email",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to send approval email:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
