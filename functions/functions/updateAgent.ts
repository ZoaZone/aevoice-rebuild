import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = body.id || body.agent_id || body.agentId;
    if (!id) return Response.json({ error: "Missing agent id" }, { status: 400 });

    // Load agent and verify tenant
    const agents = await base44.asServiceRole.entities.Agent.filter({ id });
    const agent = agents?.[0];
    if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });

    // If user is not admin, ensure same client
    if (user.role !== "admin" && user?.data?.client_id && agent.client_id !== user.data.client_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Normalize fields (support camelCase and snake_case)
    const normalized = {
      // identity
      name: body.name ?? agent.name,
      description: body.description ?? agent.description ?? "",
      client_id: body.client_id ?? agent.client_id,
      // core
      agent_type: body.agent_type ?? body.agentType ?? agent.agent_type ?? "general",
      system_prompt: body.system_prompt ?? body.systemPrompt ?? agent.system_prompt ?? "",
      greeting_message: body.greeting_message ?? body.greetingMessage ?? agent.greeting_message ??
        "",
      voice_provider: body.voice_provider ?? body.voiceProvider ?? agent.voice_provider ?? "openai",
      voice_id: body.voice_id ?? body.voiceId ?? agent.voice_id ?? "nova",
      voice_settings: body.voice_settings ?? body.voiceSettings ?? agent.voice_settings ??
        { speed: 1, pitch: 1, stability: 0.75, similarity_boost: 0.75 },
      language: body.language ?? agent.language ?? "en-US",
      supported_languages: body.supported_languages ?? body.supportedLanguages ??
        agent.supported_languages ?? [agent.language ?? "en-US"],
      auto_language_detection: (typeof body.auto_language_detection === "boolean"
        ? body.auto_language_detection
        : (typeof body.autoLanguageDetection === "boolean"
          ? body.autoLanguageDetection
          : (agent.auto_language_detection ?? true))),
      language_prompt_enabled: body.language_prompt_enabled ?? body.languagePromptEnabled ??
        agent.language_prompt_enabled ?? false,
      personality: body.personality ?? agent.personality ??
        { formality: 50, friendliness: 70, verbosity: 50, empathy: 60 },
      llm_config: body.llm_config ?? body.llmConfig ?? agent.llm_config ??
        {
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 500,
          timeout_ms: 2000,
          fallback_enabled: true,
        },
      tools_config: body.tools_config ?? body.toolsConfig ?? agent.tools_config ?? [],
      knowledge_base_ids: body.knowledge_base_ids ?? body.knowledgeBaseIds ??
        agent.knowledge_base_ids ?? [],
      transfer_config: body.transfer_config ?? body.transferConfig ?? agent.transfer_config ?? {},
      guardrails: body.guardrails ?? agent.guardrails ??
        { restricted_topics: [], escalation_keywords: [], pii_handling: "redact" },
      learning_enabled: (typeof body.learning_enabled === "boolean"
        ? body.learning_enabled
        : (agent.learning_enabled ?? true)),
      learning_sources: body.learning_sources ?? agent.learning_sources ??
        ["website", "conversations", "documents"],
      website_url: body.website_url ?? agent.website_url ?? "",
      auto_update_website: (typeof body.auto_update_website === "boolean"
        ? body.auto_update_website
        : (agent.auto_update_website ?? true)),
      update_frequency: body.update_frequency ?? agent.update_frequency ?? "weekly",
      conversation_learning: (typeof body.conversation_learning === "boolean"
        ? body.conversation_learning
        : (agent.conversation_learning ?? true)),
      knowledge_confidence_threshold: (typeof body.knowledge_confidence_threshold === "number"
        ? body.knowledge_confidence_threshold
        : (agent.knowledge_confidence_threshold ?? 0.8)),
      max_call_duration_sec: body.max_call_duration_sec ?? agent.max_call_duration_sec ?? 900,
      status: body.status ?? agent.status ?? "draft",
      metadata: body.metadata ?? agent.metadata ?? {},
      version: body.version ?? agent.version ?? 1,
      schema_version: body.schema_version ?? agent.schema_version ?? "1.0",
    };

    // Validate KB IDs if provided
    if (Array.isArray(normalized.knowledge_base_ids) && normalized.knowledge_base_ids.length > 0) {
      const checks = await Promise.all(normalized.knowledge_base_ids.map((kbId) =>
        base44.asServiceRole.entities.KnowledgeBase.filter({ id: kbId, client_id: agent.client_id })
      ));
      const valid = checks.map((r) =>
        r?.[0]?.id
      ).filter(Boolean);
      if (valid.length !== normalized.knowledge_base_ids.length) {
        return Response.json({ error: "Invalid knowledge base ids" }, { status: 400 });
      }
    }

    // Ensure widget metadata consistency
    normalized.metadata = {
      ...(normalized.metadata || {}),
      widget_bot_name:
        (normalized.metadata?.widget_bot_name ?? agent.metadata?.widget_bot_name ?? "Sree"),
      phone_assistant_name:
        (normalized.metadata?.phone_assistant_name ?? agent.metadata?.phone_assistant_name ??
          "Aeva"),
      shared_with_sree:
        (normalized.metadata?.shared_with_sree ?? agent.metadata?.shared_with_sree ?? true),
    };

    // Enforce KB presence when activating
    if (
      normalized.status === "active" &&
      (!Array.isArray(normalized.knowledge_base_ids) || normalized.knowledge_base_ids.length === 0)
    ) {
      return Response.json({
        error: "Agent must have at least one knowledge base when status is active",
      }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Agent.update(id, normalized);
    return Response.json({ success: true, agent: updated });
  } catch (error) {
    return Response.json({ error: (error instanceof Error ? error.message : String(error)) }, {
      status: 500,
    });
  }
});
