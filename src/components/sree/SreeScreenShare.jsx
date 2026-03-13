import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, X, ScreenShare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SreeScreenShare({ onStreamReady, onStop, compact = false }) {
  const [status, setStatus] = useState("idle"); // idle | selecting | sharing | error
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startShare = useCallback(async () => {
    setStatus("selecting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });
      streamRef.current = stream;
      setStatus("sharing");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        stopShare();
      };

      onStreamReady?.(stream);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setStatus("idle");
      } else {
        setErrorMsg(err.message || "Screen sharing not supported");
        setStatus("error");
      }
    }
  }, [onStreamReady]);

  const stopShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
    onStop?.();
  }, [onStop]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (status === "idle" || status === "selecting") {
    return (
      <Button
        variant="outline"
        size={compact ? "icon" : "sm"}
        onClick={startShare}
        disabled={status === "selecting"}
        className={cn(
          "gap-1.5",
          compact && "h-10 w-10 rounded-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
        )}
        title="Share Your Screen"
      >
        <ScreenShare className={cn("w-4 h-4", !compact && "mr-1")} />
        {!compact && (status === "selecting" ? "Selecting…" : "Share Your Screen")}
      </Button>
    );
  }

  if (status === "error") {
    return (
      <div className="text-xs text-red-500 p-2">{errorMsg}</div>
    );
  }

  // Sharing active
  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain rounded-lg"
        style={{ maxHeight: compact ? 160 : 300 }}
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Sharing with Sree
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-6 w-6 bg-black/50 text-white hover:bg-black/80"
        onClick={stopShare}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}