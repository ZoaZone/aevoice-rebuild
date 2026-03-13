/**
 * Centralized Type Definitions for AEVOICE AI
 *
 * This module contains shared type definitions used across the codebase.
 * Moving types here improves type safety and reduces `any` usage.
 *
 * TYPE SAFETY FIX: Replaces 20+ instances of `any` with concrete types
 */

// ==================== AGENT TYPES ====================

/**
 * Agent entity structure from Base44
 * Used in conversationOrchestrator cache
 * TYPE SAFETY FIX (Phase 2B #1): Extended with 15+ missing properties
 */
export interface Agent {
  id: string;
  client_id: string;
  name: string;

  // Core configuration
  system_prompt?: string;
  knowledge_base_ids?: string[];
  phone_number?: string;
  status?: "active" | "paused" | "archived";
  approved?: boolean;

  // Voice & Language (Phase 2B #1)
  phone_assistant_name?: string;
  language?: string; // Default language (e.g., "en-US")
  voice_id?: string; // ElevenLabs/OpenAI voice ID
  auto_language_detection?: boolean;
  supported_languages?: string[]; // e.g., ["en-US", "es-ES", "fr-FR"]

  // Legacy voice_config (kept for backward compatibility)
  voice_config?: {
    provider?: string;
    voice_id?: string;
    language?: string;
  };

  // AI Configuration (Phase 2B #1)
  llm_config?: LLMConfig;
  guardrails?: Guardrails;

  // Business settings (Phase 2B #1)
  co_brand_opt_in?: boolean;
  byollm_enabled?: boolean;

  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string; // User email who created agent
  metadata?: Record<string, unknown>;
}

/**
 * LLM configuration for agent responses
 * TYPE SAFETY FIX (Phase 2B #2): Structured config object
 */
export interface LLMConfig {
  model?: string; // e.g., "gpt-4o-mini", "gpt-4o"
  temperature?: number; // 0.0 - 2.0
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  timeout_ms?: number; // Custom timeout for LLM calls
}

/**
 * Guardrails configuration for safety and escalation
 * TYPE SAFETY FIX (Phase 2B #3): Structured guardrails object
 */
export interface Guardrails {
  restricted_topics?: string[]; // Topics agent should not discuss
  escalation_keywords?: string[]; // Keywords that trigger escalation
  safety_mode?: "strict" | "moderate" | "permissive";
  max_retries?: number;
  escalation_enabled?: boolean;
}

// ==================== KNOWLEDGE BASE TYPES ====================

/**
 * Knowledge base chunk with embedding vector
 * Used in conversationOrchestrator KB cache
 */
export interface KnowledgeChunk {
  id: string;
  knowledge_base_id: string;
  content: string;
  embedding?: number[];
  metadata?: {
    source?: string;
    page?: number;
    section?: string;
    confidence?: number;
  };
  created_at?: string;
}

// ==================== CONVERSATION SESSION TYPES ====================

/**
 * Conversation session state management
 * TYPE SAFETY FIX (Phase 2B #4-7): Replaces implicit session object
 */
export interface ConversationSession {
  // Session tracking
  turn: number;
  last_intent: string | null;

  // Conversation context (Phase 2B #5)
  context: ConversationMessage[];

  // Usage tracking (Phase 2B #6)
  usage_stats: UsageStats;

  // Language detection (Phase 2B #7)
  detected_language?: string;

  // Escalation (Phase 2B #8)
  escalation_suggested?: boolean;
  escalation_reason?: string;

  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * Message in conversation context
 * TYPE SAFETY FIX (Phase 2B #5): Fixes 'never[]' type error
 */
export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Usage statistics for conversation session
 * TYPE SAFETY FIX (Phase 2B #6): Structured usage tracking
 */
export interface UsageStats {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

/**
 * LLM response with usage information
 * TYPE SAFETY FIX (Phase 2B #9): Replaces implicit llmResult type
 */
export interface LLMResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    input_tokens?: number; // Alias for prompt_tokens
    output_tokens?: number; // Alias for completion_tokens
  };
  finish_reason?: string;
  model?: string;
}

// ==================== CRM TYPES ====================

/**
 * Salesforce API response for contact creation
 * TYPE SAFETY FIX: Replaces `any` in crmConnectors.ts:131
 */
export interface SalesforceContactResponse {
  id: string;
  success: boolean;
  errors?: Array<{
    message: string;
    errorCode: string;
    fields?: string[];
  }>;
}

/**
 * HubSpot API response for contact creation
 * TYPE SAFETY FIX: Replaces `any` in crmConnectors.ts:205
 */
export interface HubSpotContactResponse {
  id: string;
  properties: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

/**
 * Zoho API response for contact creation
 * TYPE SAFETY FIX: Replaces `any` in crmConnectors.ts:285
 */
export interface ZohoContactResponse {
  data: Array<{
    code: string;
    details: {
      id: string;
      created_time?: string;
      modified_time?: string;
    };
    message: string;
    status: string;
  }>;
}

/**
 * Generic CRM API response union type
 * Supports all major CRM providers
 */
export type CRMApiResponse =
  | SalesforceContactResponse
  | HubSpotContactResponse
  | ZohoContactResponse;

/**
 * CRM update payload (provider-agnostic)
 * Used when syncing contact updates
 */
export interface CRMUpdatePayload {
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  Company?: string;
  Description?: string;
  // Salesforce-specific
  LeadSource?: string;
  // HubSpot-specific (nested in properties)
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  // Zoho-specific
  First_Name?: string;
  Last_Name?: string;
  Account_Name?: string;
}

// ==================== FLOWSYNC TYPES ====================

/**
 * FlowSync API response structure
 * TYPE SAFETY FIX: Replaces `any` in flowSyncIntegration.ts:88
 */
export interface FlowSyncApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
  };
}

/**
 * Workflow execution result
 * TYPE SAFETY FIX: Replaces `any` in flowSyncIntegration.ts:380
 */
export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  output?: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
  steps?: Array<{
    name: string;
    status: "pending" | "running" | "completed" | "failed";
    duration_ms?: number;
  }>;
}

/**
 * Workflow monitoring metrics
 * Used in monitorWorkflowStatus function
 */
export interface WorkflowMetrics {
  total_executions: number;
  successful: number;
  failed: number;
  avg_duration_ms?: number;
  last_execution_at?: string;
}

// ==================== LOGGING TYPES ====================

/**
 * Serializable function parameters for logging
 * TYPE SAFETY FIX: Replaces `any` in logging.ts:105, 116
 */
export type LoggableParams =
  | string
  | number
  | boolean
  | null
  | undefined
  | LoggableParams[]
  | { [key: string]: LoggableParams };

/**
 * Serializable function result for logging
 * Prevents logging of complex objects like Promises, Functions, etc.
 */
export type LoggableResult =
  | string
  | number
  | boolean
  | null
  | undefined
  | LoggableResult[]
  | { [key: string]: LoggableResult };

/**
 * Error object that can be logged
 * TYPE SAFETY FIX: Replaces `Error | any` in logging.ts
 */
export interface LoggableError {
  message: string;
  stack?: string;
  name?: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * Convert unknown error to loggable format
 * Handles Error instances, plain objects, and primitives
 */
export function toLoggableError(error: unknown): LoggableError {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error as Record<string, unknown>),
    };
  }

  if (typeof error === "object" && error !== null) {
    return {
      message: (error as { message?: string }).message || "Unknown error",
      ...(error as Record<string, unknown>),
    };
  }

  return {
    message: String(error),
  };
}

// ==================== VALIDATION TYPES ====================

/**
 * Validation error value
 * TYPE SAFETY FIX: Replaces `any` in logging.ts:182
 */
export type ValidationValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ValidationValue[]
  | { [key: string]: ValidationValue };

// ==================== CACHE TYPES ====================

/**
 * Generic cache entry metadata
 * Used across all cache implementations
 */
export interface CacheMetadata {
  client_id?: string;
  language?: string;
  version?: string;
  classification?: string;
  [key: string]: unknown;
}

// ==================== HELLOBIZ TYPES ====================

/**
 * HelloBiz provider account response
 * Used in helloBizClient.ts
 */
export interface HelloBizProviderResponse {
  providerId: string;
  businessName: string;
  profileUrl: string;
  status: "active" | "pending" | "suspended";
  credentials?: {
    apiKey: string;
    apiSecret?: string;
  };
  metadata?: Record<string, unknown>;
}

// ==================== UTILITY TYPES ====================

/**
 * JSON-serializable value
 * Useful for API requests/responses and logging
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Deeply partial type (makes all nested properties optional)
 * Useful for update operations
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Require at least one property
 * Useful for ensuring at least one field is provided in updates
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  & Pick<
    T,
    Exclude<keyof T, Keys>
  >
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// ==================== TYPE GUARDS ====================

/**
 * Check if value is a valid Error object
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Check if value is JSON-serializable
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (type === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

/**
 * Check if value is a record with string keys
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ==================== EXTERNAL API TYPES (PHASE 2A) ====================

// ==================== STRIPE API TYPES ====================

/**
 * Stripe Webhook Event Structure
 * TYPE SAFETY FIX (Phase 2A): Replaces `any` in stripeWebhook.ts event handling
 */
export interface StripeWebhookEvent {
  id: string;
  object: "event";
  type: string;
  data: {
    object:
      | StripeCheckoutSession
      | StripeSubscription
      | StripeInvoice
      | StripeCustomer
      | Record<string, unknown>;
  };
  api_version: string | null;
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  } | null;
}

/**
 * Stripe Checkout Session
 * Used in checkout.session.completed events
 */
export interface StripeCheckoutSession {
  id: string;
  object: "checkout.session";
  mode: "payment" | "setup" | "subscription";
  customer: string | null;
  customer_email: string | null;
  subscription: string | null;
  payment_intent: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "complete" | "expired" | "open";
  metadata?: Record<string, string>;
  success_url: string;
  cancel_url: string;
  url: string | null;
}

/**
 * Stripe Subscription
 * Used in subscription lifecycle events
 */
export interface StripeSubscription {
  id: string;
  object: "subscription";
  customer: string;
  status:
    | "active"
    | "past_due"
    | "unpaid"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "trialing";
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  trial_start: number | null;
  trial_end: number | null;
  items: {
    object: "list";
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: "day" | "week" | "month" | "year";
          interval_count: number;
        } | null;
      };
      quantity: number;
    }>;
  };
  metadata?: Record<string, string>;
}

/**
 * Stripe Invoice
 * Used in invoice payment events
 */
export interface StripeInvoice {
  id: string;
  object: "invoice";
  customer: string;
  subscription: string | null;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  metadata?: Record<string, string>;
}

/**
 * Stripe Customer
 * Used in customer lifecycle events
 */
export interface StripeCustomer {
  id: string;
  object: "customer";
  email: string | null;
  name: string | null;
  phone: string | null;
  metadata?: Record<string, string>;
  created: number;
  balance: number;
}

/**
 * Stripe Product
 * Used for product lookups
 */
export interface StripeProduct {
  id: string;
  object: "product";
  name: string;
  description: string | null;
  active: boolean;
  metadata?: Record<string, string>;
}

/**
 * Stripe Price
 * Used for pricing information
 */
export interface StripePrice {
  id: string;
  object: "price";
  product: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  } | null;
  type: "one_time" | "recurring";
}

// ==================== TWILIO API TYPES ====================

/**
 * Twilio Webhook Request Data
 * TYPE SAFETY FIX (Phase 2A): Replaces `any` in twilioWebhook.ts FormData handling
 */
export interface TwilioWebhookData {
  CallSid: string;
  From: string;
  To: string;
  CallStatus?:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer"
    | "canceled";
  CallDuration?: string;
  Duration?: string;
  SpeechResult?: string;
  Confidence?: string;
  AccountSid?: string;
  Direction?: "inbound" | "outbound-api" | "outbound-dial";
  [key: string]: string | undefined;
}

/**
 * Twilio Available Phone Number
 * Used in searchTwilioNumbers.ts
 */
export interface TwilioAvailablePhoneNumber {
  friendly_name: string;
  phone_number: string;
  lata: string | null;
  rate_center: string | null;
  latitude: string | null;
  longitude: string | null;
  region: string;
  postal_code: string | null;
  iso_country: string;
  address_requirements: "none" | "any" | "local" | "foreign";
  beta: boolean;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
    fax: boolean;
  };
}

/**
 * Twilio API Response for available phone numbers
 */
export interface TwilioAvailableNumbersResponse {
  uri: string;
  available_phone_numbers: TwilioAvailablePhoneNumber[];
}

// ==================== SENDGRID API TYPES ====================

/**
 * SendGrid Email Request Payload
 * TYPE SAFETY FIX (Phase 2A): Replaces `any` in sendOTP.ts and emailService.ts
 */
export interface SendGridEmailPayload {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject: string;
    dynamic_template_data?: Record<string, unknown>;
  }>;
  from: {
    email: string;
    name?: string;
  };
  reply_to?: {
    email: string;
    name?: string;
  };
  content?: Array<{
    type: "text/plain" | "text/html";
    value: string;
  }>;
  template_id?: string;
  custom_args?: Record<string, string>;
  send_at?: number;
}

/**
 * SendGrid API Error Response
 */
export interface SendGridErrorResponse {
  errors: Array<{
    message: string;
    field?: string;
    help?: string;
  }>;
}

// ==================== OPENAI API TYPES ====================

/**
 * OpenAI Chat Completion Request
 * TYPE SAFETY FIX (Phase 2A): Replaces `any` in aiGateway.ts and conversationOrchestrator.ts
 */
export interface OpenAIChatCompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "function";
    content: string;
    name?: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  functions?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
  function_call?: "none" | "auto" | { name: string };
}

/**
 * OpenAI Chat Completion Response
 */
export interface OpenAIChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant" | "function";
      content: string | null;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason:
      | "stop"
      | "length"
      | "function_call"
      | "content_filter"
      | null;
    logprobs: unknown | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Embedding Request
 * Used in embedding generation
 */
export interface OpenAIEmbeddingRequest {
  model: string;
  input: string | string[];
  encoding_format?: "float" | "base64";
  user?: string;
}

/**
 * OpenAI Embedding Response
 */
export interface OpenAIEmbeddingResponse {
  object: "list";
  data: Array<{
    object: "embedding";
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI TTS (Text-to-Speech) Request
 * Used in previewVoice.ts
 */
export interface OpenAITTSRequest {
  model: "tts-1" | "tts-1-hd";
  input: string;
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  response_format?: "mp3" | "opus" | "aac" | "flac";
  speed?: number; // 0.25 to 4.0
}

/**
 * OpenAI Error Response
 */
export interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}

// ==================== ELEVENLABS API TYPES ====================

/**
 * ElevenLabs Text-to-Speech Request
 * TYPE SAFETY FIX (Phase 2A): Replaces `any` in previewVoice.ts
 */
export interface ElevenLabsTTSRequest {
  text: string;
  model_id: string;
  voice_settings?: {
    stability: number; // 0 to 1
    similarity_boost: number; // 0 to 1
    style?: number; // 0 to 1
    use_speaker_boost?: boolean;
  };
}

/**
 * ElevenLabs Voice Model
 */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

/**
 * ElevenLabs Error Response
 */
export interface ElevenLabsErrorResponse {
  detail: {
    status: string;
    message: string;
  } | string;
}

// ==================== TYPE GUARDS FOR EXTERNAL APIs ====================

/**
 * Type guard for Stripe Checkout Session
 */
export function isStripeCheckoutSession(
  obj: unknown,
): obj is StripeCheckoutSession {
  return isRecord(obj) && obj.object === "checkout.session" &&
    typeof obj.id === "string";
}

/**
 * Type guard for Stripe Subscription
 */
export function isStripeSubscription(obj: unknown): obj is StripeSubscription {
  return isRecord(obj) && obj.object === "subscription" &&
    typeof obj.id === "string";
}

/**
 * Type guard for OpenAI Chat Completion Response
 */
export function isOpenAIChatCompletionResponse(
  obj: unknown,
): obj is OpenAIChatCompletionResponse {
  return (
    isRecord(obj) &&
    obj.object === "chat.completion" &&
    Array.isArray(obj.choices) &&
    isRecord(obj.usage)
  );
}

/**
 * Type guard for OpenAI Embedding Response
 */
export function isOpenAIEmbeddingResponse(
  obj: unknown,
): obj is OpenAIEmbeddingResponse {
  return (
    isRecord(obj) &&
    obj.object === "list" &&
    Array.isArray(obj.data) &&
    isRecord(obj.usage)
  );
}

/**
 * Extract Stripe event data with type safety
 * Handles all Stripe webhook event types
 */
export function extractStripeEventData<
  T extends
    | StripeCheckoutSession
    | StripeSubscription
    | StripeInvoice
    | StripeCustomer,
>(
  event: StripeWebhookEvent,
  expectedType: "checkout.session" | "subscription" | "invoice" | "customer",
): T | null {
  const obj = event.data.object;

  if (!isRecord(obj) || obj.object !== expectedType) {
    return null;
  }

  return obj as T;
}

// ==================== BASE44 SDK TYPES ====================

/**
 * TYPE SAFETY FIX (Phase 2D #1-20): Base44 SDK Client Interface
 * Replaces 20+ instances of `base44: any` across the codebase
 *
 * This interface provides type safety for Base44 SDK operations
 * Used in: conversationOrchestrator, knowledgeSharing, latencyTracker,
 * agentKnowledgeManagement, telephony functions, and more
 */
export interface Base44Client {
  // Authentication
  auth: {
    me(): Promise<Base44User | null>;
  };

  // Entity operations (with service role support)
  entities: {
    [entityName: string]: {
      findById(id: string): Promise<any>;
      filter(params: Record<string, unknown>): Promise<any[]>;
      create(data: Record<string, unknown>): Promise<any>;
      update(id: string, data: Record<string, unknown>): Promise<any>;
      delete(id: string): Promise<void>;
      list(): Promise<any[]>;
    };
  };

  // Service role operations (bypasses RLS)
  asServiceRole: {
    entities: {
      [entityName: string]: {
        findById(id: string): Promise<any>;
        filter(params: Record<string, unknown>): Promise<any[]>;
        create(data: Record<string, unknown>): Promise<any>;
        update(id: string, data: Record<string, unknown>): Promise<any>;
        delete(id: string): Promise<void>;
        list(): Promise<any[]>;
      };
    };
    functions: {
      invoke(
        name: string,
        params: Record<string, unknown>,
      ): Promise<{ data?: any; error?: string }>;
    };
  };

  // Function invocations
  functions: {
    invoke(
      name: string,
      params: Record<string, unknown>,
    ): Promise<{ data?: any; error?: string }>;
  };
}

/**
 * Base44 User object returned by auth.me()
 */
export interface Base44User {
  id: string;
  email: string;
  role?: "user" | "admin";
  client_id?: string;
  metadata?: Record<string, unknown>;
}

// ==================== REQUEST BODY TYPES ====================

/**
 * TYPE SAFETY FIX (Phase 2D #21-35): Request body types for API functions
 * Replaces 15+ instances of `body: any` in handler functions
 */

/**
 * Agent Knowledge Management request bodies
 */
export interface AddChunkRequest {
  agent_id: string;
  chunk_id: string;
  permission?: "read" | "write";
}

export interface ShareKnowledgeRequest {
  source_agent_id: string;
  target_agent_id: string;
  chunk_ids?: string[];
  permission?: "read" | "write";
}

export interface UnshareKnowledgeRequest {
  source_agent_id: string;
  target_agent_id: string;
  chunk_ids?: string[];
}

export interface GetAgentChunksRequest {
  agent_id: string;
}

export interface GetStatsRequest {
  agent_id: string;
}

export interface GetAccessListRequest {
  agent_id: string;
}

/**
 * Telephony Provider Management request bodies
 */
export interface CreateProviderRequest {
  client_id: string;
  name: string;
  type: "twilio" | "plivo" | "bsnl_wings" | "sip";
  credentials: {
    account_sid?: string;
    auth_token?: string;
    api_key?: string;
    api_secret?: string;
    sip_uri?: string;
    sip_username?: string;
    sip_password?: string;
  };
  config?: Record<string, unknown>;
}

export interface ListProvidersRequest {
  client_id?: string;
  type?: string;
  status?: string;
}

export interface GetProviderRequest {
  provider_id: string;
}

export interface UpdateProviderRequest {
  provider_id: string;
  name?: string;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  status?: "active" | "inactive" | "error";
}

export interface DeleteProviderRequest {
  provider_id: string;
}

export interface TestProviderConnectionRequest {
  provider_id: string;
}

export interface GetProviderHealthRequest {
  provider_id: string;
}

export interface GetProviderChannelsRequest {
  provider_id: string;
}

// ==================== LATENCY METRICS TYPES ====================

/**
 * TYPE SAFETY FIX (Phase 2D #36-41): Latency metrics types
 * Replaces 6 instances of `any` in getLatencyMetrics.ts
 */
export interface LatencyMetric {
  id: string;
  platform: "sri" | "aeva" | "all";
  operation: string;
  duration_ms: number;
  timestamp: string;
  client_id?: string;
  agent_id?: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface LatencyStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
}

export interface PlatformLatencyStats {
  platform: "sri" | "aeva";
  stats: LatencyStats;
}

// ==================== VALIDATION TYPES ====================

/**
 * TYPE SAFETY FIX (Phase 2D #42): Agent validation consistency check
 */
export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

// ==================== SECRET MANAGEMENT TYPES ====================

/**
 * TYPE SAFETY FIX (Phase 2D #43): FlowSync secrets metadata
 */
export interface SecretMetadata {
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  tags?: string[];
  description?: string;
  [key: string]: unknown;
}

// ==================== WORKFLOW TYPES ====================

/**
 * TYPE SAFETY FIX (Phase 2D #44): Workflow seed template step config
 */
export interface WorkflowStepConfig {
  action?: string;
  target?: string;
  template?: string;
  delay?: number;
  condition?: Record<string, unknown>;
  [key: string]: unknown;
}

// ==================== UTILITY TYPES ====================

/**
 * Generic metadata type that enforces unknown values
 * Use this instead of Record<string, any>
 */
export type Metadata = Record<string, unknown>;
