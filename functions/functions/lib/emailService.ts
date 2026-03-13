import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import sgMail from "npm:@sendgrid/mail@7.7.0";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// ZoaZone Services email engine configuration
const ZOAZONE_SERVICES_API_URL = Deno.env.get("ZOAZONE_SERVICES_API_URL") ||
  "https://zoazoneservices.com/api";
const ZOAZONE_SERVICES_API_KEY = Deno.env.get("ZOAZONE_SERVICES_API_KEY");

export async function splitRecipientsByUser(base44, recipients) {
  const internal = [];
  const external = [];

  // Service-role check for each recipient (user listing is restricted otherwise)
  for (const email of recipients) {
    try {
      const rows = await base44.asServiceRole.entities.User.filter({ email });
      if (Array.isArray(rows) && rows.length > 0) internal.push(email);
      else external.push(email);
    } catch (_e) {
      // If check fails, assume external to avoid leaking user directory
      external.push(email);
    }
  }
  return { internal, external };
}

export async function getClientContext(base44, options, authUser) {
  // Prefer explicit client_id if provided; else try from user data
  const clientId = options?.client_id || authUser?.data?.client_id || null;
  return { clientId };
}

export async function hasSufficientCredits(base44, clientId) {
  // If we can't resolve a wallet, optimistically return true and try Base44 first
  if (!clientId) return true;
  try {
    const wallets = await base44.entities.Wallet.filter({
      owner_type: "client",
      owner_id: clientId,
    });
    if (!wallets || wallets.length === 0) return true;
    const wallet = wallets[0];
    return (wallet?.credits_balance ?? 0) > 0;
  } catch (_e) {
    return true;
  }
}

export async function sendViaBase44(base44, { to, subject, body, from_name }) {
  const res = await base44.integrations.Core.SendEmail({
    to,
    subject,
    body,
    from_name: from_name || undefined,
  });
  return res;
}

export async function sendViaZoaZoneServices(
  { to, subject, body, from_name, from_email, email_type = "personal" },
) {
  if (!ZOAZONE_SERVICES_API_KEY) {
    throw new Error("ZOAZONE_SERVICES_API_KEY is not configured");
  }

  const response = await fetch(`${ZOAZONE_SERVICES_API_URL}/v1/email/send`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ZOAZONE_SERVICES_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      subject,
      html: body,
      from: {
        email: from_email || "noreply@zoazoneservices.com",
        name: from_name || "ZoaZone Services",
      },
      email_type,
    }),
  });

  if (!response.ok) {
    throw new Error(`ZoaZone Services email error: ${response.status}`);
  }

  return await response.json();
}

export async function sendViaSendGrid(
  { to, subject, body, from_name, from_email },
) {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }
  const msg = {
    to,
    from: {
      email: from_email || "noreply@aevoice.ai",
      name: from_name || "AEVOICE",
    },
    subject,
    html: body,
  };
  const res = await sgMail.send(msg);
  return res;
}

export async function trackUsage(
  base44,
  { client_id, recipient, provider, status = "sent", metadata },
) {
  try {
    await base44.entities.CommunicationUsage.create({
      client_id: client_id || "unknown",
      type: "email",
      direction: "outbound",
      sent_at: new Date().toISOString(),
      recipient,
      unit_cost: 0,
      total_cost: 0,
      status,
      metadata: {
        provider,
        ...metadata,
      },
    });
  } catch (_e) {
    // best-effort
  }
}

export async function sendEmailWithHierarchy(req, options) {
  const base44 = createClientFromRequest(req);
  const authUser = await base44.auth.me();
  if (!authUser) throw new Error("Unauthorized");

  const {
    to,
    subject,
    body,
    from_name,
    from_email,
    marketing = false,
    client_id: explicitClientId,
    metadata = {},
    email_type = "personal", // personal, branded, clarification, loop, notification
  } = options || {};

  if (!to || !subject || !body) {
    throw new Error("Missing required fields: to, subject, body");
  }

  const recipients = Array.isArray(to) ? to : [to];
  const isBulk = recipients.length > 1;

  const { clientId } = await getClientContext(base44, {
    client_id: explicitClientId,
  }, authUser);
  const creditsOk = await hasSufficientCredits(base44, clientId);
  const { internal, external } = await splitRecipientsByUser(
    base44,
    recipients,
  );

  const results = [];

  // Determine email priority based on type and context
  // Priority 1: Base44 credits (internal)
  // Priority 2: ZoaZone Services (personal/branded emails)
  // Priority 3: SendGrid (external marketing fallback)
  const isPersonalOrBranded = [
    "personal",
    "branded",
    "clarification",
    "loop",
    "notification",
  ].includes(email_type);

  // Helper to send + track for a list via provider
  const sendAndTrack = async (provider, list) => {
    for (const email of list) {
      try {
        if (provider === "base44") {
          await sendViaBase44(base44, { to: email, subject, body, from_name });
        } else if (provider === "zoazone") {
          await sendViaZoaZoneServices({
            to: email,
            subject,
            body,
            from_name,
            from_email,
            email_type,
          });
        } else {
          await sendViaSendGrid({
            to: email,
            subject,
            body,
            from_name,
            from_email,
          });
        }
        await trackUsage(base44, {
          client_id: clientId,
          recipient: email,
          provider,
          status: "sent",
          metadata: { marketing, isBulk, email_type, ...metadata },
        });
        results.push({ email, provider, success: true });
      } catch (err) {
        // Priority-based fallback chain
        let fallbackProvider = null;

        if (
          provider === "base44" &&
          (marketing || !creditsOk ||
            /credit|quota|insufficient/i.test(String(err?.message || "")))
        ) {
          // Fallback from Base44: try ZoaZone for personal/branded, else SendGrid
          fallbackProvider = (isPersonalOrBranded && ZOAZONE_SERVICES_API_KEY)
            ? "zoazone"
            : "sendgrid";
        } else if (provider === "zoazone") {
          // Fallback from ZoaZone: try SendGrid
          fallbackProvider = "sendgrid";
        }

        if (fallbackProvider) {
          try {
            if (fallbackProvider === "zoazone") {
              await sendViaZoaZoneServices({
                to: email,
                subject,
                body,
                from_name,
                from_email,
                email_type,
              });
            } else {
              await sendViaSendGrid({
                to: email,
                subject,
                body,
                from_name,
                from_email,
              });
            }
            await trackUsage(base44, {
              client_id: clientId,
              recipient: email,
              provider: fallbackProvider,
              status: "sent",
              metadata: {
                marketing,
                isBulk,
                email_type,
                fallback: true,
                original_provider: provider,
                error: String(err?.message || ""),
                ...metadata,
              },
            });
            results.push({
              email,
              provider: fallbackProvider,
              success: true,
              fallback: true,
            });
          } catch (err2) {
            await trackUsage(base44, {
              client_id: clientId,
              recipient: email,
              provider: fallbackProvider,
              status: "failed",
              metadata: {
                marketing,
                isBulk,
                email_type,
                fallback: true,
                error: String(err2?.message || ""),
              },
            });
            results.push({
              email,
              provider: fallbackProvider,
              success: false,
              error: String(err2?.message || ""),
            });
          }
        } else {
          await trackUsage(base44, {
            client_id: clientId,
            recipient: email,
            provider,
            status: "failed",
            metadata: {
              marketing,
              isBulk,
              email_type,
              error: String(err?.message || ""),
              ...metadata,
            },
          });
          results.push({
            email,
            provider,
            success: false,
            error: String(err?.message || ""),
          });
        }
      }
    }
  };

  // INTERNAL recipients: Priority 1 (Base44 credits)
  if (internal.length) {
    if (creditsOk) {
      await sendAndTrack("base44", internal);
    } else if (isPersonalOrBranded && ZOAZONE_SERVICES_API_KEY) {
      // Priority 2 for internal personal emails without credits
      await sendAndTrack("zoazone", internal);
    } else {
      // Priority 3 fallback
      await sendAndTrack("sendgrid", internal);
    }
  }

  // EXTERNAL recipients: Route based on type
  if (external.length) {
    if (creditsOk && !marketing && !isBulk) {
      // Priority 1: Base44 for single non-marketing external
      await sendAndTrack("base44", external);
    } else if (isPersonalOrBranded && ZOAZONE_SERVICES_API_KEY) {
      // Priority 2: ZoaZone Services for personal/branded emails
      await sendAndTrack("zoazone", external);
    } else {
      // Priority 3: SendGrid for marketing/bulk
      await sendAndTrack("sendgrid", external);
    }
  }

  return { ok: true, results };
}
