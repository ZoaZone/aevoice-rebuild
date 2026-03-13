import twilio from "npm:twilio@4.23.0";

const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

export function verifyTwilioRequest(req, params) {
  const signature = req.headers.get("x-twilio-signature");
  // Construct the URL. Deno deploy behind proxy might need handling, but we try standard way.
  // Using the header 'x-forwarded-proto' and 'host' if available to reconstruct public URL
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host");
  const url = `${proto}://${host}${new URL(req.url).pathname}${new URL(req.url).search}`;

  if (!twilio.validateRequest(twilioAuthToken, signature, url, params)) {
    throw new Error("Invalid Twilio signature");
  }
}
