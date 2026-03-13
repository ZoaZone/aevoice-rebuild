import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import eventBus from "@/components/sree/engine/eventBus";
import SreeMiniMonitor from "@/components/sree/SreeMiniMonitor";

const LS_KEY = "sree-mini-dock-state";

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null") || {}; } catch { return {}; }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

export default function SreeMiniDock({ corner = "RT", safePadding = 16 }) {
  const startState = loadState();
  const [visible, setVisible] = useState(startState.visible ?? true);
  const [expanded, setExpanded] = useState(startState.expanded ?? false);
  const [cornerPref, setCornerPref] = useState(startState.corner ?? corner);
  const [pos, setPos] = useState(startState.pos ?? null);

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [inertia, setInertia] = useState({ vx: 0, vy: 0 });
  const elRef = useRef(null);
  const lastRef = useRef({ t: 0, x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => { saveState({ visible, expanded, corner: cornerPref, pos }); }, [visible, expanded, cornerPref, pos]);

  // Default size (match SreeUnifiedWidget small)
  const size = expanded ? { w: 420, h: 560 } : { w: 300, h: 200 };

  const basePos = useMemo(() => {
    const pad = safePadding;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (cornerPref === "LT") return { x: pad, y: pad + 56 };
    return { x: vw - size.w - pad, y: pad + 56 };
   
  }, [cornerPref, expanded]);

  const style = useMemo(() => {
    const p = pos || basePos;
    return {
      position: "fixed",
      left: p.x,
      top: p.y,
      width: size.w,
      height: size.h,
      zIndex: 60,
      borderRadius: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      background: "rgba(15,23,42,0.75)",
      border: "1px solid rgba(148,163,184,0.25)",
      backdropFilter: "blur(8px)",
      overflow: "hidden"
    };
  }, [pos, basePos, size]);

  const beginDrag = (e) => {
    const r = elRef.current?.getBoundingClientRect();
    const sx = (e.touches ? e.touches[0].clientX : e.clientX);
    const sy = (e.touches ? e.touches[0].clientY : e.clientY);
    setOffset({ x: sx - r.left, y: sy - r.top });
    setDragging(true);
    setInertia({ vx: 0, vy: 0 });
    lastRef.current = { t: Date.now(), x: sx, y: sy };
    cancelAnimationFrame(rafRef.current);
  };

  const onMove = (e) => {
    if (!dragging) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const nx = Math.max(8, Math.min(vw - size.w - 8, x - offset.x));
    const ny = Math.max(56, Math.min(vh - size.h - 8, y - offset.y));
    const dt = Math.max(1, Date.now() - lastRef.current.t);
    setInertia({ vx: (x - lastRef.current.x) / dt, vy: (y - lastRef.current.y) / dt });
    lastRef.current = { t: Date.now(), x, y };
    setPos({ x: nx, y: ny });
  };

  const endDrag = () => {
    setDragging(false);
    // inertia + snap
    const animate = () => {
      setPos((p) => {
        if (!p) return p;
        const vw = window.innerWidth, vh = window.innerHeight;
        let nx = p.x + inertia.vx * 12;
        let ny = p.y + inertia.vy * 12;
        inertia.vx *= 0.92; inertia.vy *= 0.92;
        // snap to edges
        const snap = 12;
        if (Math.abs(nx - 12) < snap) nx = 12;
        if (Math.abs((vw - size.w - 12) - nx) < snap) nx = vw - size.w - 12;
        if (Math.abs(ny - 64) < snap) ny = 64;
        if (Math.abs((vh - size.h - 12) - ny) < snap) ny = vh - size.h - 12;
        nx = Math.max(8, Math.min(vw - size.w - 8, nx));
        ny = Math.max(56, Math.min(vh - size.h - 8, ny));
        return { x: nx, y: ny };
      });
      if (Math.abs(inertia.vx) > 0.05 || Math.abs(inertia.vy) > 0.05) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const onMouseMove = (e) => onMove(e);
    const onTouchMove = (e) => onMove(e);
    const onUp = () => endDrag();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging]);

  // Integration: reflect Sree status in border glow
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    const onStatus = (p) => { setStatus(p?.status || p); };
    eventBus.on("runtime:status", onStatus);
    return () => eventBus.off("runtime:status", onStatus);
  }, []);

  if (!visible) return null;

  return (
    <div ref={elRef} style={style} className={cn("group select-none", status === 'listening' ? 'ring-2 ring-cyan-400/60' : '')}>
      {/* Header */}
      <div
        className="h-9 px-2 flex items-center justify-between cursor-move bg-white/5 hover:bg-white/10 transition-colors"
        onMouseDown={beginDrag}
        onTouchStart={beginDrag}
      >
        <div className="flex items-center gap-2 text-xs text-slate-200">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sree</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setExpanded((e) => !e)}>{expanded ? 'Shrink' : 'Enlarge'}</Button>
          <Button size="sm" variant="ghost" onClick={() => setCornerPref((c) => c === 'LT' ? 'RT' : 'LT')}>{cornerPref}</Button>
          <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>Hide</Button>
        </div>
      </div>
      {/* Body */}
      <div className="w-full h-[calc(100%-2.25rem)] bg-transparent">
        {expanded ? (
          <div className="w-full h-full">
            {/* Full Sree panel: re-use MiniMonitor plus hooks */}
            <SreeMiniMonitor enabled={true} mode="monitor" />
            <div className="p-2 text-xs text-slate-200 border-t border-white/10">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => eventBus.emit('open:overlay')}>Overlay</Button>
                <Button size="sm" onClick={() => eventBus.emit('voice:start')}>Mic</Button>
                <Button size="sm" onClick={() => eventBus.emit('developer:command', 'screenshot')}>Screenshot</Button>
                <Button size="sm" onClick={() => eventBus.emit('developer:command', 'browse latest aevoice pricing')}>Research</Button>
                <Button size="sm" onClick={() => eventBus.emit('developer:command', 'open https://aevoice.ai')}>Open</Button>
              </div>
            </div>
          </div>
        ) : (
          <SreeMiniMonitor enabled={true} mode="monitor" />
        )}
      </div>
    </div>
  );
}