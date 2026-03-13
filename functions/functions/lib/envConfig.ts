/**
 * Environment Configuration Module
 * Centralizes all environment-dependent URLs and secrets
 */

// Environment detection
export const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";
export const IS_PRODUCTION = ENV === "production";

// Base URLs
export const AEVOICE_BASE_URL = Deno.env.get("AEVOICE_BASE_URL") ||
  "https://aevoice.base44.app";
export const AEVOICE_APP_ID = Deno.env.get("AEVOICE_APP_ID") ||
  Deno.env.get("BASE44_APP_ID") || "692b24a5bac54e3067972063";

// Webhook URLs - accept optional appId to support request-specific routing
export const WEBHOOK_BASE_URL = (appId?: string) =>
  `${AEVOICE_BASE_URL}/api/apps/${appId || AEVOICE_APP_ID}/functions`;
export const TWILIO_WEBHOOK_URL = (token?: string, appId?: string) =>
  `${WEBHOOK_BASE_URL(appId)}/twilioWebhook${token ? `?token=${token}` : ""}`;
export const ASTERISK_WEBHOOK_URL = (token?: string, appId?: string) =>
  `${WEBHOOK_BASE_URL(appId)}/asteriskWebhook${token ? `?token=${token}` : ""}`;

// Frontend URLs
export const ONBOARDING_URL = `${AEVOICE_BASE_URL}/Onboarding`;
export const AGENCY_PORTAL_URL = `${AEVOICE_BASE_URL}/AgencyPortal`;
export const AFFILIATE_PORTAL_URL = `${AEVOICE_BASE_URL}/AffiliatePortal`;
export const ADMIN_DASHBOARD_URL = `${AEVOICE_BASE_URL}/AdminDashboard`;

// External API URLs
export const OPENAI_API_URL = "https://api.openai.com/v1";
export const OPENAI_EMBEDDINGS_URL = `${OPENAI_API_URL}/embeddings`;
export const OPENAI_CHAT_URL = `${OPENAI_API_URL}/chat/completions`;

export const SENDGRID_API_URL = "https://api.sendgrid.com/v3";
export const SENDGRID_MAIL_URL = `${SENDGRID_API_URL}/mail/send`;

export const TWILIO_API_URL = (accountSid: string) =>
  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;

export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1";

// Third-party integrations
export const HELLOBIZ_API_URL = Deno.env.get("HELLOBIZ_API_URL") ||
  "https://api.hellobiz.app/v1";
export const FLOWSYNC_API_URL = Deno.env.get("FLOWSYNC_API_URL") ||
  "https://api.workautomation.app/v1";
export const PAY_HELLOBIZ_API_URL = Deno.env.get("PAY_HELLOBIZ_API_URL") ||
  "https://pay.hellobiz.app/api";
export const ZOAZONE_SERVICES_API_URL = Deno.env.get("ZOAZONE_SERVICES_API_URL") ||
  "https://zoazoneservices.com/api";

// Viral Dashboard
export const VIRAL_DASHBOARD_API_URL = Deno.env.get("VIRAL_DASHBOARD_API_URL") ||
  "https://app.viraldashboard.io/api";
export const FLAXXA_AI_API_URL = Deno.env.get("FLAXXA_AI_API_URL") ||
  "https://ai.flaxxa.com/api";
export const LEADS_FYNDER_API_URL = Deno.env.get("LEADS_FYNDER_API_URL") ||
  "https://app.leadsfynder.com/api";
export const FLOWOMATIC_API_URL = Deno.env.get("FLOWOMATIC_API_URL") ||
  "https://app.flowomatic.com/api";

// CRM APIs
export const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3";
export const ZOHO_CRM_API_URL = "https://www.zohoapis.com/crm/v3";

// Validation helpers
export function validateRequiredEnvVars() {
  const required = ["AEVOICE_BASE_URL", "AEVOICE_APP_ID"];
  const missing = required.filter((key) => !Deno.env.get(key));

  if (IS_PRODUCTION && missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(", ")}`,
    );
  }

  return missing.length === 0;
}

// Log configuration (only in development)
if (!IS_PRODUCTION) {
  console.log("[EnvConfig] Environment configuration loaded:", {
    ENV,
    IS_PRODUCTION,
    AEVOICE_BASE_URL,
    AEVOICE_APP_ID,
    WEBHOOK_BASE_URL: WEBHOOK_BASE_URL(),
    HELLOBIZ_API_URL,
    FLOWSYNC_API_URL,
  });
}
