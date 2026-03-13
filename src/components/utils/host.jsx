export function getHostname() {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}

export function getAevathonAllowedHosts() {
  const envHosts = (import.meta?.env?.VITE_AEVATHON_ALLOWED_HOSTS || "").toString();
  if (envHosts) {
    return envHosts
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
  }
  // Secure defaults (adjustable via env)
  return ["aevathon.aevoice.ai", "aevathon.hellobiz.app"];
}

export function isAevathonHost(hostname) {
  const host = (hostname || getHostname() || "").toLowerCase();
  const allowlist = getAevathonAllowedHosts();
  if (allowlist.includes(host)) return true;
  // Conservative fallback: substring match, useful in preview/dev.
  // Keep broad but non-sensitive: avoids exposing or leaking secrets.
  return host.includes("aevathon");
}