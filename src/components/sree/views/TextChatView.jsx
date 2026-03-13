import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { getPromptForMode } from '@/components/llm/promptProfiles';
import { runLLM } from '@/components/llm/llmRouter';
import eventBus from '@/components/sree/engine/eventBus';
import { SreeRuntime } from '@/components/sree/engine/runtime';
import { analyzeIntent, conversationState } from '@/components/sree/engine/nluEngine';
import { getProactiveSuggestions } from '@/components/sree/engine/proactiveSuggestions';
import { Loader2, Send, Lightbulb, AlertCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const SESSION = "text_chat_default";

export default function TextChatView({ config }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const scrollRef = useRef(null);

  // Initialize greeting on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: 'Hi! I\'m Sree. How can I help you today?' }]);
      SreeRuntime.setStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleCommunication = () => {
    // Detect device type
    const isMobile = /iPhone|iPad|Android|Mobile|Tablet/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (isMobile) {
      // Mobile: trigger phone call
      const phoneNumber = config?.phone_number || '+1-800-000-0000';
      window.location.href = `tel:${phoneNumber}`;
    } else {
      // Desktop: switch to voice chat
      eventBus.emit('sree:mode-change', 'voice');
    }
  };

  const send = async (override) => {
    const user = (override || text).trim();
    if (!user || loading) return;
    setText('');

    // NLU: intent + entity analysis
    const state = conversationState.getState(SESSION);
    const nlu = analyzeIntent(user, state.history);
    conversationState.addTurn(SESSION, "user", user, nlu);

    setMessages(prev => [...prev, { role: 'user', content: user, intent: nlu.intent }]);
    setSuggestions([]);
    setLoading(true);
    SreeRuntime.setStatus('processing');
    eventBus.emit('runtime:status', 'processing');

    try {
      // KB retrieval - auto-pull from all shared KBs
      let knowledge = '';
      try {
        const kbRes = await base44.functions.invoke('kbRetrieval', { query: user, limit: 6, autoShareAll: true });
        const chunks = kbRes?.data?.chunks || kbRes?.data?.results || [];
        knowledge = chunks.map(c => c.content || c.text || '').join('\n').slice(0, 3000);
      } catch {}

      // Proactive suggestions (async, non-blocking)
      getProactiveSuggestions({ intent: nlu.intent, entities: nlu.entities, sentiment: nlu.sentiment, turnCount: state.turnCount }).then(s => setSuggestions(s));

      const convo = conversationState.buildContextString(SESSION);
      const prompt = getPromptForMode('Text Chat', { conversation: convo, knowledge, intent: nlu.intent, sentiment: nlu.sentiment });
      const result = await runLLM(`${prompt}\n\nUser: ${user}`, {});
      const output = result?.output || result?.text || "I'm here to help!";

      conversationState.addTurn(SESSION, "assistant", output, {});
      setMessages(prev => [...prev, { role: 'assistant', content: String(output) }]);
      SreeRuntime.setStatus('idle');
      eventBus.emit('runtime:status', 'idle');
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I had trouble processing that. Please try again.' }]);
      SreeRuntime.setStatus('error');
    } finally {
      setLoading(false);
      SreeRuntime.setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
              m.role === 'user'
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-500">Sree is thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Proactive suggestions */}
      {suggestions.length > 0 && (
        <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input + Communication buttons */}
      <div className="px-3 pb-3 pt-1 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask Sree anything…"
          disabled={loading}
          className="flex-1 h-10 text-sm rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20"
        />
        <Button 
          onClick={() => handleCommunication()} 
          className="h-10 w-10 p-0 rounded-xl bg-green-600 hover:bg-green-700 flex-shrink-0"
          title="Start phone call (mobile) or web chat voice (desktop)"
        >
          <Phone className="w-4 h-4" />
        </Button>
        <Button onClick={() => send()} disabled={loading || !text.trim()}
          className="h-10 w-10 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}