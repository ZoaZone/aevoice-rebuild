import { createContext, useContext, useMemo } from "react";
import bus from "@/components/sree/engine/eventBus";

const EventBusContext = createContext(bus);

export function EventBusProvider({ children }) {
  const value = useMemo(() => bus, []);
  return <EventBusContext.Provider value={value}>{children}</EventBusContext.Provider>;
}

export function useEventBus() {
  return useContext(EventBusContext);
}