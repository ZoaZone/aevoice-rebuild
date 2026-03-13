import { isDesktopApp } from "@/components/utils/desktopContext";

export async function setTrayState(state = { tooltip: "Sree", badge: 0 }) {
  try {
    if (typeof window === "undefined") return false;
    if (!isDesktopApp()) return false;
    if (window.electron?.setTray) { await window.electron.setTray(state); return true; }
    if (window.__TAURI__?.invoke) { try { await window.__TAURI__.invoke("set_tray_state", state); } catch(_) {} return true; }
    return false;
  } catch (_) {
    return false;
  }
}