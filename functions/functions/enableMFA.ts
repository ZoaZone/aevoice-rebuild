// functions/enableMFA.ts
// Enable multi-factor authentication for admin accounts
// Generates TOTP secret and QR code for authenticator apps

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

    // Only admins can enable MFA
    if (user.role !== "admin") {
      logger.error("Non-admin attempted to enable MFA", {
        request_id: requestId,
        user_id: user.id,
        user_email: user.email,
        role: user.role,
      });
      return Response.json(
        { error: "Admin access required to enable MFA" },
        { status: 403 },
      );
    }

    const { action } = await req.json();

    if (action === "setup") {
      // Generate new TOTP secret
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "AEVOICE AI",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret,
      });

      // Generate QR code URI
      const qrCodeUri = totp.toString();

      // Store secret in encrypted_secrets table
      const secretBase32 = secret.base32;

      // Encrypt secret before storage
      const encryptionKey = Deno.env.get("SECRET_ENCRYPTION_KEY");
      if (!encryptionKey) {
        throw new Error("SECRET_ENCRYPTION_KEY not configured");
      }

      await base44.asServiceRole.entities.EncryptedSecret.create({
        owner_type: "user",
        owner_id: user.id,
        key_name: "mfa_secret",
        encrypted_value: secretBase32, // Base44 will encrypt this
        created_date: new Date().toISOString(),
      });

      logger.info("MFA setup initiated", {
        request_id: requestId,
        user_id: user.id,
        user_email: user.email,
      });

      return Response.json({
        success: true,
        qr_code_uri: qrCodeUri,
        secret: secretBase32,
        message: "Scan QR code with authenticator app",
      });
    } else if (action === "verify") {
      // Verify TOTP code to enable MFA
      const { code } = await req.json();

      if (!code || code.length !== 6) {
        return Response.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      // Get stored secret
      const secrets = await base44.asServiceRole.entities.EncryptedSecret
        .filter({
          owner_type: "user",
          owner_id: user.id,
          key_name: "mfa_secret",
        });

      if (secrets.length === 0) {
        return Response.json(
          { error: "MFA not set up. Call with action=setup first." },
          { status: 400 },
        );
      }

      const secretRecord = secrets[0];
      const secret = new OTPAuth.Secret({
        base32: secretRecord.encrypted_value,
      });
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
        logger.warn("Invalid MFA verification code", {
          request_id: requestId,
          user_id: user.id,
          user_email: user.email,
        });
        return Response.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      // Mark MFA as enabled
      await base44.asServiceRole.entities.EncryptedSecret.update(
        secretRecord.id,
        {
          metadata: {
            mfa_enabled: true,
            enabled_at: new Date().toISOString(),
          },
        },
      );

      logger.info("MFA enabled successfully", {
        request_id: requestId,
        user_id: user.id,
        user_email: user.email,
      });

      return Response.json({
        success: true,
        message: "MFA enabled successfully",
      });
    } else if (action === "disable") {
      // Disable MFA (requires verification code)
      const { code } = await req.json();

      if (!code || code.length !== 6) {
        return Response.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      // Get stored secret
      const secrets = await base44.asServiceRole.entities.EncryptedSecret
        .filter({
          owner_type: "user",
          owner_id: user.id,
          key_name: "mfa_secret",
        });

      if (secrets.length === 0) {
        return Response.json(
          { error: "MFA not enabled" },
          { status: 400 },
        );
      }

      const secretRecord = secrets[0];
      const secret = new OTPAuth.Secret({
        base32: secretRecord.encrypted_value,
      });
      const totp = new OTPAuth.TOTP({
        issuer: "AEVOICE AI",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret,
      });

      // Verify code before disabling
      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        logger.warn("Invalid MFA code for disable", {
          request_id: requestId,
          user_id: user.id,
          user_email: user.email,
        });
        return Response.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      // Delete MFA secret
      await base44.asServiceRole.entities.EncryptedSecret.delete(
        secretRecord.id,
      );

      logger.info("MFA disabled", {
        request_id: requestId,
        user_id: user.id,
        user_email: user.email,
      });

      return Response.json({
        success: true,
        message: "MFA disabled successfully",
      });
    } else {
      return Response.json(
        { error: "Invalid action. Use: setup, verify, or disable" },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error("MFA operation failed", {
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
