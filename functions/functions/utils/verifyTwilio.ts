import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

/**
 * Verify Twilio request signature
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
export async function verifyTwilioSignature(
  req: Request,
  authToken: string,
): Promise<boolean> {
  try {
    const signature = req.headers.get("X-Twilio-Signature");
    if (!signature) {
      return false;
    }

    const url = new URL(req.url).toString();

    // For POST requests, include form data in signature
    let params: Record<string, string> = {};
    if (req.method === "POST") {
      const formData = await req.clone().formData();
      for (const [key, value] of formData.entries()) {
        params[key] = value.toString();
      }
    }

    // Sort parameters and create concatenated string
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    // Compute HMAC-SHA1
    const hmac = createHmac("sha1", authToken);
    hmac.update(data);
    const expectedSignature = hmac.digest("base64");

    // Use timing-safe comparison to prevent timing attacks
    // Both signatures are base64 strings, decode them to buffers for comparison
    const expectedBuffer = Buffer.from(expectedSignature, "base64");
    const receivedBuffer = Buffer.from(signature, "base64");

    // timingSafeEqual requires buffers of equal length
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (_error) {
    // On any verification error, fail closed and report signature as invalid.
    return false;
  }
}
