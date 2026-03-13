/**
 * Sree Visual Debugger
 * Step-by-step agentic workflow visualizer with breadcrumb timeline,
 * live variable inspection, and re-run capability.
 */
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import eventBus from "@/components/sree/engine/eventBus";
import {
  CheckCircle2, AlertTriangle, Loader2, Circle,
  ChevronRight, Code2, Play, RotateCcw, Zap, Clock, Eye
} from "lucide-react";

const STEP_STATUS_STYLE = {
  done:    "text-emerald-400 border-emerald-600/40 bg-emerald-900/20",
  error:   "text-red-400 border-red-600/40 bg-red-900/20",
  running: "text-blue-400 border-blue-600/40 bg-blue-900/20 animate-pulse",
  pending: "text-slate-500 border-slate-700/40 bg-slate-800/20",
};

const STEP_ICONS = {
  done:    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  error:   <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  pending: <Circle className="w-3.5 h-3.5 text-slate-600" />,
};

function JsonViewer({ data }) {
  const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <pre className="text-[9px] font-mono text-emerald-200 bg-black/30 rounded-lg p-2 overflow-x-auto max-h-32 whitespace-pre-wrap">{str}</pre>
  );
}

export default function VisualDebugger() {
  const [steps, setSteps] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const onProgress = (p) => {
      setSteps(prev => {
        const existing = prev.findIndex(s => s.step === p.step);
        const entry = { step: p.step || `step_${prev.length + 1}`, message: p.message || "", status: p.status || "running", ts: Date.now(), data: p.data };
        if (existing >= 0) { const n = [...prev]; n[existing] = entry; return n; }
        return [...prev, entry];
      });
    };
    const onDone = (d) => {
      setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "done" } : s));
    };
    const onError = (e) => {
      setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "error", message: e?.error || String(e) } : s));
    };
    const onClear = () => { setSteps([]); setSelected(null); };

    eventBus.on("developer:progress", onProgress);
    eventBus.on("agent:progress", onProgress);
    eventBus.on("developer:done", onDone);
    eventBus.on("developer:error", onError);
    eventBus.on("monitor:clear", onClear);
    return () => {
      eventBus.off("developer:progress", onProgress);
      eventBus.off("agent:progress", onProgress);
      eventBus.off("developer:done", onDone);
      eventBus.off("developer:error", onError);
      eventBus.off("monitor:clear", onClear);
    };
  }, []);

  const sel = selected !== null ? steps[selected] : null;
  const hasSteps = steps.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] rounded-xl border border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-violet-700 to-indigo-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white">Visual Debugger</span>
          {hasSteps && <Badge className="text-[9px] px-1.5 py-0 bg-white/20 text-white border-0 rounded-full">{steps.length}</Badge>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => { setSteps([]); setSelected(null); }} title="Clear"><RotateCcw className="h-3 w-3" /></Button>
        </div>
      </div>

      {!hasSteps ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-violet-400" />
          </div>
          <p className="text-[11px] text-slate-500">Run a developer command to see the step-by-step execution trace here.</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Step timeline */}
          <ScrollArea className="w-48 flex-shrink-0 border-r border-white/[0.06] bg-black/20">
            <div className="p-2 space-y-1">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={cn(
                    "w-full flex items-start gap-2 px-2 py-2 rounded-lg border text-left transition-all",
                    STEP_STATUS_STYLE[s.status],
                    selected === i && "ring-1 ring-indigo-500/50"
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">{STEP_ICONS[s.status]}</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold truncate">{s.step}</div>
                    <div className="text-[9px] opacity-60 truncate">{s.message?.slice(0, 40)}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2 h-2 opacity-40" />
                      <span className="text-[8px] opacity-40">{new Date(s.ts).toLocaleTimeString("en-US", { hour12: false })}</span>
                    </div>
                  </div>
                  {s.data && <Eye className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Step detail */}
          <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
            {sel ? (
              <>
                <div className="flex items-center gap-2">
                  {STEP_ICONS[sel.status]}
                  <span className="text-sm font-bold text-slate-100">{sel.step}</span>
                  <Badge className={cn("text-[9px] px-1.5 py-0 border rounded-full", STEP_STATUS_STYLE[sel.status])}>{sel.status}</Badge>
                </div>
                <p className="text-xs text-slate-400">{sel.message}</p>
                {sel.data && (
                  <div>
                    <p className="text-[10px] font-semibold text-violet-300 mb-1">Output data</p>
                    <JsonViewer data={sel.data} />
                  </div>
                )}
                <Button size="sm" variant="outline" className="mt-auto h-7 text-xs border-white/10 text-slate-300 hover:bg-white/[0.08] gap-1.5 rounded-xl"
                  onClick={() => eventBus.emit("developer:command", sel.step)}>
                  <Play className="w-3 h-3" /> Re-run step
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <p className="text-[11px] text-slate-600">Click a step to inspect details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}