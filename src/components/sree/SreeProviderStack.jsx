import { useEffect } from "react";
import { EventBusProvider } from "@/components/sree/providers/EventBusProvider.jsx";
import { OrchestratorProvider } from "@/components/sree/providers/OrchestratorProvider.jsx";
import { ScreenContextProvider } from "@/components/sree/providers/ScreenContextProvider.jsx";
import MiniMonitorSourceMount from "@/components/sree/engine/MiniMonitorSourceMount.jsx";

import { startHotword, configureHotword } from "@/components/voice/hotword";

let __providerBooted = false;

export default function SreeProviderStack({ children }) {
  useEffect(() => {
    if (__providerBooted) return;
    __providerBooted = true;

    (async () => {
      try {
        if (typeof window !== "undefined") window.__SREE_PROVIDER_READY = true;

        // Cache purge
        try {
          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const r of regs) { try { await r.unregister(); } catch {} }
          }
          if (window.caches) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch {}

        // Hotword
        try { configureHotword({ phrase: "come on sree", sensitivity: 0.12 }); await startHotword(); } catch {}

        // Load engine + Developer Aeva
        const engine = await import("@/components/sree/engine");
        console.log("[Sree] Engine version:", engine?.ENGINE_VERSION);

        const { initDeveloperSreeEngine } = await import("@/components/sree/engine/developerSreeEngine");
        initDeveloperSreeEngine();

        // Run diagnostic tasks
        const { runTask } = await import("@/components/sree/orchestrator/sreeOrchestrator");
        await runTask({ id: `diagnose-${Date.now()}`, description: "diagnose system health deeply", channel: "developer" });
        await runTask({ id: `audit-${Date.now()}`, description: "audit mic/speaker pipeline", channel: "developer" });
      } catch (e) {
        console.error("[Sree] provider stack init failed:", e);
      }
    })();
  }, []);

  return (
    <EventBusProvider>
      <OrchestratorProvider>
        <ScreenContextProvider>
          <MiniMonitorSourceMount />
          {children}
        </ScreenContextProvider>
      </OrchestratorProvider>
    </EventBusProvider>
  );
}