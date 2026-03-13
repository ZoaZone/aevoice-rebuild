import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, ScreenShare, ScreenShareOff, AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";
import eventBus from "@/components/sree/engine/eventBus";

export default function SreeSessionBar({
  isListening,
  isSpeaking,
  micEnabled,
  screenSharing,
  onMicToggle,
  onScreenToggle,
  onEnd,
}) {
  const [waveformBars, setWaveformBars] = useState(Array(12).fill(4));
  const animFrame = useRef(null);

  useEffect(() => {
    if (!isListening && !isSpeaking) {
      setWaveformBars(Array(12).fill(4));
      return;
    }
    let running = true;
    const animate = () => {
      if (!running) return;
      setWaveformBars((prev) =>
        prev.map(() => Math.max(3, Math.floor(Math.random() * (isSpeaking ? 28 : 18))))
      );
      animFrame.current = requestAnimationFrame(() => {
        setTimeout(() => animate(), 80);
      });
    };
    animate();
    return () => {
      running = false;
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [isListening, isSpeaking]);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-t border-slate-700">
      {/* Waveform */}
      <div className="flex items-end gap-[2px] h-8 min-w-[60px]">
        {waveformBars.map((h, i) => (
          <div
            key={i}
            className={cn(
              "w-[3px] rounded-sm transition-all duration-75",
              isListening ? "bg-indigo-400" : isSpeaking ? "bg-emerald-400" : "bg-slate-600"
            )}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            micEnabled
              ? "bg-slate-700 text-white hover:bg-slate-600"
              : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
          )}
          onClick={onMicToggle}
          title={micEnabled ? "Mute" : "Unmute"}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            screenSharing
              ? "bg-indigo-600/30 text-indigo-400 hover:bg-indigo-600/40"
              : "bg-slate-700 text-white hover:bg-slate-600"
          )}
          onClick={onScreenToggle}
          title={screenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {screenSharing ? (
            <ScreenShareOff className="w-5 h-5" />
          ) : (
            <ScreenShare className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* End */}
      <Button
        onClick={onEnd}
        className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6 h-10 font-semibold"
      >
        End
      </Button>
    </div>
  );
}