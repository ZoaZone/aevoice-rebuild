import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Minus, Maximize2, ChevronDown, Loader2, Mic, MessageSquare,
  Monitor, ExternalLink, AudioLines, Send, Bot, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { loadFeatureFlags, getInitialMode } from "@/components/config/featureFlags";
import SreeLocalOnboarding from "@/components/sree/onboarding/SreeLocalOnboarding.jsx";
import SreeView from "@/components/sree/views/SreeView.jsx";
import TextChatView from "@/components/sree/views/TextChatView.jsx";
import VoiceChatView from "@/components/sree/views/VoiceChatView.jsx";
import SreeLiveAssistant from "@/components/sree/SreeLiveAssistant.jsx";
import { SreeRuntime } from "@/components/sree/engine/runtime";
import eventBus from "@/components/sree/engine/eventBus";
import { modeConfig } from "@/components/sree/modeConfig";
import { cn } from "@/lib/utils";

export default function SreeUnifiedWidget(props) {
  const {
    mode, hideOnboarding, draggable = true, demoMode = false,
    width, height, minWidth = 340, minHeight = 260, maxWidth = 1200, maxHeight = 900,
    style, className, ...rest
  } = props;

  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [featureFlags, setFeatureFlags] = useState(null);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [currentMode, setCurrentMode] = useState(mode || "Sri (Text Chat)");

  const handleModeChange = (m) => {
    if (m === "Developer Sree") { navigate(createPageUrl("SreeDeveloper")); return; }
    if (m === "AI Sree (Agentic Assistant)") { navigate(createPageUrl("SreeAgentic")); return; }
    setCurrentMode(m);
    eventBus.emit("modeChanged", m);
    SreeRuntime.setMode(m);
    // Delay voice:start so VoiceChatView has time to mount and register its listener
    if (m === "Voice Chat") setTimeout(() => eventBus.emit("voice:start"), 300);
  };

  useEffect(() => { SreeRuntime.setMode(currentMode); }, [currentMode]);
  useEffect(() => {
    const onMode = (m) => { if (m !== "Developer Sree" && m !== "AI Sree (Agentic Assistant)") setCurrentMode(m); };
    eventBus.on("modeChanged", onMode);
    return () => eventBus.off("modeChanged", onMode);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") { e.preventDefault(); handleModeChange("Developer Sree"); }
      if (e.ctrlKey && e.shiftKey && e.key === "M") { e.preventDefault(); eventBus.emit("monitor:toggle"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(!hideOnboarding);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: width || 380, height: height || 500 });
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);

  useEffect(() => { try { if (window.localStorage.getItem("sree:minimized") === "true") setIsMinimized(true); } catch {} }, []);
  useEffect(() => { try { window.localStorage.setItem("sree:minimized", String(isMinimized)); } catch {} }, [isMinimized]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        setLoadingFlags(true);
        const flags = await loadFeatureFlags();
        if (c) return;
        setFeatureFlags(flags);
        const init = getInitialMode(flags, mode) || mode || "Sri (Text Chat)";
        if (init === "Developer Sree" || init === "AI Sree (Agentic Assistant)") setCurrentMode("Sri (Text Chat)");
        else setCurrentMode(init);
      } catch {} finally { if (!c) setLoadingFlags(false); }
    })();
    return () => { c = true; };
  }, [mode]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const effectiveStyle = useMemo(() => ({
    position: "fixed", width: isMaximized ? "100%" : size.width, height: isMinimized ? "auto" : size.height,
    minWidth, minHeight, maxWidth, maxHeight,
    bottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 60px)" : "24px",
    transform: draggable ? `translate(${position.x}px, ${position.y}px)` : undefined,
    zIndex: 55, ...style,
  }), [draggable, isMaximized, isMinimized, size, minWidth, minHeight, maxWidth, maxHeight, position, style, isMobile]);

  const dragging = useRef(false);
  const dragStartPos = useRef({});
  const handleDrag = (e) => {
    if (!draggable) return;
    // Only start drag on the drag-handle icon itself
    if (!e.currentTarget.dataset.dragHandle) return;
    e.preventDefault();
    dragging.current = true;
    dragStartPos.current = { mx: e.clientX, my: e.clientY, x: position.x, y: position.y };
    const mv = (ev) => {
      if (!dragging.current) return;
      setPosition({ x: dragStartPos.current.x + ev.clientX - dragStartPos.current.mx, y: dragStartPos.current.y + ev.clientY - dragStartPos.current.my });
    };
    const up = () => { dragging.current = false; window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  const resizeStart = useRef(null);
  const handleResize = (e) => {
    e.preventDefault();
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.width, h: size.height };
    const mv = (ev) => { if (!resizeStart.current) return; setSize({ width: Math.min(Math.max(resizeStart.current.w + ev.clientX - resizeStart.current.mx, minWidth), maxWidth), height: Math.min(Math.max(resizeStart.current.h + ev.clientY - resizeStart.current.my, minHeight), maxHeight) }); };
    const up = () => { resizeStart.current = null; window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  const renderView = () => {
    const cfg = modeConfig[currentMode] || {};
    if (cfg.Component) return <cfg.Component {...(cfg.props || {})} />;
    switch (currentMode) {
      case "Sri (Text Chat)": return <TextChatView />;
      case "Sree (Local Knowledge)": return <SreeView />;
      case "Voice Chat": return <VoiceChatView />;
      default: return <TextChatView />;
    }
  };

  if (isMinimized) {
    return (
      <button
        data-sree-widget="pill"
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white pl-3.5 pr-5 py-3 rounded-full shadow-[0_4px_24px_rgba(99,102,241,0.45),0_2px_6px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_32px_rgba(99,102,241,0.55)] transition-all hover:scale-[1.04] active:scale-95"
        onClick={() => setIsMinimized(false)}
      >
        <AudioLines className="w-5 h-5" />
        <span className="text-sm font-bold">Sree</span>
      </button>
    );
  }

  if (currentMode === "Live Assistant" || showLiveAssistant) {
    return (
      <div data-sree-widget="live" ref={cardRef} className={cn("shadow-[0_16px_64px_rgba(0,0,0,0.35)] border border-slate-700/60 bg-slate-950 overflow-hidden rounded-2xl", className)} style={{ ...effectiveStyle, zIndex: 9999 }} {...rest}>
        <SreeLiveAssistant onClose={() => { setCurrentMode("Sri (Text Chat)"); setShowLiveAssistant(false); eventBus.emit("modeChanged", "Sri (Text Chat)"); }} />
      </div>
    );
  }

  const modeLabel = currentMode.replace("Sri (Text Chat)", "Text Chat").replace("Sree (Local Knowledge)", "Local KB");

  return (
    <div
      ref={cardRef}
      data-sree-widget="main"
      className={cn(
        "rounded-2xl overflow-hidden flex flex-col",
        "bg-[#f4f6f8]",
        "border border-slate-300/60",
        // SS3-style embossed card: top-light outer shadow + inset highlight
        "shadow-[0_8px_32px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.04)]",
        className
      )}
      style={{ ...effectiveStyle, zIndex: 9999 }}
      {...rest}
    >
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between px-3 py-3 select-none flex-shrink-0 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600">
        <div className="flex items-center gap-2">
          {/* Drag handle — explicit, intentional-only */}
          <div
            data-drag-handle="true"
            className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-white/25 transition-colors flex-shrink-0"
            onPointerDown={(e) => {
              if (!draggable) return;
              e.preventDefault();
              dragging.current = true;
              dragStartPos.current = { mx: e.clientX, my: e.clientY, x: position.x, y: position.y };
              const mv = (ev) => { if (!dragging.current) return; setPosition({ x: dragStartPos.current.x + ev.clientX - dragStartPos.current.mx, y: dragStartPos.current.y + ev.clientY - dragStartPos.current.my }); };
              const up = () => { dragging.current = false; window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
              window.addEventListener("mousemove", mv);
              window.addEventListener("mouseup", up);
            }}
            title="Drag to move"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white/70"><circle cx="3" cy="3" r="1" fill="currentColor"/><circle cx="7" cy="3" r="1" fill="currentColor"/><circle cx="3" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>
          </div>
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <AudioLines className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Sree</div>
            <div className="text-[10px] text-white/60 font-medium">{modeLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-white/70 hover:text-white hover:bg-white/15">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[10000]">
              <DropdownMenuItem onClick={() => handleModeChange("Sri (Text Chat)")}>
                <MessageSquare className="w-3.5 h-3.5 mr-2" /> Text Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleModeChange("Voice Chat")}>
                <Mic className="w-3.5 h-3.5 mr-2" /> Voice Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleModeChange("AI Sree (Agentic Assistant)")}>
                <Bot className="w-3.5 h-3.5 mr-2" /> Agentic <span className="ml-auto text-[10px] text-slate-400">↗</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleModeChange("Developer Sree")}>
                <Monitor className="w-3.5 h-3.5 mr-2" /> Developer <span className="ml-auto text-[10px] text-slate-400">↗</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCurrentMode("Live Assistant"); setShowLiveAssistant(true); }}>
                <AudioLines className="w-3.5 h-3.5 mr-2" /> Live Assistant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-white/70 hover:text-white hover:bg-white/15" onClick={() => setIsMinimized(true)}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-white/70 hover:text-white hover:bg-white/15" onClick={() => setIsMinimized(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="flex-1 overflow-hidden flex flex-col px-2.5 py-2.5 gap-2">
        {loadingFlags ? (
          <div className="flex items-center justify-center h-full gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-sm text-slate-500">Loading…</span>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-2">
            {!hideOnboarding && showOnboarding && currentMode === "Sree (Local Knowledge)" && (
              <div><SreeLocalOnboarding mode={currentMode} featureFlags={featureFlags} onDismiss={() => setShowOnboarding(false)} /></div>
            )}
            {/* Mode pill switcher — raised card on inset bg */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]">
              {[
                { label: "Text", mode: "Sri (Text Chat)", icon: MessageSquare },
                { label: "Voice", mode: "Voice Chat", icon: Mic },
                { label: "Agentic ↗", mode: "AI Sree (Agentic Assistant)", icon: Bot },
              ].map(({ label, mode: m, icon: Icon }) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    currentMode === m
                      ? "bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-[0_2px_6px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
            {/* Chat area — inset depressed panel */}
            <div className="flex-1 rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.04)]">
              {renderView()}
            </div>
          </div>
        )}
      </div>

      <div onMouseDown={handleResize} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" />
    </div>
  );
}