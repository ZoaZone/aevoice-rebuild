import eventBus from "@/components/sree/engine/eventBus";
import { SreeRuntime } from "./runtime";
console.log("[Sree] agentic module loaded:", import.meta.url);

export function initAgenticEngine() {
  console.log("[Sree] agentic.init called");
  eventBus.on("agentic:task", async (task) => {
    const { id, command } = task;

    SreeRuntime.setStatus("agentic-running");
    SreeRuntime.log(`Agentic task started: ${command}`);

    eventBus.emit("agentic:progress", {
      id,
      step: "starting",
      message: `Starting task: ${command}`
    });

    try {
      await delay(300);
      eventBus.emit("agentic:progress", {
        id,
        step: "thinking",
        message: "Analyzing the command…"
      });

      await delay(400);
      eventBus.emit("agentic:progress", {
        id,
        step: "planning",
        message: "Generating plan…"
      });

      await delay(500);
      eventBus.emit("agentic:progress", {
        id,
        step: "executing",
        message: "Executing steps…"
      });

      await delay(300);

      const result = `Agentic task completed: "${command}".`;

      eventBus.emit("agentic:done", {
        id,
        result
      });

      SreeRuntime.log(result);
      SreeRuntime.setStatus("idle");
    } catch (err) {
      eventBus.emit("agentic:error", {
        id,
        error: err.message
      });

      SreeRuntime.log(`Agentic error: ${err.message}`);
      SreeRuntime.setStatus("idle");
    }
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}