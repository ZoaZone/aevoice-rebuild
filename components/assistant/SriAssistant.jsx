import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  X,
  Minimize2,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Phone,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SriAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState("chat"); // chat or voice
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "" });
  const [darkMode, setDarkMode] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = "aevoice_session_token";
      let token = window.localStorage.getItem(key);
      if (!token) {
        token = `sess_${crypto.randomUUID()}`;
        window.localStorage.setItem(key, token);
      }
      setSessionToken(token);
    }
  }, []);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [detectedLanguage, setDetectedLanguage] = useState("en");

  // TTS Helper
  const speakResponse = (text) => {
    if (!text || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Try to find a good female voice or Google US English
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          role: 'assistant',
          content: "Hi! I'm Sri. How can I help you today? 👋"
        }]);
      }, 300);
    }
  }, [isOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const processMessageWithStreaming = async (text) => {
    setIsLoading(true);
    setStreamingMessage("");
    
    try {
      // Get knowledge bases shared with Sri
      const kbList = await base44.entities.KnowledgeBase.filter({ shared_with_sri: true });
      
      // Get knowledge chunks from all shared knowledge bases
      let knowledgeContext = '';
      for (const kb of kbList.slice(0, 3)) {
        const chunks = await base44.entities.KnowledgeChunk.filter({ 
          knowledge_base_id: kb.id 
        });
        
        if (chunks.length > 0) {
          knowledgeContext += chunks.map(c => 
            `${c.title ? c.title + ':\n' : ''}${c.content}`
          ).join('\n\n---\n\n');
        }
      }

      // Build conversation history
      const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      // Truncate context to avoid 500 errors from token limits
      const safeContext = knowledgeContext ? knowledgeContext.substring(0, 6000) : '';
      const safeHistory = conversationHistory.length > 2000 ? conversationHistory.substring(conversationHistory.length - 2000) : conversationHistory;

      // Use real streaming from backend
      const response = await fetch("https://aevoice.base44.app/api/apps/692b24a5bac54e3067972063/functions/streamingChatResponse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_token: sessionToken,
          conversation_history: messages
        })
      });

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;
        setStreamingMessage(prev => prev + chunk);
      }

      const finalMessage = assistantMessage.trim();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: finalMessage
      }]);
      setStreamingMessage("");
      
      // Speak the response if in voice mode or just always for Sri if desired (usually only voice mode)
      // The user requested "Sri voice bot", so we speak it.
      // We can check mode === 'voice' or just speak it. 
      // Given the request "The site Sri is unable to talk", let's speak it.
      speakResponse(finalMessage);

      // Check if lead capture needed
      const leadKeywords = ['interested', 'pricing', 'demo', 'trial', 'signup', 'contact', 'buy', 'purchase'];
      if (leadKeywords.some(word => text.toLowerCase().includes(word))) {
        setShowLeadCapture(true);
      }
    } catch (error) {
      console.error('Sri error:', error);
      // Fallback message so user doesn't see a broken state
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having a little trouble connecting to my brain right now, but I'm here! How else can I help?" 
      }]);
      setStreamingMessage("");
    }
    setIsLoading(false);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;
    
    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputText("");
    
    // Simple client-side language hint passed to backend via message content (backend detects it anyway)
    // But we can also set it locally for UI adjustments if needed
    // setDetectedLanguage(...) 
    
    await processMessageWithStreaming(userMessage);
  };

  const toggleVoiceRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          toast.error('Voice not supported in this browser');
          return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = async (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          setMessages(prev => [...prev, { role: 'user', content: transcript }]);
          await processMessageWithStreaming(transcript);
        };

        recognition.onerror = (event) => {
          if (event.error === 'not-allowed') {
            toast.error('Microphone access denied');
          }
          setIsListening(false);
        };

        recognition.start();
        setIsListening(true);
      } catch (error) {
        toast.error('Could not start voice');
        setIsListening(false);
      }
    }
  };

  const handleLeadCapture = async () => {
    if (!leadForm.email) {
      toast.error('Email is required');
      return;
    }

    try {
      await base44.functions.invoke('captureWidgetLead', {
        session_id: sessionId,
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone
      });
      
      toast.success('Thanks! We\'ll be in touch soon.');
      setShowLeadCapture(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Perfect! I\'ve captured your details. Our team will reach out shortly. How else can I help?'
      }]);
    } catch (error) {
      toast.error('Failed to save your info. Please try again.');
    }
  };

  const rateMessage = async (messageIndex, rating) => {
    toast.success(rating === 'up' ? 'Thanks for the feedback!' : 'We\'ll improve!');
  };

  // Quick action buttons
  const quickActions = [
    "Tell me about pricing",
    "How does voice AI work?",
    "Book a demo",
    "See features"
  ];

  // Collapsed state - just 60px circle
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="w-[60px] h-[60px] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all overflow-hidden backdrop-blur-md bg-gradient-to-br from-[#0e4166]/90 to-[#0b6d44]/90 border-2 border-white/20 animate-bounce-slow"
          title="Chat with Sri"
        >
          <div className="relative w-full h-full">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
              alt="Sri"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-teal-500/20 animate-pulse" />
          </div>
        </button>
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-3 backdrop-blur-xl bg-[#0e4166]/90 text-white rounded-full shadow-2xl hover:shadow-cyan-500/25 transition-all border border-white/10"
        >
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
            alt="Sri"
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="font-medium">Sri</span>
          {messages.length > 0 && (
            <Badge className="bg-cyan-500 text-white">{messages.length}</Badge>
          )}
        </button>
      </div>
    );
  }

  // Full widget - 400x600px with glassmorphism
  return (
    <div 
      className={cn(
        "fixed bottom-6 right-6 w-[400px] h-[600px] shadow-2xl backdrop-blur-xl rounded-3xl z-50 flex flex-col overflow-hidden border border-white/20 animate-slide-up",
        darkMode 
          ? "bg-slate-900/95" 
          : "bg-white/95"
      )}
    >
      {/* Header - Glassmorphism with gradient */}
      <div className="flex items-center justify-between p-4 backdrop-blur-xl bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white flex-shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
              alt="Sri"
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
            {isListening && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm">Sri - AI Assistant</h3>
            <p className="text-xs text-cyan-200">Always here to help</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="text-white hover:bg-white/10 h-8 w-8"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/10 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mode Toggle - Both buttons always visible */}
      <div className={cn(
        "grid grid-cols-2 gap-2 p-3 border-b",
        darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50/50 border-slate-200"
      )}>
        <Button
          size="sm"
          variant={mode === 'chat' ? 'default' : 'ghost'}
          onClick={() => setMode('chat')}
          className={cn(
            "gap-2",
            mode === 'chat' ? "bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white shadow-md" : "text-slate-600"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </Button>
        <Button
          size="sm"
          variant={mode === 'voice' ? 'default' : 'ghost'}
          onClick={() => setMode('voice')}
          className={cn(
            "gap-2",
            mode === 'voice' ? "bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white shadow-md" : "text-slate-600"
          )}
        >
          <Mic className="w-4 h-4" />
          Voice
        </Button>
      </div>

      {/* Messages Area */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4 space-y-3",
        darkMode ? "bg-slate-900/50" : "bg-white/50"
      )}>
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
            {msg.role === 'assistant' && (
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
                alt="Sri"
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className={cn(
              "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm backdrop-blur-sm",
              msg.role === 'user'
                ? "bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white rounded-tr-sm"
                : darkMode 
                  ? "bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700"
                  : "bg-white/90 text-slate-900 rounded-tl-sm border border-slate-200 shadow-sm"
            )}>
              {msg.content}
              {msg.role === 'assistant' && i === messages.length - 1 && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/50">
                  <button
                    onClick={() => rateMessage(i, 'up')}
                    className="text-slate-400 hover:text-green-500 transition-colors"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => rateMessage(i, 'down')}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex gap-2 justify-start">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
              alt="Sri"
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className={cn(
              "max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm backdrop-blur-sm",
              darkMode 
                ? "bg-slate-800/90 text-slate-100 border border-slate-700"
                : "bg-white/90 text-slate-900 border border-slate-200"
            )}>
              {streamingMessage}
              <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && !streamingMessage && (
          <div className="flex gap-2 justify-start">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
              alt="Sri"
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className={cn(
              "px-4 py-3 rounded-2xl rounded-tl-sm backdrop-blur-sm",
              darkMode ? "bg-slate-800/90" : "bg-white/90"
            )}>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#0e4166] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#0e4166] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#0e4166] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick actions (show on first load) */}
        {messages.length <= 1 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  setMessages(prev => [...prev, { role: 'user', content: action }]);
                  processMessageWithStreaming(action);
                }}
                className={cn(
                  "text-xs p-2 rounded-lg border transition-all hover:scale-105",
                  darkMode 
                    ? "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                {action}
              </button>
            ))}
          </div>
        )}

        {/* Lead capture form */}
        {showLeadCapture && (
          <div className={cn(
            "p-4 rounded-xl border-2 space-y-3 backdrop-blur-sm",
            darkMode 
              ? "bg-slate-800/90 border-cyan-500/50" 
              : "bg-white/90 border-cyan-500/50"
          )}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <p className="text-sm font-medium">Let's connect!</p>
            </div>
            <Input
              placeholder="Your name"
              value={leadForm.name}
              onChange={(e) => setLeadForm({...leadForm, name: e.target.value})}
              className="h-9 text-sm"
            />
            <Input
              type="email"
              placeholder="Email address *"
              value={leadForm.email}
              onChange={(e) => setLeadForm({...leadForm, email: e.target.value})}
              className="h-9 text-sm"
            />
            <Input
              placeholder="Phone (optional)"
              value={leadForm.phone}
              onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})}
              className="h-9 text-sm"
            />
            <Button
              onClick={handleLeadCapture}
              className="w-full bg-gradient-to-r from-[#0e4166] to-[#0b6d44] text-white h-9 text-sm"
            >
              Submit
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {mode === 'chat' ? (
        <form 
          onSubmit={handleSendMessage} 
          className={cn(
            "p-4 border-t backdrop-blur-sm flex-shrink-0",
            darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-slate-200"
          )}
        >
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className={cn(
                "flex-1 h-10 backdrop-blur-sm",
                darkMode ? "bg-slate-900/50 border-slate-700" : "bg-white/80"
              )}
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="bg-gradient-to-r from-[#0e4166] to-[#0b6d44] hover:opacity-90 h-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className={cn(
          "p-6 border-t backdrop-blur-sm flex flex-col items-center gap-4",
          darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-slate-200"
        )}>
          <button
            onClick={toggleVoiceRecognition}
            disabled={isLoading}
            className={cn(
              "w-16 h-16 rounded-full shadow-xl transition-all flex items-center justify-center",
              isListening
                ? "bg-red-500 animate-pulse-fast"
                : "bg-gradient-to-r from-[#0e4166] to-[#0b6d44] hover:scale-110"
            )}
          >
            {isListening ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
          </button>
          <p className={cn(
            "text-xs text-center",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}>
            {isListening ? "🔴 Listening... speak now" : "Tap to start talking"}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={cn(
        "text-center py-2 text-xs border-t backdrop-blur-sm",
        darkMode ? "bg-slate-900/50 text-slate-500 border-slate-800" : "bg-slate-50/50 text-slate-400 border-slate-200"
      )}>
        Powered by <span className="font-semibold text-[#0e4166]">AEVOICE</span>
      </div>
    </div>
  );
}