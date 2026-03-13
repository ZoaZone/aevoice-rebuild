import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Sree onboarding request received", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "noop";

    if (action === "createTenant") {
      const { name, slug, email } = body;
      if (!name || !slug) {
        return Response.json({ error: "name and slug required" }, {
          status: 400,
        });
      }
      const client = await base44.asServiceRole.entities.Client.create({
        name,
        slug,
        contact_email: email || null,
        status: "active",
      });
      return Response.json({ success: true, client });
    }

    if (action === "saveSettings") {
      const {
        tenantId,
        enableSreeWeb = true,
        enableSreeDemo = true,
        enableSreeKiosk = false,
        enableSreeDesktop = false,
      } = body;
      if (!tenantId) {
        return Response.json({ error: "tenantId required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.SreeSettings.filter({
        tenantId,
      });
      if (existing[0]) {
        const updated = await base44.asServiceRole.entities.SreeSettings.update(
          existing[0].id,
          { enableSreeWeb, enableSreeDemo, enableSreeKiosk, enableSreeDesktop },
        );
        return Response.json({ success: true, settings: updated });
      }
      const created = await base44.asServiceRole.entities.SreeSettings.create({
        tenantId,
        enableSreeWeb,
        enableSreeDemo,
        enableSreeKiosk,
        enableSreeDesktop,
      });
      return Response.json({ success: true, settings: created });
    }

    if (action === "autoScan") {
      const { tenantId, url } = body;
      if (!tenantId || !url) {
        return Response.json({ error: "tenantId and url required" }, {
          status: 400,
        });
      }
      const res = await base44.asServiceRole.functions.invoke(
        "sreeAutoScanService",
        { action: "scanWebsite", tenantId, url },
      );
      return Response.json({ success: true, details: res.data });
    }

    return Response.json({ ok: true });
  } catch (e) {
    logger.error("Sree onboarding failed", {
      request_id: requestId,
      error: e.message,
    });
    return Response.json({ error: e.message }, { status: 500 });
  }
});
