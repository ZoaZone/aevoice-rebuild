import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import * as jose from "npm:jose@5.2.0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, name, provider_data, source } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      email,
    });

    if (existingUsers.length > 0) {
      // User exists - find or create their client under HelloBiz agency
      const hellobizAgency = await base44.asServiceRole.entities.Agency.filter({
        slug: "hellobiz",
      });

      if (hellobizAgency.length === 0) {
        return Response.json({ error: "HelloBiz agency not found" }, {
          status: 404,
        });
      }

      const existingClient = await base44.asServiceRole.entities.Client.filter({
        contact_email: email,
        agency_id: hellobizAgency[0].id,
      });

      if (existingClient.length > 0) {
        return Response.json({
          success: true,
          existing_user: true,
          user_id: existingUsers[0].id,
          client_id: existingClient[0].id,
          agency_url: `?agency=hellobiz`,
        });
      }

      // Create client for existing user under HelloBiz
      const newClient = await base44.asServiceRole.entities.Client.create({
        agency_id: hellobizAgency[0].id,
        name: name || email.split("@")[0],
        slug: `hellobiz-${Date.now()}`,
        industry: "other",
        contact_email: email,
        contact_name: name,
        status: "active",
        settings: {
          source: source || "hellobiz",
          unified_user_id: provider_data?.unified_user_id || email,
          white_glove: provider_data?.white_glove || false,
        },
      });

      // Create wallet
      await base44.asServiceRole.entities.Wallet.create({
        owner_type: "client",
        owner_id: newClient.id,
        credits_balance: provider_data?.initial_credits || 0,
        currency: "USD",
      });

      return Response.json({
        success: true,
        existing_user: true,
        user_id: existingUsers[0].id,
        client_id: newClient.id,
        agency_url: `?agency=hellobiz`,
      });
    }

    // New user - create everything
    const hellobizAgency = await base44.asServiceRole.entities.Agency.filter({
      slug: "hellobiz",
    });

    if (hellobizAgency.length === 0) {
      return Response.json({ error: "HelloBiz agency not found" }, {
        status: 404,
      });
    }

    // Create client
    const client = await base44.asServiceRole.entities.Client.create({
      agency_id: hellobizAgency[0].id,
      name: name || email.split("@")[0],
      slug: `hellobiz-${Date.now()}`,
      industry: "other",
      contact_email: email,
      contact_name: name,
      status: "active",
      settings: {
        source: source || "hellobiz",
        unified_user_id: provider_data?.unified_user_id || email,
        white_glove: provider_data?.white_glove || false,
      },
    });

    // Create wallet with initial credits if provided
    await base44.asServiceRole.entities.Wallet.create({
      owner_type: "client",
      owner_id: client.id,
      credits_balance: provider_data?.initial_credits || 0,
      currency: "USD",
    });

    return Response.json({
      success: true,
      new_user: true,
      message: "User will be invited to AEVOICE via email",
      client_id: client.id,
      agency_url: `?agency=hellobiz`,
    });
  } catch (error) {
    console.error("SSO Create User Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      details: "Failed to create SSO user",
    }, { status: 500 });
  }
});
