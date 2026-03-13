// functions/lib/security/hostGuard.js
// Host and environment guards for backend functions

export function getRequestHost(req) {
  try {
    const hdr = req.headers.get("host") || "";
    return hdr.toLowerCase();
  } catch {
    return "";
  }
}

function parseCsvEnv(name) {
  const raw = (Deno.env.get(name) || "").toString();
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedHost(host) {
  const allowed = new Set([
    ...parseCsvEnv("ALLOWED_HOSTS"),
    ...parseCsvEnv("AEVATHON_ALLOWED_HOSTS"),
  ]);
  if (allowed.size === 0) return true; // fail-open until configured
  return allowed.has(host);
}

export function isAevathonHostServer(host) {
  const aevathon = new Set(parseCsvEnv("AEVATHON_ALLOWED_HOSTS"));
  return aevathon.has(host);
}

// Options: { requireAevathon?: boolean, requireAevoice?: boolean }
export function ensureAllowedHost(req, options = {}) {
  const host = getRequestHost(req);
  if (!isAllowedHost(host)) return false;
  if (options.requireAevathon && !isAevathonHostServer(host)) return false;
  if (options.requireAevoice && isAevathonHostServer(host)) return false;
  return true;
}

export function getClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    "unknown";
}

export function getPublicBaseUrl(req) {
  const envBase = Deno.env.get("PUBLIC_WEBHOOK_BASE");
  if (envBase) return envBase.replace(/\/$/, "");
  try {
    const host = getRequestHost(req);
    return `https://${host}`;
  } catch {
    return "";
  }
}
