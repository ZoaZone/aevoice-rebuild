/**
 * Make Outbound Call Function
 * Intelligently routes outbound calls through best available provider
 *
 * @route POST /functions/telephony/makeOutboundCall
 * @auth Required
 * @body { to, from?, agentId, clientId?, options? }
 * @returns { success: true, call }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { providerManager } from "./telephony/lib/ProviderManager.ts";
import type { CallOptions, ProviderSelectionCriteria, RoutingRule } from "./telephony/lib/types.ts";
import { extractCountryCode } from "./telephony/lib/utils.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Outbound call function started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { to, from, agentId, clientId, options = {} } = body;

    // Validate required fields
    if (!to) {
      return Response.json({ error: "Missing required field: to" }, {
        status: 400,
      });
    }

    if (!agentId) {
      return Response.json({ error: "Missing required field: agentId" }, {
        status: 400,
      });
    }

    logger.info("Initiating outbound call", {
      request_id: requestId,
      to,
      from,
      agent_id: agentId,
    });

    // Verify agent ownership
    const agents = await base44.entities.Agent.filter({ id: agentId });
    if (!agents || agents.length === 0) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent = agents[0];
    const resolvedClientId = clientId || agent.client_id;

    // Get routing rules for tenant/client
    const routingRules = await getRoutingRules(base44, resolvedClientId);

    // Build provider selection criteria
    const criteria: ProviderSelectionCriteria = {
      destination_number: to,
      source_number: from,
      tenant_id: resolvedClientId,
      country_code: extractCountryCode(to),
      required_channels: 1,
      require_recording: options.recordCall || false,
    };

    // Select best provider
    const provider = await providerManager.selectProvider(
      criteria,
      routingRules,
    );

    if (!provider) {
      logger.error("No available providers for call", {
        request_id: requestId,
        to,
      });
      return Response.json(
        { error: "No available providers to handle this call" },
        { status: 503 },
      );
    }

    logger.info("Provider selected for call", {
      request_id: requestId,
      provider_id: provider.id,
      provider_name: provider.name,
    });

    // Build call options
    const callOptions: CallOptions = {
      agent_id: agentId,
      client_id: resolvedClientId,
      record_call: options.recordCall !== false,
      transcribe: options.transcribe || false,
      timeout_seconds: options.timeoutSeconds || 120,
      caller_id: from,
      webhook_url: options.webhookUrl,
      status_callback_url: options.statusCallbackUrl,
    };

    // Attempt call with primary provider
    let call;
    let failoverAttempted = false;

    try {
      call = await provider.makeCall(to, from || "", callOptions);
    } catch (error) {
      logger.warn("Primary provider failed, attempting failover", {
        request_id: requestId,
        provider_id: provider.id,
        error: error.message,
      });

      // Try failover to next available provider
      const healthyProviders = await providerManager.getAllProviders();
      const fallbackProvider = healthyProviders.find(
        (p) => p.id !== provider.id && p.type === provider.type,
      );

      if (fallbackProvider) {
        failoverAttempted = true;
        logger.info("Attempting failover provider", {
          request_id: requestId,
          failover_provider_id: fallbackProvider.id,
        });

        call = await fallbackProvider.makeCall(to, from || "", callOptions);
      } else {
        throw error;
      }
    }

    // Create call session in database
    const callSession = await base44.asServiceRole.entities.CallSession.create({
      client_id: resolvedClientId,
      agent_id: agentId,
      provider_call_id: call.provider_call_id,
      provider_id: call.provider_id,
      provider_type: provider.type,
      direction: "outbound",
      from_number: call.from,
      to_number: call.to,
      status: call.status,
      started_at: call.started_at,
      failover_attempted: failoverAttempted,
    });

    logger.info("Outbound call created successfully", {
      request_id: requestId,
      call_id: callSession.id,
      provider: provider.name,
    });

    return Response.json({
      success: true,
      data: {
        callSessionId: callSession.id,
        providerCallId: call.provider_call_id,
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
        },
        status: call.status,
        failoverAttempted,
      },
    });
  } catch (error) {
    logger.error("Outbound call function failed", {
      request_id: requestId,
      error: error.message,
      stack: error.stack,
    });
    return Response.json(
      { error: error.message || "Failed to initiate call" },
      { status: 500 },
    );
  }
});

/**
 * Get routing rules for tenant
 */
async function getRoutingRules(
  base44: any,
  clientId: string,
): Promise<RoutingRule[]> {
  try {
    const rules = await base44.asServiceRole.entities.RoutingRule.filter({
      tenant_id: clientId,
      enabled: true,
    });

    return rules || [];
  } catch (error) {
    logger.warn("Failed to load routing rules, using defaults", {
      client_id: clientId,
      error: error.message,
    });
    return [];
  }
}
