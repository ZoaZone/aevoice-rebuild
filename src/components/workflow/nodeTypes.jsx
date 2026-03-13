import {
  Phone, MessageSquare, Mail, Clock, Globe, Bot, GitBranch,
  Zap, Database, Send, ArrowRightLeft, Megaphone, Calendar,
  UserCheck, Filter, Sparkles
} from "lucide-react";

export const NODE_CATEGORIES = [
  {
    label: "Triggers",
    color: "emerald",
    nodes: [
      { type: "trigger_call", label: "Inbound Call", icon: Phone, description: "When a call is received" },
      { type: "trigger_sms", label: "SMS Received", icon: MessageSquare, description: "When an SMS arrives" },
      { type: "trigger_webhook", label: "Webhook", icon: Globe, description: "External API trigger" },
      { type: "trigger_schedule", label: "Scheduled", icon: Calendar, description: "Run on a schedule" },
      { type: "trigger_form", label: "Form Submitted", icon: UserCheck, description: "Web form submission" },
    ],
  },
  {
    label: "AI & Logic",
    color: "violet",
    nodes: [
      { type: "ai_respond", label: "AI Response", icon: Sparkles, description: "Generate AI response" },
      { type: "ai_classify", label: "AI Classify", icon: Filter, description: "Classify intent with AI" },
      { type: "ai_extract", label: "AI Extract", icon: Database, description: "Extract data from text" },
      { type: "condition", label: "Condition", icon: GitBranch, description: "Branch based on data" },
    ],
  },
  {
    label: "Actions",
    color: "blue",
    nodes: [
      { type: "send_sms", label: "Send SMS", icon: Send, description: "Send an SMS message" },
      { type: "send_email", label: "Send Email", icon: Mail, description: "Send an email" },
      { type: "transfer_call", label: "Transfer Call", icon: ArrowRightLeft, description: "Transfer to agent/number" },
      { type: "play_audio", label: "Play Audio", icon: Megaphone, description: "Play audio message" },
      { type: "delay", label: "Delay", icon: Clock, description: "Wait before continuing" },
    ],
  },
  {
    label: "Integrations",
    color: "amber",
    nodes: [
      { type: "api_call", label: "HTTP Request", icon: Globe, description: "Call external API" },
      { type: "crm_update", label: "CRM Update", icon: Database, description: "Update CRM record" },
      { type: "webhook_send", label: "Send Webhook", icon: Zap, description: "Fire outbound webhook" },
      { type: "agent_handoff", label: "Agent Handoff", icon: Bot, description: "Transfer to AI agent" },
    ],
  },
];

export const ALL_NODES = NODE_CATEGORIES.flatMap(c =>
  c.nodes.map(n => ({ ...n, category: c.label, categoryColor: c.color }))
);

export function getNodeDef(type) {
  return ALL_NODES.find(n => n.type === type) || { type, label: type, icon: Zap, category: "Unknown", categoryColor: "slate" };
}

export const CATEGORY_COLORS = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", ring: "ring-emerald-400", iconBg: "bg-emerald-100" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-300",  text: "text-violet-700",  ring: "ring-violet-400",  iconBg: "bg-violet-100" },
  blue:    { bg: "bg-blue-50",    border: "border-blue-300",    text: "text-blue-700",    ring: "ring-blue-400",    iconBg: "bg-blue-100" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-300",   text: "text-amber-700",   ring: "ring-amber-400",   iconBg: "bg-amber-100" },
  slate:   { bg: "bg-slate-50",   border: "border-slate-300",   text: "text-slate-700",   ring: "ring-slate-400",   iconBg: "bg-slate-100" },
};