import { useState, useEffect, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Monitor as MonitorIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SreeScreenPreview({ className }) {
  const imgRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const capturing = useRef(false);

  const capture = useCallback(async () => {
    if (capturing.current) return;
    capturing.current = true;
    try {
      const target = document.body;
      const canvas = await html2canvas(target, {
        scale: 0.5,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        ignoreElements: (el) => {
          if (el.closest && (el.closest("[data-sree-monitor]") || el.closest("[data-sree-widget]"))) return true;
          return false;
        },
      });
      setImgSrc(canvas.toDataURL("image/jpeg", 0.6));
    } catch (e) {
      console.warn("[SreeScreenPreview] capture failed:", e.message);
    } finally {
      capturing.current = false;
    }
  }, []);

  useEffect(() => {
    // Skip capture loop on mobile devices — too expensive and not useful
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return;
    capture();
    const timer = setInterval(capture, 5000);
    return () => clearInterval(timer);
  }, [capture]);

  return (
    <div className={cn("relative overflow-hidden bg-slate-800 rounded-xl border border-slate-600/50", className)}>
      {/* Browser chrome bar */}
      <div className="absolute top-0 inset-x-0 h-5 z-10 flex items-center px-2 gap-1 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <div className="w-2 h-2 rounded-full bg-green-500/70" />
        </div>
        <span className="text-[9px] font-medium text-slate-400 ml-1">Sharing with Sree</span>
      </div>
      {imgSrc ? (
        <img
          ref={imgRef}
          src={imgSrc}
          alt="Screen preview"
          className="w-full h-full object-cover object-top pt-5"
          style={{ imageRendering: "auto" }}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500 gap-2">
          <MonitorIcon className="w-5 h-5 animate-pulse text-indigo-400" />
          <span className="text-xs text-slate-400">Capturing screen…</span>
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
    </div>
  );
}