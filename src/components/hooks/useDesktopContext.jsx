import { useEffect, useState } from "react";
import { isDesktopApp as detectDesktop, getDesktopAPI } from "@/components/utils/desktopContext";

export default function useDesktopContext({ pollIntervalMs = 3000 } = {}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [context, setContext] = useState({ currentApp: "Unknown", currentScreen: "Dashboard", suggestion: "" });

  useEffect(() => {
    const desktop = detectDesktop();
    setIsDesktop(desktop);
    if (!desktop) return;

    let mounted = true;
    const api = getDesktopAPI();

    const update = async () => {
      if (!mounted) return;
      const ctx = (await api?.getScreenContext()) || null;
      if (ctx) setContext(ctx);
    };

    update();
    const id = setInterval(update, pollIntervalMs);
    return () => { mounted = false; clearInterval(id); };
  }, [pollIntervalMs]);

  return { isDesktopApp: isDesktop, contextInfo: context };
}