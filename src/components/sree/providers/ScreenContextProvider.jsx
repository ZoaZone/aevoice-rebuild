import { createContext, useContext, useEffect, useState } from "react";
import { pollScreenContext } from "@/components/desktop/screenContext";
import { SreeRuntime } from "@/components/sree/engine/runtime";

const ScreenContext = createContext(null);

export function ScreenContextProvider({ children }) {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const stop = pollScreenContext((c) => {
      setCtx(c);
      try { SreeRuntime.setScreenContext(c); } catch {}
    });
    return stop;
  }, []);

  return <ScreenContext.Provider value={ctx}>{children}</ScreenContext.Provider>;
}

export function useScreenContext() {
  return useContext(ScreenContext);
}