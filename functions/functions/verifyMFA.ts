// functions/verifyMFA.ts
// Verify MFA code during admin login
// Called after successful password authentication

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import * as OTPAuth from "npm:otpauth@9.2.2";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS preflight
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

    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return Response.json(
        { error: "Invalid verification code format" },
        { status: 400 },
      );
    }

    // Get stored MFA secret
    const secrets = await base44.asServiceRole.entities.EncryptedSecret.filter({
      owner_type: "user",
      owner_id: user.id,
      key_name: "mfa_secret",
    });

    if (secrets.length === 0) {
      return Response.json(
        { error: "MFA not enabled for this user" },
        { status: 400 },
      );
    }

    const secretRecord = secrets[0];

    // Check if MFA is enabled
    if (!secretRecord.metadata?.mfa_enabled) {
      return Response.json(
        { error: "MFA not fully enabled. Complete setup first." },
        { status: 400 },
      );
    }

    // Verify TOTP code
    const secret = new OTPAuth.Secret({ base32: secretRecord.encrypted_value });
    const totp = new OTPAuth.TOTP({
      issuer: "AEVOICE AI",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    // Verify code (allow ±1 period for clock skew)
    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      logger.warn("MFA verification failed", {
        request_id: requestId,
        user_id: user.id,
        user_email: user.email,
        ip: req.headers.get("x-forwarded-for") ||
          req.headers.get("cf-connecting-ip"),
      });

      return Response.json(
        {
          success: false,
          error: "Invalid verification code",
        },
        { status: 401 },
      );
    }

    // Log successful verification
    logger.info("MFA verification successful", {
      request_id: requestId,
      user_id: user.id,
      user_email: user.email,
      ip: req.headers.get("x-forwarded-for") ||
        req.headers.get("cf-connecting-ip"),
    });

    return Response.json({
      success: true,
      message: "MFA verified successfully",
      user_id: user.id,
      user_email: user.email,
      role: user.role,
    });
  } catch (error) {
    logger.error("MFA verification error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error) || "Internal server error",
      },
      { status: 500 },
    );
  }
});
