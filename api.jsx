// Desktop API wrapper (Electron/Tauri) - Phase 2 placeholders
export async function invoke(channel, payload) {
  try {
    if (typeof window !== "undefined") {
      if (window.electron?.invoke) return await window.electron.invoke(channel, payload);
      if (window.__TAURI__?.invoke) return await window.__TAURI__.invoke(channel, payload);
    }
  } catch (_) {}
  return null;
}