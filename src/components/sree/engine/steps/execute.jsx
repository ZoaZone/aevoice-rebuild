import { invokeTool } from '../toolExecutor';
import eventBus from '../eventBus';

// Execute step — calls the resolved module's tool logic
async function defaultFn(ctx = {}) {
  ctx?.emit?.("progress", { step: "execute", message: "Executing via module tool" });

  // Surface NO_INTENT_MATCH directly — no echo
  if (ctx.__intentError) return ctx.__intentError;

  const module = ctx.__resolvedModule;
  const tool   = ctx.__plannedTool;

  if (!module || !tool) {
    return {
      error: "NO_INTENT_MATCH",
      message: "I could not map your request to a developer module.",
    };
  }

  eventBus.emit('monitor:event', { type: 'execute', source: 'StepExecutor', action: 'tool_invoke', detail: `${module}.${tool}`, ts: Date.now() });

  const result = await invokeTool(module, tool, ctx);
  ctx.__toolResult = result;
  return result;
}

export const run = defaultFn;
export default defaultFn;