import eventBus from "@/components/sree/engine/eventBus";
import { SreeRuntime } from "./runtime";
import { detectEnvironment } from "./environmentDetector";

// ═══════════════════════════════════════════════════════════════
// MINI MONITOR ENGINE — Hardened, Environment-Aware
// ═══════════════════════════════════════════════════════════════

export const MONITOR_MODULES = [
  "EventStream", "EventFilter", "EventTagging", "EventReplay",
  "EventSummary", "ErrorHighlight", "DevOverlay", "LatencyTracker",
  "LLMTracker", "FunctionTracker", "KBTracker", "AgentTracker",
  "EmbeddingTracker", "ChunkTracker", "VoicePreviewTracker", "DOCXTracker"
];

const MAX_EVENTS = 500;
let __eventStore = [];
let __filters = { types: null, sources: null };

function pushEvent(event) {
  const env = detectEnvironment();
  const enriched = { ...event, _seq: __eventStore.length, ts: event.ts || Date.now(), _env: env.mode };
  __eventStore.push(enriched);
  if (__eventStore.length > MAX_EVENTS) __eventStore = __eventStore.slice(-MAX_EVENTS);
  if (__filters.types && !__filters.types.includes(enriched.type)) return;
  if (__filters.sources && !__filters.sources.includes(enriched.source)) return;
  eventBus.emit("monitor:event_stream", enriched);
}

export function getEventStore() { return [...__eventStore]; }
export function clearEventStore() { __eventStore = []; }
export function setEventFilter(filters) { __filters = { ...__filters, ...filters }; }
export function replayEvents(fromSeq = 0) {
  const events = __eventStore.filter(e => e._seq >= fromSeq);
  events.forEach(e => eventBus.emit("monitor:event_stream", { ...e, _replay: true }));
  return events.length;
}
export function getEventSummary() {
  const s = { total: __eventStore.length, by_type: {}, by_source: {}, errors: 0, latency_events: 0 };
  for (const e of __eventStore) {
    s.by_type[e.type] = (s.by_type[e.type] || 0) + 1;
    s.by_source[e.source] = (s.by_source[e.source] || 0) + 1;
    if (e.type === "error") s.errors++;
    if (e.latency_ms) s.latency_events++;
  }
  return s;
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

export function initMiniMonitorSource() {
  const env = detectEnvironment();
  console.log(`[Monitor] Init — env=${env.mode}, modules=${MONITOR_MODULES.length}`);

  const emitSnapshot = () => {
    eventBus.emit("monitor:update", { mode: SreeRuntime.mode, status: SreeRuntime.status, screen: SreeRuntime.screenContext, env: env.mode });
  };
  emitSnapshot();
  eventBus.on("runtime:mode", emitSnapshot);
  eventBus.on("runtime:status", emitSnapshot);
  eventBus.on("runtime:screen", emitSnapshot);
  eventBus.on("screenContext:update", emitSnapshot);

  // Developer Aeva events
  eventBus.on("developer:progress", (p) => {
    pushEvent({ type: "task", source: "Aeva", action: p.step || "progress", detail: p.message, id: p.id });
    eventBus.emit("monitor:update", { mode: SreeRuntime.mode, status: `Dev: ${p.step || ""} ${p.message || ""}`.trim(), screen: SreeRuntime.screenContext });
  });
  eventBus.on("developer:done", (d) => { pushEvent({ type: "task", source: "Aeva", action: "done", id: d.id }); emitSnapshot(); });
  eventBus.on("developer:error", (e) => { pushEvent({ type: "error", source: "Aeva", action: "error", detail: e?.error || String(e), id: e?.id }); emitSnapshot(); });
  eventBus.on("developer:start", (p) => { pushEvent({ type: "task", source: "Aeva", action: "start", id: p?.id }); });

  // Agentic
  eventBus.on("agentic:progress", (p) => { pushEvent({ type: "task", source: "Orchestrator", action: p.step || "progress", detail: p.message }); });
  eventBus.on("agentic:done", () => { pushEvent({ type: "task", source: "Orchestrator", action: "done" }); emitSnapshot(); });
  eventBus.on("agentic:error", (e) => { pushEvent({ type: "error", source: "Orchestrator", action: "error", detail: e?.error || String(e) }); emitSnapshot(); });

  // Aeva lifecycle
  eventBus.on("aeva:activated", (r) => pushEvent({ type: "system", source: "Aeva", action: "activated", detail: `${r.developer_modules_exposed?.length || 0} modules, env=${r.current_env || env.mode}` }));
  eventBus.on("aeva:context_indexed", (c) => pushEvent({ type: "system", source: "Aeva", action: "context_indexed", detail: `${c.agents?.length || 0} agents, ${c.kbs?.length || 0} KBs` }));
  eventBus.on("aeva:self_heal_report", (r) => pushEvent({ type: "diagnostic", source: "Aeva", action: "self_heal_report", detail: `${r.issues?.length || 0} issues` }));
  eventBus.on("aeva:rls_report", (r) => pushEvent({ type: "diagnostic", source: "Aeva", action: "rls_report", detail: JSON.stringify(r).slice(0, 200) }));
  eventBus.on("aeva:tenant_set", (t) => pushEvent({ type: "system", source: "Aeva", action: "tenant_set", detail: t.tenant_id || "auto" }));
  eventBus.on("aeva:module_status", (m) => pushEvent({ type: "system", source: "Aeva", action: `module:${m.name}`, detail: m.status }));
  eventBus.on("monitor:event", (event) => pushEvent(event));

  // Tracking channels
  const channels = [
    { event: "llm:call", type: "llm", source: "LLM" },
    { event: "llm:response", type: "llm", source: "LLM" },
    { event: "function:invoke", type: "function", source: "Function" },
    { event: "function:response", type: "function", source: "Function" },
    { event: "kb:operation", type: "kb", source: "KBManager" },
    { event: "agent:operation", type: "agent", source: "AgentOps" },
    { event: "embedding:create", type: "embedding", source: "Embeddings" },
    { event: "chunk:create", type: "chunk", source: "Chunks" },
    { event: "voice:preview", type: "voice", source: "VoicePreview" },
    { event: "docx:extract", type: "docx", source: "DOCXPipeline" },
    { event: "latency:report", type: "latency", source: "Latency" },
  ];
  for (const ch of channels) {
    eventBus.on(ch.event, (data) => {
      pushEvent({ type: ch.type, source: ch.source, action: data?.action || ch.event, detail: data?.detail || data?.message || "", latency_ms: data?.latency_ms, id: data?.id });
    });
  }

  // Control
  eventBus.on("monitor:filter", (f) => setEventFilter(f));
  eventBus.on("monitor:replay", (s) => replayEvents(s || 0));
  eventBus.on("monitor:clear", () => clearEventStore());
  eventBus.on("monitor:summary", () => eventBus.emit("monitor:summary_result", getEventSummary()));

  // Overlay rules
  if (env.mode === "web") {
    pushEvent({ type: "system", source: "Monitor", action: "overlay_rule", detail: "web mode — task stream only, no DOM capture" });
  } else if (env.mode === "desktop") {
    pushEvent({ type: "system", source: "Monitor", action: "overlay_rule", detail: "desktop mode — overlay + window capture enabled" });
  }

  pushEvent({ type: "system", source: "Monitor", action: "initialized", detail: `${MONITOR_MODULES.length} modules, env=${env.mode}` });
}