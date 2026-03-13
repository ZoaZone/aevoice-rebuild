/**
 * Telephony Provider Management Function
 * Create, update, configure and manage telephony providers
 *
 * @route POST /functions/telephony/manageProviders
 * @auth Required - Admin only
 * @body { action, providerId?, config?, ... }
 * @returns { success: true, data }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { providerManager } from "./telephony/lib/ProviderManager.ts";
import { GoIPAdapter } from "./telephony/providers/gsm/GoIPAdapter.ts";
import type { ProviderConfig } from "./telephony/lib/types.ts";
import type {
  Base44Client,
  CreateProviderRequest,
  DeleteProviderRequest,
  GetProviderChannelsRequest,
  GetProviderHealthRequest,
  GetProviderRequest,
  ListProvidersRequest,
  TestProviderConnectionRequest,
  UpdateProviderRequest,
} from "./lib/types/index.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Provider management function started", {
      request_id: requestId,
    });

    // Initialize Base44 client
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-only for now (can be extended for tenant-level management)
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, {
        status: 403,
      });
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return Response.json({ error: "Missing required field: action" }, {
        status: 400,
      });
    }

    let result;

    switch (action) {
      case "create":
        result = await createProvider(base44, body, requestId);
        break;

      case "list":
        result = await listProviders(base44, body, requestId);
        break;

      case "get":
        result = await getProvider(base44, body, requestId);
        break;

      case "update":
        result = await updateProvider(base44, body, requestId);
        break;

      case "delete":
        result = await deleteProvider(base44, body, requestId);
        break;

      case "testConnection":
        result = await testProviderConnection(base44, body, requestId);
        break;

      case "getHealth":
        result = await getProviderHealth(base44, body, requestId);
        break;

      case "getChannels":
        result = await getProviderChannels(base44, body, requestId);
        break;

      default:
        return Response.json({ error: `Unknown action: ${action}` }, {
          status: 400,
        });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    logger.error("Provider management function failed", {
      request_id: requestId,
      error: error.message,
      stack: error.stack,
    });
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
});

/**
 * Create a new telephony provider
 */
async function createProvider(
  base44: Base44Client,
  body: CreateProviderRequest,
  requestId: string,
) {
  const { name, providerType, config, tenantId, costPerMinute, priority } = body;

  if (!name || !providerType || !config) {
    throw new Error("Missing required fields: name, providerType, config");
  }

  logger.info("Creating telephony provider", {
    request_id: requestId,
    name,
    provider_type: providerType,
  });

  // Validate provider type
  const validTypes = ["gsm_gateway", "sip_trunk", "api_provider"];
  if (!validTypes.includes(providerType)) {
    throw new Error(
      `Invalid providerType. Must be one of: ${validTypes.join(", ")}`,
    );
  }

  // Create provider in database
  const providerRecord = await base44.asServiceRole.entities.TelephonyProvider
    .create({
      name,
      provider_type: providerType,
      status: "inactive",
      priority: priority || 0,
      cost_per_minute: costPerMinute || 0,
      channels_total: config.channels || 0,
      channels_available: 0,
      config: config,
      tenant_id: tenantId || null,
    });

  // Initialize provider if it's a GSM gateway
  if (providerType === "gsm_gateway") {
    try {
      const adapter = createGSMAdapter(providerRecord.id, name, config);
      await providerManager.registerProvider(adapter, config);

      // Update status to active
      await base44.asServiceRole.entities.TelephonyProvider.update(
        providerRecord.id,
        {
          status: "active",
        },
      );

      // Get and store channel information
      const channels = adapter.getChannels();
      await base44.asServiceRole.entities.TelephonyProvider.update(
        providerRecord.id,
        {
          channels_total: channels.length,
          channels_available: channels.filter((ch: any) => ch.status === "available").length,
        },
      );

      // Store GSM channels in database
      for (const channel of channels) {
        await base44.asServiceRole.entities.GSMChannel.create({
          gateway_id: providerRecord.id,
          channel_number: channel.channel_number,
          sim_number: channel.sim_number,
          network_operator: channel.network_operator,
          signal_strength: channel.signal_strength,
          status: channel.status,
        });
      }

      logger.info("GSM provider initialized successfully", {
        request_id: requestId,
        provider_id: providerRecord.id,
        channels: channels.length,
      });
    } catch (error) {
      logger.error("Failed to initialize GSM provider", {
        request_id: requestId,
        provider_id: providerRecord.id,
        error: error.message,
      });

      // Update status to error
      await base44.asServiceRole.entities.TelephonyProvider.update(
        providerRecord.id,
        {
          status: "error",
        },
      );

      throw new Error(
        `Provider created but initialization failed: ${error.message}`,
      );
    }
  }

  return providerRecord;
}

/**
 * List all providers
 */
async function listProviders(
  base44: Base44Client,
  body: ListProvidersRequest,
  requestId: string,
) {
  const { tenantId, providerType, status } = body;

  logger.info("Listing telephony providers", {
    request_id: requestId,
    tenant_id: tenantId,
    provider_type: providerType,
  });

  const filters: any = {};
  if (tenantId) filters.tenant_id = tenantId;
  if (providerType) filters.provider_type = providerType;
  if (status) filters.status = status;

  const providers = await base44.asServiceRole.entities.TelephonyProvider
    .filter(filters);

  return providers;
}

/**
 * Get a specific provider
 */
async function getProvider(
  base44: Base44Client,
  body: GetProviderRequest,
  requestId: string,
) {
  const { providerId } = body;

  if (!providerId) {
    throw new Error("Missing required field: providerId");
  }

  logger.info("Getting provider details", {
    request_id: requestId,
    provider_id: providerId,
  });

  const providers = await base44.asServiceRole.entities.TelephonyProvider
    .filter({
      id: providerId,
    });

  if (!providers || providers.length === 0) {
    throw new Error("Provider not found");
  }

  return providers[0];
}

/**
 * Update provider configuration
 */
async function updateProvider(
  base44: Base44Client,
  body: UpdateProviderRequest,
  requestId: string,
) {
  const { providerId, name, priority, costPerMinute, status, config } = body;

  if (!providerId) {
    throw new Error("Missing required field: providerId");
  }

  logger.info("Updating provider", {
    request_id: requestId,
    provider_id: providerId,
  });

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (priority !== undefined) updates.priority = priority;
  if (costPerMinute !== undefined) updates.cost_per_minute = costPerMinute;
  if (status !== undefined) updates.status = status;
  if (config !== undefined) updates.config = config;

  const updated = await base44.asServiceRole.entities.TelephonyProvider.update(
    providerId,
    updates,
  );

  return updated;
}

/**
 * Delete a provider
 */
async function deleteProvider(
  base44: Base44Client,
  body: DeleteProviderRequest,
  requestId: string,
) {
  const { providerId } = body;

  if (!providerId) {
    throw new Error("Missing required field: providerId");
  }

  logger.info("Deleting provider", {
    request_id: requestId,
    provider_id: providerId,
  });

  // Unregister from provider manager
  await providerManager.unregisterProvider(providerId);

  // Delete from database (cascades to GSM channels)
  await base44.asServiceRole.entities.TelephonyProvider.delete(providerId);

  return { providerId, deleted: true };
}

/**
 * Test provider connection
 */
async function testProviderConnection(
  base44: Base44Client,
  body: TestProviderConnectionRequest,
  requestId: string,
) {
  const { providerId } = body;

  if (!providerId) {
    throw new Error("Missing required field: providerId");
  }

  logger.info("Testing provider connection", {
    request_id: requestId,
    provider_id: providerId,
  });

  const provider = providerManager.getProvider(providerId);

  if (!provider) {
    throw new Error("Provider not found in manager");
  }

  const isHealthy = await provider.healthCheck();

  return {
    providerId,
    healthy: isHealthy,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get provider health metrics
 */
async function getProviderHealth(
  base44: Base44Client,
  body: GetProviderHealthRequest,
  requestId: string,
) {
  const { providerId } = body;

  if (!providerId) {
    throw new Error("Missing required field: providerId");
  }

  logger.info("Getting provider health", {
    request_id: requestId,
    provider_id: providerId,
  });

  const provider = providerManager.getProvider(providerId);

  if (!provider) {
    throw new Error("Provider not found in manager");
  }

  const health = await provider.getStatus();

  // Update database with latest metrics
  await base44.asServiceRole.entities.TelephonyProvider.update(providerId, {
    channels_available: health.available_channels,
    uptime_percentage: health.uptime_percentage,
    average_latency_ms: health.average_latency_ms,
    error_count: health.error_count,
    last_health_check: new Date().toISOString(),
  });

  return health;
}

/**
 * Get provider channels (GSM only)
 */
async function getProviderChannels(
  base44: Base44Client,
  body: GetProviderChannelsRequest,
  requestId: string,
) {
  const { providerId } = body;

  if (!providerId) {
    throw new Error("Missing required field: providerId");
  }

  logger.info("Getting provider channels", {
    request_id: requestId,
    provider_id: providerId,
  });

  const channels = await base44.asServiceRole.entities.GSMChannel.filter({
    gateway_id: providerId,
  });

  return channels;
}

/**
 * Create GSM adapter based on configuration
 */
function createGSMAdapter(id: string, name: string, config: ProviderConfig) {
  // For now, we only support GoIP
  // In future, check config.gateway_type to determine adapter type
  return new GoIPAdapter(id, name);
}
