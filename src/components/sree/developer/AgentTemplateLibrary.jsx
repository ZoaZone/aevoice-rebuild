/**
 * Agent Template Library
 * Pre-built templates for common agent structures and tasks.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import eventBus from "@/components/sree/engine/eventBus";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, CheckCircle2, Bot, Phone, HeartPulse, ShoppingCart, Headphones, Calendar } from "lucide-react";

const TEMPLATES = [
  {
    id: "receptionist",
    name: "AI Receptionist",
    icon: Phone,
    category: "Voice",
    description: "Answers inbound calls, greets callers, collects basic information and routes to departments.",
    tags: ["voice", "inbound", "routing"],
    color: "from-blue-600 to-cyan-600",
    system_prompt: "You are a professional AI receptionist. Greet callers warmly, identify their needs, and route them appropriately. Collect caller name and reason for call. Be concise and professional.",
    agent_type: "receptionist",
    greeting_message: "Thank you for calling! I'm your AI receptionist. How may I help you today?",
  },
  {
    id: "appointment",
    name: "Appointment Scheduler",
    icon: Calendar,
    category: "Scheduling",
    description: "Books, reschedules, and cancels appointments. Sends confirmations and reminders.",
    tags: ["appointments", "scheduling", "CRM"],
    color: "from-emerald-600 to-teal-600",
    system_prompt: "You are an appointment scheduling assistant. Help users book, reschedule, or cancel appointments. Collect their name, contact info, preferred date/time, and service needed. Confirm all details before finalizing.",
    agent_type: "appointment",
    greeting_message: "Hi! I can help you schedule, reschedule or cancel an appointment. What would you like to do?",
  },
  {
    id: "support",
    name: "Customer Support",
    icon: Headphones,
    category: "Support",
    description: "Handles support tickets, resolves common issues, escalates complex cases to humans.",
    tags: ["support", "helpdesk", "escalation"],
    color: "from-violet-600 to-purple-600",
    system_prompt: "You are a customer support specialist. Listen carefully to customer issues, ask clarifying questions, and provide clear solutions. For issues you cannot resolve, collect the details and escalate to a human agent.",
    agent_type: "support",
    greeting_message: "Hello! I'm here to help with any questions or issues. What can I assist you with today?",
  },
  {
    id: "sales",
    name: "Sales Assistant",
    icon: ShoppingCart,
    category: "Sales",
    description: "Qualifies leads, presents products/services, handles objections and books demos.",
    tags: ["sales", "leads", "outbound"],
    color: "from-amber-600 to-orange-600",
    system_prompt: "You are a sales assistant. Qualify prospects by understanding their needs, present relevant solutions, handle common objections gracefully, and guide qualified leads toward scheduling a demo or consultation. Always be consultative, never pushy.",
    agent_type: "sales",
    greeting_message: "Hi there! I'm excited to learn about your needs and see how we can help your business grow!",
  },
  {
    id: "healthcare",
    name: "Healthcare Assistant",
    icon: HeartPulse,
    category: "Healthcare",
    description: "HIPAA-aware assistant for medical offices. Books appointments, handles pre-visit questions.",
    tags: ["healthcare", "HIPAA", "appointments"],
    color: "from-rose-600 to-pink-600",
    system_prompt: "You are a healthcare practice assistant. Help patients book appointments, provide general information about services, and answer pre-visit questions. Never provide medical advice. Always recommend consulting a healthcare professional for medical concerns. Handle all information with strict confidentiality.",
    agent_type: "appointment",
    greeting_message: "Thank you for contacting our medical office. How may I assist you today?",
  },
  {
    id: "site_assistant",
    name: "Website Assistant",
    icon: Bot,
    category: "Web Chat",
    description: "Embedded web chat bot that answers questions from your website knowledge base.",
    tags: ["web chat", "KB", "lead capture"],
    color: "from-indigo-600 to-blue-600",
    system_prompt: "You are a helpful website assistant. Answer visitor questions using the knowledge base provided. If you don't know the answer, offer to connect them with a human representative. Capture their contact info for follow-up when appropriate.",
    agent_type: "site_assistant",
    greeting_message: "Hi! Welcome to our website. I'm here to help — what can I answer for you?",
  },
];

export default function AgentTemplateLibrary({ onClose }) {
  const [query, setQuery] = useState("");
  const [deploying, setDeploying] = useState(null);
  const [deployed, setDeployed] = useState(null);

  const filtered = TEMPLATES.filter(t =>
    !query || t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.tags.some(tag => tag.includes(query.toLowerCase()))
  );

  const deploy = async (tpl) => {
    setDeploying(tpl.id);
    try {
      const user = await base44.auth.me();
      const clientRes = await base44.functions.invoke("getMyClient", {});
      const client_id = clientRes?.data?.client?.id || user?.data?.client_id;
      if (!client_id) throw new Error("No client found");

      await base44.entities.Agent.create({
        client_id,
        name: `${tpl.name} (from template)`,
        description: tpl.description,
        agent_type: tpl.agent_type,
        system_prompt: tpl.system_prompt,
        greeting_message: tpl.greeting_message,
        status: "draft",
        schema_version: "3.0",
      });
      setDeployed(tpl.id);
      eventBus.emit("developer:progress", { step: "template_deploy", message: `Agent created from template: ${tpl.name}`, status: "done" });
    } catch (err) {
      eventBus.emit("developer:error", { error: `Template deploy failed: ${err.message}` });
    } finally {
      setDeploying(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] rounded-xl border border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white">Template Library</span>
        </div>
        {onClose && <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-[11px]" onClick={onClose}>✕</Button>}
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="h-8 text-xs pl-7 bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 rounded-xl"
          />
        </div>
      </div>

      {/* Templates */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {filtered.map(tpl => {
          const Icon = tpl.icon;
          const isDone = deployed === tpl.id;
          const isDeploying = deploying === tpl.id;
          return (
            <div key={tpl.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 flex gap-3 hover:bg-white/[0.05] transition-colors">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br flex-shrink-0", tpl.color)}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-white">{tpl.name}</span>
                  <Badge className="text-[8px] px-1.5 py-0 bg-white/[0.08] text-slate-300 border-0 rounded-md">{tpl.category}</Badge>
                </div>
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">{tpl.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {tpl.tags.map(t => <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-400">{t}</span>)}
                  </div>
                  <Button
                    size="sm"
                    disabled={isDeploying || isDone}
                    onClick={() => deploy(tpl)}
                    className={cn(
                      "h-7 text-[10px] px-3 rounded-xl flex-shrink-0 gap-1",
                      isDone ? "bg-emerald-600/30 text-emerald-300 border border-emerald-600/30" : `bg-gradient-to-r ${tpl.color} text-white border-0 shadow-sm`
                    )}
                  >
                    {isDeploying ? <><Loader2 className="w-3 h-3 animate-spin" /> Creating…</> :
                     isDone ? <><CheckCircle2 className="w-3 h-3" /> Created!</> :
                     "Use Template"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}