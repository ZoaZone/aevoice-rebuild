/**
 * HelloBiz.app API Client
 * Handles provider account creation and management on hellobiz.app marketplace
 */

import { createClient } from "npm:@base44/sdk@0.8.6";
// TYPE SAFETY FIX #24 (Phase 2C): Import JsonValue for type-safe API responses
import type { JsonValue } from "./types/index.ts";

const base44 = createClient();

export interface HelloBizProviderAccount {
  providerId: string;
  businessName: string;
  email: string;
  apiKey: string;
  apiSecret: string;
  profileUrl: string;
  status: "active" | "pending" | "suspended";
  createdAt: string;
}

export interface HelloBizServiceListing {
  serviceId: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  pricing: {
    type: "fixed" | "hourly" | "custom";
    amount: number;
    currency: string;
  };
  status: "active" | "draft";
}

const HELLOBIZ_API_BASE = Deno.env.get("HELLOBIZ_API_URL") ||
  "https://api.hellobiz.app/v1";
const HELLOBIZ_API_KEY = Deno.env.get("HELLOBIZ_API_KEY");

/**
 * Make authenticated request to HelloBiz.app API
 * TYPE SAFETY FIX #24 (Phase 2C): Replaced `Promise<any>` with `Promise<JsonValue>`
 * Ensures all HelloBiz API responses are JSON-serializable
 */
async function makeRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  retries = 3,
): Promise<JsonValue> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HELLOBIZ_API_KEY}`,
          "X-AEVOICE-Integration": "true",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${HELLOBIZ_API_BASE}${endpoint}`, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HelloBiz API error (${response.status}): ${errorData.message || response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `HelloBiz API request failed (attempt ${attempt}/${retries}):`,
        error,
      );

      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

/**
 * Create a new provider account on HelloBiz.app
 */
export async function createProviderAccount(
  businessName: string,
  email: string,
  businessData: {
    description?: string;
    industry?: string;
    website?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  },
): Promise<HelloBizProviderAccount> {
  console.log(`Creating HelloBiz provider account for: ${businessName}`);

  try {
    const payload = {
      business_name: businessName,
      email: email,
      description: businessData.description,
      industry: businessData.industry,
      website: businessData.website,
      phone: businessData.phone,
      address: businessData.address,
      source: "aevoice_whiteglove",
      auto_approve: true, // White glove clients are pre-approved
    };

    const result = await makeRequest("/providers", "POST", payload);

    // SECURITY: Import masking for success logs
    const { maskEmail } = await import("../security/piiMasking.ts");
    console.log(
      `[HelloBiz] ✅ Provider account created`,
      {
        provider_id: result.provider_id,
        email: maskEmail(contactEmail),
      },
    );

    return {
      providerId: result.provider_id,
      businessName: result.business_name,
      email: result.email,
      apiKey: result.api_key,
      apiSecret: result.api_secret,
      profileUrl: result.profile_url,
      status: result.status,
      createdAt: result.created_at,
    };
  } catch (error) {
    console.error("Failed to create HelloBiz provider account:", error);
    throw new Error(`HelloBiz provider creation failed: ${error.message}`);
  }
}

/**
 * Update provider profile on HelloBiz.app
 */
export async function updateProviderProfile(
  providerId: string,
  updates: {
    description?: string;
    website?: string;
    logo_url?: string;
    services?: string[];
    availability?: string;
  },
): Promise<void> {
  console.log(`Updating HelloBiz provider profile: ${providerId}`);

  try {
    await makeRequest(`/providers/${providerId}`, "PATCH", updates);
    console.log(`✅ Provider profile updated: ${providerId}`);
  } catch (error) {
    console.error("Failed to update provider profile:", error);
    throw new Error(`Provider profile update failed: ${error.message}`);
  }
}

/**
 * Link AEVOICE agent to HelloBiz provider account
 */
export async function linkAevoiceAgent(
  providerId: string,
  agentId: string,
  agentConfig: {
    name: string;
    capabilities: string[];
    voice_enabled: boolean;
    chat_enabled: boolean;
  },
): Promise<void> {
  console.log(
    `Linking AEVOICE agent ${agentId} to HelloBiz provider ${providerId}`,
  );

  try {
    const payload = {
      integration_type: "aevoice",
      agent_id: agentId,
      agent_name: agentConfig.name,
      capabilities: agentConfig.capabilities,
      voice_enabled: agentConfig.voice_enabled,
      chat_enabled: agentConfig.chat_enabled,
      webhook_url: `${
        Deno.env.get("AEVOICE_WEBHOOK_BASE") || "https://aevoice.ai/functions"
      }/helloBizProviderWebhook`,
    };

    await makeRequest(
      `/providers/${providerId}/integrations`,
      "POST",
      payload,
    );

    console.log(`✅ Agent linked to HelloBiz provider: ${agentId}`);
  } catch (error) {
    console.error("Failed to link agent to provider:", error);
    throw new Error(`Agent linking failed: ${error.message}`);
  }
}

/**
 * Sync service listings to HelloBiz marketplace
 */
export async function syncServices(
  providerId: string,
  services: Array<{
    title: string;
    description: string;
    category: string;
    price: number;
    currency: string;
  }>,
): Promise<HelloBizServiceListing[]> {
  console.log(`Syncing ${services.length} services to HelloBiz`);

  try {
    const listings: HelloBizServiceListing[] = [];

    for (const service of services) {
      const payload = {
        provider_id: providerId,
        title: service.title,
        description: service.description,
        category: service.category,
        pricing: {
          type: "fixed",
          amount: service.price,
          currency: service.currency,
        },
        status: "active",
      };

      const result = await makeRequest("/services", "POST", payload);
      listings.push({
        serviceId: result.service_id,
        providerId: providerId,
        title: result.title,
        description: result.description,
        category: result.category,
        pricing: result.pricing,
        status: result.status,
      });
    }

    console.log(`✅ Synced ${listings.length} services to HelloBiz`);
    return listings;
  } catch (error) {
    console.error("Failed to sync services:", error);
    throw new Error(`Service sync failed: ${error.message}`);
  }
}

/**
 * Get provider account status
 * TYPE SAFETY FIX #25 (Phase 2C): Replaced `metrics: any` with `Record<string, unknown>`
 * HelloBiz metrics structure varies by provider and must be validated at runtime
 */
export async function getProviderStatus(
  providerId: string,
): Promise<{ status: string; metrics: Record<string, unknown> }> {
  try {
    const result = await makeRequest(`/providers/${providerId}`, "GET");
    return {
      status: result.status,
      metrics: result.metrics || {},
    };
  } catch (error) {
    console.error("Failed to get provider status:", error);
    throw new Error(`Provider status check failed: ${error.message}`);
  }
}

/**
 * Store HelloBiz provider data in Base44 database
 */
export async function storeProviderInDatabase(
  clientId: string,
  providerAccount: HelloBizProviderAccount,
): Promise<void> {
  try {
    // Store as IntegrationConfig for now (can be migrated to HelloBizProvider entity later)
    await base44.asServiceRole.entities.IntegrationConfig.create({
      client_id: clientId,
      integration_type: "hellobiz_provider",
      provider: "hellobiz",
      config: {
        provider_id: providerAccount.providerId,
        business_name: providerAccount.businessName,
        email: providerAccount.email,
        profile_url: providerAccount.profileUrl,
        status: providerAccount.status,
        created_at: providerAccount.createdAt,
      },
      credentials: {
        api_key: providerAccount.apiKey,
        api_secret: providerAccount.apiSecret,
      },
      status: "active",
    });

    console.log(
      `✅ HelloBiz provider data stored for client: ${clientId}`,
    );
  } catch (error) {
    console.error("Failed to store provider in database:", error);
    throw new Error(`Database storage failed: ${error.message}`);
  }
}
