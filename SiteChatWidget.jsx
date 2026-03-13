import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, Phone, Mail, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SITE_KNOWLEDGE = `
You are the AEVOICE Website Assistant. You help visitors understand AEVOICE products and services.

ABOUT AEVOICE:
- AEVOICE is an AI voice platform for answering calls, booking appointments, and handling support at scale.
- Products: AI Voice Agents (receptionist, sales, support, appointment), Knowledge Base management, Phone Number management, Call Analytics.
- Pricing starts at $35/month with pay-per-use for minutes.

KEY FEATURES:
- Multi-language voice AI (30+ languages including Indian regional)
- Auto-learn from websites and documents
- Call recording, transcription, and analytics
- CRM integrations and webhook support
- WhatsApp, email, and phone channels
- Custom SIP trunk support

AEVOICE VOICE AI PLANS:
- Aeva Mini ($35/mo): 1 AI agent, 1 phone number, 100 minutes included.
- Aeva Micro ($100/mo): 3 AI agents, 2 phone numbers, 300 minutes included.
- Aeva Medium ($250/mo): Unlimited agents/numbers, 1,666 minutes.
- Aeva Mega ($1,000/mo): 7,000+ minutes, unlimited everything.

SREE / SRI ASSISTANT PLANS:
- Sri (Text Chat) — Free. Simple text assistant.
- Sri (Voice Chat) — $15/month. Natural voice with STT/TTS.
- Sree (Local Knowledge) — $35/month. Privacy-first offline AI.
- AI Sree (Agentic Assistant) — From $50/month. Task execution.

CONTACT:
- Phone: +1 (256) 699-8899
- Email: care@aevoice.ai
- Website: https://aevoice.ai

GUIDELINES:
- Be friendly, concise, and helpful
- Answer FAQs about the platform
- Guide users to sign up or contact sales for specific pricing
- If asked about things outside AEVOICE, politely redirect
`;

export default function SiteChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! 👋 I'm the AEVOICE assistant. How can I help you today?\n\nYou can ask me about our AI voice agents, pricing, or features." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setIsLoading(true);
    const history = messages.slice(-6).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const response = await base44.integrations.Core.InvokeLLM({ prompt: `${SITE_KNOWLEDGE}\n\nConversation:\n${history}\nUser: ${text}\n\nRespond helpfully:`, add_context_from_internet: false });
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_8px_32px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)] transition-all hover:scale-105 flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9998] w-[380px] max-h-[600px] flex flex-col rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_16px_56px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]">
      {/* Header — embossed gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white px-4 py-3 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">AEVOICE Assistant</p>
            <p className="text-xs text-indigo-200">Ask me anything</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:bg-white/15" onClick={() => setIsOpen(false)}>
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:bg-white/15" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages — inset shadow for depth */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px] min-h-[200px] bg-gradient-to-b from-slate-50/80 to-white/60 shadow-[inset_0_4px_8px_rgba(0,0,0,0.03)]">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
              msg.role === "user"
                ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-md shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
                : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-md shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]"
            )}>
              {msg.role === "user" ? <p>{msg.content}</p> : (
                <ReactMarkdown
                  className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                    a: ({ children, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">{children}</a>,
                  }}
                >{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 border-t border-slate-100/80 bg-white/90 flex items-center gap-2">
        <a href="https://wa.me/12566998899?text=Hi%2C%20I%20want%20to%20know%20about%20AEVOICE" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 transition shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Phone className="w-3 h-3" /> WhatsApp
        </a>
        <a href="tel:+12566998899"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 transition shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Phone className="w-3 h-3" /> Call
        </a>
        <a href="mailto:care@aevoice.ai" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200/60 hover:bg-purple-100 transition shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Mail className="w-3 h-3" /> Email
        </a>
      </div>

      {/* Input — embossed */}
      <div className="p-3 border-t border-slate-200/60 bg-white/95 flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type your question..."
          className="flex-1 text-sm rounded-xl border-slate-200/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] focus:border-indigo-300 focus:ring-indigo-200/50"
          disabled={isLoading}
        />
        <Button size="icon" onClick={sendMessage} disabled={!input.trim() || isLoading}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 h-9 w-9 rounded-xl shadow-[0_2px_8px_rgba(99,102,241,0.3)]">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}