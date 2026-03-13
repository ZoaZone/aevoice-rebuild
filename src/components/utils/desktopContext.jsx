// Shared desktop context helpers
export function isDesktopApp() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__TAURI__ || window.electron || window.process?.type === "renderer");
}

// Returns a unified desktop API wrapper if available
export function getDesktopAPI() {
  if (typeof window === "undefined") return null;
  const api = {
    // Screens
    async getScreenContext() {
      try {
        if (window.electron?.getScreenContext) return await window.electron.getScreenContext();
        if (window.__TAURI__?.invoke) return await window.__TAURI__.invoke("get_screen_context");
      } catch (_) {}
      return null;
    },
    async captureScreen() {
      try {
        if (window.electron?.captureScreen) return await window.electron.captureScreen();
        if (window.__TAURI__?.invoke) return await window.__TAURI__.invoke("capture_screen");
      } catch (_) {}
      return null;
    },
    // Voice placeholders
    async startMic() { try { return await window.electron?.startMic?.(); } catch(_) { return null; } },
    async stopMic() { try { return await window.electron?.stopMic?.(); } catch(_) { return null; } },
  };
  return api;
}