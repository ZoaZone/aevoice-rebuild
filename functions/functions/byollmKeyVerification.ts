/**
 * byollmKeyVerification.ts
 *
 * Verify BYOLLM (Bring Your Own LLM) API keys and enable BYOLLM for agencies.
 * Only agencies with tier 'growth' or 'elite' can enable BYOLLM.
 *
 * @module byollmKeyVerification
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import OpenAI from "npm:openai@4.28.0";
import { logger } from "./lib/infra/logger.js";
import { storeSecret } from "./secretStoreHelper.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);

    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agency_id, api_key, provider = "openai" } = body;

    logger.info("BYOLLM key verification request", {
      request_id: requestId,
      agency_id,
      provider,
      user_email: user.email,
    });

    // Validate inputs
    if (!agency_id || !api_key) {
      return Response.json(
        { error: "Missing agency_id or api_key" },
        { status: 400 },
      );
    }

    // Fetch agency details
    const agencyResult = await base44.asServiceRole.db.query(
      `SELECT id, tier FROM agencies WHERE id = $1`,
      [agency_id],
    );

    if (agencyResult.rows.length === 0) {
      return Response.json(
        { error: "Agency not found" },
        { status: 404 },
      );
    }

    const agency = agencyResult.rows[0];

    // Check if agency tier allows BYOLLM
    if (!["growth", "elite"].includes(agency.tier)) {
      return Response.json(
        {
          error: "BYOLLM is only available for Growth and Elite tier agencies",
          current_tier: agency.tier,
          required_tiers: ["growth", "elite"],
        },
        { status: 403 },
      );
    }

    // Verify API key with provider
    let verified = false;
    let verificationError = null;

    if (provider === "openai") {
      try {
        const openai = new OpenAI({ apiKey: api_key });

        // Test API key with a minimal request
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 5,
        });

        if (response && response.choices && response.choices.length > 0) {
          verified = true;
          logger.info("OpenAI API key verified", {
            request_id: requestId,
            agency_id,
          });
        }
      } catch (error) {
        verificationError = error instanceof Error ? error.message : String(error);
        logger.warn("OpenAI API key verification failed", {
          request_id: requestId,
          agency_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      return Response.json(
        { error: `Provider '${provider}' is not supported yet` },
        { status: 400 },
      );
    }

    if (!verified) {
      return Response.json(
        {
          error: "API key verification failed",
          details: verificationError || "Invalid API key",
        },
        { status: 400 },
      );
    }

    // Store encrypted API key
    const secretId = await storeSecret(
      base44,
      "agency",
      agency_id,
      `${provider}_api_key`,
      api_key,
    );

    // Update agency with BYOLLM settings
    await base44.asServiceRole.db.query(
      `UPDATE agencies 
       SET byollm_enabled = true,
           llm_provider = $1,
           llm_api_keys_ref = $2,
           llm_cost_tracking = true,
           byollm_verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [provider, secretId, agency_id],
    );

    logger.info("BYOLLM enabled for agency", {
      request_id: requestId,
      agency_id,
      provider,
      secret_id: secretId,
    });

    return Response.json({
      success: true,
      message: "BYOLLM enabled successfully",
      agency_id,
      provider,
      byollm_enabled: true,
      verified_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("BYOLLM verification failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
});
