import { useState, useRef, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import eventBus from "@/components/sree/engine/eventBus";
import { detectEnvironment } from "@/components/sree/engine/environmentDetector";
import AevaModulePanel from "./AevaModulePanel";
import { cn } from "@/lib/utils";
import {
  Mic, MicOff, Volume2, VolumeX, Send,
  Wrench, Bug, Database, Brain, FileSearch, Activity,
  Shield, FileCode, Sparkles, AlertTriangle,
  CheckCircle2, Loader2, Terminal, Layers, Globe, Laptop, FlaskConical, Cpu, MonitorSmartphone, HardDrive, Zap, Users
} from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Phase 17 AI Workforce", cmd: "phase 17", icon: Users, color: "text-violet-300" },
  { label: "Phase 16 Marketing & Media", cmd: "phase 16", icon: Zap, color: "text-pink-300" },
  { label: "Phase 15 Sree OS Runtime", cmd: "phase 15", icon: Cpu, color: "text-orange-300" },
  { label: "Phase 14 Universal Adapter", cmd: "phase 14", icon: Zap, color: "text-yellow-300" },
  { label: "Phase 13 Consolidation", cmd: "phase 13", icon: Layers, color: "text-violet-300" },
  { label: "Phase 12 Desktop Mode", cmd: "phase 12", icon: HardDrive, color: "text-fuchsia-300" },
  { label: "Phase 11 Browser Assistant", cmd: "phase 11", icon: MonitorSmartphone, color: "text-emerald-300" },
  { label: "Phase 10 Copilot Mode", cmd: "phase 10", icon: Cpu, color: "text-sky-300" },
  { label: "Phase 9 Regression Testing", cmd: "phase 9", icon: CheckCircle2, color: "text-cyan-300" },
  { label: "Phase 8 Testing & QA", cmd: "phase 8", icon: FlaskConical, color: "text-lime-400" },
  { label: "Phase 7 Dev Mode", cmd: "phase 7", icon: FileCode, color: "text-violet-400" },
  { label: "Phase 6 Monitor", cmd: "phase 6", icon: Activity, color: "text-orange-400" },
  { label: "Phase 5 Intelligence", cmd: "phase 5", icon: Brain, color: "text-rose-400" },
  { label: "Phase 4 Sync", cmd: "phase 4", icon: Layers, color: "text-teal-400" },
  { label: "Phase 3 Deploy", cmd: "phase 3", icon: Globe, color: "text-sky-400" },
  { label: "Phase 2 Repair", cmd: "phase 2", icon: Sparkles, color: "text-purple-400" },
  { label: "Phase 1 Repair", cmd: "phase 1", icon: Wrench, color: "text-yellow-400" },
  { label: "Full Diagnostics", cmd: "full platform diagnostics", icon: Activity, color: "text-emerald-400" },
  { label: "Fix Error", cmd: "self heal", icon: Bug, color: "text-red-400" },
  { label: "Repair Agent", cmd: "diagnose", icon: Wrench, color: "text-amber-400" },
  { label: "Clean KB", cmd: "run clean orphaned knowledge bases", icon: Database, color: "text-emerald-400" },
  { label: "RLS Check", cmd: "rls check", icon: Shield, color: "text-blue-400" },
  { label: "Index Project", cmd: "index project", icon: FileSearch, color: "text-violet-400" },
  { label: "Rebuild Embeddings", cmd: "run rebuild embeddings", icon: Brain, color: "text-pink-400" },
  { label: "Test DOCX", cmd: "run test docx pipeline", icon: FileCode, color: "text-orange-400" },
  { label: "Test Voice", cmd: "run test voice preview", icon: Volume2, color: "text-cyan-400" },
  { label: "Aeva Status", cmd: "aeva status", icon: Activity, color: "text-indigo-400" },
];

const ENV_ICONS = { web: Globe, saas: Globe, desktop: Laptop, cli: Terminal };

function DeveloperSreeView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const [env] = useState(() => detectEnvironment());
  const scrollRef = useRef(null);

  useEffect(() => {
    const onResp = (msg) => {
      // Suppress simple "Queued task" echo — real result comes via developer:done
      const raw = typeof msg === "string" ? msg : (msg?.result ?? msg);
      const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
      if (/^Queued task \(aeva-/.test(rawStr)) return;
      setMessages(prev => [...prev, { role: "assistant", text: raw, type: "response", ts: Date.now() }]);
      setIsProcessing(false);
    };
    const onProgress = (p) => {
      // Preserve structured data: label + optional data object
      const label = `${p.step || ""} — ${p.message || ""}`;
      setMessages(prev => [...prev, { role: "system", text: label, data: p.data, type: "progress", ts: Date.now() }]);
    };
    const onDone = (d) => {
      const result = d?.result;
      // If result is a NO_INTENT_MATCH, show a friendly message
      if (result?.error === "NO_INTENT_MATCH") {
        setMessages(prev => [...prev, { role: "assistant", text: result.message, type: "response", ts: Date.now() }]);
        setIsProcessing(false);
        return;
      }
      // Store raw result — object or string — rendering handles serialization
      setMessages(prev => [...prev, { role: "assistant", text: result, type: "done", ts: Date.now() }]);
      setIsProcessing(false);
    };
    const onError = (e) => {
      setMessages(prev => [...prev, { role: "error", text: e?.error || String(e), type: "error", ts: Date.now() }]);
      setIsProcessing(false);
    };
    eventBus.on("developer:response", onResp);
    eventBus.on("developer:progress", onProgress);
    eventBus.on("developer:done", onDone);
    eventBus.on("developer:error", onError);
    return () => {
      eventBus.off("developer:response", onResp);
      eventBus.off("developer:progress", onProgress);
      eventBus.off("developer:done", onDone);
      eventBus.off("developer:error", onError);
    };
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendCommand = (cmd) => {
    const text = cmd || input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: "user", text, type: "command", ts: Date.now() }]);
    setInput("");
    setIsProcessing(true);
    eventBus.emit("developer:command", text);
  };

  const EnvIcon = ENV_ICONS[env.mode] || Globe;

  // Module panel view
  if (showModules) {
    return <AevaModulePanel onClose={() => setShowModules(false)} />;
  }

  return (
    <div className="flex flex-col h-full gap-1.5">
      {/* Env + module strip */}
      <div className="flex items-center gap-1.5 px-0.5">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/40">
          <EnvIcon className="w-2.5 h-2.5 text-slate-400" />
          <span className="text-[9px] text-slate-400 font-medium uppercase">{env.mode}</span>
        </div>
        <button
          onClick={() => setShowModules(true)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-900/30 border border-indigo-700/30 text-[9px] text-indigo-300 font-medium hover:bg-indigo-800/40 transition-colors"
        >
          <Layers className="w-2.5 h-2.5" /> 12 + 16 Modules
        </button>
        <div className="flex-1" />
        <Badge className="text-[8px] px-1 py-0 bg-emerald-900/30 text-emerald-300 border-emerald-700/30">Hardened</Badge>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1 px-0.5">
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.cmd}
            onClick={() => sendCommand(a.cmd)}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all",
              "bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600",
              "text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <a.icon className={cn("w-3 h-3", a.color)} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Message stream */}
      <ScrollArea className="flex-1 rounded-xl bg-slate-900/30 border border-slate-700/40">
        <div className="p-2.5 space-y-1.5 min-h-[140px]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Terminal className="w-7 h-7 text-slate-600" />
              <p className="text-[10px] text-slate-500 text-center max-w-[220px]">Developer Aeva ready ({env.mode}). Type a command or use quick actions.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex items-start gap-1.5 text-[11px] leading-relaxed", m.role === "user" && "justify-end")}>
              {m.role !== "user" && (
                m.type === "error" ? <AlertTriangle className="w-3 h-3 mt-0.5 text-red-400 flex-shrink-0" /> :
                m.type === "done" ? <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-400 flex-shrink-0" /> :
                m.type === "progress" ? <Loader2 className="w-3 h-3 mt-0.5 text-blue-400 animate-spin flex-shrink-0" /> :
                <Sparkles className="w-3 h-3 mt-0.5 text-indigo-400 flex-shrink-0" />
              )}
              <div className={cn(
                "rounded-xl px-3 py-2 max-w-[90%]",
                m.role === "user" ? "bg-indigo-600 text-white ml-auto shadow-[0_2px_8px_rgba(99,102,241,0.35)]" :
                m.type === "error" ? "bg-red-900/60 text-red-200 border border-red-700/50" :
                m.type === "progress" ? "bg-slate-700/50 text-slate-300 border border-slate-600/30" :
                m.type === "done" ? "bg-emerald-900/40 text-emerald-200 border border-emerald-700/30" :
                "bg-slate-700/60 text-slate-100 border border-slate-600/30"
              )}>
                <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                  {typeof m.text === "object" && m.text !== null
                    ? JSON.stringify(m.text, null, 2)
                    : String(m.text ?? "")}
                  {m.data != null && (
                    "\n" + (typeof m.data === "object" ? JSON.stringify(m.data, null, 2) : String(m.data))
                  )}
                </pre>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center gap-2 text-[11px] text-blue-400 py-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Executing…
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setMicOn(!micOn)}
          title={micOn ? "Mute mic" : "Unmute mic"}
          className={cn(
            "p-2 rounded-xl border-2 transition-all shadow-sm",
            micOn
              ? "bg-red-500 border-red-400 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)]"
              : "bg-slate-700/60 border-slate-600/60 text-slate-400 hover:text-white hover:border-slate-500"
          )}
        >
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setSpeakerOn(!speakerOn)}
          title={speakerOn ? "Mute speaker" : "Unmute speaker"}
          className={cn(
            "p-2 rounded-xl border-2 transition-all shadow-sm",
            speakerOn
              ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
              : "bg-slate-700/60 border-slate-600/60 text-slate-400 hover:text-white hover:border-slate-500"
          )}
        >
          {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendCommand()}
          placeholder="Developer command…"
          disabled={isProcessing}
          className="flex-1 h-9 text-sm bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
        />
        <Button
          onClick={() => sendCommand()}
          disabled={isProcessing || !input.trim()}
          size="sm"
          className="h-9 w-9 px-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-[0_2px_8px_rgba(99,102,241,0.35)] disabled:opacity-40"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

export default memo(DeveloperSreeView);