
import eventBus from "@/components/sree/engine/eventBus";
console.log("[Sree] runtime module loaded:", import.meta.url);

export const SreeRuntime = {
  mode: "Sri (Text Chat)",
  status: "idle",
  screenContext: null,
  logs: [],

  setMode(mode) {
    this.mode = mode;
    eventBus.emit("runtime:mode", mode);
    eventBus.emit("modeChanged", mode);
  },

  setStatus(status) {
    this.status = status;
    eventBus.emit("runtime:status", status);
  },

  setScreenContext(ctx) {
    this.screenContext = ctx;
    eventBus.emit("runtime:screen", ctx);
  },

  log(message) {
    const serialized = (message !== null && message !== undefined && typeof message === "object")
      ? JSON.stringify(message, null, 2)
      : String(message ?? "");
    const entry = { ts: Date.now(), message: serialized };
    this.logs.push(entry);
    eventBus.emit("runtime:log", entry);
  }
};

export function initRuntime() {
  console.log("[Sree] runtime.init called");
  eventBus.on("runtime:status", (s) => console.log("[Sree] runtime status:", s));
}

// The following exports are added based on the provided outline.
// SreeRuntime and initRuntime are already named exports via their declarations,
// but explicitly re-exporting them here is also valid.
// SreeRuntime is additionally exported as the default export.
export default SreeRuntime;
