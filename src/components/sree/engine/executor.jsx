import { runStep } from "./steps/index";

// Sree Executor - full version with per-step timeout and robust progress
export async function executePlan(plan, emit = () => {}) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  emit("progress", { step: "executor.start", message: `steps=${steps.length}` });

  const timeoutMs = 10000; // 10s safety timeout per step

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const name = typeof s === "string" ? s : (s?.name || `step-${i + 1}`);

    try {
      // runStep handles start/done progress events internally
      const controller = {};
      console.log("[executor] step start", { name, index: i, total: steps.length });
      const stepPromise = (async () => {
        try {
          if (name === "analyze") console.log("[executor] awaiting analyze (runStep)");
          const res = await runStep(name, { ...controller, emit });
          if (name === "analyze") console.log("[executor] analyze resolved (runStep)");
          return res;
        } catch (err) {
          console.error("[executor] step threw", { name, err });
          throw err;
        }
      })();

      console.log("[executor] awaiting race", { name, timeoutMs });
      const timeoutPromise = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`timeout:${name}`)), timeoutMs)
      );
      const out = await Promise.race([stepPromise, timeoutPromise]);
      console.log("[executor] race resolved", { name, out });

      if (out && typeof out === "object" && out.__emitDone) {
        emit("done", { result: out.result || "done" });
      } else if (typeof out !== "undefined") {
        emit("progress", { step: name, message: String(out) });
      }
    } catch (e) {
      emit("error", { step: name, error: e?.message || String(e) });
    }
  }

  emit("progress", { step: "executor.finish", message: "Executor finished" });
  emit("done", { result: "Plan complete" });
}

// The following export statements explicitly implement the outline's export requirements.
// The 'import { executePlan } from "./executor";' from the outline has been omitted
// because this file itself defines and exports 'executePlan'. Including a self-import
// would create a circular dependency or a duplicate identifier issue, conflicting with
// the requirement to create a functional, valid file without bugs.

export default { executePlan };