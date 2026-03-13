import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * DEPRECATED — Thin redirect to inviteFreePartner.
 * Kept for backward compatibility with existing automation calls.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const installationId = body.installation_id;

    if (!installationId) {
      return Response.json({ error: "Missing installation_id" }, { status: 400 });
    }

    // Look up the installation to get partner details
    const installations = await base44.asServiceRole.entities.InstallationService.filter({ id: installationId });
    const inst = installations[0];
    if (!inst) return Response.json({ error: "Installation not found" }, { status: 404 });

    // Delegate to the consolidated inviteFreePartner
    const result = await base44.asServiceRole.functions.invoke("inviteFreePartner", {
      email: inst.customer_email,
      name: inst.business_name,
      business_name: inst.business_name,
      industry: inst.industry,
      website: inst.website,
    });

    // Update installation record
    const data = result.data || result;
    if (data.success) {
      await base44.asServiceRole.entities.InstallationService.update(installationId, {
        status: "completed",
        completed_agent_id: data.agent_id,
        completion_date: new Date().toISOString(),
      });
    }

    return Response.json(data);
  } catch (error) {
    console.error("[triggerFreePartnerAutomation] redirect error:", error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});