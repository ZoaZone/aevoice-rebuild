/**
 * HMAC Signature Verification Utility
 *
 * Verifies incoming webhook requests using HMAC-SHA256 signatures
 * to ensure requests are authentic and not tampered with.
 *
 * Usage:
 *   const isValid = await verifyHmacRequest(req, 'FLOWSYNC_TRIGGER_SECRET', 'X-Flowsync');
 *   if (!isValid) return Response.json({ error: 'Unauthorized' }, { status: 401 });
 */

import { createHmac } from "node:crypto";
import { logger } from "../lib/infra/logger.js";

/**
 * Verify HMAC signature on incoming request
 *
 * @param req - The incoming request
 * @param secretEnvName - Name of environment variable containing the shared secret
 * @param headerPrefix - Prefix for signature/timestamp headers (e.g., 'X-Flowsync', 'X-Hellobiz')
 * @returns true if signature is valid and timestamp is fresh, false otherwise
 */
export async function verifyHmacRequest(
  req: Request,
  secretEnvName: string,
  headerPrefix: string,
): Promise<boolean> {
  try {
    // Get secret from environment
    const secret = Deno.env.get(secretEnvName);
    if (!secret) {
      logger.error("HMAC verification failed: secret not configured", {
        secret_env_name: secretEnvName,
      });
      return false;
    }

    // Get headers
    const signatureHeader = `${headerPrefix}-Signature`;
    const timestampHeader = `${headerPrefix}-Timestamp`;

    const receivedSignature = req.headers.get(signatureHeader);
    const timestamp = req.headers.get(timestampHeader);

    if (!receivedSignature || !timestamp) {
      logger.warn("HMAC verification failed: missing headers", {
        has_signature: !!receivedSignature,
        has_timestamp: !!timestamp,
      });
      return false;
    }

    // Verify timestamp freshness (±5 minutes = 300 seconds)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 300) {
      logger.warn("HMAC verification failed: timestamp too old", {
        time_diff_seconds: timeDiff,
        request_timestamp: requestTime,
        current_timestamp: now,
      });
      return false;
    }

    // Clone request and read body as text
    const clonedReq = req.clone();
    const body = await clonedReq.text();

    // Compute HMAC-SHA256 signature
    // Format: HMAC-SHA256(secret, timestamp + body)
    const message = `${timestamp}${body}`;
    const computedSignature = createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    // Compare signatures (constant-time comparison would be better in production)
    const isValid = computedSignature === receivedSignature;

    if (!isValid) {
      logger.warn("HMAC verification failed: signature mismatch", {
        received_signature: receivedSignature.substring(0, 10) + "...",
        computed_signature: computedSignature.substring(0, 10) + "...",
      });
    }

    return isValid;
  } catch (error) {
    logger.error("HMAC verification error", {
      error: error.message,
      secret_env_name: secretEnvName,
    });
    return false;
  }
}

/**
 * Generate HMAC signature for outgoing requests
 *
 * @param body - Request body (string or object)
 * @param secret - Shared secret
 * @param timestamp - Unix timestamp (optional, defaults to current time)
 * @returns Object with signature and timestamp
 */
export function generateHmacSignature(
  body: string | Record<string, any>,
  secret: string,
  timestamp?: number,
): { signature: string; timestamp: number } {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);

  const message = `${ts}${bodyStr}`;
  const signature = createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return { signature, timestamp: ts };
}
