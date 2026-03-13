import { selectEnvironment } from "../environments/environmentSelector";
import eventBus from "@/components/sree/engine/eventBus";
import { SreeRuntime } from "../engine/runtime";
import { buildPlan } from "../engine/planner";
import { executePlan } from "../engine/executor";

export const __SreeOrchestratorPath = import.meta.url;
console.log("[Sree] orchestrator module loaded:", import.meta.url);
try {
  const params = new URLSearchParams(window.location.search);
  console.log("[Sree] orchestrator boot info:", {
    href: window.location.href,
    host: window.location.host,
    base44_data_env: params.get("base44_data_env"),
  });
} catch (e) {
  console.log("[Sree] orchestrator boot info unavailable");
}
try {
  const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
  if (p.includes("/dashboard")) {
    console.log("[Sree] AEVOICE Dashboard: orchestrator loaded");
    console.log("[Sree] AEVOICE Dashboard using orchestrator from:", import.meta.url);
  }
} catch {}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function runTask({ id = Date.now().toString(), description, channel = "agentic" }) {
  const env = selectEnvironment();
  const ep = channel === "developer" ? "developer" : "agentic";
  const emit = (type, payload) => {
    if (ep === "developer") {
      try {
        const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
        if (p.includes("/dashboard")) {
          console.log(`[${'Sree'}] AEVOICE Dashboard: emitted developer:${type}`, payload);
        }
      } catch {}
    }
    eventBus.emit(`${ep}:${type}`, payload);
    try {
      const p = typeof window!=="undefined" ? window.location.pathname.toLowerCase() : "";
      if (ep === "developer" && p.includes("/dashboard")) {
        if (type === "progress") console.log("[Sree] AEVOICE Dashboard: emitted developer:progress");
        if (type === "done") console.log("[Sree] AEVOICE Dashboard: emitted developer:done");
      }
    } catch {}
    };
    console.log("[Sree] runSreeTask(channel)", { channel, id, description, orchestrator: import.meta.url });
  try {
    const path = typeof window!=="undefined" ? window.location.pathname : "";
    if (channel === "developer" && path.toLowerCase().includes("/dashboard")) {
      console.log("[Sree] AEVOICE Dashboard: runSreeTask(channel=developer) invoked");
    }
  } catch {}

  emit("start", { id, message: "start" });
  emit("progress", { id, step: "plan", message: "Building plan" });
  console.log("[Sree] buildPlan called", { route: typeof window!=="undefined"?window.location.pathname:undefined, description });
  try {
    const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
    if (channel === "developer" && p.includes("/dashboard")) {
      console.log("[Sree] AEVOICE Dashboard: buildPlan called");
    }
  } catch {}
  const plan = buildPlan(description);
  let count = (plan && Array.isArray(plan.steps)) ? plan.steps.length : 0;
  console.log("[Sree] buildPlan steps", { count });
  try {
    const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
    if (channel === "developer" && p.includes("/dashboard")) {
      console.log(`[Sree] AEVOICE Dashboard: buildPlan called, steps=${count}`);
    }
  } catch {}

  try {
    const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
    if (channel === "developer" && p.includes("/dashboard")) {
      console.log("[Sree] AEVOICE Dashboard: buildPlan steps", { count });
    }
  } catch {}


  // Normalize planner output before deciding execution path
  const plannerOut = Array.isArray(plan?.steps)
    ? plan.steps
    : (Array.isArray(plan) ? plan : []);
  let steps = plannerOut;
  if (steps.length === 0) {
    try {
      const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
      if (channel === "developer" && p.includes("/dashboard")) {
        console.log("[Sree] AEVOICE Dashboard: buildPlan steps=0, injecting fallback-step");
      }
    } catch {}
    emit("progress", { id, step: "plan-empty", message: "No steps generated, injecting fallback" });
    steps = [
      {
        name: "fallback-step",
        run: async () => {
          try {
            const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
            if (channel === "developer" && p.includes("/dashboard")) {
              console.log("[Sree] AEVOICE Dashboard: step.run invoked for fallback-step");
            }
          } catch {}
          emit("progress", { id, step: "fallback-step", message: "fallback-step running" });
          await delay(200);
          emit("done", { id, result: "fallback-step done" });
          return "fallback executed";
        },
      },
    ];
  }
  count = steps.length;
  try {
    const p = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
    if (channel === "developer" && p.includes("/dashboard")) {
      console.log(`[Sree] AEVOICE Dashboard: buildPlan steps=${count}`);
    }
  } catch {}
  emit("progress", { id, step: "plan", message: `steps=${count}` });

  // Execute using engine executor with step registry fallback
  await executePlan({ steps }, (type, payload) => {
    if (type === "progress") emit("progress", { id, ...payload });
    else if (type === "error") emit("error", { id, ...payload });
    else if (type === "done") emit("done", { id, ...payload });
  });

  const result = `Task completed: "${description}"`;
  SreeRuntime.log(result);
  return result;
}


export default { runTask };