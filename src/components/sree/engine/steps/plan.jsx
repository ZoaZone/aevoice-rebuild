import eventBus from '../eventBus';

// Plan step — builds tool steps for the resolved module
async function plan(ctx = {}) {
  ctx?.emit?.("progress", { step: "plan", message: "Building execution plan" });

  // Propagate intent errors immediately
  if (ctx.__intentError) return ctx.__intentError;

  const module = ctx.__resolvedModule;
  if (!module) {
    return { error: "NO_MODULE", message: "No module was resolved during analyze." };
  }

  // Default tool per module
  const MODULE_DEFAULT_TOOL = {
    PlatformDiagnostics: "runDiagnostics",
    AgentOrchestrator:   "listAgents",
    KBManager:           "listKBs",
    Validator:           "validateRLS",
    CodeReader:          "listFiles",
    CodeWriter:          "writeFile",
    RepoNavigator:       "indexProject",
    LogInspector:        "getLogs",
    WorkflowPlanner:     "listWorkflows",
    MultiStepExecutor:   "execute",
  };

  const tool = MODULE_DEFAULT_TOOL[module] || "run";
  ctx.__plannedTool = tool;

  eventBus.emit('monitor:event', { type: 'plan', source: 'Plan', action: 'steps_built', detail: `${module}.${tool}`, ts: Date.now() });
  return { module, tool, steps: [`${module}.${tool}`] };
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

export const run = plan;
export default plan;