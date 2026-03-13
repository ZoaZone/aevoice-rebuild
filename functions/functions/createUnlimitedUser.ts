import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized - Admin only" }, {
        status: 403,
      });
    }

    const { email, full_name, plan_type = "unlimited_free" } = await req.json();

    if (!email || !full_name) {
      return Response.json({ error: "Email and full_name required" }, {
        status: 400,
      });
    }

    // Check if client already exists
    const existingClients = await base44.asServiceRole.entities.Client.filter({
      contact_email: email,
    });

    let client;
    if (existingClients.length > 0) {
      client = existingClients[0];

      // Update to unlimited if not already
      await base44.asServiceRole.entities.Client.update(client.id, {
        settings: {
          ...client.settings,
          unlimited_usage: true,
          plan_type: "unlimited_free",
        },
      });
    } else {
      // Create new agency for this free user
      const agency = await base44.asServiceRole.entities.Agency.create({
        name: `${full_name}'s Agency`,
        slug: `${email.split("@")[0]}-${Date.now()}`,
        primary_email: email,
        status: "active",
      });

      // Create client under this agency
      client = await base44.asServiceRole.entities.Client.create({
        agency_id: agency.id,
        name: full_name,
        slug: email.split("@")[0],
        contact_email: email,
        contact_name: full_name,
        status: "active",
        settings: {
          unlimited_usage: true,
          plan_type: "unlimited_free",
        },
      });

      // Create unlimited wallet
      await base44.asServiceRole.entities.Wallet.create({
        owner_type: "client",
        owner_id: client.id,
        credits_balance: 999999999, // Effectively unlimited
        currency: "USD",
      });
    }

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: "🎉 Your Unlimited AEVOICE Account is Ready!",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0e4166, #00bcd4); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Welcome to AEVOICE!</h1>
          </div>
          <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
            <h2>Hi ${full_name},</h2>
            <p>Your unlimited AEVOICE account has been activated by our admin team!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #10b981;">✨ Your Benefits</h3>
              <ul style="color: #64748b;">
                <li>Unlimited AI voice agents</li>
                <li>Unlimited phone numbers</li>
                <li>Unlimited voice minutes</li>
                <li>No credit limits</li>
                <li>Full platform access</li>
                <li>Priority support</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="https://aevoice.ai/Dashboard" style="display: inline-block; background: linear-gradient(135deg, #0e4166, #00bcd4); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Access Your Dashboard
              </a>
            </p>
            
            <p>Best regards,<br><strong>AEVOICE Team</strong></p>
          </div>
        </div>
      `,
    });

    return Response.json({
      success: true,
      client_id: client.id,
      message: "Unlimited user created successfully",
    });
  } catch (error) {
    console.error("Error creating unlimited user:", error);
    return Response.json({
      error: error instanceof Error
        ? error.message
        : String(error) || "Failed to create unlimited user",
    }, { status: 500 });
  }
});
