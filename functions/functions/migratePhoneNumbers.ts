import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Migrate phone numbers request started", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, {
        status: 403,
      });
    }

    // Load all phone numbers and telephony accounts
    const phoneNumbers = await base44.asServiceRole.entities.PhoneNumber.list();
    const accounts = await base44.asServiceRole.entities.TelephonyAccount
      .list();

    const accById = new Map(accounts.map((a) => [a.id, a]));

    let updated = 0;
    for (const pn of phoneNumbers) {
      const acc = accById.get(pn.telephony_account_id);
      let provider = pn.provider;

      // Infer provider if missing
      if (!provider) {
        if (pn.sip_address) {
          provider = (acc?.provider === "bsnl_wings") ? "bsnl_wings" : "custom_sip";
        } else {
          provider = "pstn";
        }
      }

      const updates = {};

      if (provider === "pstn") {
        // PSTN: ensure sip_address null and E.164 formatted
        if (pn.sip_address) updates.sip_address = null;
        if (pn.number_e164 && !pn.number_e164.startsWith("+")) {
          const digits = pn.number_e164.replace(/\s|-/g, "");
          if (/^[1-9]\d{7,14}$/.test(digits)) {
            updates.number_e164 = `+${digits}`;
          }
        }
      } else {
        // SIP: ensure number_e164 null and sip prefix present
        if (pn.number_e164) updates.number_e164 = null;
        if (pn.sip_address && !pn.sip_address.startsWith("sip:")) {
          updates.sip_address = `sip:${pn.sip_address}`;
        }
        if (
          !pn.sip_address && acc?.config?.sip_host && acc?.config?.sip_username
        ) {
          const port = acc?.config?.sip_port || "80";
          updates.sip_address = `sip:${acc.config.sip_username}@${acc.config.sip_host}:${port}`;
        }
      }

      if (pn.provider !== provider) updates.provider = provider;

      if (Object.keys(updates).length) {
        await base44.asServiceRole.entities.PhoneNumber.update(pn.id, updates);
        updated += 1;
      }
    }

    return Response.json({
      success: true,
      total: phoneNumbers.length,
      updated,
    });
  } catch (err) {
    logger.error("Migrate phone numbers failed", {
      request_id: requestId,
      error: err.message,
      stack: err.stack,
    });
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
    });
  }
});
