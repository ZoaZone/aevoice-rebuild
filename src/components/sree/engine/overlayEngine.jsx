
import eventBus from "@/components/sree/engine/eventBus";
console.log("[Sree] overlay module loaded:", import.meta.url);

export const overlay = {
  show(payload = {}) { eventBus.emit("overlay:show", payload); },
  hide() { eventBus.emit("overlay:hide"); },
  highlight(selector) { eventBus.emit("overlay:highlight", { selector }); },
  clear() { eventBus.emit("overlay:clear"); },
};

export default overlay;

export function initOverlayEngine() {
  console.log("[Sree] overlay.init called");
  // Echo some helpful defaults for UX
  eventBus.on("screenContext:update", (ctx) => {
    // Example: when screen changes, briefly show overlay header
    overlay.show({ message: `${ctx?.currentApp || 'App'} • ${ctx?.currentScreen || ''}`, autoHideMs: 1200 });
  });
}
