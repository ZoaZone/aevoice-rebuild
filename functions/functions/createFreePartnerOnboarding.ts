import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * DEPRECATED — Thin redirect to inviteFreePartner.
 * Kept for backward compatibility with existing UI calls.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Map the old payload shape to inviteFreePartner's expected shape
    const result = await base44.functions.invoke("inviteFreePartner", {
      email: user.email,
      name: user.full_name || body.business_name,
      business_name: body.business_name,
      industry: body.industry,
      website: body.website,
    });

    return Response.json(result.data || result);
  } catch (error) {
    console.error("[createFreePartnerOnboarding] redirect error:", error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});