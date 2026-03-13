import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

async function getOrCreateFreePartnersAgency(base44) {
  const agencySlug = "free-partners";
  console.log(`Checking for Free Partners Agency: ${agencySlug}`);

  try {
    const agencies = await base44.asServiceRole.entities.Agency.filter({
      slug: agencySlug,
    });

    if (agencies.length > 0) {
      console.log(`✓ Free Partners Agency found: ${agencies[0].id}`);
      return agencies[0];
    }

    console.log(`Free Partners Agency not found. Creating it...`);
    const agency = await base44.asServiceRole.entities.Agency.create({
      name: "AEVOICE Free Partners",
      slug: agencySlug,
      primary_email: "partners@aevoice.ai",
      status: "active",
      settings: {
        description: "System-managed agency for free partner program clients",
        auto_created: true,
      },
    });
    console.log(`✓ Free Partners Agency created: ${agency.id}`);
    return agency;
  } catch (error) {
    console.error("❌ Failed to get/create Free Partners Agency:", error);
    throw new Error(
      `Agency setup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function createPartnerClient(partner, base44) {
  console.log(`[1/6] Creating/fetching client for partner: ${partner.name}`);

  try {
    const freePartnersAgency = await getOrCreateFreePartnersAgency(base44);

    const existing = await base44.asServiceRole.entities.Client.filter({
      contact_email: partner.email,
    });

    if (existing.length > 0) {
      console.log(`✓ Client already exists: ${existing[0].id}`);
      return existing[0];
    }

    const client = await base44.asServiceRole.entities.Client.create({
      agency_id: freePartnersAgency.id,
      name: partner.business_name,
      slug: partner.partner_id,
      industry: partner.industry,
      contact_email: partner.email,
      status: "active",
      contact_name: partner.name,
    });

    console.log(`✓ Client created: ${client.id}`);
    return client;
  } catch (error) {
    console.error("❌ Failed to create client:", error);
    throw new Error(
      `Client creation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function createKnowledgeBase(client, partner, base44) {
  console.log(`[2/6] Creating knowledge base for: ${partner.name}`);

  try {
    // Create knowledge base with basic info - SKIP website scraping
    const kb = await base44.asServiceRole.entities.KnowledgeBase.create({
      client_id: client.id,
      name: `${partner.name} - Knowledge Base`,
      description: `Free partner knowledge base for ${partner.business_name}`,
      type: "mixed",
      status: "active",
      chunk_count: 0,
      shared_with_sri: true,
    });

    console.log(`✓ Knowledge base created: ${kb.id}`);

    // Add basic company info as a knowledge chunk
    try {
      await base44.asServiceRole.entities.KnowledgeChunk.create({
        knowledge_base_id: kb.id,
        source_type: "manual",
        source_ref: "partner_info",
        title: `About ${partner.business_name}`,
        content:
          `Company: ${partner.business_name}\nWebsite: ${partner.website}\nIndustry: ${partner.industry}\nContact: ${partner.email}`,
      });
      console.log(`✓ Basic knowledge chunk added`);
    } catch (chunkError) {
      console.warn(
        "⚠️ Could not add knowledge chunk (non-critical):",
        chunkError.message,
      );
    }

    return kb;
  } catch (error) {
    console.error("❌ Failed to create knowledge base:", error);
    throw new Error(
      `Knowledge base creation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function createPartnerAgent(client, partner, kb, base44) {
  console.log(`[3/6] Creating AI agent for: ${partner.name}`);

  try {
    const agentData = {
      client_id: client.id,
      name: `${partner.name} Assistant`,
      description: `AI chatbot for ${partner.name} - FREE Partner`,
      agent_type: "support",
      system_prompt: `You are a professional AI assistant for ${partner.business_name}. 

    Your role is to help website visitors with their inquiries about ${partner.business_name}.

    Be friendly, professional, and helpful. If you don't know specific information, offer to connect the visitor with the team.

    Business Details:
    - Company: ${partner.business_name}
    - Website: ${partner.website}
    - Industry: ${partner.industry}

    CRITICAL SECURITY & LANGUAGE RULES:
    1. AUTO-DETECT visitor's language from their first message
    2. RESPOND in the SAME language they write/speak
    3. NEVER share data between different website visitors
    4. Keep all conversations CONFIDENTIAL
    5. Do not disclose business private information`,
      greeting_message:
        `Hello! Welcome to ${partner.name}. I'm your AI assistant. How can I help you today?`,
      voice_provider: "openai",
      voice_id: "nova",
      language: "en-US",
      supported_languages: [
        "en-US",
        "es-ES",
        "fr-FR",
        "de-DE",
        "pt-BR",
        "hi-IN",
        "te-IN",
        "ta-IN",
        "kn-IN",
        "ml-IN",
        "mr-IN",
        "bn-IN",
      ],
      auto_language_detection: true,
      knowledge_base_ids: [kb.id],
      status: "active",
      metadata: {
        partner_type: "free_partner",
        partner_id: partner.partner_id,
        partner_name: partner.name,
        created_via: "free_partner_program",
      },
    };

    console.log(
      "Creating agent with data:",
      JSON.stringify(agentData, null, 2),
    );

    const agent = await base44.asServiceRole.entities.Agent.create(agentData);

    console.log(`✓ Agent created successfully: ${agent.id}`);
    console.log(`✓ Agent name: ${agent.name}`);
    console.log(`✓ Agent metadata:`, agent.metadata);

    return agent;
  } catch (error) {
    console.error("❌ Failed to create agent:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("Error stack:", error instanceof Error ? error.stack : "");
    throw new Error(
      `Agent creation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function createSubscriptionForClient(client, base44) {
  console.log(
    `[4/6] Creating subscription for client: ${client.name || client.id}`,
  );
  const plans = await base44.asServiceRole.entities.Plan.filter({
    slug: "free-partner",
  });
  const plan = plans[0];
  if (!plan) {
    throw new Error("Free partner plan (slug='free-partner') not found");
  }
  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setFullYear(now.getFullYear() + 1);
  const sub = await base44.asServiceRole.entities.Subscription.create({
    client_id: client.id,
    plan_id: plan.id,
    status: "active",
    billing_cycle: "monthly",
    current_period_start: now.toISOString(),
    current_period_end: nextYear.toISOString(),
  });
  console.log(`✓ Subscription created: ${sub.id}`);
  return sub;
}

async function createWalletForClient(client, base44) {
  // SECURITY: Import masking utility
  const { maskId, maskName } = await import("./lib/security/piiMasking.ts");

  // SECURITY: Mask client name to prevent business info exposure
  console.log(`[5/6] Creating wallet with unlimited credits`, {
    client_name: maskName(client.name),
    client_id: maskId(client.id),
  });
  const wallet = await base44.asServiceRole.entities.Wallet.create({
    owner_type: "client",
    owner_id: client.id,
    credits_balance: 999999,
    currency: "USD",
  });
  // SECURITY: Only log wallet ID, not client details
  console.log(`✓ Wallet created`, {
    wallet_id: maskId(wallet.id),
    balance: wallet.credits_balance,
  });
  return wallet;
}

function generatePartnerWidgetCode(client, agent, partner) {
  console.log(`[6/6] Generating widget code for: ${partner.name}`);

  const config = {
    position: "bottom-right",
    primaryColor: "#0e4166",
    secondaryColor: "#06b6d4",
    buttonColor: "#0e4166",
    greetingMessage: agent.greeting_message,
    showAfterSeconds: 5,
    enableVoice: false,
    enableChat: true,
    buttonText: "Chat with us",
    proactiveGreeting: true,
    partnerId: partner.partner_id,
    partnerName: partner.name,
  };

  const widgetCode = `<!-- AEVOICE Free Partner Widget - ${partner.name} -->
<script>
  window.aevoiceConfig = ${JSON.stringify(config, null, 2)};
  window.aevoicePartner = "${partner.partner_id}";
</script>
<script src="https://cdn.aevoice.ai/partner-widget.js?agent=${agent.id}&client=${client.id}&partner=${partner.partner_id}" async></script>
<!-- End AEVOICE Free Partner Widget -->`;

  console.log(`✓ Widget code generated`);
  return widgetCode;
}

Deno.serve(async (req) => {
  console.log("========================================");
  console.log("🚀 FREE PARTNER AGENT CREATION STARTED");
  console.log("========================================");

  try {
    const base44 = createClientFromRequest(req);

    // Validate auth
    console.log("Validating authentication...");
    await base44.auth.me();
    console.log("✓ Authentication validated");

    const { partner_id } = await req.json();
    console.log(`Partner ID requested: ${partner_id}`);

    // Query the FreePartner entity from database
    console.log("Fetching partner from database...");
    const partners = await base44.asServiceRole.entities.FreePartner.filter({
      partner_id: partner_id,
    });
    const partner = partners[0];

    if (!partner) {
      console.error(`❌ Partner not found: ${partner_id}`);
      return Response.json({
        success: false,
        error: "Partner not found in database",
        partner_id: partner_id,
      }, { status: 404 });
    }

    console.log(`✓ Partner found: ${partner.name}`);

    if (!partner.is_active) {
      console.error(`❌ Partner is inactive: ${partner_id}`);
      return Response.json({
        success: false,
        error: "Partner is not active",
        partner_id: partner_id,
      }, { status: 400 });
    }

    console.log("✓ Partner is active");

    // Step 1: Create or get client
    const client = await createPartnerClient(partner, base44);

    // Step 2: Create knowledge base (simplified, no website scraping)
    const kb = await createKnowledgeBase(client, partner, base44);

    // Step 3: Create AI agent with metadata
    const agent = await createPartnerAgent(client, partner, kb, base44);

    // Step 4: Create Subscription (free-partner plan)
    const subscription = await createSubscriptionForClient(client, base44);

    // Step 5: Create Wallet (unlimited credits)
    const wallet = await createWalletForClient(client, base44);

    // Step 6: Generate widget code
    const widgetCode = generatePartnerWidgetCode(client, agent, partner);

    // Final success log
    console.log("========================================");
    console.log(`✅ SUCCESS: Agent created for ${partner.name}`);
    console.log(`   Client ID: ${client.id}`);
    console.log(`   Agent ID: ${agent.id}`);
    console.log(`   KB ID: ${kb.id}`);
    console.log(`   Partner Type: free_partner`);
    console.log("========================================");

    return Response.json({
      success: true,
      partner: partner.name,
      partner_id: partner.partner_id,
      client_id: client.id,
      agent_id: agent.id,
      agent_name: agent.name,
      knowledge_base_id: kb.id,
      subscription_id: subscription.id,
      wallet_id: wallet.id,
      widget_code: widgetCode,
      metadata: agent.metadata,
      message: `✅ FREE partner agent created successfully for ${partner.name}!`,
      details: {
        client_created: client.id,
        kb_created: kb.id,
        agent_created: agent.id,
        subscription_created: subscription.id,
        wallet_created: wallet.id,
        partner_type: "free_partner",
      },
    });
  } catch (error) {
    console.error("========================================");
    console.error("❌ FATAL ERROR in createFreePartnerAgent");
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("Error stack:", error instanceof Error ? error.stack : "");
    console.error("========================================");

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});
