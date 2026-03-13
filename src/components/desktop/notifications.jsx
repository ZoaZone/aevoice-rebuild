import { isDesktopApp } from "@/components/utils/desktopContext";

export async function showNotification(title, body) {
  try {
    if (typeof window === "undefined") return false;
    if (isDesktopApp()) {
      if (window.electron?.notify) { await window.electron.notify({ title, body }); return true; }
      if (window.__TAURI__?.invoke) { try { await window.__TAURI__.invoke("notify", { title, body }); } catch(_) {} return true; }
    }
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title || "Notification", { body: body || "" });
        return true;
      }
      const perm = await Notification.requestPermission();
      if (perm === "granted") { new Notification(title || "Notification", { body: body || "" }); return true; }
    }
    return false;
  } catch (_) {
    return false;
  }
}