import eventBus from '../eventBus';

// Finalize step — returns structured module output, never echoes input
const defaultFn = async function finalize(ctx = {}) {
  ctx?.emit?.("progress", { step: "finalize", message: "Collecting module output" });

  // Propagate intent errors as structured response
  if (ctx.__intentError) {
    return {
      error: "NO_INTENT_MATCH",
      message: "I could not map your request to a developer module.",
    };
  }

  const result = ctx.__toolResult ?? ctx?.result ?? null;
  eventBus.emit('monitor:event', { type: 'finalize', source: 'StepFinalizer', action: 'output_ready', detail: ctx.__resolvedModule || 'unknown', ts: Date.now() });

  return {
    module:      ctx.__resolvedModule || null,
    tool:        ctx.__plannedTool    || null,
    result,
    finalizedAt: new Date().toISOString(),
  };
};

export const run = defaultFn;
export default defaultFn;