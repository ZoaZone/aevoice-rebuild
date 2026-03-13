import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import twilio from "npm:twilio@4.23.0";
import { logger } from "./lib/infra/logger.js";
import { SENDGRID_MAIL_URL } from "./lib/envConfig.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);

    // Require authentication to prevent OTP spam
    const user = await base44.auth.me();
    if (!user) {
      logger.error("Unauthorized OTP request", { request_id: requestId });
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, phone, type } = await req.json();

    logger.info("OTP request", {
      request_id: requestId,
      email,
      phone: phone ? "***" : null,
      type,
    });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Save OTP to database
    const otpRecord = await base44.asServiceRole.entities.OTPVerification
      .create({
        email: email || null,
        phone: phone || null,
        otp_code: otpCode,
        verification_type: type,
        status: "pending",
        expires_at: expiresAt,
        attempts: 0,
      });

    // Send OTP via email
    if (type === "email" || type === "both") {
      // SECURITY: Mask email to prevent PII exposure in logs (GDPR compliance)
      console.log(`[sendOTP] Sending OTP email`, {
        request_id: requestId,
        email: maskEmail(email),
        type,
      });

      const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

      if (!SENDGRID_API_KEY) {
        console.error("SENDGRID_API_KEY not found in environment");
        return Response.json({ error: "Email service not configured" }, {
          status: 500,
        });
      }

      // TYPE SAFETY FIX #11: Type emailData as SendGridEmailPayload
      const emailData: SendGridEmailPayload = {
        personalizations: [{
          to: [{ email: email }],
          subject: "AEVOICE Email Verification",
        }],
        from: {
          email: "care@aevoice.ai",
          name: "AEVOICE",
        },
        content: [{
          type: "text/html",
          value: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #0e4166;">Email Verification</h2>
    <p>Your verification code is:</p>
    
    <div style="background: #f0f9ff; border: 2px solid #0e4166; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
      <h1 style="color: #0e4166; margin: 0; font-size: 36px; letter-spacing: 8px;">${otpCode}</h1>
    </div>

    <p>This code will expire in 10 minutes.</p>
    <p style="color: #999; font-size: 14px;">If you didn't request this code, please ignore this email.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
    <p style="font-size: 11px; color: #999; text-align: center;">
      <a href="mailto:care@aevoice.ai?subject=Unsubscribe" style="color: #999;">Unsubscribe</a> | 
      <a href="https://aevoice.ai" style="color: #999;">AEVOICE</a>
    </p>
    </div>
    </body>
    </html>
          `,
        }],
      };

      const sgResponse = await fetch(SENDGRID_MAIL_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!sgResponse.ok) {
        const errorText = await sgResponse.text();
        // SECURITY: Mask email in error logs to prevent PII exposure
        console.error(`[sendOTP] Failed to send OTP email`, {
          request_id: requestId,
          email: maskEmail(email),
          error: errorText,
        });
        return Response.json({
          error: "Failed to send OTP email",
          details: errorText,
        }, { status: 500 });
      }

      // SECURITY: Mask email in success logs to prevent PII exposure
      console.log(`[sendOTP] OTP email sent successfully`, {
        request_id: requestId,
        email: maskEmail(email),
      });
    }

    // Send OTP via SMS if phone is provided
    if (type === "sms" || type === "both") {
      if (phone) {
        const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (accountSid && authToken && twilioNumber) {
          const client = twilio(accountSid, authToken);
          await client.messages.create({
            body: `Your AEVOICE verification code is: ${otpCode}`,
            from: twilioNumber,
            to: phone,
          });
          console.log(`OTP SMS sent successfully to ${phone}`);
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
