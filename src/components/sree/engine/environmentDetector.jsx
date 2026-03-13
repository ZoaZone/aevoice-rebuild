// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT DETECTOR — Shared across Aeva + Monitor
// ═══════════════════════════════════════════════════════════════

let __cachedEnv = null;

export function detectEnvironment() {
  if (__cachedEnv) return __cachedEnv;

  const isClient = typeof window !== "undefined";
  const isTauri = isClient && (window.__TAURI__ || false);
  const isElectron = isClient && (window.electron || window.process?.type === "renderer");
  const isDesktop = isTauri || isElectron;
  const isBase44 = isClient && (window.location.hostname.includes("base44") || window.location.hostname.includes("hellobiz"));
  const isCLI = !isClient;

  let mode = "web/base44";
  if (isCLI) mode = "cli";
  else if (isDesktop) mode = "desktop";
  else if (isBase44) mode = "web/base44";
  else mode = "saas";

  const hasMicAPI = isClient && !!(navigator?.mediaDevices?.getUserMedia);
  const hasSpeechSynth = isClient && !!window.speechSynthesis;
  const canVoiceListen = isDesktop ? hasMicAPI : false;   // web/base44: no mic in SaaS mode
  const canVoiceSpeak  = isDesktop ? hasSpeechSynth : false;

  __cachedEnv = {
    mode,
    isDesktop,
    isBase44,
    isTauri,
    isElectron,
    isCLI,
    canLocalFileAccess: isDesktop,
    canOverlay: isDesktop,
    canWindowCapture: isDesktop,
    canVoiceListen,
    canVoiceSpeak,
    canBrowserInspect: isDesktop,
    canBrowserAct: isDesktop,
    canFileWrite: isDesktop,
    hostname: isClient ? window.location.hostname : "cli",
    toolsEnabled: isBase44 ? ["File.read", "HTTP.request", "DB.query", "DB.mutate", "UI.show", "Log.stream"] : [],
    voiceDiagnostic: {
      micApiAvailable: hasMicAPI,
      speechSynthAvailable: hasSpeechSynth,
      voiceDisabledReason: (!isDesktop && isBase44)
        ? "Voice input/output disabled in web/base44 environment. Download the desktop app to enable."
        : (!isDesktop ? "Voice requires desktop mode." : null),
    },
    desktopCapabilities: {
      available: isDesktop,
      tauriDetected: isTauri,
      electronDetected: isElectron,
      missingReason: !isDesktop
        ? "Desktop adapter not loaded. Run the downloadable AEVOICE desktop app to enable local file access, voice, overlay, and screen capture."
        : null,
    },
  };

  return __cachedEnv;
}

export function getEnvMode() {
  return detectEnvironment().mode;
}

export function resetEnvCache() {
  __cachedEnv = null;
}