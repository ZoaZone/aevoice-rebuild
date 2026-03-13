import { useState, useCallback, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, ScreenShare, ScreenShareOff, X, Maximize2, Minimize2, ExternalLink, AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";
import SreeScreenShare from "./SreeScreenShare";
import SreeMicConsent from "./SreeMicConsent";
import SreeSessionBar from "./SreeSessionBar";
import eventBus from "@/components/sree/engine/eventBus";
import { SreeRuntime } from "@/components/sree/engine/runtime";
import { base44 } from "@/api/base44Client";
import { getPromptForMode } from "@/components/llm/promptProfiles";
import { runLLM } from "@/components/llm/llmRouter";

export default function SreeLiveAssistant({ onClose, isNewTab = false }) {
  const [micGranted, setMicGranted] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastTranscript, setLastTranscript] = useState("");
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (screenStream && videoRef.current) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const handleScreenReady = useCallback((stream) => {
    setScreenStream(stream);
    setScreenSharing(true);
    setSessionActive(true);
    eventBus.emit("developer:progress", { step: "screen_share", message: "Screen sharing started" });
  }, []);

  const handleScreenStop = useCallback(() => {
    setScreenStream(null);
    setScreenSharing(false);
    eventBus.emit("developer:progress", { step: "screen_share", message: "Screen sharing stopped" });
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !screenStream) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, [screenStream]);

  const startListening = useCallback(async () => {
    if (!micGranted || !micEnabled) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMessages((p) => [...p, { role: "assistant", content: "Voice not supported. Use Chrome or Edge." }]); return; }

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { window.__SREE_AC = window.__SREE_AC || new AC(); await window.__SREE_AC.resume(); }
      window.speechSynthesis?.resume?.();
    } catch {}

    setIsListening(true);
    SreeRuntime.setStatus("listening");

    const r = new SR();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;

    r.onresult = async (ev) => {
      const text = ev.results[0][0].transcript;
      setLastTranscript(text);
      setIsListening(false);
      setMessages((p) => [...p, { role: "user", content: text }]);

      SreeRuntime.setStatus("processing");
      eventBus.emit("developer:progress", { step: "user_input", message: text });

      let screenContext = "";
      if (screenSharing) {
        const frame = await captureFrame();
        if (frame) screenContext = "\n[User is sharing their screen. Use visual context to assist.]";
      }

      try {
        const prompt = getPromptForMode("Voice Chat", {});
        const result = await runLLM(`${prompt}${screenContext}\n\nUser: ${text}`, {});
        const out = result?.output || result?.text || "I'm here to help!";
        setMessages((p) => [...p, { role: "assistant", content: String(out) }]);

        setIsSpeaking(true);
        SreeRuntime.setStatus("speaking");
        const utter = new SpeechSynthesisUtterance(String(out));
        utter.rate = 1.0;
        utter.onend = () => { setIsSpeaking(false); SreeRuntime.setStatus("idle"); };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch {
        setMessages((p) => [...p, { role: "assistant", content: "Sorry, I had trouble processing that." }]);
        SreeRuntime.setStatus("idle");
      }
    };

    r.onerror = () => { setIsListening(false); SreeRuntime.setStatus("idle"); };
    r.onend = () => setIsListening(false);

    window.speechSynthesis?.cancel?.();
    r.start();
  }, [micGranted, micEnabled, screenSharing, captureFrame]);

  const endSession = useCallback(() => {
    window.speechSynthesis?.cancel?.();
    if (screenStream) { screenStream.getTracks().forEach((t) => t.stop()); }
    setScreenStream(null);
    setScreenSharing(false);
    setSessionActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setMessages([]);
    SreeRuntime.setStatus("idle");
    onClose?.();
  }, [screenStream, onClose]);

  // Pre-session consent view
  if (!sessionActive) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <AudioLines className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Sree Live Assistant</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <AudioLines className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">Start a Session with Sree</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              Grant mic access so Sree can listen and respond to you.
            </p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <SreeMicConsent onGranted={() => setMicGranted(true)} onDenied={() => setMicGranted(false)} />
          </div>
          <div className="flex flex-col gap-2 w-full max-w-sm">
            <Button
              onClick={() => setSessionActive(true)}
              disabled={!micGranted}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-semibold rounded-full w-full"
            >
              Start Voice Session
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
                  handleScreenReady(stream);
                  stream.getVideoTracks()[0].onended = handleScreenStop;
                } catch {}
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 h-10 rounded-full w-full text-sm"
            >
              + Add Screen Share (optional)
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 text-center max-w-xs">
            Share only what's relevant. You can stop sharing anytime. Sree may not always be accurate.
          </p>
        </div>
      </div>
    );
  }

  // Active session view
  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <span className="text-sm font-semibold text-slate-300">Sharing with Sree</span>
        <div className="flex items-center gap-1">
          {!isNewTab && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-white"
              onClick={() => {
                const url = window.location.origin + "/SreeDemo?mode=live";
                window.open(url, "sree_live", "width=500,height=700");
              }}
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={endSession}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Screen preview */}
      {screenSharing && screenStream ? (
        <div className="relative bg-black flex-shrink-0" style={{ maxHeight: isNewTab ? "45%" : "200px" }}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-4 bg-slate-900 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={async () => {
              try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
                handleScreenReady(stream);
                stream.getVideoTracks()[0].onended = handleScreenStop;
              } catch {}
            }}
          >
            <ScreenShare className="w-3 h-3 mr-1.5" /> Share Screen
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            {isListening ? "Listening..." : "Tap the mic or say something to start"}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm",
              msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Session bar */}
      <SreeSessionBar
        isListening={isListening}
        isSpeaking={isSpeaking}
        micEnabled={micEnabled}
        screenSharing={screenSharing}
        onMicToggle={() => {
          if (!micEnabled) {
            setMicEnabled(true);
            startListening();
          } else {
            setMicEnabled(false);
          }
        }}
        onScreenToggle={() => {
          if (screenSharing) {
            if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
            handleScreenStop();
          } else {
            navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false }).then((stream) => {
              handleScreenReady(stream);
              stream.getVideoTracks()[0].onended = handleScreenStop;
            }).catch(() => {});
          }
        }}
        onEnd={endSession}
      />

      {/* Auto-listen when idle */}
      {sessionActive && micEnabled && !isListening && !isSpeaking && (
        <button
          onClick={startListening}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-full shadow-lg animate-pulse"
        >
          Tap to speak
        </button>
      )}
    </div>
  );
}