import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72; // px needed to trigger refresh

export default function PullToRefresh({ onRefresh, children, className }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    // Only activate if scrolled to top
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) { startY.current = null; return; } // scrolling up
    // Clamp with resistance
    const clamped = Math.min(delta * 0.45, THRESHOLD * 1.4);
    setPullY(clamped);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pullY >= THRESHOLD) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
  }, [pullY, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);
  const showIndicator = pullY > 4 || refreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: showIndicator ? Math.max(pullY, refreshing ? THRESHOLD : 0) : 0 }}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-sm text-indigo-600 font-medium",
            refreshing ? "opacity-100" : "opacity-70"
          )}
        >
          <RefreshCw
            className={cn("w-5 h-5 transition-transform", refreshing && "animate-spin")}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 180}deg)` }}
          />
          <span>{refreshing ? "Refreshing…" : progress >= 1 ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>
      {children}
    </div>
  );
}