/**
 * externalIntegrations.ts
 *
 * API clients for external platform integrations:
 * - Viral Dashboard (app.viraldashboard.io)
 * - Flaxxa AI (ai.flaxxa.com)
 * - LeadsFynder (app.leadsfynder.com)
 * - Flowomatic (app.flowomatic.com)
 *
 * @module externalIntegrations
 */

import { logger } from "./infra/logger.ts";

// Environment configuration
const VIRAL_DASHBOARD_API_URL = Deno.env.get("VIRAL_DASHBOARD_API_URL") ||
  "https://app.viraldashboard.io/api";
const VIRAL_DASHBOARD_API_KEY = Deno.env.get("VIRAL_DASHBOARD_API_KEY");

const FLAXXA_AI_API_URL = Deno.env.get("FLAXXA_AI_API_URL") ||
  "https://ai.flaxxa.com/api";
const FLAXXA_AI_API_KEY = Deno.env.get("FLAXXA_AI_API_KEY");

const LEADS_FYNDER_API_URL = Deno.env.get("LEADS_FYNDER_API_URL") ||
  "https://app.leadsfynder.com/api";
const LEADS_FYNDER_API_KEY = Deno.env.get("LEADS_FYNDER_API_KEY");

const FLOWOMATIC_API_URL = Deno.env.get("FLOWOMATIC_API_URL") ||
  "https://app.flowomatic.com/api";
const FLOWOMATIC_API_KEY = Deno.env.get("FLOWOMATIC_API_KEY");

interface ExternalIntegrationConfig {
  apiUrl?: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Base class for external API clients
 */
class BaseExternalClient {
  protected apiUrl: string;
  protected apiKey: string;
  protected timeout: number;
  protected platformName: string;

  constructor(platformName: string, config: ExternalIntegrationConfig = {}) {
    this.platformName = platformName;
    this.apiUrl = config.apiUrl || "";
    this.apiKey = config.apiKey || "";
    this.timeout = config.timeout || 30000;

    if (!this.apiKey) {
      logger.warn(
        `${platformName} API key not configured - integration disabled`,
      );
    }
  }

  /**
   * Make authenticated request to external API
   */
  protected async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error(`${this.platformName} API key not configured`);
    }

    const url = `${this.apiUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (
        body && (method === "POST" || method === "PATCH" || method === "PUT")
      ) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `${this.platformName} API error (${response.status}): ${errorText}`,
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          `${this.platformName} API timeout after ${this.timeout}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if integration is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

/**
 * Viral Dashboard Client
 * Social media management and analytics
 */
export class ViralDashboardClient extends BaseExternalClient {
  constructor(config: ExternalIntegrationConfig = {}) {
    super("Viral Dashboard", {
      apiUrl: config.apiUrl || VIRAL_DASHBOARD_API_URL,
      apiKey: config.apiKey || VIRAL_DASHBOARD_API_KEY,
      timeout: config.timeout,
    });
  }

  /**
   * Connect social media account
   */
  async connectSocialAccount(data: {
    platform: "facebook" | "twitter" | "instagram" | "linkedin" | "tiktok";
    credentials: Record<string, string>;
    userId: string;
  }): Promise<{ success: boolean; accountId: string }> {
    logger.info("Connecting social media account", { platform: data.platform });

    const result = await this.makeRequest("/v1/accounts/connect", "POST", data);
    return result as { success: boolean; accountId: string };
  }

  /**
   * Schedule social media post
   */
  async schedulePost(data: {
    accountIds: string[];
    content: string;
    mediaUrls?: string[];
    scheduledTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; postId: string }> {
    logger.info("Scheduling social media post");

    const result = await this.makeRequest("/v1/posts/schedule", "POST", data);
    return result as { success: boolean; postId: string };
  }

  /**
   * Get analytics
   */
  async getAnalytics(data: {
    accountId: string;
    startDate: string;
    endDate: string;
  }): Promise<{
    reach: number;
    engagement: number;
    clicks: number;
    conversions: number;
  }> {
    const params = new URLSearchParams({
      accountId: data.accountId,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    const result = await this.makeRequest(`/v1/analytics?${params.toString()}`);
    return result as {
      reach: number;
      engagement: number;
      clicks: number;
      conversions: number;
    };
  }
}

/**
 * Flaxxa AI Client
 * AI content generation
 */
export class FlaxxaAIClient extends BaseExternalClient {
  constructor(config: ExternalIntegrationConfig = {}) {
    super("Flaxxa AI", {
      apiUrl: config.apiUrl || FLAXXA_AI_API_URL,
      apiKey: config.apiKey || FLAXXA_AI_API_KEY,
      timeout: config.timeout,
    });
  }

  /**
   * Generate content
   */
  async generateContent(data: {
    contentType: "blog_post" | "social_media" | "email" | "ad_copy";
    prompt: string;
    tone?: "professional" | "casual" | "friendly" | "formal";
    length?: "short" | "medium" | "long";
  }): Promise<
    { success: boolean; content: string; metadata: Record<string, unknown> }
  > {
    logger.info("Generating AI content", { contentType: data.contentType });

    const result = await this.makeRequest("/v1/generate", "POST", data);
    return result as {
      success: boolean;
      content: string;
      metadata: Record<string, unknown>;
    };
  }

  /**
   * Improve existing content
   */
  async improveContent(data: {
    content: string;
    improvements: string[];
  }): Promise<{ success: boolean; improvedContent: string }> {
    const result = await this.makeRequest("/v1/improve", "POST", data);
    return result as { success: boolean; improvedContent: string };
  }

  /**
   * Generate images
   */
  async generateImage(data: {
    prompt: string;
    style?: string;
    size?: "square" | "landscape" | "portrait";
  }): Promise<{ success: boolean; imageUrl: string }> {
    const result = await this.makeRequest("/v1/images/generate", "POST", data);
    return result as { success: boolean; imageUrl: string };
  }
}

/**
 * LeadsFynder Client
 * Lead generation and prospecting
 */
export class LeadsFynderClient extends BaseExternalClient {
  constructor(config: ExternalIntegrationConfig = {}) {
    super("LeadsFynder", {
      apiUrl: config.apiUrl || LEADS_FYNDER_API_URL,
      apiKey: config.apiKey || LEADS_FYNDER_API_KEY,
      timeout: config.timeout,
    });
  }

  /**
   * Search for leads
   */
  async searchLeads(data: {
    industry?: string;
    location?: string;
    companySize?: string;
    keywords?: string[];
    limit?: number;
  }): Promise<{ success: boolean; leads: Array<Record<string, unknown>> }> {
    logger.info("Searching for leads", {
      industry: data.industry,
      location: data.location,
    });

    const result = await this.makeRequest("/v1/leads/search", "POST", data);
    return result as {
      success: boolean;
      leads: Array<Record<string, unknown>>;
    };
  }

  /**
   * Enrich lead data
   */
  async enrichLead(data: {
    email?: string;
    phone?: string;
    company?: string;
  }): Promise<{ success: boolean; enrichedData: Record<string, unknown> }> {
    const result = await this.makeRequest("/v1/leads/enrich", "POST", data);
    return result as {
      success: boolean;
      enrichedData: Record<string, unknown>;
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(
    email: string,
  ): Promise<{ success: boolean; valid: boolean; score: number }> {
    const result = await this.makeRequest("/v1/verify/email", "POST", {
      email,
    });
    return result as { success: boolean; valid: boolean; score: number };
  }
}

/**
 * Flowomatic Client
 * Workflow automation
 */
export class FlowomaticClient extends BaseExternalClient {
  constructor(config: ExternalIntegrationConfig = {}) {
    super("Flowomatic", {
      apiUrl: config.apiUrl || FLOWOMATIC_API_URL,
      apiKey: config.apiKey || FLOWOMATIC_API_KEY,
      timeout: config.timeout,
    });
  }

  /**
   * Create workflow
   */
  async createWorkflow(data: {
    name: string;
    trigger: {
      type: string;
      config: Record<string, unknown>;
    };
    actions: Array<{
      type: string;
      config: Record<string, unknown>;
    }>;
    userId: string;
  }): Promise<{ success: boolean; workflowId: string }> {
    logger.info("Creating workflow", { name: data.name });

    const result = await this.makeRequest("/v1/workflows", "POST", data);
    return result as { success: boolean; workflowId: string };
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(data: {
    workflowId: string;
    input: Record<string, unknown>;
  }): Promise<{ success: boolean; executionId: string; status: string }> {
    const result = await this.makeRequest(
      `/v1/workflows/${data.workflowId}/execute`,
      "POST",
      data,
    );
    return result as { success: boolean; executionId: string; status: string };
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<{
    success: boolean;
    status: string;
    executions: number;
    lastRun?: string;
  }> {
    const result = await this.makeRequest(`/v1/workflows/${workflowId}`);
    return result as {
      success: boolean;
      status: string;
      executions: number;
      lastRun?: string;
    };
  }
}

/**
 * Factory functions to create client instances
 */
export function createViralDashboardClient(
  config?: ExternalIntegrationConfig,
): ViralDashboardClient {
  return new ViralDashboardClient(config);
}

export function createFlaxxaAIClient(
  config?: ExternalIntegrationConfig,
): FlaxxaAIClient {
  return new FlaxxaAIClient(config);
}

export function createLeadsFynderClient(
  config?: ExternalIntegrationConfig,
): LeadsFynderClient {
  return new LeadsFynderClient(config);
}

export function createFlowomaticClient(
  config?: ExternalIntegrationConfig,
): FlowomaticClient {
  return new FlowomaticClient(config);
}

/**
 * Check which integrations are configured
 */
export function getConfiguredIntegrations(): {
  viralDashboard: boolean;
  flaxxaAI: boolean;
  leadsFynder: boolean;
  flowomatic: boolean;
} {
  return {
    viralDashboard: !!VIRAL_DASHBOARD_API_KEY,
    flaxxaAI: !!FLAXXA_AI_API_KEY,
    leadsFynder: !!LEADS_FYNDER_API_KEY,
    flowomatic: !!FLOWOMATIC_API_KEY,
  };
}
