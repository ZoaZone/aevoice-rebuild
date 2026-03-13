import { createContext, useContext, useMemo } from "react";

const OrchestratorContext = createContext({ runTask: async () => {} });

export function OrchestratorProvider({ children }) {
  const runTask = async (task) => {
    const mod = await import("@/components/sree/orchestrator/sreeOrchestrator");
    return mod.runTask(task);
  };

  const value = useMemo(() => ({ runTask }), []);
  return <OrchestratorContext.Provider value={value}>{children}</OrchestratorContext.Provider>;
}

export function useOrchestrator() {
  return useContext(OrchestratorContext);
}