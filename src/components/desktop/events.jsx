// Desktop event listeners wrapper
export function on(event, handler) {
  try {
    if (typeof window !== "undefined") {
      return window.electron?.on?.(event, handler) || window.__TAURI__?.event?.listen?.(event, handler);
    }
  } catch (_) {}
  return () => {};
}