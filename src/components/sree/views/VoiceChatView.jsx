import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getPromptForMode } from '@/components/llm/promptProfiles';
import { runLLM } from '@/components/llm/llmRouter';
import eventBus from '@/components/sree/engine/eventBus';
import { SreeRuntime } from '@/components/sree/engine/runtime';
import { analyzeIntent, conversationState } from '@/components/sree/engine/nluEngine';
import { cn } from '@/lib/utils';
import VoiceProfileSettings from '@/components/sree/VoiceProfileSettings';

const S = { idle: "idle", requesting: "requesting", listening: "listening", processing: "processing", speaking: "speaking", error: "error" };
const SESSION = 'voice_chat_default';

export default function VoiceChatView({ config }) {
  const [phase, setPhase] = useState(S.idle);
  const [micGranted, setMicGranted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState({
    voiceId: 'default',
    speechRate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });

  const recogRef = useRef(null);
  const scrollRef = useRef(null);
  const phaseRef = useRef(S.idle);
  const micGrantedRef = useRef(false);
  const speakerOnRef = useRef(true);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { speakerOnRef.current = speakerOn; }, [speakerOn]);
  useEffect(() => { micGrantedRef.current = micGranted; }, [micGranted]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    (async () => {
      setMessages([{ role: 'assistant', content: 'Hi! I\'m Sree. Tap the mic button to start talking.' }]);
      SreeRuntime.setStatus('idle');
      try {
        if (navigator.permissions) {
          const r = await navigator.permissions.query({ name: "microphone" });
          if (r.state === "granted") { setMicGranted(true); micGrantedRef.current = true; return; }
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setMicGranted(true); micGrantedRef.current = true;
      } catch { }
    })();
  }, []);

  const speak = useCallback((text) => {
    if (!speakerOnRef.current) { setPhase(S.idle); SreeRuntime.setStatus('idle'); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = voiceProfile.speechRate;
    utter.pitch = voiceProfile.pitch;
    utter.volume = voiceProfile.volume;
    setPhase(S.speaking); SreeRuntime.setStatus('speaking'); eventBus.emit('runtime:status', 'speaking');
    utter.onend = () => { setPhase(S.idle); SreeRuntime.setStatus('idle'); eventBus.emit('runtime:status', 'idle'); };
    utter.onerror = () => { setPhase(S.idle); SreeRuntime.setStatus('idle'); };
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 5000);
    utter.onend = () => { clearInterval(keepAlive); setPhase(S.idle); SreeRuntime.setStatus('idle'); eventBus.emit('runtime:status', 'idle'); };
    window.speechSynthesis.speak(utter);
  }, [voiceProfile]);

  const startListening = useCallback(async () => {
    const current = phaseRef.current;
    if (current === S.listening || current === S.processing || current === S.speaking) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        if (!window.__SREE_AC) window.__SREE_AC = new AC();
        if (window.__SREE_AC.state === 'suspended') await window.__SREE_AC.resume();
      }
    } catch {}
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages(prev => [...prev, { role: 'system', content: '⚠ Voice recognition requires Chrome or Edge.' }]);
      setPhase(S.error);
      return;
    }
    if (!micGrantedRef.current) {
      setPhase(S.requesting);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setMicGranted(true); micGrantedRef.current = true;
      } catch {
        setMessages(prev => [...prev, { role: 'system', content: '⚠ Microphone blocked.' }]);
        setPhase(S.error);
        return;
      }
    }
    try { recogRef.current?.stop(); } catch {}
    const r = new SR();
    recogRef.current = r;
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onstart = () => {
      setPhase(S.listening);
      SreeRuntime.setStatus('listening');
      eventBus.emit('runtime:status', 'listening');
    };
    r.onresult = async (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (!text) return;
      setPhase(S.processing);
      SreeRuntime.setStatus('processing');
      eventBus.emit('runtime:status', 'processing');
      const state = conversationState.getState(SESSION);
      const nlu = analyzeIntent(text, state.history);
      conversationState.addTurn(SESSION, "user", text, nlu);
      setMessages(prev => [...prev, { role: 'user', content: text, intent: nlu.intent }]);
      try {
        let knowledge = '';
        try {
          const kbRes = await base44.functions.invoke('kbRetrieval', { query: text, limit: 6, autoShareAll: true });
          const chunks = kbRes?.data?.chunks || kbRes?.data?.results || [];
          knowledge = chunks.map(c => c.content || c.text || '').join('\n').slice(0, 3000);
        } catch (e) {
          console.warn('[VoiceChatView] KB retrieval:', e.message);
        }
        const convo = conversationState.buildContextString(SESSION);
        const prompt = getPromptForMode('Voice Chat', { conversation: convo, knowledge, intent: nlu.intent, sentiment: nlu.sentiment, entities: nlu.entities });
        const result = await runLLM(`${prompt}\n\nUser: ${text}`, {});
        const out = String(result?.output || result?.text || "I'm here to help!");
        conversationState.addTurn(SESSION, "assistant", out, {});
        setMessages(prev => [...prev, { role: 'assistant', content: out }]);
        speak(out);
      } catch (err) {
        console.error('[VoiceChatView] Error:', err);
        const fallback = 'Sorry, I had trouble. Try again.';
        setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
        speak(fallback);
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setMicGranted(false);
        micGrantedRef.current = false;
        setMessages(prev => [...prev, { role: 'system', content: '⚠ Allow mic in settings.' }]);
      } else if (e.error === 'network') {
        setMessages(prev => [...prev, { role: 'system', content: '⚠ Network error.' }]);
      }
      setPhase(S.idle);
      SreeRuntime.setStatus('idle');
    };
    r.onend = () => {
      if (phaseRef.current === S.listening) { setPhase(S.idle); SreeRuntime.setStatus('idle'); }
    };
    r.start();
  }, [speak]);

  const stopAll = useCallback(() => {
    try { recogRef.current?.stop(); } catch {}
    window.speechSynthesis?.cancel();
    setPhase(S.idle);
    SreeRuntime.setStatus('idle');
  }, []);

  const toggleMic = () => {
    if (phase === S.listening || phase === S.processing || phase === S.speaking) {
      stopAll();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
              m.role === 'user'
                ? "bg-indigo-600 text-white rounded-br-sm"
                : m.role === 'system'
                ? "bg-amber-50 text-amber-700 border border-amber-200 rounded-bl-sm"
                : "bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200"
            )}>
              {m.content}
              {m.intent && <div className="text-[10px] opacity-75 mt-1">Intent: {m.intent}</div>}
            </div>
          </div>
        ))}
        {phase === S.processing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-slate-500">
              Processing...
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 bg-white p-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={toggleMic}
            disabled={!micGranted && phase !== S.listening}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors",
              phase === S.listening || phase === S.processing
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700",
              (!micGranted && phase !== S.listening) && "opacity-50 cursor-not-allowed"
            )}
          >
            {phase === S.listening ? <MicOff className="w-4 h-4 mr-1 inline" /> : <Mic className="w-4 h-4 mr-1 inline" />}
            {phase === S.listening ? 'Stop' : 'Speak'}
          </button>
          <button
            onClick={() => setSpeakerOn(!speakerOn)}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowVoiceSettings(true)}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setMessages([]); stopAll(); }}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 text-center">
          {phase === S.listening && 'Listening...'}
          {phase === S.processing && 'Processing...'}
          {phase === S.speaking && 'Speaking...'}
          {phase === S.idle && !micGranted && 'Allow microphone access'}
          {phase === S.idle && micGranted && 'Ready to listen'}
        </p>
      </div>
      <VoiceProfileSettings
        open={showVoiceSettings}
        onOpenChange={setShowVoiceSettings}
        profile={voiceProfile}
        onSave={setVoiceProfile}
      />
    </div>
  );
}