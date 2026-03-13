import { base44 } from "@/api/base44Client";

export const defaultFlags = {
  enableSreeWeb: true,
  enableVoiceChat: true,
  enableScreenContext: true,
  enableOverlay: true,
  enableHotword: true,
  enableMultiWindow: true,
  // Legacy aliases for backward compatibility
  enableSree: true,
  enableVoice: true,
  enableTelemetry: true,
};

function getQueryFlags() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const out = {};
  if (p.get('sree') === '1') out.enableSree = true;
  if (p.get('agentic') === '1') out.enableAgentic = true;
  if (p.get('voice') === '0') out.enableVoice = false;
  return out;
}

function getLocalOverrides() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('sree_feature_overrides');
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

export async function loadFeatureFlags() {
  let flags = { ...defaultFlags };

  // Host-level defaults from Layout flags if present
  if (typeof window !== 'undefined' && window.__SREE_FLAGS__) {
    const f = window.__SREE_FLAGS__;
    flags.enableSreeWeb = f.enableSreeWeb ?? flags.enableSreeWeb;
    flags.enableOverlay = f.enableDesktop ?? flags.enableOverlay;
    flags.enableVoiceChat = f.enableVoice ?? flags.enableVoiceChat;
    flags.enableMultiWindow = f.enableMiniMonitor ?? flags.enableMultiWindow;
  }

  try {
    // Resolve tenant and fetch SreeSettings row if exists
    const res = await base44.functions.invoke('getMyClient', {});
    const tenantId = res?.data?.client?.id;
    if (tenantId) {
      const rows = await base44.entities.SreeSettings.filter({ tenantId });
      const row = rows?.[0];
      if (row) {
        flags.enableSreeWeb = row.enableSreeWeb ?? flags.enableSreeWeb;
        flags.enableVoiceChat = row.enableSreeWeb ?? flags.enableVoiceChat;
        flags.enableHotword = row.enableSreeDesktop ?? flags.enableHotword;
        flags.enableOverlay = row.enableSreeDesktop ?? flags.enableOverlay;
        // Legacy aliases
        flags.enableSree = flags.enableSreeWeb;
        flags.enableVoice = flags.enableVoiceChat;
      }
    }
  } catch (_) {}

  // Apply query + local overrides
  flags = { ...flags, ...getQueryFlags(), ...getLocalOverrides() };
  return flags;
}

// Backwards-compatible alias
export async function getFeatureFlags() {
  return await loadFeatureFlags();
}

export function getInitialMode(flags) {
  if (flags.enableScreenContext || flags.enableOverlay) return 'Agentic Sree';
  if (flags.enableSreeWeb || flags.enableSree) return 'Sree';
  return 'Sri';
}