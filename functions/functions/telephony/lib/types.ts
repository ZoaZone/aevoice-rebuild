/**
 * Core telephony provider type definitions
 * Provides unified interface for GSM gateways, SIP trunks, and API providers
 */

/**
 * Provider types supported by the system
 */
export type ProviderType = "gsm_gateway" | "sip_trunk" | "api_provider";

/**
 * Provider operational status
 */
export type ProviderStatus = "active" | "inactive" | "maintenance" | "error";

/**
 * Call direction
 */
export type CallDirection = "inbound" | "outbound";

/**
 * Call status throughout lifecycle
 */
export type CallStatus =
  | "initiating"
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer"
  | "busy";

/**
 * Provider configuration interface
 * Generic config that can hold provider-specific settings
 */
export interface ProviderConfig {
  // GSM Gateway specific
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  channels?: number;

  // SIP specific
  sip_domain?: string;
  sip_username?: string;
  sip_password?: string;
  sip_proxy?: string;

  // API provider specific
  api_key?: string;
  api_secret?: string;
  account_sid?: string;
  auth_token?: string;

  // Common settings
  timeout_seconds?: number;
  retry_attempts?: number;
  enable_recording?: boolean;
  enable_transcription?: boolean;
}

/**
 * Provider health metrics
 */
export interface ProviderHealthMetrics {
  is_healthy: boolean;
  last_check: string;
  uptime_percentage: number;
  average_latency_ms: number;
  error_count: number;
  available_channels: number;
  total_channels: number;
  current_calls: number;
}

/**
 * Call options for initiating outbound calls
 */
export interface CallOptions {
  agent_id: string;
  client_id?: string;
  record_call?: boolean;
  transcribe?: boolean;
  timeout_seconds?: number;
  caller_id?: string;
  webhook_url?: string;
  status_callback_url?: string;
}

/**
 * Call object returned by providers
 */
export interface Call {
  id: string;
  provider_id: string;
  provider_call_id: string;
  from: string;
  to: string;
  direction: CallDirection;
  status: CallStatus;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  cost?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Inbound webhook structure (normalized from various providers)
 */
export interface InboundCallWebhook {
  provider: string;
  provider_call_id: string;
  from: string;
  to: string;
  timestamp: string;
  raw_payload?: Record<string, unknown>;
}

/**
 * Provider interface that all telephony providers must implement
 */
export interface TelephonyProvider {
  /**
   * Unique provider identifier
   */
  id: string;

  /**
   * Human-readable provider name
   */
  name: string;

  /**
   * Provider type
   */
  type: ProviderType;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Make an outbound call
   */
  makeCall(to: string, from: string, options: CallOptions): Promise<Call>;

  /**
   * Receive and process an inbound call webhook
   */
  receiveCall(webhook: InboundCallWebhook): Promise<Call>;

  /**
   * End an active call
   */
  endCall(callId: string): Promise<void>;

  /**
   * Get current provider status and metrics
   */
  getStatus(): Promise<ProviderHealthMetrics>;

  /**
   * Perform health check on provider
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get available channels/capacity
   */
  getAvailableChannels(): Promise<number>;

  /**
   * Cleanup and disconnect
   */
  disconnect(): Promise<void>;
}

/**
 * Routing rule types
 */
export type RoutingRuleType = "cost" | "geo" | "time" | "quality" | "load";

/**
 * Routing rule interface
 */
export interface RoutingRule {
  id: string;
  tenant_id?: string;
  rule_type: RoutingRuleType;
  priority: number;
  conditions: Record<string, unknown>;
  provider_priority: string[]; // Array of provider IDs in order of preference
  enabled: boolean;
}

/**
 * Provider selection criteria
 */
export interface ProviderSelectionCriteria {
  destination_number: string;
  source_number?: string;
  tenant_id?: string;
  country_code?: string;
  required_channels?: number;
  max_cost_per_minute?: number;
  require_recording?: boolean;
}

/**
 * GSM Channel status
 */
export interface GSMChannel {
  id: string;
  gateway_id: string;
  channel_number: number;
  sim_number?: string;
  network_operator?: string;
  signal_strength?: number; // dBm
  status: "available" | "in_use" | "error" | "offline";
  current_call_id?: string;
  last_used?: string;
}

/**
 * Error types for telephony operations
 */
export class TelephonyError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TelephonyError";
  }
}
