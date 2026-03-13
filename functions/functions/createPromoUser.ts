import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse request body
    const { email, full_name, promo_type, metadata } = await req.json();

    if (!email || !full_name || !promo_type) {
      return Response.json(
        { error: "Missing required fields: email, full_name, promo_type" },
        { status: 400 },
      );
    }

    // Verify promo type
    if (promo_type !== "hellobiz" && promo_type !== "promotional") {
      return Response.json(
        { error: "Invalid promo type" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      email,
    });

    if (existingUsers.length > 0) {
      return Response.json(
        { error: "User already exists with this email" },
        { status: 409 },
      );
    }

    // Create client/agency for the user
    const client = await base44.asServiceRole.entities.Client.create({
      agency_id: "promotional",
      name: metadata?.company || full_name + "'s Business",
      slug: `promo-${Date.now()}`,
      industry: "other",
      contact_email: email,
      contact_name: full_name,
      contact_phone: metadata?.phone || "",
      status: "active",
    });

    // Create wallet with zero subscription (promotional plan)
    await base44.asServiceRole.entities.Wallet.create({
      owner_type: "client",
      owner_id: client.id,
      credits_balance: 0,
      currency: "USD",
    });

    // Create subscription record (free lifetime)
    await base44.asServiceRole.entities.Subscription.create({
      client_id: client.id,
      plan_name: `Aeva Micro (${promo_type === "hellobiz" ? "HelloBiz" : "Promotional"})`,
      plan_slug: "aeva-micro-promo",
      status: "active",
      billing_cycle: "monthly",
      price: 0, // FREE subscription
      credits_included: 0, // Pay-as-you-go only
      started_at: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString(), // 1 year (renewable)
      metadata: {
        promo_type,
        subscription_waived: true,
        credit_rate: 0.15,
        max_agents: 3,
        max_phone_numbers: 2,
      },
    });

    // Send welcome email with credentials
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `Welcome to AEVOICE - Your ${
        promo_type === "hellobiz" ? "HelloBiz" : "Promotional"
      } Account is Active!`,
      body: `
        <h2>Welcome to AEVOICE, ${full_name}!</h2>
        <p>Your exclusive promotional account has been activated.</p>
        
        <h3>🎉 Your Benefits:</h3>
        <ul>
          <li><strong>FREE Lifetime Subscription</strong> - $0/month forever</li>
          <li><strong>3 AI Voice Agents</strong></li>
          <li><strong>2 Phone Numbers</strong></li>
          <li><strong>Pay-as-you-go Credits</strong> at $0.15/minute</li>
        </ul>
        
        <h3>Login Details:</h3>
        <p>Email: <strong>${email}</strong></p>
        <p>You can log in at: <a href="https://aevoice.base44.app">https://aevoice.base44.app</a></p>
        <p>Set your password on first login.</p>
        
        <p>Questions? Reply to this email or contact support@aevoice.com</p>
        
        <p>Best regards,<br/>The AEVOICE Team</p>
      `,
    });

    return Response.json({
      success: true,
      message: "Account created successfully",
      client_id: client.id,
      email,
    });
  } catch (error) {
    console.error("Error creating promo user:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error) || "Failed to create account",
      },
      { status: 500 },
    );
  }
});
