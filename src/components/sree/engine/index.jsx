import { initDeveloperSreeEngine } from "./developerSreeEngine";
import { initMiniMonitorSource } from "./miniMonitorSource";
import { initAgenticEngine } from "./agenticEngine";
import { SreeRuntime, initRuntime } from "./runtime";
import { initOverlayEngine } from "./overlayEngine";
import eventBus from "@/components/sree/engine/eventBus";
import { pollScreenContext } from "@/components/desktop/screenContext";
import { startHotword, onHotwordDetected } from "@/components/voice/hotword";
import { showNotification } from "@/components/desktop/notifications";
import { setTrayState } from "@/components/desktop/systemTray";
import { stepRegistry } from "./steps/index";
console.log("[Sree] engine/index.js loaded:", import.meta.url);

export const ENGINE_VERSION = "1.3.0";
export { eventBus } from "./eventBus";
export { SreeRuntime } from "./runtime";

let initialized = false;

export function initSreeEngine() {
  if (initialized) return;
  initialized = true;
  console.log("[SreeEngine] initSreeEngine called");
  console.log("[Sree] engine/index.js about to init engines");

  console.log("[Sree] calling developerSreeEngine.init");
  initDeveloperSreeEngine();

  console.log("[Sree] calling agenticEngine.init");
  initAgenticEngine();

  console.log("[Sree] calling miniMonitorSource.init");
  initMiniMonitorSource();

  console.log("[Sree] calling overlayEngine.init");
  initOverlayEngine();

  console.log("[Sree] calling runtime.init");
  initRuntime();

  // Screen context polling
  try {
    pollScreenContext((ctx) => {
      SreeRuntime.setScreenContext(ctx);
      eventBus.emit("screenContext:update", ctx);
    });
  } catch (e) {
    console.warn("[SreeEngine] screenContext poll failed", e);
  }

  // Hotword detection
  try {
    startHotword?.();
    onHotwordDetected?.(() => {
      SreeRuntime.log("Hotword detected");
      eventBus.emit("hotword:detected");
    });
  } catch (e) {
    console.warn("[SreeEngine] hotword init failed", e);
  }

  // Desktop bridge integrations
  eventBus.on("agentic:done", (e) => {
    try { showNotification?.("Agentic Task", e?.result || "Completed"); } catch {}
  });
  eventBus.on("runtime:mode", (mode) => {
    try { setTrayState?.({ tooltip: `Sree: ${mode}` }); } catch {}
  });

  console.log("%cSree Engine initialized", "color:#4ade80;font-weight:bold;");
  console.log("[Sree] Engine version:", ENGINE_VERSION);
  console.log("[Sree] Loaded steps:", Object.keys(stepRegistry || {}));

  // One-time self test (guarded)
  try {
    if (typeof window !== "undefined" && !window.__SREE_SELFTEST_RUN) {
      window.__SREE_SELFTEST_RUN = true;
      setTimeout(async () => {
        try {
          const mod = await import("../orchestrator/sreeOrchestrator");
          const channel = "developer";
          const run = (description) => mod.runTask({ id: `${description}-${Date.now()}`.replace(/\s+/g, '-'), description, channel });
          await run("diagnose system health deeply");
          await run("audit mic/speaker pipeline");
          await run("debug event flow");
        } catch (e) {
          console.error("[Sree] self-test failed", e);
        }
      }, 200);
    }
  } catch {}
}

// Auto-init on import (guarded inside)
initSreeEngine();