// Dynamic step registry using Vite's import.meta.glob
console.log("[Sree] steps/index loaded:", import.meta.url);

// Explicit imports to guarantee bundling in Dashboard
import analyze from "./analyze.jsx";
import plan from "./plan.jsx";
import execute from "./execute.jsx";
import finalize from "./finalize.jsx";
import audit from "./audit.jsx";
import scan from "./scan.jsx";

const stepRegistry = {
  analyze: analyze?.run || analyze,
  plan: plan?.run || plan,
  execute: execute?.run || execute,
  finalize: finalize?.run || finalize,
  audit: audit?.run || audit,
  scan: scan?.run || scan,
};

console.log("[Sree] stepRegistry keys:", Object.keys(stepRegistry));
console.log("[Sree] analyze typeof:", typeof analyze);

export { stepRegistry, analyze, plan, execute, finalize, audit, scan };

export async function runStep(name, ctx = {}) {
  const fn = stepRegistry[name];
  if (!fn) {
    ctx?.emit?.("progress", { step: name, message: "noop (missing)" });
    return `noop:${name}`;
  }
  try {
    ctx?.emit?.("progress", { step: name, message: "starting" });
    const out = await fn(ctx);
    ctx?.emit?.("progress", { step: name, message: "done" });
    return out ?? `${name}:done`;
  } catch (e) {
    ctx?.emit?.("error", { step: name, error: e?.message || String(e) });
    throw e;
  }
}