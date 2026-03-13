import { isDesktopApp } from "@/components/utils/desktopContext";

export async function getScreenContext() {
  try {
    if (typeof window === "undefined") return null;
    if (isDesktopApp()) {
      if (window.electron?.getScreenContext) return await window.electron.getScreenContext();
      if (window.__TAURI__?.invoke) return await window.__TAURI__.invoke("get_screen_context");
    }
    // Browser fallback: derive minimal context
    return {
      currentApp: document?.title || "Browser",
      currentScreen: window?.location?.pathname || "/",
      suggestion: "Use the menu to explore features"
    };
  } catch (_) {
    return null;
  }
}

export function pollScreenContext(callback, intervalMs = 3000) {
  let stopped = false;
  async function tick() {
    if (stopped) return;
    const ctx = await getScreenContext();
    if (ctx) callback(ctx);
  }
  tick();
  const id = setInterval(tick, intervalMs);
  return () => { stopped = true; clearInterval(id); };
}

// Exported for recovery path; legacy poller has no shared state
export function resetScreenContext() {
  // no-op to satisfy desktopBridge.recover(); future: replace with shared emitter reset
  try {} catch {}
}