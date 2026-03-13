import { routeIntent } from '../intentRouter';
import eventBus from '../eventBus';

// Analyze step — routes intent to the correct Developer Aeva module
export default async function analyze(ctx = {}) {
  ctx?.emit?.("progress", { step: "analyze", message: "Routing intent to module" });

  const desc = ctx?.description || ctx?.task?.description || "";
  const route = routeIntent(desc);

  if (route.error) {
    eventBus.emit('monitor:event', { type: 'warn', source: 'Analyze', action: 'no_intent_match', detail: desc, ts: Date.now() });
    // Attach error to ctx so execute step can surface it
    ctx.__intentError = route;
    return route;
  }

  eventBus.emit('monitor:event', { type: 'route', source: 'Analyze', action: 'intent_matched', detail: route.module, ts: Date.now() });

  // Store resolved module on ctx for plan + execute steps
  ctx.__resolvedModule = route.module;
  return { module: route.module, input: desc };
}

export const run = analyze;