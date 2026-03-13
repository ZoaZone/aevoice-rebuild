/**
 * Provider Manager - Manages lifecycle of telephony providers
 * Handles registration, health checks, and provider selection
 */

import type {
  ProviderConfig,
  ProviderHealthMetrics,
  ProviderSelectionCriteria,
  RoutingRule,
  TelephonyProvider,
} from "./types.ts";
import { TelephonyError } from "./types.ts";
import { logger } from "../../lib/infra/logger.js";

/**
 * Provider Manager singleton for managing all telephony providers
 */
export class ProviderManager {
  private providers: Map<string, TelephonyProvider> = new Map();
  private healthCheckInterval: number | null = null;
  private readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds

  /**
   * Register a new telephony provider
   */
  async registerProvider(
    provider: TelephonyProvider,
    config: ProviderConfig,
  ): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Registering telephony provider", {
        request_id: requestId,
        provider_id: provider.id,
        provider_name: provider.name,
        provider_type: provider.type,
      });

      // Initialize provider with config
      await provider.initialize(config);

      // Perform initial health check
      const isHealthy = await provider.healthCheck();
      if (!isHealthy) {
        throw new TelephonyError(
          "Provider failed initial health check",
          "HEALTH_CHECK_FAILED",
          provider.id,
        );
      }

      // Store provider
      this.providers.set(provider.id, provider);

      logger.info("Provider registered successfully", {
        request_id: requestId,
        provider_id: provider.id,
      });
    } catch (error) {
      logger.error("Failed to register provider", {
        request_id: requestId,
        provider_id: provider.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unregister a provider
   */
  async unregisterProvider(providerId: string): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        logger.warn("Provider not found for unregistration", {
          request_id: requestId,
          provider_id: providerId,
        });
        return;
      }

      await provider.disconnect();
      this.providers.delete(providerId);

      logger.info("Provider unregistered successfully", {
        request_id: requestId,
        provider_id: providerId,
      });
    } catch (error) {
      logger.error("Failed to unregister provider", {
        request_id: requestId,
        provider_id: providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a provider by ID
   */
  getProvider(providerId: string): TelephonyProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): TelephonyProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by type
   */
  getProvidersByType(type: string): TelephonyProvider[] {
    return this.getAllProviders().filter((p) => p.type === type);
  }

  /**
   * Select best provider based on criteria and routing rules
   */
  async selectProvider(
    criteria: ProviderSelectionCriteria,
    routingRules: RoutingRule[],
  ): Promise<TelephonyProvider | null> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Selecting provider", {
        request_id: requestId,
        destination: criteria.destination_number,
        rules_count: routingRules.length,
      });

      // Get all active providers
      const activeProviders = await this.getHealthyProviders();

      if (activeProviders.length === 0) {
        logger.error("No healthy providers available", {
          request_id: requestId,
        });
        return null;
      }

      // Apply routing rules in priority order
      const sortedRules = routingRules
        .filter((r) => r.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        const selectedProvider = await this.applyRoutingRule(
          rule,
          activeProviders,
          criteria,
        );

        if (selectedProvider) {
          logger.info("Provider selected via routing rule", {
            request_id: requestId,
            provider_id: selectedProvider.id,
            rule_type: rule.rule_type,
          });
          return selectedProvider;
        }
      }

      // Fallback: Select provider with most available channels
      const providerWithCapacity = await this.selectByCapacity(activeProviders);

      if (providerWithCapacity) {
        logger.info("Provider selected by capacity (fallback)", {
          request_id: requestId,
          provider_id: providerWithCapacity.id,
        });
      }

      return providerWithCapacity;
    } catch (error) {
      logger.error("Failed to select provider", {
        request_id: requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all healthy providers
   */
  private async getHealthyProviders(): Promise<TelephonyProvider[]> {
    const healthyProviders: TelephonyProvider[] = [];

    for (const provider of this.providers.values()) {
      try {
        const isHealthy = await provider.healthCheck();
        if (isHealthy) {
          healthyProviders.push(provider);
        }
      } catch (error) {
        logger.warn("Health check failed for provider", {
          provider_id: provider.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return healthyProviders;
  }

  /**
   * Apply a routing rule to select provider
   */
  private async applyRoutingRule(
    rule: RoutingRule,
    providers: TelephonyProvider[],
    criteria: ProviderSelectionCriteria,
  ): Promise<TelephonyProvider | null> {
    switch (rule.rule_type) {
      case "cost":
        return this.selectByCost(providers, criteria, rule);

      case "geo":
        return this.selectByGeography(providers, criteria, rule);

      case "load":
        return this.selectByLoad(providers, rule);

      case "quality":
        return this.selectByQuality(providers, rule);

      case "time":
        return this.selectByTime(providers, rule);

      default:
        logger.warn("Unknown routing rule type", { rule_type: rule.rule_type });
        return null;
    }
  }

  /**
   * Select provider by cost
   */
  private async selectByCost(
    providers: TelephonyProvider[],
    _criteria: ProviderSelectionCriteria,
    rule: RoutingRule,
  ): Promise<TelephonyProvider | null> {
    // Priority order from rule
    for (const providerId of rule.provider_priority) {
      const provider = providers.find((p) => p.id === providerId);
      if (provider) {
        const channels = await provider.getAvailableChannels();
        if (channels > 0) {
          return provider;
        }
      }
    }
    return null;
  }

  /**
   * Select provider by geography
   */
  private async selectByGeography(
    providers: TelephonyProvider[],
    criteria: ProviderSelectionCriteria,
    rule: RoutingRule,
  ): Promise<TelephonyProvider | null> {
    // Extract country code from destination
    const countryCode = this.extractCountryCode(criteria.destination_number);

    // Check rule conditions for country matching
    const countryMapping = rule.conditions.country_mapping as Record<string, string[]> || {};

    for (const [country, providerIds] of Object.entries(countryMapping)) {
      if (country === countryCode) {
        for (const providerId of providerIds) {
          const provider = providers.find((p) => p.id === providerId);
          if (provider) {
            const channels = await provider.getAvailableChannels();
            if (channels > 0) {
              return provider;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Select provider by load balancing
   */
  private async selectByLoad(
    providers: TelephonyProvider[],
    _rule: RoutingRule,
  ): Promise<TelephonyProvider | null> {
    // Find provider with lowest utilization
    let selectedProvider: TelephonyProvider | null = null;
    let lowestUtilization = 1.0;

    for (const provider of providers) {
      try {
        const status = await provider.getStatus();
        const utilization = status.total_channels > 0
          ? (status.total_channels - status.available_channels) /
            status.total_channels
          : 1.0;

        if (utilization < lowestUtilization && status.available_channels > 0) {
          lowestUtilization = utilization;
          selectedProvider = provider;
        }
      } catch (_error) {
        logger.warn("Failed to get provider status for load balancing", {
          provider_id: provider.id,
        });
      }
    }

    return selectedProvider;
  }

  /**
   * Select provider by quality metrics
   */
  private async selectByQuality(
    providers: TelephonyProvider[],
    _rule: RoutingRule,
  ): Promise<TelephonyProvider | null> {
    // Select provider with highest uptime and lowest latency
    let bestProvider: TelephonyProvider | null = null;
    let bestScore = 0;

    for (const provider of providers) {
      try {
        const status = await provider.getStatus();
        // Score: uptime (70%) + inverse latency (30%)
        const score = (status.uptime_percentage * 0.7) +
          ((1000 / Math.max(status.average_latency_ms, 1)) * 0.3);

        if (score > bestScore && status.available_channels > 0) {
          bestScore = score;
          bestProvider = provider;
        }
      } catch (_error) {
        logger.warn("Failed to get provider status for quality check", {
          provider_id: provider.id,
        });
      }
    }

    return bestProvider;
  }

  /**
   * Select provider by time-based rules
   */
  private selectByTime(
    providers: TelephonyProvider[],
    rule: RoutingRule,
  ): TelephonyProvider | null {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday

    const timeRules = rule.conditions.time_rules as {
      hours?: number[];
      days?: number[];
      provider_ids?: string[];
    } || {};

    // Check if current time matches rule
    if (timeRules.hours && !timeRules.hours.includes(hour)) {
      return null;
    }

    if (timeRules.days && !timeRules.days.includes(day)) {
      return null;
    }

    // Return first matching provider from rule
    if (timeRules.provider_ids) {
      for (const providerId of timeRules.provider_ids) {
        const provider = providers.find((p) => p.id === providerId);
        if (provider) {
          return provider;
        }
      }
    }

    return null;
  }

  /**
   * Select provider by available capacity
   */
  private async selectByCapacity(
    providers: TelephonyProvider[],
  ): Promise<TelephonyProvider | null> {
    let selectedProvider: TelephonyProvider | null = null;
    let maxChannels = 0;

    for (const provider of providers) {
      try {
        const channels = await provider.getAvailableChannels();
        if (channels > maxChannels) {
          maxChannels = channels;
          selectedProvider = provider;
        }
      } catch (_error) {
        logger.warn("Failed to get available channels", {
          provider_id: provider.id,
        });
      }
    }

    return selectedProvider;
  }

  /**
   * Extract country code from phone number
   */
  private extractCountryCode(phoneNumber: string): string {
    // Simple extraction - assumes E.164 format
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Common country codes
    if (cleaned.startsWith("1")) return "US"; // US/Canada
    if (cleaned.startsWith("91")) return "IN"; // India
    if (cleaned.startsWith("44")) return "GB"; // UK
    if (cleaned.startsWith("86")) return "CN"; // China

    return "UNKNOWN";
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    logger.info("Starting provider health checks", {
      interval_ms: this.HEALTH_CHECK_INTERVAL_MS,
    });

    this.healthCheckInterval = setInterval(async () => {
      // Run health checks in parallel to prevent blocking
      const healthCheckPromises = Array.from(this.providers.values()).map(
        async (provider) => {
          try {
            await provider.healthCheck();
          } catch (error) {
            logger.error("Health check failed", {
              provider_id: provider.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
      );

      // Wait for all health checks to complete
      await Promise.allSettled(healthCheckPromises);
    }, this.HEALTH_CHECK_INTERVAL_MS) as unknown as number;
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info("Stopped provider health checks");
    }
  }

  /**
   * Get health metrics for all providers
   */
  async getAllHealthMetrics(): Promise<Map<string, ProviderHealthMetrics>> {
    const metrics = new Map<string, ProviderHealthMetrics>();

    for (const provider of this.providers.values()) {
      try {
        const status = await provider.getStatus();
        metrics.set(provider.id, status);
      } catch (error) {
        logger.error("Failed to get provider metrics", {
          provider_id: provider.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return metrics;
  }
}

// Export singleton instance
export const providerManager = new ProviderManager();
