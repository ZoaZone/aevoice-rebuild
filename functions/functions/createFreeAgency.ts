import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Create free agency request started", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { agency_name, primary_email, slug } = await req.json();

    if (!agency_name || !primary_email) {
      return Response.json({ error: "Agency name and email required" }, {
        status: 400,
      });
    }

    // Create agency
    const agency = await base44.asServiceRole.entities.Agency.create({
      name: agency_name,
      slug: slug || agency_name.toLowerCase().replace(/\s+/g, "-"),
      primary_email,
      status: "active",
      settings: {
        free_lifetime_access: true,
        created_by_admin: true,
        no_stripe_required: true,
      },
    });

    // Create wallet for agency
    await base44.asServiceRole.entities.Wallet.create({
      owner_type: "agency",
      owner_id: agency.id,
      credits_balance: 0,
      currency: "USD",
    });

    return Response.json({
      success: true,
      agency,
      portal_url: `/AgencyPortal?agency=${agency.slug}`,
    });
  } catch (error) {
    logger.error("Create free agency failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      success: false,
    }, { status: 500 });
  }
});
