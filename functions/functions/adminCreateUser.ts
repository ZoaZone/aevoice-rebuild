// functions/adminCreateUser.js
// Admin function to create a fully-configured user with client, agent, and phone number
// Bypasses invitation flow for quick admin setup

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  logger.info("Admin create user request received", {
    request_id: requestId,
  });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // Verify admin access
  let user;
  try {
    user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      logger.warn("Non-admin user attempted admin operation", {
        request_id: requestId,
        user_email: user?.email,
      });
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const {
    email,
    full_name,
    business_name,
    account_type = "business",
    category = "General",
    credits = 50,
    // Agent config
    create_agent = true,
    agent_name,
    agent_type = "receptionist",
    system_prompt,
    greeting_message,
    // Phone config
    phone_number,
    sip_config,
  } = body;

  if (!email || !business_name) {
    return Response.json({
      error: "Email and business_name are required",
    }, { status: 400 });
  }

  const userEmail = email.toLowerCase();

  try {
    logger.info("Starting user creation", {
      request_id: requestId,
      email: userEmail,
      business_name,
      account_type,
    });

    // 1. Check if client already exists - if so, we'll update/enhance it
    let existingClient = null;
    try {
      const existingClients = await base44.asServiceRole.entities.Client.filter(
        {
          contact_email: userEmail,
        },
      );
      if (existingClients && existingClients.length > 0) {
        existingClient = existingClients[0];
        logger.info("Found existing client", {
          request_id: requestId,
          client_id: existingClient.id,
        });
      }
    } catch (e) {
      logger.info("No existing client found", {
        request_id: requestId,
      });
    }

    // 2. Create or update Client
    let client;

    if (existingClient) {
      // Update existing client
      client = await base44.asServiceRole.entities.Client.update(
        existingClient.id,
        {
          name: business_name,
          contact_name: full_name || business_name,
          account_type,
          category,
          onboarding_status: "completed",
          industry: category.toLowerCase() || "other",
          status: "active",
          settings: {
            ...existingClient.settings,
            updated_by_admin: true,
            admin_email: user.email,
            updated_at: new Date().toISOString(),
          },
        },
      );
      client = { ...existingClient, ...client, id: existingClient.id };
      logger.info("Client updated", {
        request_id: requestId,
        client_id: client.id,
      });
    } else {
      // Create new client
      const slug = business_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + `-${Date.now().toString().slice(-5)}`;

      client = await base44.asServiceRole.entities.Client.create({
        name: business_name,
        slug,
        contact_email: userEmail,
        contact_name: full_name || business_name,
        account_type,
        category,
        onboarding_status: "completed",
        industry: category.toLowerCase() || "other",
        status: "active",
        created_by: userEmail, // Use target user's email so they can access it
        settings: {
          created_by_admin: true,
          admin_email: user.email,
          created_at: new Date().toISOString(),
        },
      });
      logger.info("Client created", {
        request_id: requestId,
        client_id: client.id,
      });
    }

    // 3. Create or update Wallet with credits
    let existingWallets = [];
    try {
      existingWallets = await base44.asServiceRole.entities.Wallet.filter({
        owner_id: client.id,
      });
    } catch (e) {}

    if (existingWallets.length > 0) {
      await base44.asServiceRole.entities.Wallet.update(existingWallets[0].id, {
        credits_balance: (existingWallets[0].credits_balance || 0) + credits,
      });
      logger.info("Wallet updated", {
        request_id: requestId,
        wallet_id: existingWallets[0].id,
        credits_added: credits,
      });
    } else {
      await base44.asServiceRole.entities.Wallet.create({
        owner_type: "client",
        owner_id: client.id,
        credits_balance: credits,
        currency: "USD",
        low_balance_threshold: 10,
        auto_recharge: { enabled: false },
        created_by: user.email,
      });
      logger.info("Wallet created", {
        request_id: requestId,
        credits,
      });
    }

    // 4. Create Knowledge Base if doesn't exist
    let kb;
    let existingKBs = [];
    try {
      existingKBs = await base44.asServiceRole.entities.KnowledgeBase.filter({
        client_id: client.id,
      });
    } catch (e) {}

    if (existingKBs.length > 0) {
      kb = existingKBs[0];
      logger.info("Using existing Knowledge Base", {
        request_id: requestId,
        kb_id: kb.id,
      });
    } else {
      kb = await base44.asServiceRole.entities.KnowledgeBase.create({
        client_id: client.id,
        name: `${business_name} Knowledge Base`,
        description: `Knowledge base for ${business_name}`,
        type: "mixed",
        status: "active",
        shared_with_sree: true,
        chunk_count: 0,
        total_words: 0,
        created_by: user.email,
      });
      logger.info("Knowledge Base created", {
        request_id: requestId,
        kb_id: kb.id,
      });
    }

    // 5. Create Agent if requested
    let agent = null;
    if (create_agent) {
      const defaultSystemPrompt = system_prompt ||
        `You are the AI voice assistant for ${business_name}.

CRITICAL RULES:
1. Keep responses SHORT - 1-2 sentences maximum (this is a phone call!)
2. Be professional, friendly, and helpful
3. If you don't know something, say so honestly
4. Listen carefully and answer what the caller actually asked

Your role: Help callers with inquiries about ${business_name}.`;

      const defaultGreeting = greeting_message ||
        `Hello! Thank you for calling ${business_name}. How can I help you today?`;

      agent = await base44.asServiceRole.entities.Agent.create({
        client_id: client.id,
        name: agent_name || `${business_name} Assistant`,
        description: `AI voice assistant for ${business_name}`,
        agent_type,
        system_prompt: defaultSystemPrompt,
        greeting_message: defaultGreeting,
        voice_provider: "elevenlabs",
        voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
        language: "en-US",
        status: "active",
        knowledge_base_ids: [kb.id],
        llm_config: {
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 150,
          timeout_ms: 2000,
        },
        guardrails: {
          restricted_topics: ["legal advice", "medical diagnosis"],
          escalation_keywords: ["manager", "supervisor", "human", "complaint"],
        },
        created_by: user.email,
      });

      logger.info("Agent created", {
        request_id: requestId,
        agent_id: agent.id,
      });
    }

    // 6. Create Telephony Account and Phone Number if SIP config provided
    let telephonyAccount = null;
    let phoneNumberRecord = null;

    if (sip_config && phone_number) {
      // Create telephony account
      telephonyAccount = await base44.asServiceRole.entities.TelephonyAccount
        .create({
          client_id: client.id,
          mode: "custom_sip",
          provider: sip_config.provider || "bsnl_wings",
          display_name: sip_config.display_name || `${business_name} SIP`,
          config: {
            sip_host: sip_config.sip_host,
            sip_port: sip_config.sip_port || 5060,
            sip_username: sip_config.sip_username,
            sip_password: sip_config.sip_password,
            sip_transport: sip_config.sip_transport || "udp",
            sip_outbound_proxy: sip_config.sip_outbound_proxy,
          },
          status: "active",
          created_by: user.email,
        });

      logger.info("Telephony Account created", {
        request_id: requestId,
        telephony_account_id: telephonyAccount.id,
      });

      // Create phone number record
      phoneNumberRecord = await base44.asServiceRole.entities.PhoneNumber
        .create({
          client_id: client.id,
          telephony_account_id: telephonyAccount.id,
          agent_id: agent?.id,
          number_e164: phone_number.startsWith("+") ? phone_number : `+${phone_number}`,
          sip_address: sip_config.sip_address ||
            `sip:${sip_config.sip_username}@${sip_config.sip_host}`,
          label: sip_config.label || "Main Line",
          capabilities: ["voice"],
          status: "active",
          webhook_token: crypto.randomUUID().replace(/-/g, "").substring(0, 16),
          created_by: user.email,
        });

      logger.info("Phone Number created", {
        request_id: requestId,
        phone_number_id: phoneNumberRecord.id,
      });
    }

    // 7. Create Usage Counter
    await base44.asServiceRole.entities.UsageCounter.create({
      client_id: client.id,
      total_minutes_allocated: credits,
      minutes_used: 0,
      created_by: user.email,
    });

    logger.info("User account created successfully", {
      request_id: requestId,
      email,
      client_id: client.id,
      agent_id: agent?.id,
    });

    return Response.json({
      success: true,
      message: `User account created successfully for ${email}`,
      data: {
        client_id: client.id,
        client_slug: client.slug,
        agent_id: agent?.id,
        kb_id: kb.id,
        telephony_account_id: telephonyAccount?.id,
        phone_number_id: phoneNumberRecord?.id,
        credits_allocated: credits,
      },
      instructions: `
User can now login at https://aevoice.ai with email: ${email}
If they don't have a Base44 account, they will need to sign up first.
Once logged in, they will be automatically connected to their business account.
`,
    });
  } catch (err) {
    logger.error("Admin create user failed", {
      request_id: requestId,
      error: err.message,
      stack: err.stack,
    });
    return Response.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
});
