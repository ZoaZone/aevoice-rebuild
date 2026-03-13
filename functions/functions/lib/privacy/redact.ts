// lib/privacy/redact.js

import { logger } from "../infra/logger.js";

/**
 * PII patterns for redaction
 */
const PII_PATTERNS = {
  email: {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  phone: {
    pattern: /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    replacement: "[PHONE]",
  },
  ssn: {
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    replacement: "[SSN]",
  },
  creditCard: {
    pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
    replacement: "[CARD]",
  },
  ipAddress: {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: "[IP]",
  },
  // US ZIP codes
  zipCode: {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: "[ZIP]",
  },
};

/**
 * Redact PII from text
 */
export function redactPII(text, options = {}) {
  if (!text || typeof text !== "string") return text;

  const {
    redactEmails = true,
    redactPhones = true,
    redactSSN = true,
    redactCards = true,
    redactIPs = false,
    redactZips = false,
    customPatterns = [],
  } = options;

  let redacted = text;
  let redactionCount = 0;

  if (redactEmails) {
    const matches = redacted.match(PII_PATTERNS.email.pattern);
    if (matches) redactionCount += matches.length;
    redacted = redacted.replace(
      PII_PATTERNS.email.pattern,
      PII_PATTERNS.email.replacement,
    );
  }

  if (redactPhones) {
    const matches = redacted.match(PII_PATTERNS.phone.pattern);
    if (matches) redactionCount += matches.length;
    redacted = redacted.replace(
      PII_PATTERNS.phone.pattern,
      PII_PATTERNS.phone.replacement,
    );
  }

  if (redactSSN) {
    const matches = redacted.match(PII_PATTERNS.ssn.pattern);
    if (matches) redactionCount += matches.length;
    redacted = redacted.replace(
      PII_PATTERNS.ssn.pattern,
      PII_PATTERNS.ssn.replacement,
    );
  }

  if (redactCards) {
    const matches = redacted.match(PII_PATTERNS.creditCard.pattern);
    if (matches) redactionCount += matches.length;
    redacted = redacted.replace(
      PII_PATTERNS.creditCard.pattern,
      PII_PATTERNS.creditCard.replacement,
    );
  }

  if (redactIPs) {
    const matches = redacted.match(PII_PATTERNS.ipAddress.pattern);
    if (matches) redactionCount += matches.length;
    redacted = redacted.replace(
      PII_PATTERNS.ipAddress.pattern,
      PII_PATTERNS.ipAddress.replacement,
    );
  }

  if (redactZips) {
    const matches = redacted.match(PII_PATTERNS.zipCode.pattern);
    if (matches) redactionCount += matches.length;
    redacted = redacted.replace(
      PII_PATTERNS.zipCode.pattern,
      PII_PATTERNS.zipCode.replacement,
    );
  }

  // Apply custom patterns
  for (const custom of customPatterns) {
    if (custom.pattern && custom.replacement) {
      const matches = redacted.match(custom.pattern);
      if (matches) redactionCount += matches.length;
      redacted = redacted.replace(custom.pattern, custom.replacement);
    }
  }

  if (redactionCount > 0) {
    logger.debug("PII redacted", { count: redactionCount });
  }

  return redacted;
}

/**
 * Check if text contains PII
 */
export function containsPII(text) {
  if (!text || typeof text !== "string") return false;

  for (const [type, config] of Object.entries(PII_PATTERNS)) {
    if (config.pattern.test(text)) {
      return true;
    }
    // Reset regex lastIndex
    config.pattern.lastIndex = 0;
  }

  return false;
}

/**
 * Get PII types found in text
 */
export function detectPIITypes(text) {
  if (!text || typeof text !== "string") return [];

  const found = [];

  for (const [type, config] of Object.entries(PII_PATTERNS)) {
    if (config.pattern.test(text)) {
      found.push(type);
    }
    // Reset regex lastIndex
    config.pattern.lastIndex = 0;
  }

  return found;
}
