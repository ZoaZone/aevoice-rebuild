import { useEffect } from "react";
import { initMiniMonitorSource } from "@/components/sree/engine/miniMonitorSource";

let __initialized = false;

export default function MiniMonitorSourceMount() {
  useEffect(() => {
    if (__initialized) return;
    __initialized = true;
    try {
      initMiniMonitorSource();
    } catch (e) {
      console.error("[Monitor] MiniMonitorSourceMount init error:", e);
    }
  }, []);
  return null;
}