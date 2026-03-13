/**
 * URL Allowlist Utility
 *
 * Validates that URLs to be scraped are within the tenant's
 * registered domains to prevent arbitrary site scraping.
 *
 * Usage:
 *   const isAllowed = await isUrlAllowedForTenant(url, clientRecord);
 *   if (!isAllowed) return Response.json({ error: 'URL not allowed' }, { status: 400 });
 */

import { logger } from "../lib/infra/logger.js";

export interface ClientRecord {
  id: string;
  website?: string;
  domains?: string[];
  metadata?: {
    allowed_domains?: string[];
    allow_subdomains?: boolean;
  };
}

/**
 * Extract hostname from URL
 */
function getHostname(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch (error) {
    logger.warn("Invalid URL format", { url, error: error.message });
    return null;
  }
}

/**
 * Check if hostname matches domain (with optional subdomain support)
 */
function hostnameMatchesDomain(
  hostname: string,
  domain: string,
  allowSubdomains: boolean,
): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, "");

  // Exact match
  if (normalizedHostname === normalizedDomain) {
    return true;
  }

  // Subdomain match (if enabled)
  if (allowSubdomains && normalizedHostname.endsWith(`.${normalizedDomain}`)) {
    return true;
  }

  return false;
}

/**
 * Validate that a URL is allowed for the tenant
 *
 * @param url - URL to validate
 * @param clientRecord - Client/tenant record with domain information
 * @returns true if URL is allowed, false otherwise
 */
export function isUrlAllowedForTenant(
  url: string,
  clientRecord: ClientRecord,
): boolean {
  try {
    const hostname = getHostname(url);
    if (!hostname) {
      logger.warn("URL allowlist check failed: invalid URL", {
        url,
        tenant_id: clientRecord.id,
      });
      return false;
    }

    // Get allowed domains from various sources
    const allowedDomains: string[] = [];

    // 1. From client.website
    if (clientRecord.website) {
      const websiteHostname = getHostname(clientRecord.website);
      if (websiteHostname) {
        allowedDomains.push(websiteHostname);
      }
    }

    // 2. From client.domains array
    if (clientRecord.domains && Array.isArray(clientRecord.domains)) {
      for (const domain of clientRecord.domains) {
        const domainHostname = getHostname(
          domain.startsWith("http") ? domain : `https://${domain}`,
        );
        if (domainHostname) {
          allowedDomains.push(domainHostname);
        }
      }
    }

    // 3. From client.metadata.allowed_domains
    if (
      clientRecord.metadata?.allowed_domains &&
      Array.isArray(clientRecord.metadata.allowed_domains)
    ) {
      for (const domain of clientRecord.metadata.allowed_domains) {
        const domainHostname = getHostname(
          domain.startsWith("http") ? domain : `https://${domain}`,
        );
        if (domainHostname) {
          allowedDomains.push(domainHostname);
        }
      }
    }

    // No domains configured - deny by default
    if (allowedDomains.length === 0) {
      logger.warn(
        "URL allowlist check failed: no domains configured for tenant",
        {
          url,
          tenant_id: clientRecord.id,
          hostname,
        },
      );
      return false;
    }

    // Check if hostname matches any allowed domain
    const allowSubdomains = clientRecord.metadata?.allow_subdomains !== false; // Default to true

    for (const allowedDomain of allowedDomains) {
      if (hostnameMatchesDomain(hostname, allowedDomain, allowSubdomains)) {
        logger.info("URL allowlist check passed", {
          url,
          tenant_id: clientRecord.id,
          hostname,
          matched_domain: allowedDomain,
        });
        return true;
      }
    }

    // No match found
    logger.warn("URL allowlist check failed: hostname not in allowed domains", {
      url,
      tenant_id: clientRecord.id,
      hostname,
      allowed_domains: allowedDomains,
    });
    return false;
  } catch (error) {
    logger.error("URL allowlist check error", {
      url,
      tenant_id: clientRecord.id,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get allowed domains for a tenant (for display/debugging)
 */
export function getAllowedDomainsForTenant(
  clientRecord: ClientRecord,
): string[] {
  const domains: Set<string> = new Set();

  if (clientRecord.website) {
    const hostname = getHostname(clientRecord.website);
    if (hostname) domains.add(hostname);
  }

  if (clientRecord.domains && Array.isArray(clientRecord.domains)) {
    for (const domain of clientRecord.domains) {
      const hostname = getHostname(
        domain.startsWith("http") ? domain : `https://${domain}`,
      );
      if (hostname) domains.add(hostname);
    }
  }

  if (
    clientRecord.metadata?.allowed_domains &&
    Array.isArray(clientRecord.metadata.allowed_domains)
  ) {
    for (const domain of clientRecord.metadata.allowed_domains) {
      const hostname = getHostname(
        domain.startsWith("http") ? domain : `https://${domain}`,
      );
      if (hostname) domains.add(hostname);
    }
  }

  return Array.from(domains);
}
