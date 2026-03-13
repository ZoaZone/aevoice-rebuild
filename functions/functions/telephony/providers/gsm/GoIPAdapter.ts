/**
 * GoIP Gateway Adapter
 * Implements GSM gateway provider for GoIP devices (HTTP API based)
 * Supports: GoIP-1, GoIP-4, GoIP-8, GoIP-16, GoIP-32
 */

import { GSMGatewayProvider } from "./GSMGatewayProvider.ts";
import type {
  Call,
  CallOptions,
  GSMChannel,
  InboundCallWebhook,
  ProviderConfig,
} from "../lib/types.ts";
import { TelephonyError } from "../lib/types.ts";
import { logger } from "../../lib/infra/logger.js";
import { normalizePhoneNumber } from "../lib/utils.ts";

/**
 * GoIP Gateway API endpoints
 */
const GOIP_ENDPOINTS = {
  STATUS: "/default/en_US/status.xml",
  SEND_SMS: "/default/en_US/send_sms.html",
  MAKE_CALL: "/default/en_US/goip_make_call.html",
  END_CALL: "/default/en_US/goip_hangup_call.html",
  USSD: "/default/en_US/send_ussd.html",
  INFO: "/default/en_US/gsm_status.html",
};

/**
 * GoIP specific configuration
 */
interface GoIPConfig extends ProviderConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  channels?: number;
  api_timeout_ms?: number;
}

/**
 * GoIP status response interface
 */
interface GoIPChannelStatus {
  line: number;
  gsm_status: string;
  signal_strength: number;
  sim_number: string;
  operator: string;
  registration_status: string;
}

/**
 * GoIP Gateway Provider Implementation
 */
export class GoIPAdapter extends GSMGatewayProvider {
  private baseUrl: string = "";
  private auth: string = "";
  private apiTimeout: number = 10000;

  constructor(id: string, name: string) {
    super(id, name);
  }

  /**
   * Initialize GoIP gateway connection
   */
  protected async initializeGateway(): Promise<void> {
    const config = this.config as GoIPConfig;

    const port = config.port || 80;
    this.baseUrl = `http://${config.host}:${port}`;
    this.apiTimeout = config.api_timeout_ms || 10000;

    // Setup authentication if provided
    if (config.username && config.password) {
      const credentials = btoa(`${config.username}:${config.password}`);
      this.auth = `Basic ${credentials}`;
    }

    logger.info("GoIP gateway connection configured", {
      provider_id: this.id,
      base_url: this.baseUrl,
      has_auth: !!this.auth,
    });
  }

  /**
   * Discover channels on GoIP gateway
   */
  protected async discoverChannels(): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      logger.info("Discovering GoIP channels", {
        request_id: requestId,
        provider_id: this.id,
      });

      // Fetch channel status from gateway
      const statusUrl = `${this.baseUrl}${GOIP_ENDPOINTS.STATUS}`;
      const response = await this.makeGoIPRequest(statusUrl);

      if (!response.ok) {
        throw new TelephonyError(
          `Failed to fetch GoIP status: ${response.statusText}`,
          "GATEWAY_CONNECTION_ERROR",
          this.id,
        );
      }

      const xmlText = await response.text();
      const channels = this.parseGoIPStatus(xmlText);

      // Register each channel
      for (const channelData of channels) {
        const channel: GSMChannel = {
          id: `${this.id}_ch${channelData.line}`,
          gateway_id: this.id,
          channel_number: channelData.line,
          sim_number: channelData.sim_number,
          network_operator: channelData.operator,
          signal_strength: channelData.signal_strength,
          status: this.mapGoIPStatus(channelData.gsm_status),
        };

        this.channels.set(channelData.line, channel);
      }

      logger.info("GoIP channels discovered", {
        request_id: requestId,
        provider_id: this.id,
        channels_found: this.channels.size,
      });
    } catch (error) {
      logger.error("Failed to discover GoIP channels", {
        request_id: requestId,
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initiate call on GoIP channel
   */
  protected async initiateCall(
    channel: GSMChannel,
    to: string,
    from: string,
    options: CallOptions,
  ): Promise<Call> {
    const requestId = crypto.randomUUID();

    try {
      const callId = `goip_${this.id}_${Date.now()}`;

      // Format phone number (remove non-digits)
      const cleanNumber = normalizePhoneNumber(to).replace(/^\+/, "");

      // Build call initiation URL
      const callUrl = `${this.baseUrl}${GOIP_ENDPOINTS.MAKE_CALL}`;
      const params = new URLSearchParams({
        line: String(channel.channel_number),
        number: cleanNumber,
        hangup_timeout: String(options.timeout_seconds || 120),
      });

      const response = await this.makeGoIPRequest(
        `${callUrl}?${params.toString()}`,
      );

      if (!response.ok) {
        throw new TelephonyError(
          `GoIP call initiation failed: ${response.statusText}`,
          "CALL_INITIATION_FAILED",
          this.id,
        );
      }

      const call: Call = {
        id: callId,
        provider_id: this.id,
        provider_call_id: callId,
        from: channel.sim_number || from,
        to: cleanNumber,
        direction: "outbound",
        status: "initiating",
        started_at: new Date().toISOString(),
        metadata: {
          channel_number: channel.channel_number,
          gateway_id: this.id,
        },
      };

      logger.info("GoIP call initiated", {
        request_id: requestId,
        call_id: callId,
        channel: channel.channel_number,
      });

      return call;
    } catch (error) {
      logger.error("Failed to initiate GoIP call", {
        request_id: requestId,
        channel: channel.channel_number,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process inbound webhook from GoIP
   */
  protected processInboundWebhook(
    webhook: InboundCallWebhook,
  ): Promise<Call> {
    const callId = webhook.provider_call_id || `goip_inbound_${Date.now()}`;

    const call: Call = {
      id: callId,
      provider_id: this.id,
      provider_call_id: callId,
      from: webhook.from,
      to: webhook.to,
      direction: "inbound",
      status: "ringing",
      started_at: webhook.timestamp || new Date().toISOString(),
      metadata: webhook.raw_payload,
    };

    return Promise.resolve(call);
  }

  /**
   * Terminate call on GoIP channel
   */
  protected async terminateCall(
    channel: GSMChannel,
    callId: string,
  ): Promise<void> {
    const requestId = crypto.randomUUID();

    try {
      const hangupUrl = `${this.baseUrl}${GOIP_ENDPOINTS.END_CALL}`;
      const params = new URLSearchParams({
        line: String(channel.channel_number),
      });

      const response = await this.makeGoIPRequest(
        `${hangupUrl}?${params.toString()}`,
      );

      if (!response.ok) {
        logger.warn("GoIP call termination warning", {
          request_id: requestId,
          channel: channel.channel_number,
          status: response.status,
        });
      }

      logger.info("GoIP call terminated", {
        request_id: requestId,
        call_id: callId,
        channel: channel.channel_number,
      });
    } catch (error) {
      logger.error("Failed to terminate GoIP call", {
        request_id: requestId,
        call_id: callId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - call might have already ended
    }
  }

  /**
   * Check GoIP gateway health
   */
  protected async checkGatewayHealth(): Promise<boolean> {
    try {
      const statusUrl = `${this.baseUrl}${GOIP_ENDPOINTS.STATUS}`;
      const response = await this.makeGoIPRequest(statusUrl);
      return response.ok;
    } catch (error) {
      logger.error("GoIP health check failed", {
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Update channel status from GoIP gateway
   */
  protected async updateChannelStatus(): Promise<void> {
    try {
      const statusUrl = `${this.baseUrl}${GOIP_ENDPOINTS.STATUS}`;
      const response = await this.makeGoIPRequest(statusUrl);

      if (!response.ok) {
        return;
      }

      const xmlText = await response.text();
      const channels = this.parseGoIPStatus(xmlText);

      // Update existing channels
      for (const channelData of channels) {
        const existingChannel = this.channels.get(channelData.line);
        if (existingChannel) {
          existingChannel.signal_strength = channelData.signal_strength;
          existingChannel.network_operator = channelData.operator;

          // Only update status if not currently in use
          if (existingChannel.status !== "in_use") {
            existingChannel.status = this.mapGoIPStatus(channelData.gsm_status);
          }

          this.channels.set(channelData.line, existingChannel);
        }
      }
    } catch (error) {
      logger.warn("Failed to update GoIP channel status", {
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Cleanup GoIP gateway resources
   */
  protected cleanupGateway(): Promise<void> {
    logger.info("GoIP gateway cleanup complete", {
      provider_id: this.id,
    });
    return Promise.resolve();
  }

  /**
   * Make HTTP request to GoIP gateway
   */
  private async makeGoIPRequest(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

    try {
      const headers: HeadersInit = {
        "User-Agent": "AEVOICE-GoIP-Client/1.0",
      };

      if (this.auth) {
        headers["Authorization"] = this.auth;
      }

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse GoIP status XML response
   */
  private parseGoIPStatus(xmlText: string): GoIPChannelStatus[] {
    const channels: GoIPChannelStatus[] = [];

    try {
      // Simple XML parsing for GoIP status
      // Format: <line1>status,signal,number,operator</line1>
      const linePattern = /<line(\d+)>([^<]+)<\/line\1>/g;
      let match;

      while ((match = linePattern.exec(xmlText)) !== null) {
        const lineNumber = parseInt(match[1], 10);
        const data = match[2].split(",");

        if (data.length >= 4) {
          channels.push({
            line: lineNumber,
            gsm_status: data[0].trim(),
            signal_strength: parseInt(data[1], 10) || -100,
            sim_number: data[2].trim(),
            operator: data[3].trim(),
            registration_status: data[0].trim(),
          });
        }
      }
    } catch (error) {
      logger.error("Failed to parse GoIP status XML", {
        provider_id: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return channels;
  }

  /**
   * Map GoIP status string to channel status
   */
  private mapGoIPStatus(goipStatus: string): GSMChannel["status"] {
    const status = goipStatus.toLowerCase();

    if (status.includes("idle") || status.includes("ready")) {
      return "available";
    }

    if (status.includes("call") || status.includes("busy")) {
      return "in_use";
    }

    if (status.includes("error") || status.includes("fail")) {
      return "error";
    }

    return "offline";
  }

  /**
   * Send SMS via GoIP channel (bonus feature)
   */
  public async sendSMS(
    channelNumber: number,
    to: string,
    message: string,
  ): Promise<boolean> {
    const requestId = crypto.randomUUID();

    try {
      const smsUrl = `${this.baseUrl}${GOIP_ENDPOINTS.SEND_SMS}`;
      const params = new URLSearchParams({
        line: String(channelNumber),
        number: normalizePhoneNumber(to).replace(/^\+/, ""),
        message: encodeURIComponent(message),
      });

      const response = await this.makeGoIPRequest(
        `${smsUrl}?${params.toString()}`,
      );

      logger.info("GoIP SMS sent", {
        request_id: requestId,
        channel: channelNumber,
        success: response.ok,
      });

      return response.ok;
    } catch (error) {
      logger.error("Failed to send GoIP SMS", {
        request_id: requestId,
        channel: channelNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
