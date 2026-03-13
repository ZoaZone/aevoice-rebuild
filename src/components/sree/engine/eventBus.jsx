const existingBus = typeof window !== "undefined" ? (window.__SREE_BUS || null) : null;
const listeners = existingBus && existingBus._listeners ? existingBus._listeners : {};

let bus;
if (existingBus) {
  bus = existingBus;
  try { console.log("[Sree] EventBus: reusing existing global instance", existingBus); } catch {}
} else {
  bus = {
    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },
    off(event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    },
    emit(event, payload) {
      if (!listeners[event]) return;
      for (const cb of listeners[event]) {
        try { cb(payload); } catch (e) {
          try { console.error("[Sree] eventBus listener error on", event, e); } catch {}
        }
      }
    },
    // Expose for debugging/validation
    _listeners: listeners,
  };
}

console.log("[Sree] EventBus initialized");
console.log("[Sree] eventBus module path:", import.meta.url);
try {
  const p = typeof window!=="undefined" ? window.location.pathname.toLowerCase() : "";
  if (p.includes("/dashboard")) {
    console.log("[Sree] AEVOICE Dashboard using eventBus from:", import.meta.url);
  }
} catch {}


if (typeof window !== "undefined") {
  window.__SREE_BUS = bus;
}

try { bus.emit("bus:ready", { ts: Date.now() }); } catch {}

export const eventBus = bus;
export default bus;