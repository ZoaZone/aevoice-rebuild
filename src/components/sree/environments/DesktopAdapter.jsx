// ═══════════════════════════════════════════════════════════════
// DESKTOP ADAPTER — placeholder with correct capability flags
// Real implementation loaded when Tauri/Electron is detected.
// ═══════════════════════════════════════════════════════════════
import { detectEnvironment } from "../engine/environmentDetector";

function notAvailable(feature) {
  const env = detectEnvironment();
  return {
    ok: false,
    error: "DESKTOP_UNAVAILABLE",
    feature,
    reason: env.desktopCapabilities?.missingReason ||
      "Desktop adapter not active. Download the AEVOICE desktop app.",
  };
}

const DesktopAdapter = {
  isActive() {
    return detectEnvironment().isDesktop;
  },

  getCapabilities() {
    const env = detectEnvironment();
    return {
      ...env.desktopCapabilities,
      canVoiceListen: env.canVoiceListen,
      canVoiceSpeak: env.canVoiceSpeak,
      canLocalFileAccess: env.canLocalFileAccess,
      canOverlay: env.canOverlay,
      canWindowCapture: env.canWindowCapture,
    };
  },

  async readFile(path) {
    if (!this.isActive()) return notAvailable("readFile");
    try {
      const { readTextFile } = await import("@tauri-apps/api/fs");
      const content = await readTextFile(path);
      return { ok: true, content };
    } catch (e) {
      return { ok: false, error: "FILE_READ_FAILED", reason: e.message };
    }
  },

  async listFiles(dir) {
    if (!this.isActive()) return notAvailable("listFiles");
    try {
      const { readDir } = await import("@tauri-apps/api/fs");
      const entries = await readDir(dir, { recursive: false });
      return { ok: true, entries };
    } catch (e) {
      return { ok: false, error: "LIST_FILES_FAILED", reason: e.message };
    }
  },

  async captureScreen() {
    if (!this.isActive()) return notAvailable("captureScreen");
    return { ok: false, error: "NOT_IMPLEMENTED", reason: "Screen capture not yet implemented in this build." };
  },

  async startMic() {
    if (!this.isActive()) return notAvailable("startMic");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return { ok: true, stream };
    } catch (e) {
      return { ok: false, error: "MIC_ACCESS_DENIED", reason: e.message };
    }
  },

  async stopMic(stream) {
    try { stream?.getTracks?.().forEach(t => t.stop()); } catch {}
    return { ok: true };
  },
};

export default DesktopAdapter;