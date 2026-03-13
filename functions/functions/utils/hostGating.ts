/**
 * Host gating utility for AEVOICE platform
 * Validates that requests come from allowed hosts/domains
 */

const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";

// Allowed hosts configuration
const ALLOWED_HOSTS = [
  "aevoice.base44.app",
  "app.aevoice.ai",
  "aevoice.ai",
  "hellobiz.app",
  "app.hellobiz.app",
  "localhost",
  "127.0.0.1",
];

// Aevathon allowed subdomains (from environment or default list)
const DEFAULT_AEVATHON_ALLOWED_HOSTS: string[] = [
  "demo.aevathon.com",
  "sandbox.aevathon.com",
];

const AEVATHON_ALLOWED_HOSTS_ENV = Deno.env.get("AEVATHON_ALLOWED_HOSTS");
const PARSED_AEVATHON_ALLOWED_HOSTS: string[] = AEVATHON_ALLOWED_HOSTS_ENV
  ? AEVATHON_ALLOWED_HOSTS_ENV.split(",")
    .map((h: string) => h.trim())
    .filter((h: string) => h.length > 0)
  : [];

const AEVATHON_ALLOWED_HOSTS: string[] = PARSED_AEVATHON_ALLOWED_HOSTS.length > 0
  ? PARSED_AEVATHON_ALLOWED_HOSTS
  : DEFAULT_AEVATHON_ALLOWED_HOSTS;
/**
 * Check if a host is allowed for the platform
 */
export function isHostAllowed(host: string | null): boolean {
  if (!host) {
    return false;
  }

  // In development, allow all
  if (ENV === "development") {
    return true;
  }

  const hostLower = host.toLowerCase();

  // Check against main allowed hosts
  if (
    ALLOWED_HOSTS.some((allowedHost) =>
      hostLower === allowedHost || hostLower.endsWith("." + allowedHost)
    )
  ) {
    return true;
  }

  // Check against Aevathon hosts
  if (
    AEVATHON_ALLOWED_HOSTS.some((aevathonHost: string) =>
      hostLower === aevathonHost || hostLower.endsWith("." + aevathonHost)
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Extract host from request
 */
export function getRequestHost(req: Request): string | null {
  // Try Origin header first
  const origin = req.headers.get("Origin");
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      // Invalid origin
    }
  }

  // Try Referer header
  const referer = req.headers.get("Referer");
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      // Invalid referer
    }
  }

  // Try Host header
  const host = req.headers.get("Host");
  if (host) {
    // Remove port if present
    return host.split(":")[0];
  }

  return null;
}

/**
 * Get the full origin from request (with scheme)
 */
export function getRequestOrigin(req: Request): string | null {
  // Try Origin header first (includes scheme)
  const origin = req.headers.get("Origin");
  if (origin) {
    try {
      new URL(origin); // Validate it's a valid URL
      return origin;
    } catch {
      // Invalid origin
    }
  }

  // Try Referer header as fallback
  // Note: Referer can be spoofed, but we validate against allowlist anyway
  // This helps identify widget embedding locations for legitimate use cases
  const referer = req.headers.get("Referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch {
      // Invalid referer
    }
  }

  return null;
}

/**
 * Validate request comes from allowed host
 * Returns { allowed: boolean, host: string | null, origin: string | null, reason?: string }
 */
export function validateRequestHost(
  req: Request,
): {
  allowed: boolean;
  host: string | null;
  origin: string | null;
  reason?: string;
} {
  const host = getRequestHost(req);
  const origin = getRequestOrigin(req);

  if (!host) {
    return {
      allowed: false,
      host: null,
      origin: null,
      reason: "No host header found",
    };
  }

  const allowed = isHostAllowed(host);

  if (!allowed) {
    return {
      allowed: false,
      host,
      origin,
      reason: `Host '${host}' is not in the allowed list`,
    };
  }

  return {
    allowed: true,
    host,
    origin,
  };
}
