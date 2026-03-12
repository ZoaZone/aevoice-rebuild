import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Minus, Maximize2, Minimize2, Activity, Circle,
  ExternalLink, AudioLines, Trash2, RotateCcw,
  AlertTriangle, Zap, Search, X, Mic, Monitor as MonitorIcon
} from "lucide-react";
import eventBus from "@/components/sree/engine/eventBus";
import SreeScreenPreview from "./SreeScreenPreview";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  idle: "bg-emerald-500", running: "bg-blue-500 animate-pulse",
  listening: "bg-indigo-500 animate-pulse", speaking: "bg-purple-500 animate-pulse",
  processing: "bg-amber-500 animate-pulse", working: "bg-blue-500 animate-pulse",
  error: "bg-red-500",
};

const TYPE_COLORS = {
  system: "bg-slate-500/20 text-slate-300", task: "bg-cyan-500/20 text-cyan-300",
  command: "bg-indigo-500/20 text-indigo-300", error: "bg-red-500/20 text-red-300",
  diagnostic: "bg-amber-500/20 text-amber-300", llm: "bg-violet-500/20 text-violet-300",
  function: "bg-blue-500/20 text-blue-300", kb: "bg-emerald-500/20 text-emerald-300",
  agent: "bg-purple-500/20 text-purple-300",
};

function StatusDot({ status }) {
  return <span className={cn("inline-block w-2 h-2 rounded-full", STATUS_COLORS[status] || STATUS_COLORS.idle)} />;
}

const MONITOR_MODES = new Set(["Developer Sree", "AI Sree (Agentic Assistant)", "developer", "agentic"]);

export default function SreeMiniMonitor({ enabled = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMax, setIsMax] = useState(false);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(null);
  const [data, setData] = useState({ mode: "—", status: "idle" });
  const [activeMode, setActiveMode] = useState("Sri (Text Chat)");
  const scrollRef = useRef(null);

  // Only show monitor pill/panel when in developer or agentic mode
  const isDevMode = MONITOR_MODES.has(activeMode);

  useEffect(() => {
    if (!enabled) return;
    const toggle = () => setIsOpen(p => !p);
    const update = (d) => setData(p => ({ ...p, ...(d || {}) }));
    const onEv = (ev) => setEvents(p => { const n = [...p, ev]; return n.length > 200 ? n.slice(-200) : n; });
    const onMode = (m) => {
      const modeStr = m?.mode || m;
      setData(p => ({ ...p, mode: modeStr }));
      setActiveMode(modeStr);
      // Auto-open monitor when entering dev/agentic mode
      if (MONITOR_MODES.has(modeStr)) setIsOpen(true);
      else setIsOpen(false);
    };
    const onStatus = (s) => setData(p => ({ ...p, status: s }));
    const onProg = () => setData(p => ({ ...p, status: "running" }));

    eventBus.on("monitor:toggle", toggle); eventBus.on("monitor:update", update);
    eventBus.on("monitor:event_stream", onEv); eventBus.on("runtime:mode", onMode);
    eventBus.on("modeChanged", onMode); eventBus.on("runtime:status", onStatus);
    eventBus.on("developer:progress", onProg); eventBus.on("agent:progress", onProg);
    return () => {
      eventBus.off("monitor:toggle", toggle); eventBus.off("monitor:update", update);
      eventBus.off("monitor:event_stream", onEv); eventBus.off("runtime:mode", onMode);
      eventBus.off("modeChanged", onMode); eventBus.off("runtime:status", onStatus);
      eventBus.off("developer:progress", onProg); eventBus.off("agent:progress", onProg);
    };
  }, [enabled]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]") || scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [events]);

  if (!enabled || !isDevMode) return null;

  const filtered = events.filter(e => {
    if (filter && e.type !== filter) return false;
    if (search) { const q = search.toLowerCase(); return (e.action||"").toLowerCase().includes(q)||(e.detail||"").toLowerCase().includes(q)||(e.source||"").toLowerCase().includes(q); }
    return true;
  });
  const errs = events.filter(e => e.type === "error").length;
  const st = typeof data.status === "string" ? data.status : "idle";

  if (!isOpen) {
    return (
      <button
        data-sree-monitor="pill"
        className="fixed bottom-6 left-6 z-[9998] flex items-center gap-2.5 bg-slate-900 text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-slate-700/50 hover:bg-slate-800 transition-all hover:scale-[1.03] active:scale-95"
        onClick={() => setIsOpen(true)}
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold">Monitor</span>
        <StatusDot status={st} />
        {errs > 0 && <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{errs}</span>}
      </button>
    );
  }

  const filters = ["system","task","error","diagnostic","llm","function","kb","agent"];
  const pw = isMax ? 520 : 390;

  return (
    <div
      data-sree-monitor="panel"
      className="fixed bottom-6 left-6 z-[9999] flex flex-col overflow-hidden rounded-2xl bg-slate-950 border border-slate-700/40 shadow-[0_16px_64px_rgba(0,0,0,0.55),0_4px_12px_rgba(0,0,0,0.3)]"
      style={{ width: pw, maxHeight: "88vh" }}
    >
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Sree Monitor</span>
          <StatusDot status={st} />
          {errs > 0 && (
            <span className="bg-red-500/80 text-white text-[9px] font-bold rounded-full px-1.5 py-0 flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />{errs}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {[
            { icon: Trash2, action: () => { setEvents([]); eventBus.emit("monitor:clear"); }, tip: "Clear" },
            { icon: RotateCcw, action: () => eventBus.emit("monitor:replay", 0), tip: "Replay" },
            { icon: isMax ? Minimize2 : Maximize2, action: () => setIsMax(v => !v) },
            { icon: Minus, action: () => setIsOpen(false) },
          ].map((b, i) => (
            <Button key={i} variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-white/60 hover:text-white hover:bg-white/15" onClick={b.action} title={b.tip}>
              <b.icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      </div>

      {/* ═══ Screen Preview ═══ */}
      <div className="px-3 pt-3 flex-shrink-0">
        <SreeScreenPreview className="h-44 w-full" />
      </div>

      {/* ═══ Status ═══ */}
      <div className="mx-3 mt-2.5 px-3 py-2 flex items-center gap-2 rounded-xl bg-slate-800/50 border border-slate-700/30 flex-shrink-0">
        <StatusDot status={st} />
        <span className="text-[11px] font-semibold text-slate-300 capitalize truncate flex-1">{st}</span>
        <Badge className="text-[9px] px-1.5 py-0 bg-slate-700/50 text-slate-400 border-slate-600/40 rounded-md">{data.mode || "—"}</Badge>
        {data.env && <Badge className="text-[9px] px-1.5 py-0 bg-indigo-600/20 text-indigo-300 border-indigo-500/30 rounded-md">{data.env}</Badge>}
        <Badge className="text-[9px] px-1.5 py-0 bg-slate-700/50 text-slate-400 border-slate-600/40 rounded-md">{events.length}</Badge>
      </div>

      {/* ═══ Filters ═══ */}
      <div className="mx-3 mt-1.5 px-2 py-1.5 flex items-center gap-1 rounded-xl bg-slate-800/30 border border-slate-700/20 flex-shrink-0 overflow-x-auto">
        <div className="relative flex-shrink-0">
          <Search className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter…" className="h-6 w-20 text-[10px] pl-5 pr-5 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 rounded-lg" />
          {search && <button onClick={() => setSearch("")} className="absolute right-1 top-1/2 -translate-y-1/2"><X className="w-2.5 h-2.5 text-slate-500" /></button>}
        </div>
        <button onClick={() => setFilter(null)} className={cn("text-[9px] px-2 py-0.5 rounded-lg font-semibold flex-shrink-0 transition-all", !filter ? "bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.4)]" : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60")}>All</button>
        {filters.map(t => (
          <button key={t} onClick={() => setFilter(filter === t ? null : t)} className={cn("text-[9px] px-2 py-0.5 rounded-lg capitalize font-semibold flex-shrink-0 transition-all", filter === t ? "bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.4)]" : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60")}>{t}</button>
        ))}
      </div>

      {/* ═══ Event Stream ═══ */}
      <ScrollArea ref={scrollRef} className="flex-1 mx-3 mt-1.5 rounded-xl bg-slate-900/30 border border-slate-700/20" style={{ height: isMax ? 220 : 140 }}>
        <div className="px-2 py-1 space-y-px">
          {filtered.length === 0 && <p className="text-xs text-slate-600 text-center py-4">Waiting for events…</p>}
          {filtered.map((e, i) => {
            const isErr = e.type === "error";
            const last = i === filtered.length - 1;
            return (
              <div key={e._seq ?? i} className={cn("flex items-start gap-1.5 text-[10px] px-2 py-1 rounded-lg", isErr && "bg-red-500/10", last && !isErr && "bg-white/[0.03]")}>
                {isErr ? <AlertTriangle className="w-2.5 h-2.5 mt-0.5 text-red-400 flex-shrink-0" /> : last ? <Zap className="w-2.5 h-2.5 mt-0.5 text-indigo-400 flex-shrink-0" /> : <Circle className="w-1.5 h-1.5 mt-1 text-slate-600 fill-slate-600 flex-shrink-0" />}
                <Badge className={cn("text-[8px] px-1 py-0 flex-shrink-0 rounded border-0", TYPE_COLORS[e.type] || TYPE_COLORS.system)}>{e.type}</Badge>
                <span className="text-slate-500 flex-shrink-0">{e.source}</span>
                <span className={cn("font-mono flex-shrink-0", last ? "text-slate-200" : "text-slate-500")}>{e.action}</span>
                {e.detail && (
                  <span className="text-slate-600 truncate min-w-0">
                    {typeof e.detail === "object" ? JSON.stringify(e.detail) : e.detail}
                  </span>
                )}
                {e.latency_ms && <span className="text-yellow-400 flex-shrink-0">{e.latency_ms}ms</span>}
                <span className="text-slate-700 flex-shrink-0 ml-auto font-mono">{new Date(e.ts).toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* ═══ Footer ═══ */}
      <div className="px-3 py-3 flex items-center gap-2 flex-shrink-0">
        <Button size="sm" className="flex-1 h-9 text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white gap-2 rounded-xl shadow-[0_2px_10px_rgba(99,102,241,0.35)]"
          onClick={() => eventBus.emit("modeChanged", "Live Assistant")}>
          <AudioLines className="w-3.5 h-3.5" /> Live Session
        </Button>
        <Button size="sm" variant="outline" className="h-9 text-xs font-bold border-slate-700 text-slate-300 hover:bg-slate-800 gap-2 rounded-xl"
          onClick={() => window.open(window.location.origin + "/SreeDemo?mode=live", "sree_live", "width=500,height=700")}>
          <ExternalLink className="w-3.5 h-3.5" /> New Tab
        </Button>
      </div>
    </div>
  );
}