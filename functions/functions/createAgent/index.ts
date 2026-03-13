import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const clientId = body.client_id ?? body.clientId;
    const userClientId = user?.data?.client_id || null;
    const name = body.name;
    const systemPrompt = body.system_prompt ?? body.systemPrompt;

    const description = body.description || "";
    const agentType = body.agent_type || body.agentType || "general";
    const greetingMessage = body.greeting_message || body.greetingMessage ||
      `Hello! This is ${name}. How may I help you today?`;
    const voiceProvider = body.voice_provider || body.voiceProvider || "openai";
    const voiceId = body.voice_id || body.voiceId || "nova";
    const voiceSettings = body.voice_settings || body.voiceSettings ||
      { speed: 1, pitch: 1, stability: 0.75, similarity_boost: 0.75 };
    const language = body.language || "en-US";
    const supportedLanguages = body.supported_languages || body.supportedLanguages || [language];
    const autoLanguageDetection = typeof body.auto_language_detection === "boolean"
      ? body.auto_language_detection
      : (body.autoLanguageDetection ?? true);
    const languagePromptEnabled = body.language_prompt_enabled || body.languagePromptEnabled || false;
    const personality = body.personality ||
      { formality: 50, friendliness: 70, verbosity: 50, empathy: 60 };
    const llmConfig = body.llm_config || body.llmConfig ||
      { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 500, timeout_ms: 2000, fallback_enabled: true };
    const toolsConfig = body.tools_config || body.toolsConfig || [];
    let knowledgeBaseIds = body.knowledge_base_ids || body.knowledgeBaseIds || [];
    const transferConfig = body.transfer_config || body.transferConfig || {};
    const guardrails = body.guardrails ||
      { restricted_topics: [], escalation_keywords: [], pii_handling: "redact" };
    const learningEnabled = typeof body.learning_enabled === "boolean" ? body.learning_enabled : true;
    const learningSources = body.learning_sources || ["website", "conversations", "documents"];
    const websiteUrl = body.website_url || "";
    const autoUpdateWebsite = typeof body.auto_update_website === "boolean" ? body.auto_update_website : true;
    const updateFrequency = body.update_frequency || "weekly";
    const conversationLearning = typeof body.conversation_learning === "boolean" ? body.conversation_learning : true;
    const knowledgeConfidenceThreshold = typeof body.knowledge_confidence_threshold === "number"
      ? body.knowledge_confidence_threshold : 0.8;
    const maxCallDurationSec = body.max_call_duration_sec || 900;
    const status = body.status || "active";
    const metadata = body.metadata || {};
    const channels = body.channels || { voice: false, sms: false, web_chat: true, whatsapp: false, email: false, facebook_dm: false, instagram_dm: false };
    const assignPhoneNumberId = body.assignPhoneNumberId || body.assign_phone_number_id || null;

    if (!name || !systemPrompt) {
      return Response.json({
        success: false,
        error: "Missing required fields: name, system_prompt",
      }, { status: 400 });
    }

    // --- Generate human-readable display_id: "agent1vetnpet", "agent2vetnpet" ---
    function generateDisplayId(agentName) {
      return agentName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
    }

    async function getNextAgentDisplayId(clientId, baseName) {
      const base = baseName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 16);
      let n = 1;
      while (n < 200) {
        const candidate = `agent${n}${base}`;
        const check = await base44.asServiceRole.entities.Agent.filter({ client_id: clientId, display_id: candidate });
        if (!check?.length) return candidate;
        n++;
      }
      return `agent${Date.now()}${base}`;
    }

    // NOTE: We no longer auto-attach KBs. The user must explicitly select
    // which knowledge bases to link during agent creation (Step 5).
    // This prevents stale or unrelated KBs from being attached automatically.

    // Load KBs only when provided
    let kbs = [];
    let missingKbIds = [];
    if (Array.isArray(knowledgeBaseIds) && knowledgeBaseIds.length > 0) {
      const kbRows = await Promise.all(
        knowledgeBaseIds.map((kbId) =>
          base44.asServiceRole.entities.KnowledgeBase.filter({ id: kbId })
        ),
      );
      kbs = kbRows.map((r) => r?.[0]).filter(Boolean);
      missingKbIds = knowledgeBaseIds.filter((id) => !kbs.some((k) => k?.id === id));
      if (!kbs.length && knowledgeBaseIds.length > 0) {
        knowledgeBaseIds = [];
      }
    }

    // Determine effective client
    let effectiveClientId = clientId || null;
    if (!effectiveClientId && kbs.length > 0) {
      const byClient = kbs.reduce((acc, kb) => {
        const cid = kb?.client_id;
        if (!cid) return acc;
        acc[cid] = acc[cid] || [];
        acc[cid].push(kb);
        return acc;
      }, {});
      effectiveClientId = Object.keys(byClient)[0] || null;
    }
    if (!effectiveClientId) {
      effectiveClientId = userClientId;
    }
    if (!effectiveClientId) {
      return Response.json({
        success: false,
        error: "Could not determine client. Please select a Client or ensure your user is linked to a client in Profile.",
      }, { status: 400 });
    }

    // Verify client exists
    const clientRows = await base44.asServiceRole.entities.Client.filter({ id: effectiveClientId });
    const client = clientRows?.[0];
    if (!client) {
      return Response.json(
        { success: false, error: "Client not found", code: "CLIENT_NOT_FOUND" },
        { status: 404 },
      );
    }
    const isOwner = client.contact_email === user.email;
    const isAdmin = user.role === "admin";
    const ownsKb = kbs.some((k) => k?.created_by === user.email);
    const isClientCreator = client.created_by === user.email;
    if (!isOwner && !isAdmin && !ownsKb && !isClientCreator) {
      return Response.json({
        success: false,
        error: "Unauthorized: You do not have access to the selected client/knowledge base",
        code: "UNAUTHORIZED_CLIENT_ACCESS",
      }, { status: 403 });
    }

    // Check for duplicate name
    const existing = await base44.asServiceRole.entities.Agent.filter({
      client_id: effectiveClientId,
      name,
    });
    if (existing?.length) {
      return Response.json({
        success: false,
        error_code: "DUPLICATE_AGENT",
        error: `Agent name "${name}" already exists for this client.`,
        details: { existing_agent_id: existing[0].id },
      }, { status: 409 });
    }

    // Generate human-readable display_id: agent1vetnpet, agent2vetnpet, etc.
    const clientSlug = client.slug || generateDisplayId(client.name || name);
    const displayId = await getNextAgentDisplayId(effectiveClientId, clientSlug);

    // Create agent
    const agent = await base44.asServiceRole.entities.Agent.create({
      client_id: effectiveClientId,
      display_id: displayId,
      name,
      description,
      agent_type: agentType,
      system_prompt: systemPrompt,
      greeting_message: greetingMessage,
      voice_provider: voiceProvider,
      voice_id: voiceId,
      voice_settings: voiceSettings,
      language,
      supported_languages: supportedLanguages,
      auto_language_detection: autoLanguageDetection,
      language_prompt_enabled: languagePromptEnabled,
      personality,
      llm_config: llmConfig,
      tools_config: toolsConfig,
      knowledge_base_ids: knowledgeBaseIds,
      transfer_config: transferConfig,
      guardrails,
      learning_enabled: learningEnabled,
      learning_sources: learningSources,
      website_url: websiteUrl,
      auto_update_website: autoUpdateWebsite,
      update_frequency: updateFrequency,
      conversation_learning: conversationLearning,
      knowledge_confidence_threshold: knowledgeConfidenceThreshold,
      max_call_duration_sec: maxCallDurationSec,
      status,
      channels,
      metadata: {
        ...(metadata || {}),
      },
      version: body.version || 1,
      channel_config: body.channel_config || {},
      schema_version: "3.0",
    });

    // Webhook token
    const webhookToken = crypto.randomUUID().replace(/-/g, "");
    await base44.asServiceRole.entities.Agent.update(agent.id, { webhook_token: webhookToken });

    // Optional phone assignment
    let phoneNumber = null;
    if (assignPhoneNumberId) {
      await base44.asServiceRole.entities.PhoneNumber.update(assignPhoneNumberId, {
        agent_id: agent.id,
        webhook_token: webhookToken,
      });
      const rows = await base44.asServiceRole.entities.PhoneNumber.filter({
        id: assignPhoneNumberId,
      });
      phoneNumber = rows?.[0] || null;
    }

    return Response.json({ success: true, agent, phoneNumber, webhookToken, display_id: displayId });
  } catch (error) {
    return Response.json({
      success: false,
      error_code: "INTERNAL_ERROR",
      error: (error instanceof Error ? error.message : String(error)),
      details: {},
    }, { status: 500 });
  }
});