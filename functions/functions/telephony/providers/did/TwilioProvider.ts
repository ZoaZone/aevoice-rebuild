/**
 * Twilio API Provider Adapter
 * Implements telephony provider for Twilio Voice API
 */

import type {
  Call,
  CallOptions,
  InboundCallWebhook,
  ProviderConfig,
  ProviderHealthMetrics,
  ProviderType,
  TelephonyProvider,
} from "../lib/types.ts";
import { TelephonyError } from "../lib/types.ts";
import { logger } from "../../lib/infra/logger.js";

/**
 * Twilio-specific configuration
 */
interface TwilioConfig extends ProviderConfig {
  account_sid: string;
  auth_token: string;
  api_base_url?: string;
}

/**
 * Twilio API Provider Implementation
 */
export class TwilioProvider implements TelephonyProvider {
  public id: string;
  public name: string;
  public type: ProviderType = "api_provider";

  private config: TwilioConfig = { account_sid: "", auth_token: "" };
  private isInitialized = false;
  private activeCallsCount = 0;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  /**
   * Initialize Twilio provider
   */
  async initialize(config: ProviderConfig): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Initializing Twilio provider", {
        request_id: requestId,
        provider_id: this.id,
      });

      const twilioConfig = config as TwilioConfig;

      if (!twilioConfig.account_sid || !twilioConfig.auth_token) {
        throw new TelephonyError(
          "Twilio requires account_sid and auth_token",
          "INVALID_CONFIG",
          this.id,
        );
      }

      this.config = {
        ...twilioConfig,
        api_base_url: twilioConfig.api_base_url ||
          "https://api.twilio.com/2010-04-01",
      };

      // Verify credentials by fetching account info
      await this.verifyCredentials();

      this.isInitialized = true;

      logger.info("Twilio provider initialized successfully", {
        request_id: requestId,
        provider_id: this.id,
      });
    } catch (error) {
      logger.error("Failed to initialize Twilio provider", {
        request_id: requestId,
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Make outbound call via Twilio
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

      logger.info("Initiating Twilio call", {
        request_id: requestId,
        provider_id: this.id,
        to,
        from,
      });

      // Build Twilio API request
      const endpoint = `${this.config.api_base_url}/Accounts/${this.config.account_sid}/Calls.json`;

      const formData = new URLSearchParams({
        To: to,
        From: from,
        Url: options.webhook_url || "",
        StatusCallback: options.status_callback_url || "",
        Record: options.record_call ? "true" : "false",
        Timeout: String(options.timeout_seconds || 60),
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": this.makeAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TelephonyError(
          `Twilio API error: ${errorText}`,
          "CALL_INITIATION_FAILED",
          this.id,
        );
      }

      const data = await response.json();

      this.activeCallsCount++;

      const call: Call = {
        id: data.sid,
        provider_id: this.id,
        provider_call_id: data.sid,
        from: data.from,
        to: data.to,
        direction: "outbound",
        status: this.mapTwilioStatus(data.status),
        started_at: new Date().toISOString(),
        metadata: {
          twilio_call_sid: data.sid,
          twilio_account_sid: data.account_sid,
        },
      };

      logger.info("Twilio call initiated successfully", {
        request_id: requestId,
        call_id: call.id,
      });

      return call;
    } catch (error) {
      logger.error("Failed to make Twilio call", {
        request_id: requestId,
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process inbound call webhook from Twilio
   */
  receiveCall(webhook: InboundCallWebhook): Promise<Call> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Receiving inbound Twilio call", {
        request_id: requestId,
        provider_id: this.id,
        from: webhook.from,
        to: webhook.to,
      });

      this.activeCallsCount++;

      const call: Call = {
        id: webhook.provider_call_id,
        provider_id: this.id,
        provider_call_id: webhook.provider_call_id,
        from: webhook.from,
        to: webhook.to,
        direction: "inbound",
        status: "ringing",
        started_at: webhook.timestamp,
        metadata: webhook.raw_payload,
      };

      logger.info("Inbound Twilio call processed", {
        request_id: requestId,
        call_id: call.id,
      });

      return Promise.resolve(call);
    } catch (error) {
      logger.error("Failed to receive Twilio call", {
        request_id: requestId,
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * End an active Twilio call
   */
  async endCall(callId: string): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Ending Twilio call", {
        request_id: requestId,
        provider_id: this.id,
        call_id: callId,
      });

      const endpoint =
        `${this.config.api_base_url}/Accounts/${this.config.account_sid}/Calls/${callId}.json`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": this.makeAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ Status: "completed" }).toString(),
      });

      if (response.ok) {
        this.activeCallsCount = Math.max(0, this.activeCallsCount - 1);
      }

      logger.info("Twilio call ended successfully", {
        request_id: requestId,
        call_id: callId,
      });
    } catch (error) {
      logger.error("Failed to end Twilio call", {
        request_id: requestId,
        call_id: callId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get Twilio provider status
   */
  getStatus(): Promise<ProviderHealthMetrics> {
    return Promise.resolve({
      is_healthy: this.isInitialized,
      last_check: new Date().toISOString(),
      uptime_percentage: 99.99, // Twilio's uptime
      average_latency_ms: 200,
      error_count: 0,
      available_channels: 1000, // Twilio has virtually unlimited capacity
      total_channels: 1000,
      current_calls: this.activeCallsCount,
    });
  }

  /**
   * Health check for Twilio
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Verify we can reach Twilio API
      const endpoint = `${this.config.api_base_url}/Accounts/${this.config.account_sid}.json`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": this.makeAuthHeader(),
        },
      });

      return response.ok;
    } catch (error) {
      logger.error("Twilio health check failed", {
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get available channels (always high for Twilio)
   */
  async getAvailableChannels(): Promise<number> {
    return this.isInitialized ? 1000 : 0;
  }

  /**
   * Disconnect from Twilio (cleanup)
   */
  async disconnect(): Promise<void> {
    logger.info("Disconnecting Twilio provider", {
      provider_id: this.id,
    });

    this.isInitialized = false;
    this.activeCallsCount = 0;
  }

  /**
   * Verify Twilio credentials
   */
  private async verifyCredentials(): Promise<void> {
    const endpoint = `${this.config.api_base_url}/Accounts/${this.config.account_sid}.json`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": this.makeAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new TelephonyError(
        `Invalid Twilio credentials: ${errorText}`,
        "INVALID_CREDENTIALS",
        this.id,
      );
    }
  }

  /**
   * Create Basic Auth header for Twilio
   */
  private makeAuthHeader(): string {
    const credentials = btoa(
      `${this.config.account_sid}:${this.config.auth_token}`,
    );
    return `Basic ${credentials}`;
  }

  /**
   * Map Twilio call status to standard status
   */
  private mapTwilioStatus(twilioStatus: string): Call["status"] {
    const statusMap: Record<string, Call["status"]> = {
      "queued": "initiating",
      "initiated": "initiating",
      "ringing": "ringing",
      "in-progress": "in_progress",
      "completed": "completed",
      "busy": "busy",
      "failed": "failed",
      "no-answer": "no_answer",
      "canceled": "failed",
    };

    return statusMap[twilioStatus.toLowerCase()] || "failed";
  }
}
