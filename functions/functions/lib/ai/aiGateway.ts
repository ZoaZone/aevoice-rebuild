// lib/ai/aiGateway.js

import OpenAI from "npm:openai@4.28.0";
import { logger } from "../infra/logger.js";
import { getSecretById } from "../../secretStoreHelper.ts";

// ---------------------------------------------
// Provider Client
// ---------------------------------------------
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// ---------------------------------------------
// Model Registry
// ---------------------------------------------
const MODEL_CONFIGS = {
  "gpt-4o-mini": {
    provider: "openai",
    maxTokens: 4096,
    costPer1k: { prompt: 0.00015, completion: 0.0006 },
  },
  "gpt-4o": {
    provider: "openai",
    maxTokens: 4096,
    costPer1k: { prompt: 0.005, completion: 0.015 },
  },
  "gpt-4-turbo": {
    provider: "openai",
    maxTokens: 4096,
    costPer1k: { prompt: 0.01, completion: 0.03 },
  },
};

// ---------------------------------------------
// Cost Calculator
// ---------------------------------------------
function calculateCost(promptTokens, completionTokens, costPer1k) {
  return (
    (promptTokens / 1000) * costPer1k.prompt +
    (completionTokens / 1000) * costPer1k.completion
  );
}

// ---------------------------------------------
// Main AI Gateway with BYOLLM support
// ---------------------------------------------
export async function callAI({
  messages,
  model = "gpt-4o-mini",
  temperature = 0.7,
  maxTokens = 150,
  clientId,
  agentId,
  stream = false,
  metadata = {},
  base44 = null,
}) {
  const requestId = metadata.request_id || crypto.randomUUID();
  const startTime = Date.now();

  const config = MODEL_CONFIGS[model] || MODEL_CONFIGS["gpt-4o-mini"];

  // Check for BYOLLM (Bring Your Own LLM) usage
  let byollmApplied = false;
  let customClient = null;

  if (base44 && clientId) {
    try {
      // Check if client belongs to an agency with BYOLLM enabled
      const clientResult = await base44.asServiceRole.db.query(
        `SELECT agency_id FROM clients WHERE id = $1`,
        [clientId],
      );

      if (clientResult.rows.length > 0 && clientResult.rows[0].agency_id) {
        const agencyId = clientResult.rows[0].agency_id;

        const agencyResult = await base44.asServiceRole.db.query(
          `SELECT byollm_enabled, llm_provider, llm_api_keys_ref, tier 
           FROM agencies WHERE id = $1`,
          [agencyId],
        );

        if (agencyResult.rows.length > 0) {
          const agency = agencyResult.rows[0];

          // BYOLLM is available for growth and elite tiers
          if (
            agency.byollm_enabled &&
            agency.llm_api_keys_ref &&
            ["growth", "elite"].includes(agency.tier)
          ) {
            // Fetch and decrypt the agency's API key
            const apiKey = await getSecretById(base44, agency.llm_api_keys_ref);

            if (apiKey) {
              customClient = new OpenAI({ apiKey });
              byollmApplied = true;

              logger.info("Using BYOLLM key for request", {
                request_id: requestId,
                agency_id: agencyId,
                provider: agency.llm_provider,
              });
            }
          }
        }
      }
    } catch (error) {
      logger.warn("BYOLLM lookup failed, using platform key", {
        request_id: requestId,
        error: error.message,
      });
      // Fall back to platform key
    }
  }

  logger.info("AI request started", {
    request_id: requestId,
    model,
    provider: config.provider,
    client_id: clientId,
    agent_id: agentId,
    stream,
    byollm_applied: byollmApplied,
  });

  try {
    return await callOpenAI({
      messages,
      model,
      temperature,
      maxTokens,
      stream,
      requestId,
      clientId,
      agentId,
      metadata: { ...metadata, byollm_applied: byollmApplied },
      config,
      startTime,
      base44,
      byollmApplied,
    });
  } catch (err) {
    logger.error("AI request failed (integrated)", {
      request_id: requestId,
      error: err.message,
      byollm_applied: byollmApplied,
    });

    // Fallback: return minimal failure response
    return {
      content: "",
      usage: { prompt_tokens: 0, completion_tokens: 0 },
      cost: 0,
      byollm_applied: byollmApplied,
    };
  }
}

// ---------------------------------------------
// OpenAI Implementation
// ---------------------------------------------
async function callOpenAI({
  messages,
  model,
  temperature,
  maxTokens,
  stream,
  requestId,
  clientId,
  agentId,
  metadata,
  config,
  startTime,
  base44,
  byollmApplied = false,
}) {
  if (!stream) {
    // Non-streaming mode via Base44 integrated LLM
    const sys = messages.find((m) => m.role === "system")?.content || "";
    const rest = messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const prompt = `${sys ? sys + "\n\n" : ""}${rest}\n\nAssistant:`;

    const resp = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });

    const content = typeof resp === "string" ? resp : (resp?.content || "");
    const usage = { prompt_tokens: 0, completion_tokens: 0 };
    const cost = 0;

    logger.info("AI request completed (non-stream, integrated)", {
      request_id: requestId,
      latency_ms: Date.now() - startTime,
      byollm_applied: byollmApplied,
    });

    return {
      content,
      usage,
      cost,
      byollm_applied: byollmApplied,
    };
  }

  // STREAMING MODE (simulate streaming with integrated LLM single-shot)
  const sys = messages.find((m) => m.role === "system")?.content || "";
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const prompt = `${sys ? sys + "\n\n" : ""}${rest}\n\nAssistant:`;

  const resp = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });
  const full = typeof resp === "string" ? resp : (resp?.content || "");

  async function* streamGenerator() {
    // naive chunking by sentences
    const parts = full.split(/(?<=[.!?])\s+/);
    let emitted = "";
    for (const p of parts) {
      if (p) {
        emitted += p + " ";
        yield p + " ";
      }
    }
    yield {
      usage: { prompt_tokens: 0, completion_tokens: 0 },
      cost: 0,
      byollm_applied: byollmApplied,
    };
  }

  return streamGenerator();
}
