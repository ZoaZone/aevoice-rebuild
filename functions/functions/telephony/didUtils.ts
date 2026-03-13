// functions/telephony/didUtils.ts
// DID (Direct Inward Dialing) normalization utilities for SIP routing
// Handles E.164 international format, local format with/without leading zero

/**
 * Normalize a phone number to digits only
 * @param value - Phone number in any format (+914024001355, 914024001355, 04024001355, 4024001355)
 * @returns Normalized digits-only string
 */
export function normalizeNumber(value: string | undefined | null): string {
  if (!value) return "";
  const digits = String(value).replace(/\D+/g, "");
  return digits;
}

/**
 * Generate all possible variants of a DID for tolerant lookup
 * - Full E.164 with country code: 914024001355
 * - Local with leading zero: 04024001355
 * - Local without leading zero: 4024001355
 * @param did - Normalized DID (digits only)
 * @returns Array of variant DIDs
 */
export function generateDidVariants(did: string): string[] {
  if (!did) return [];

  const variants = [did];

  // If starts with country code 91 (India), add local variants
  if (did.startsWith("91") && did.length > 2) {
    const localNumber = did.substring(2); // Remove '91'

    // Add local with leading zero if not already present
    if (localNumber.startsWith("0")) {
      variants.push(localNumber);
      // Add without leading zero
      variants.push(localNumber.substring(1));
    } else {
      // Add with leading zero
      variants.push("0" + localNumber);
      variants.push(localNumber);
    }
  }

  // If starts with 0, add variant without leading zero
  if (did.startsWith("0") && did.length > 1) {
    variants.push(did.substring(1));
    // Also add with country code if it looks like an Indian number
    if (did.length >= 10) {
      variants.push("91" + did.substring(1));
    }
  }

  // If doesn't start with 91 or 0, might be local without leading zero
  if (!did.startsWith("91") && !did.startsWith("0") && did.length >= 9) {
    variants.push("0" + did);
    variants.push("91" + did);
  }

  // Remove duplicates
  return [...new Set(variants)];
}

/**
 * Build a normalized lookup map from SIP_ACCOUNTS
 * Maps all variants of each DID to the same assistant configuration
 * @param sipAccounts - Original SIP_ACCOUNTS map
 * @returns Normalized lookup map with all DID variants
 */
export function buildNormalizedSipAccounts(
  sipAccounts: Record<string, { assistant_name: string }>,
): Record<string, { assistant_name: string }> {
  const normalized: Record<string, { assistant_name: string }> = {};

  for (const [did, config] of Object.entries(sipAccounts)) {
    const normalizedDid = normalizeNumber(did);
    const variants = generateDidVariants(normalizedDid);

    // Map all variants to the same config
    for (const variant of variants) {
      normalized[variant] = config;
    }
  }

  return normalized;
}

/**
 * Find SIP account configuration by DID with tolerant matching
 * @param calleeNumber - Incoming callee number (any format)
 * @param sipAccounts - Original SIP_ACCOUNTS map
 * @returns SIP account configuration or undefined
 */
export function findSipAccountByDid(
  calleeNumber: string | undefined | null,
  sipAccounts: Record<string, { assistant_name: string }>,
): { assistant_name: string } | undefined {
  if (!calleeNumber) return undefined;

  const normalizedLookup = buildNormalizedSipAccounts(sipAccounts);
  const normalizedDid = normalizeNumber(calleeNumber);

  return normalizedLookup[normalizedDid];
}
