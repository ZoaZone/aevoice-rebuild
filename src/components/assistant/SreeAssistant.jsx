import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Mic, MicOff, Send, X, Minimize2, Loader2, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import eventBus from "@/components/sree/engine/eventBus";
import { SreeRuntime } from "@/components/sree/engine/runtime";

export default function SreeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "" });
  const [detectedLang, setDetectedLang] = useState('en');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingMessage]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = "Hi! I'm Sree. How can I help you today? 👋";
      setMessages([{ role: 'assistant', content: greeting }]);
      if (mode === 'voice') speakResponse(greeting);
    }
  }, [isOpen, mode]);

  const speakResponse = (text) => {
    if (!text || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05; utter.pitch = 1.05; utter.lang = 'en-US';
    window.speechSynthesis.speak(utter);
  };

  const detectLanguage = (text) => {
    const hindi=/[\u0900-\u097F]/, arabic=/[\u0600-\u06FF]/, chinese=/[\u4e00-\u9fff]/, japanese=/[\u3040-\u30ff]/, spanish=/[áéíóúñ¿¡]/i;
    if (hindi.test(text)) return 'hi'; if (arabic.test(text)) return 'ar'; if (chinese.test(text)) return 'zh'; if (japanese.test(text)) return 'ja'; if (spanish.test(text)) return 'es'; return 'en';
  };

  const fetchKnowledgeContext = async (query) => {
    try {
      const res = await base44.functions.invoke('kbRetrieval', { query, limit: 6 });
      const list = res?.data?.chunks || res?.data?.results || [];
      const text = list.map((c) => c.content || c.text || '').join('\n').slice(0, 3000);
      return text;
    } catch { return ''; }
  };

  const processMessage = async (text) => {
    const detected = detectLanguage(text);
    setDetectedLang(detected);
    setIsLoading(true); setStreamingMessage("");
    SreeRuntime.setStatus('thinking');
    eventBus.emit('developer:progress', { step: 'user_input', message: text });
    try {
      const context = await fetchKnowledgeContext(text);
      const conversationContext = messages.slice(-4).map(m => m.role + ": " + m.content).join("\n");
      const systemPrompt = "You are Sree, AEVOICE's website AI assistant. Be concise, friendly, and respond in the user's language. Use the provided knowledge context when relevant.";
      const fullPrompt = `${systemPrompt}\n\nKnowledge Context (may be partial):\n${context}\n\nPrevious conversation:\n${conversationContext}\n\nUser: ${text}\n\nRespond naturally in the user's language:`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
      const finalMessage = result || "I'm here to help!";
      setMessages(prev => [...prev, { role: 'assistant', content: finalMessage }]);
      if (mode === 'voice') speakResponse(finalMessage);
      SreeRuntime.setStatus('idle');
      eventBus.emit('developer:progress', { step: 'reply', message: finalMessage.slice(0,120) });
      const leadKeywords = ['interested','pricing','demo','trial','signup','contact','buy','purchase'];
      if (leadKeywords.some(w => text.toLowerCase().includes(w))) setShowLeadCapture(true);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again." }]);
      SreeRuntime.setStatus('error');
    }
    setIsLoading(false);
    SreeRuntime.setStatus('idle');
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputText("");
    await processMessage(userMessage);
  };

  const toggleVoiceRecognition = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { toast.error('Voice not supported'); return; }
      const r = new SR(); recognitionRef.current = r; r.continuous = true; r.interimResults = false; r.lang = 'en-US';
      r.onresult = async (ev) => { const t = ev.results[ev.results.length-1][0].transcript; setMessages(p=>[...p,{role:'user',content:t}]); await processMessage(t); };
      r.onerror = () => setIsListening(false);
      r.start(); setIsListening(true);
    } catch { setIsListening(false); }
  };

  return (
    !isOpen ? (
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => setIsOpen(true)} className="w-[60px] h-[60px] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all overflow-hidden backdrop-blur-md bg-gradient-to-br from-[#0e4166]/90 to-[#0b6d44]/90 border-2 border-white/20">
          <div className="relative w-full h-full">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg" alt="Sree" className="w-full h-full object-cover opacity-90 rounded-full" />
          </div>
        </button>
      </div>
    ) : (
      <div className="fixed bottom-6 right-6 w-[400px] h-[600px] shadow-2xl backdrop-blur-xl rounded-3xl z-50 flex flex-col overflow-hidden border border-white/20 bg-white/95">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg" alt="Sree" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Sree - AI Assistant</h3>
              <p className="text-xs text-cyan-200">Here to help</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setIsMinimized(true)} className="text-white hover:bg-white/10 h-8 w-8"><Minimize2 className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 h-8 w-8"><X className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 border-b bg-slate-50/50 border-slate-200">
          <Button size="sm" variant={mode==='chat'?'default':'ghost'} onClick={()=>setMode('chat')} className={cn('gap-2', mode==='chat'? 'bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white shadow-md':'text-slate-600')}><MessageSquare className="w-4 h-4"/>Chat</Button>
          <Button size="sm" variant={mode==='voice'?'default':'ghost'} onClick={()=>setMode('voice')} className={cn('gap-2', mode==='voice'? 'bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white shadow-md':'text-slate-600')}><Mic className="w-4 h-4"/>Voice</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/50">
          {messages.map((m,i)=> (
            <div key={i} className={cn('flex gap-2', m.role==='user'?'justify-end':'justify-start')}>
              <div className={cn('max-w-[75%] px-4 py-2.5 rounded-2xl text-sm', m.role==='user'?'bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white rounded-tr-sm':'bg-white/90 text-slate-900 rounded-tl-sm border border-slate-200 shadow-sm')}>
                {m.content}
                {m.role==='assistant' && i===messages.length-1 && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/50">
                    <button onClick={()=>toast.success('Thanks!')} className="text-slate-400 hover:text-green-500 transition-colors"><ThumbsUp className="w-3 h-3"/></button>
                    <button onClick={()=>toast.success('Noted!')} className="text-slate-400 hover:text-red-500 transition-colors"><ThumbsDown className="w-3 h-3"/></button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {streamingMessage && (<div className="text-slate-600 text-sm">{streamingMessage}</div>)}
          {isLoading && !streamingMessage && (
            <div className="flex gap-2 justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white/90">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#0e4166] rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                  <div className="w-2 h-2 bg-[#0e4166] rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                  <div className="w-2 h-2 bg-[#0e4166] rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                </div>
              </div>
            </div>
          )}
          {messages.length<=1 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {["Tell me about pricing","How does voice AI work?","Book a demo","See features"].map((a,i)=> (
                <button key={i} onClick={()=>{setMessages(p=>[...p,{role:'user',content:a}]); processMessage(a);}} className="text-xs p-2 rounded-lg border bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50">{a}</button>
              ))}
            </div>
          )}
          {showLeadCapture && (
            <div className="p-4 rounded-xl border-2 bg-white/90 border-cyan-500/50">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-500"/><p className="text-sm font-medium">Let's connect!</p></div>
              <Input placeholder="Your name" value={leadForm.name} onChange={(e)=>setLeadForm({...leadForm, name:e.target.value})} className="h-9 text-sm mt-2"/>
              <Input type="email" placeholder="Email address *" value={leadForm.email} onChange={(e)=>setLeadForm({...leadForm, email:e.target.value})} className="h-9 text-sm mt-2"/>
              <Input placeholder="Phone (optional)" value={leadForm.phone} onChange={(e)=>setLeadForm({...leadForm, phone:e.target.value})} className="h-9 text-sm mt-2"/>
              <Button onClick={async ()=>{ if(!leadForm.email){toast.error('Email is required'); return;} await base44.functions.invoke('captureWidgetLead',{session_id:sessionId, ...leadForm}); toast.success("Thanks! We'll be in touch."); setShowLeadCapture(false); }} className="w-full bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white h-9 text-sm mt-2">Submit</Button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white/50 border-slate-200">
          <div className="flex gap-2">
            <Input ref={inputRef} value={inputText} onChange={(e)=>setInputText(e.target.value)} placeholder="Type your message..." className="flex-1 h-10 bg-white/80 text-slate-900" disabled={isLoading} autoComplete="off"/>
            <Button type="submit" disabled={!inputText.trim()||isLoading} className="bg-gradient-to-r from-[#0e4166] to-[#0b6d44] hover:opacity-90 h-10">{isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}</Button>
          </div>
        </form>
        {mode==='voice' && (
          <div className="p-3 border-t bg-white/50 border-slate-200 flex items-center justify-center gap-4">
            <button onClick={toggleVoiceRecognition} disabled={isLoading} className={cn('w-12 h-12 rounded-full shadow-xl transition-all flex items-center justify-center', isListening ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-[#0e4166] to-[#0b6d44] hover:scale-110')}>
              {isListening ? <MicOff className="w-5 h-5 text-white"/> : <Mic className="w-5 h-5 text-white"/>}
            </button>
            <p className="text-xs text-slate-500">{isListening ? '🔴 Listening...' : 'Tap mic to speak'}</p>
          </div>
        )}
      </div>
    )
  );
}