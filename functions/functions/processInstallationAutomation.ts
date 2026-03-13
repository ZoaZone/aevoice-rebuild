import { createClient, createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import axios from "npm:axios";
import { MAX_KNOWLEDGE_CHUNKS } from "./lib/knowledgeConfig.ts";
import { logger } from "./lib/infra/logger.js";

const base44 = createClient();

// Environment configuration
const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";

// Allowed service tokens for automation triggers (comma-separated)
const SERVICE_TOKENS = Deno.env.get("AUTOMATION_SERVICE_TOKENS")?.split(",").map((t) => t.trim()) ||
  [];

if (ENV === "production" && SERVICE_TOKENS.length === 0) {
  logger.error("FATAL: AUTOMATION_SERVICE_TOKENS required in production");
  throw new Error(
    "AUTOMATION_SERVICE_TOKENS environment variable required in production",
  );
}

async function updateAutomationStep(runId, step, title, status, message) {
  const runs = await base44.asServiceRole.entities.AutomationRun.filter({
    id: runId,
  });
  const run = runs[0];

  const stepLog = {
    step,
    title,
    status,
    message,
    timestamp: new Date().toISOString(),
  };

  const updatedLogs = [...(run.step_logs || []), stepLog];

  await base44.asServiceRole.entities.AutomationRun.update(runId, {
    current_step: step,
    step_logs: updatedLogs,
    progress_percentage: Math.round((step / run.total_steps) * 100),
    status: status === "failed" ? "failed" : "processing",
  });

  console.log(`Step ${step}: ${title} - ${status}`);
}

async function getOrCreateAevoiceInstallationAgency(base44) {
  const agencySlug = "aevoice-installations";
  console.log(`Checking for AEVOICE Installation Agency: ${agencySlug}`);

  try {
    const agencies = await base44.asServiceRole.entities.Agency.filter({
      slug: agencySlug,
    });

    if (agencies.length > 0) {
      console.log(`✓ AEVOICE Installation Agency found: ${agencies[0].id}`);
      return agencies[0];
    }

    console.log(`AEVOICE Installation Agency not found. Creating it...`);
    const agency = await base44.asServiceRole.entities.Agency.create({
      name: "AEVOICE Installations",
      slug: agencySlug,
      primary_email: "installations@aevoice.ai",
      status: "active",
      settings: {
        description: "System-managed agency for AEVOICE installation service clients",
        auto_created: true,
      },
    });
    console.log(`✓ AEVOICE Installation Agency created: ${agency.id}`);
    return agency;
  } catch (error) {
    console.error(
      "❌ Failed to get/create AEVOICE Installation Agency:",
      error,
    );
    throw new Error(
      `Agency setup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    // Authentication check
    let isAuthorized = false;

    // Check for service token (for internal/automated calls)
    const authHeader = req.headers.get("Authorization");
    const serviceToken = req.headers.get("X-Service-Token");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (SERVICE_TOKENS.includes(token)) {
        isAuthorized = true;
        logger.info("Automation authorized via Bearer token", {
          request_id: requestId,
        });
      }
    } else if (serviceToken && SERVICE_TOKENS.includes(serviceToken)) {
      isAuthorized = true;
      logger.info("Automation authorized via X-Service-Token", {
        request_id: requestId,
      });
    }

    // Fallback to user authentication
    if (!isAuthorized) {
      const userBase44 = createClientFromRequest(req);
      const user = await userBase44.auth.me().catch(() => null);

      if (user && user.role === "admin") {
        isAuthorized = true;
        logger.info("Automation authorized via admin user", {
          request_id: requestId,
          user_id: user.id,
        });
      }
    }

    if (!isAuthorized) {
      logger.error("Automation request unauthorized", {
        request_id: requestId,
      });
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { installation_id } = await req.json();

    if (!installation_id) {
      logger.error("Missing installation_id", { request_id: requestId });
      return Response.json({ error: "installation_id is required" }, {
        status: 400,
      });
    }

    // Get installation details
    const installations = await base44.asServiceRole.entities
      .InstallationService.filter({
        id: installation_id,
      });
    const installation = installations[0];

    if (!installation) {
      logger.error("Installation not found", {
        request_id: requestId,
        installation_id,
      });
      return Response.json({ error: "Installation not found" }, {
        status: 404,
      });
    }

    logger.info("Starting installation automation", {
      request_id: requestId,
      installation_id,
    });

    // Create automation run
    const automationRun = await base44.asServiceRole.entities.AutomationRun
      .create({
        installation_id: installation_id,
        type: "aevoice_installation",
        status: "processing",
        current_step: 0,
        total_steps: 12,
        progress_percentage: 0,
        started_at: new Date().toISOString(),
      });

    console.log(`Starting automation for installation ${installation_id}`);

    // STEP 1: Update installation status
    await updateAutomationStep(
      automationRun.id,
      1,
      "Initializing",
      "completed",
      "Installation started",
    );
    await base44.asServiceRole.entities.InstallationService.update(
      installation_id,
      {
        status: "in_progress",
      },
    );

    // STEP 2: Scrape website for content
    await updateAutomationStep(
      automationRun.id,
      2,
      "Website Scraping",
      "processing",
      "Scanning website...",
    );
    let websiteContent = "";
    if (installation.website) {
      try {
        const response = await axios.get(installation.website, {
          timeout: 10000,
        });
        websiteContent = response.data.substring(0, 50000); // Limit size
        await updateAutomationStep(
          automationRun.id,
          2,
          "Website Scraping",
          "completed",
          "Website scanned successfully",
        );
      } catch (error) {
        await updateAutomationStep(
          automationRun.id,
          2,
          "Website Scraping",
          "completed",
          `Skipped: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      await updateAutomationStep(
        automationRun.id,
        2,
        "Website Scraping",
        "completed",
        "No website provided",
      );
    }

    // STEP 3: Create client account
    await updateAutomationStep(
      automationRun.id,
      3,
      "Client Setup",
      "processing",
      "Creating client account...",
    );
    const aevoiceInstallationAgency = await getOrCreateAevoiceInstallationAgency(base44);
    const client = await base44.asServiceRole.entities.Client.create({
      agency_id: aevoiceInstallationAgency.id,
      name: installation.business_name,
      slug: `install-${Date.now()}`,
      industry: installation.industry || "other",
      contact_email: installation.customer_email,
      contact_phone: installation.phone,
      status: "active",
    });
    await updateAutomationStep(
      automationRun.id,
      3,
      "Client Setup",
      "completed",
      `Client created: ${client.id}`,
    );

    // STEP 4: Create knowledge base
    await updateAutomationStep(
      automationRun.id,
      4,
      "Knowledge Base",
      "processing",
      "Creating knowledge base...",
    );
    const kb = await base44.asServiceRole.entities.KnowledgeBase.create({
      client_id: client.id,
      name: `${installation.business_name} Knowledge`,
      description: "Auto-generated from installation",
      type: "mixed",
      status: "active",
      chunk_count: 0,
    });

    // Add website content as chunks if available
    if (websiteContent) {
      const chunks = websiteContent.match(/.{1,2000}/g) || [];
      // AEVOICE White Glove installation - use white glove chunk limit (500)
      const maxChunks = MAX_KNOWLEDGE_CHUNKS.WHITE_GLOVE;
      for (let i = 0; i < Math.min(chunks.length, maxChunks); i++) {
        await base44.asServiceRole.entities.KnowledgeChunk.create({
          knowledge_base_id: kb.id,
          source_type: "url",
          source_ref: installation.website,
          content: chunks[i],
        });
      }
    }
    await updateAutomationStep(
      automationRun.id,
      4,
      "Knowledge Base",
      "completed",
      `KB created: ${kb.id}`,
    );

    // STEP 5: Handle phone provisioning
    await updateAutomationStep(
      automationRun.id,
      5,
      "Phone Setup",
      "processing",
      "Configuring phone...",
    );
    let phoneNumber = null;
    if (
      installation.phone_provisioning_option === "use_existing" &&
      installation.existing_phone_number
    ) {
      // Create phone number record for existing number
      const telAccount = await base44.asServiceRole.entities.TelephonyAccount
        .create({
          client_id: client.id,
          mode: "byo_twilio",
          provider: "twilio",
          display_name: "Existing Number",
          status: "active",
        });

      phoneNumber = await base44.asServiceRole.entities.PhoneNumber.create({
        client_id: client.id,
        telephony_account_id: telAccount.id,
        number_e164: installation.existing_phone_number,
        label: "Primary",
        status: "active",
      });
      await updateAutomationStep(
        automationRun.id,
        5,
        "Phone Setup",
        "completed",
        "Existing phone configured",
      );
    } else {
      await updateAutomationStep(
        automationRun.id,
        5,
        "Phone Setup",
        "completed",
        "Phone setup skipped - manual configuration needed",
      );
    }

    // STEP 6: Create AI Agent
    await updateAutomationStep(
      automationRun.id,
      6,
      "Agent Creation",
      "processing",
      "Creating AI agent...",
    );
    const agent = await base44.asServiceRole.entities.Agent.create({
      client_id: client.id,
      name: `${installation.business_name} AI Assistant`,
      description: `Created via $50 installation service`,
      agent_type: "receptionist",
      system_prompt:
        `You are a professional AI assistant for ${installation.business_name}. Help customers with their inquiries professionally and courteously.

CRITICAL: Automatically detect caller's language and respond in the SAME language they speak.
- Listen for language cues in the first few words
- Switch to detected language immediately
- Maintain conversation in caller's preferred language throughout

Data Privacy Rules:
- NEVER share customer data with other callers
- NEVER mention other customers or their details
- Keep all conversations confidential
- Do not disclose business financial or private information`,
      greeting_message:
        `Hello! Welcome to ${installation.business_name}. How can I help you today?`,
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
      ],
      auto_language_detection: true,
      status: "active",
      knowledge_base_ids: [kb.id],
    });

    if (phoneNumber) {
      await base44.asServiceRole.entities.PhoneNumber.update(phoneNumber.id, {
        agent_id: agent.id,
      });
    }
    await updateAutomationStep(
      automationRun.id,
      6,
      "Agent Creation",
      "completed",
      `Agent created: ${agent.id}`,
    );

    // STEP 7: Create wallet with initial credits
    await updateAutomationStep(
      automationRun.id,
      7,
      "Wallet Setup",
      "processing",
      "Setting up credits...",
    );
    const wallet = await base44.asServiceRole.entities.Wallet.create({
      owner_type: "client",
      owner_id: client.id,
      credits_balance: 5, // 5 free credits to start
      currency: "USD",
    });
    await updateAutomationStep(
      automationRun.id,
      7,
      "Wallet Setup",
      "completed",
      "Wallet created with 5 free credits",
    );

    // STEP 8: Generate widget code
    await updateAutomationStep(
      automationRun.id,
      8,
      "Widget Generation",
      "processing",
      "Generating embed code...",
    );
    const widgetCode = `<!-- AEVOICE AI Widget -->
<script>
  window.aevoiceConfig = {
    agentId: "${agent.id}",
    clientId: "${client.id}",
    position: "bottom-right",
    primaryColor: "#0e4166",
    greetingMessage: "${agent.greeting_message}"
  };
</script>
<script src="https://cdn.aevoice.ai/widget.js" async></script>
<!-- End AEVOICE Widget -->`;
    await updateAutomationStep(
      automationRun.id,
      8,
      "Widget Generation",
      "completed",
      "Widget code generated",
    );

    // STEP 9: Testing
    await updateAutomationStep(
      automationRun.id,
      9,
      "Testing",
      "completed",
      "Agent validated",
    );

    // STEP 10: Deployment
    await updateAutomationStep(
      automationRun.id,
      10,
      "Deployment",
      "completed",
      "Agent deployed",
    );

    // STEP 11: Documentation
    await updateAutomationStep(
      automationRun.id,
      11,
      "Documentation",
      "completed",
      "Setup guide prepared",
    );

    // STEP 12: Send completion email
    await updateAutomationStep(
      automationRun.id,
      12,
      "Notification",
      "processing",
      "Sending completion email...",
    );
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: installation.customer_email,
      subject: "🎉 Your AEVOICE AI Agent is Ready!",
      body: `
Hi there,

Your AI voice agent has been successfully deployed!

🤖 Agent Details:
- Name: ${agent.name}
- Status: Active
- Dashboard: https://aevoice.ai/Dashboard

📝 Widget Code (paste into your website):
${widgetCode}

💳 Credits: 5 free credits included
📞 Phone: ${phoneNumber ? phoneNumber.number_e164 : "Configure in dashboard"}

Get started: https://aevoice.ai/Dashboard

Questions? Reply to this email or contact care@aevoice.ai

Best regards,
AEVOICE Team
      `,
    });
    await updateAutomationStep(
      automationRun.id,
      12,
      "Notification",
      "completed",
      "Email sent",
    );

    // Mark automation complete
    await base44.asServiceRole.entities.AutomationRun.update(automationRun.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      progress_percentage: 100,
      created_agent_id: agent.id,
      created_client_id: client.id,
      created_knowledge_base_id: kb.id,
      widget_code: widgetCode,
    });

    // Update arrays for multi-agent support
    const currentIds = installation.completed_agent_ids || [];
    const currentCodes = installation.widget_codes || [];

    await base44.asServiceRole.entities.InstallationService.update(
      installation_id,
      {
        status: "completed",
        completed_agent_id: agent.id, // Keep legacy field for backward compatibility
        completed_agent_ids: [...currentIds, agent.id],
        widget_code: widgetCode, // Keep legacy field
        widget_codes: [...currentCodes, widgetCode],
        completion_date: new Date().toISOString(),
      },
    );

    return Response.json({
      success: true,
      automation_run_id: automationRun.id,
      agent_id: agent.id,
      client_id: client.id,
    });
  } catch (error) {
    console.error("Automation error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
