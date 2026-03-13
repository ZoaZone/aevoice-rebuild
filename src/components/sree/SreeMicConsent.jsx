import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SreeMicConsent({ onGranted, onDenied, compact = false }) {
  const [status, setStatus] = useState("checking"); // checking | prompt | granted | denied | unavailable

  const checkPermission = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: "microphone" });
        if (result.state === "granted") { setStatus("granted"); onGranted?.(); return; }
        if (result.state === "denied") { setStatus("denied"); onDenied?.(); return; }
      }
      setStatus("prompt");
    } catch {
      setStatus("prompt");
    }
  }, [onGranted, onDenied]);

  useEffect(() => { checkPermission(); }, [checkPermission]);

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setStatus("granted");
      onGranted?.();
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setStatus("denied");
        onDenied?.();
      } else {
        setStatus("unavailable");
        onDenied?.();
      }
    }
  }, [onGranted, onDenied]);

  if (status === "granted") {
    return compact ? (
      <div className="flex items-center gap-1 text-emerald-400 text-[10px]">
        <Mic className="w-3 h-3" /> Mic on
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-emerald-600 p-2 bg-emerald-50 rounded-lg">
        <Mic className="w-4 h-4" />
        <span>Microphone allowed</span>
      </div>
    );
  }

  if (status === "denied") {
    return compact ? (
      <div className="flex items-center gap-1 text-red-400 text-[10px]">
        <MicOff className="w-3 h-3" /> Blocked
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <div>
          <p className="font-medium">Microphone blocked</p>
          <p className="text-xs text-red-500 mt-0.5">Click the lock icon in your address bar → Allow microphone, then reload.</p>
        </div>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="text-xs text-slate-500 p-2">
        Microphone not available in this browser.
      </div>
    );
  }

  // prompt or checking
  return (
    <Button
      onClick={requestMic}
      variant={compact ? "ghost" : "default"}
      size={compact ? "icon" : "default"}
      className={cn(
        compact
          ? "h-10 w-10 rounded-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
          : "bg-indigo-600 hover:bg-indigo-700 text-white border-0 w-full"
      )}
      title="Enable Microphone"
    >
      <Mic className={cn("w-4 h-4", !compact && "mr-2")} />
      {!compact && (status === "checking" ? "Checking mic…" : "Enable Microphone")}
    </Button>
  );
}