import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import eventBus from "@/components/sree/engine/eventBus";
import { AEVA_MODULES, MODULE_STATUS } from "@/components/sree/engine/developerSreeEngine";
import { MONITOR_MODULES } from "@/components/sree/engine/miniMonitorSource";
import { detectEnvironment } from "@/components/sree/engine/environmentDetector";
import { cn } from "@/lib/utils";
import {
  FileCode, FileSearch, Pencil, FolderTree, Bot, Database, Shield,
  Bug, ScrollText, Wrench, Workflow, Play, Activity, Filter,
  Tag, RotateCcw, BarChart3, AlertTriangle, Clock, Sparkles,
  Cpu, Globe, Laptop, Terminal, Monitor
} from "lucide-react";

const MODULE_ICONS = {
  CodeReader: FileCode, CodeWriter: Pencil, FileEditor: FileSearch,
  RepoNavigator: FolderTree, AgentOrchestrator: Bot, KBManager: Database,
  Validator: Shield, Debugger: Bug, LogInspector: ScrollText,
  PlatformDiagnostics: Wrench, WorkflowPlanner: Workflow, MultiStepExecutor: Play,
};

const MONITOR_ICONS = {
  EventStream: Activity, EventFilter: Filter, EventTagging: Tag,
  EventReplay: RotateCcw, EventSummary: BarChart3, ErrorHighlight: AlertTriangle,
  DevOverlay: Monitor, LatencyTracker: Clock, LLMTracker: Sparkles,
  FunctionTracker: Cpu, KBTracker: Database, AgentTracker: Bot,
  EmbeddingTracker: Sparkles, ChunkTracker: Database, VoicePreviewTracker: Activity,
  DOCXTracker: FileCode,
};

const ENV_ICONS = { web: Globe, saas: Globe, desktop: Laptop, cli: Terminal };

export default function AevaModulePanel({ onClose }) {
  const [moduleStates, setModuleStates] = useState({ ...MODULE_STATUS });
  const [env] = useState(() => detectEnvironment());

  useEffect(() => {
    const handler = (m) => {
      setModuleStates(prev => ({ ...prev, [m.name]: { status: m.status, lastRun: m.lastRun, lastError: m.lastError, runCount: m.runCount } }));
    };
    eventBus.on("aeva:module_status", handler);
    return () => eventBus.off("aeva:module_status", handler);
  }, []);

  const EnvIcon = ENV_ICONS[env.mode] || Globe;

  return (
    <div className="flex flex-col h-full">
      {/* Env badge */}
      <div className="flex items-center gap-2 px-1 py-1.5 border-b border-slate-700/40 mb-2">
        <EnvIcon className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Env: {env.mode}</span>
        {env.canOverlay && <Badge className="text-[8px] px-1 py-0 bg-emerald-900/40 text-emerald-300 border-emerald-700/50">overlay</Badge>}
        {env.canLocalFileAccess && <Badge className="text-[8px] px-1 py-0 bg-blue-900/40 text-blue-300 border-blue-700/50">local FS</Badge>}
        <button onClick={onClose} className="ml-auto text-[10px] text-slate-500 hover:text-slate-300">✕</button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {/* Aeva modules */}
          <div>
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 px-0.5">Developer Aeva — {AEVA_MODULES.length} Modules</p>
            <div className="grid grid-cols-2 gap-1">
              {AEVA_MODULES.map(name => {
                const Icon = MODULE_ICONS[name] || Sparkles;
                const s = moduleStates[name] || { status: "ready" };
                const isError = s.status === "error";
                return (
                  <button
                    key={name}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] border transition-all text-left",
                      isError
                        ? "bg-red-950/30 border-red-800/40 text-red-300"
                        : "bg-slate-800/30 border-slate-700/40 text-slate-300 hover:bg-slate-700/40 hover:border-slate-600"
                    )}
                    onClick={() => eventBus.emit("developer:command", `run ${name.toLowerCase()}`)}
                  >
                    <Icon className={cn("w-3 h-3 flex-shrink-0", isError ? "text-red-400" : "text-indigo-400")} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{name}</div>
                      <div className="text-[8px] text-slate-500">{s.runCount || 0} runs</div>
                    </div>
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isError ? "bg-red-500" : "bg-emerald-500")} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monitor modules */}
          <div>
            <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5 px-0.5">Mini Monitor — {MONITOR_MODULES.length} Modules</p>
            <div className="grid grid-cols-2 gap-1">
              {MONITOR_MODULES.map(name => {
                const Icon = MONITOR_ICONS[name] || Activity;
                const disabled = name === "DevOverlay" && !env.canOverlay;
                return (
                  <div
                    key={name}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] border",
                      disabled
                        ? "bg-slate-900/30 border-slate-800/30 text-slate-600 opacity-50"
                        : "bg-slate-800/30 border-slate-700/40 text-slate-300"
                    )}
                  >
                    <Icon className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                    {disabled && <span className="text-[7px] text-slate-600 ml-auto">web only</span>}
                    {!disabled && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}