/**
 * PII Masking Utilities for AEVOICE AI
 *
 * SECURITY: This module provides utilities to mask personally identifiable
 * information (PII) before logging, preventing sensitive data exposure in
 * production logs and ensuring GDPR/privacy compliance.
 *
 * Usage:
 *   import { maskEmail, maskPhone, maskPII } from "./lib/security/piiMasking.ts";
 *   console.log(`User: ${maskEmail(user.email)}`);
 */

/**
 * Masks an email address, showing only first 2 chars of local part and domain
 * SECURITY: Prevents email address exposure in logs while maintaining debuggability
 *
 * Examples:
 *   "john.doe@example.com" → "jo***@example.com"
 *   "a@test.com" → "a***@test.com"
 *   null/undefined → "[no-email]"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "[no-email]";

  const [local, domain] = email.split("@");
  if (!domain) return "[invalid-email]";

  const maskedLocal = local.length <= 2 ? local.charAt(0) + "***" : local.slice(0, 2) + "***";

  return `${maskedLocal}@${domain}`;
}

/**
 * Masks a phone number, showing only last 4 digits
 * SECURITY: Prevents phone number exposure while allowing call tracing
 *
 * Examples:
 *   "+1234567890" → "***7890"
 *   "555-123-4567" → "***4567"
 *   null/undefined → "[no-phone]"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== "string") return "[no-phone]";

  // Extract only digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";

  return `***${digits.slice(-4)}`;
}

/**
 * Masks a UUID or ID, showing only first 8 chars
 * SECURITY: Allows correlation while hiding full ID
 *
 * Examples:
 *   "550e8400-e29b-41d4-a716-446655440000" → "550e8400-****"
 *   "abc123xyz" → "abc123xy-****"
 */
export function maskId(id: string | null | undefined): string {
  if (!id || typeof id !== "string") return "[no-id]";
  if (id.length <= 8) return id.slice(0, 4) + "****";
  return id.slice(0, 8) + "-****";
}

/**
 * Masks a name, showing only first char of each part
 * SECURITY: Prevents name exposure while maintaining context
 *
 * Examples:
 *   "John Doe" → "J*** D***"
 *   "Alice" → "A***"
 */
export function maskName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "[no-name]";

  return name.split(" ")
    .map((part) => part.charAt(0) + "***")
    .join(" ");
}

/**
 * Generic PII masking for objects - recursively masks known PII fields
 * SECURITY: Comprehensive object sanitization for safe logging
 *
 * Masks these fields: email, phone, password, ssn, credit_card, firstName,
 * lastName, name, address, contact_email
 */
export function maskPII(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskPII(item));
  }

  const masked: any = {};
  const piiFields = new Set([
    "email",
    "contact_email",
    "phone",
    "phone_number",
    "password",
    "ssn",
    "credit_card",
    "firstName",
    "lastName",
    "name",
    "business_name",
    "address",
    "street",
  ]);

  for (const [key, value] of Object.entries(obj)) {
    if (piiFields.has(key)) {
      if (key.includes("email")) {
        masked[key] = maskEmail(value as string);
      } else if (key.includes("phone")) {
        masked[key] = maskPhone(value as string);
      } else if (key.includes("name")) {
        masked[key] = maskName(value as string);
      } else {
        masked[key] = "[REDACTED]";
      }
    } else if (typeof value === "object") {
      masked[key] = maskPII(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Creates a structured log context with masked PII and correlation IDs
 * SECURITY: Ensures consistent logging format with PII protection
 *
 * @param requestId - Unique request identifier for tracing
 * @param tenantId - Client/tenant ID for multi-tenant isolation tracking
 * @param agentId - Agent ID for operation attribution
 * @param additionalContext - Any additional context (will be PII-masked)
 */
export function createLogContext(
  requestId: string,
  tenantId?: string | null,
  agentId?: string | null,
  additionalContext?: Record<string, any>,
): Record<string, any> {
  const context: Record<string, any> = {
    request_id: requestId,
  };

  if (tenantId) context.tenant_id = maskId(tenantId);
  if (agentId) context.agent_id = maskId(agentId);

  if (additionalContext) {
    Object.assign(context, maskPII(additionalContext));
  }

  return context;
}
