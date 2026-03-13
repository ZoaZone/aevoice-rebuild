/**
 * GSM Gateway Provider Base Class
 * Provides common functionality for all GSM gateway implementations
 */

import type {
  Call,
  CallOptions,
  GSMChannel,
  InboundCallWebhook,
  ProviderConfig,
  ProviderHealthMetrics,
  ProviderType,
  TelephonyProvider,
} from "../lib/types.ts";
import { TelephonyError } from "../lib/types.ts";
import { logger } from "../../lib/infra/logger.js";

/**
 * Base class for GSM Gateway providers
 */
export abstract class GSMGatewayProvider implements TelephonyProvider {
  public id: string;
  public name: string;
  public type: ProviderType = "gsm_gateway";

  protected config: ProviderConfig = {};
  protected channels: Map<number, GSMChannel> = new Map();
  protected isInitialized = false;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  /**
   * Initialize the GSM gateway
   */
  async initialize(config: ProviderConfig): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Initializing GSM gateway", {
        request_id: requestId,
        provider_id: this.id,
        host: config.host,
        channels: config.channels,
      });

      this.config = config;

      // Validate required configuration
      if (!config.host) {
        throw new TelephonyError(
          "GSM gateway host is required",
          "INVALID_CONFIG",
          this.id,
        );
      }

      // Perform gateway-specific initialization
      await this.initializeGateway();

      // Discover and register channels
      await this.discoverChannels();

      this.isInitialized = true;

      logger.info("GSM gateway initialized successfully", {
        request_id: requestId,
        provider_id: this.id,
        channels: this.channels.size,
      });
    } catch (error) {
      logger.error("Failed to initialize GSM gateway", {
        request_id: requestId,
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Make an outbound call via GSM channel
   */
  async makeCall(
    to: string,
    from: string,
    options: CallOptions,
  ): Promise<Call> {
    const requestId = crypto.randomUUID();

    try {
      if (!this.isInitialized) {
        throw new TelephonyError(
          "Provider not initialized",
          "NOT_INITIALIZED",
          this.id,
        );
      }

      logger.info("Initiating GSM call", {
        request_id: requestId,
        provider_id: this.id,
        to,
        from,
      });

      // Find available channel
      const channel = await this.findAvailableChannel();
      if (!channel) {
        throw new TelephonyError(
          "No available GSM channels",
          "NO_CHANNELS_AVAILABLE",
          this.id,
        );
      }

      // Execute gateway-specific call initiation
      const call = await this.initiateCall(channel, to, from, options);

      // Mark channel as in use
      channel.status = "in_use";
      channel.current_call_id = call.id;
      this.channels.set(channel.channel_number, channel);

      logger.info("GSM call initiated successfully", {
        request_id: requestId,
        call_id: call.id,
        channel: channel.channel_number,
      });

      return call;
    } catch (error) {
      logger.error("Failed to make GSM call", {
        request_id: requestId,
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Receive inbound call webhook
   */
  async receiveCall(webhook: InboundCallWebhook): Promise<Call> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Receiving inbound GSM call", {
        request_id: requestId,
        provider_id: this.id,
        from: webhook.from,
        to: webhook.to,
      });

      // Process gateway-specific webhook
      const call = await this.processInboundWebhook(webhook);

      logger.info("Inbound GSM call processed", {
        request_id: requestId,
        call_id: call.id,
      });

      return call;
    } catch (error) {
      logger.error("Failed to receive GSM call", {
        request_id: requestId,
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Ending GSM call", {
        request_id: requestId,
        provider_id: this.id,
        call_id: callId,
      });

      // Find channel with this call
      const channel = Array.from(this.channels.values()).find(
        (ch) => ch.current_call_id === callId,
      );

      if (channel) {
        // Execute gateway-specific call termination
        await this.terminateCall(channel, callId);

        // Mark channel as available
        channel.status = "available";
        channel.current_call_id = undefined;
        channel.last_used = new Date().toISOString();
        this.channels.set(channel.channel_number, channel);
      }

      logger.info("GSM call ended successfully", {
        request_id: requestId,
        call_id: callId,
      });
    } catch (error) {
      logger.error("Failed to end GSM call", {
        request_id: requestId,
        provider_id: this.id,
        call_id: callId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get provider status and health metrics
   */
  getStatus(): Promise<ProviderHealthMetrics> {
    const availableChannels = Array.from(this.channels.values()).filter(
      (ch) => ch.status === "available",
    ).length;

    const totalChannels = this.channels.size;
    const currentCalls = Array.from(this.channels.values()).filter(
      (ch) => ch.status === "in_use",
    ).length;

    return Promise.resolve({
      is_healthy: this.isInitialized && availableChannels > 0,
      last_check: new Date().toISOString(),
      uptime_percentage: 99.9, // TODO: Calculate from metrics
      average_latency_ms: 150, // TODO: Calculate from metrics
      error_count: 0, // TODO: Track errors
      available_channels: availableChannels,
      total_channels: totalChannels,
      current_calls: currentCalls,
    });
  }

  /**
   * Health check for GSM gateway
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Perform gateway-specific health check
      const isHealthy = await this.checkGatewayHealth();

      // Update channel status
      await this.updateChannelStatus();

      return isHealthy;
    } catch (error) {
      logger.error("GSM gateway health check failed", {
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get available channels count
   */
  getAvailableChannels(): Promise<number> {
    return Promise.resolve(
      Array.from(this.channels.values()).filter(
        (ch) => ch.status === "available",
      ).length,
    );
  }

  /**
   * Disconnect from GSM gateway
   */
  async disconnect(): Promise<void> {
    logger.info("Disconnecting from GSM gateway", {
      provider_id: this.id,
    });

    // Perform gateway-specific cleanup
    await this.cleanupGateway();

    this.isInitialized = false;
    this.channels.clear();
  }

  /**
   * Find an available channel
   */
  protected async findAvailableChannel(): Promise<GSMChannel | null> {
    // Refresh channel status first
    await this.updateChannelStatus();

    // Find channel with best signal strength
    const availableChannels = Array.from(this.channels.values())
      .filter((ch) => ch.status === "available")
      .sort((a, b) => (b.signal_strength || -100) - (a.signal_strength || -100));

    return availableChannels[0] || null;
  }

  /**
   * Get all channels information
   */
  public getChannels(): GSMChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channel by number
   */
  public getChannel(channelNumber: number): GSMChannel | undefined {
    return this.channels.get(channelNumber);
  }

  // ===== Abstract methods to be implemented by specific gateway types =====

  /**
   * Gateway-specific initialization
   */
  protected abstract initializeGateway(): Promise<void>;

  /**
   * Discover available channels on the gateway
   */
  protected abstract discoverChannels(): Promise<void>;

  /**
   * Initiate a call on a specific channel
   */
  protected abstract initiateCall(
    channel: GSMChannel,
    to: string,
    from: string,
    options: CallOptions,
  ): Promise<Call>;

  /**
   * Process inbound webhook from gateway
   */
  protected abstract processInboundWebhook(
    webhook: InboundCallWebhook,
  ): Promise<Call>;

  /**
   * Terminate a call on a specific channel
   */
  protected abstract terminateCall(
    channel: GSMChannel,
    callId: string,
  ): Promise<void>;

  /**
   * Check gateway health
   */
  protected abstract checkGatewayHealth(): Promise<boolean>;

  /**
   * Update status of all channels
   */
  protected abstract updateChannelStatus(): Promise<void>;

  /**
   * Clean up gateway resources
   */
  protected abstract cleanupGateway(): Promise<void>;
}
