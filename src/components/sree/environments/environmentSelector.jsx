import BrowserEnvironmentAdapter from "./BrowserEnvironmentAdapter";
import DesktopEnvironmentAdapter from "./DesktopEnvironmentAdapter";
import NodeEnvironmentAdapter from "./NodeEnvironmentAdapter";

export function selectEnvironment() {
  try {
    if (typeof window !== "undefined") {
      if (window.electron || window.__TAURI__) {
        return new DesktopEnvironmentAdapter();
      }
      return new BrowserEnvironmentAdapter();
    }
    return new NodeEnvironmentAdapter();
  } catch (_) {
    return new BrowserEnvironmentAdapter();
  }
}