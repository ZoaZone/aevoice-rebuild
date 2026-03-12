import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Phone, ClipboardList, Clock, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const typeConfig = {
  email: { icon: Mail, color: "bg-blue-100 text-blue-700" },
  sms: { icon: MessageSquare, color: "bg-emerald-100 text-emerald-700" },
  call: { icon: Phone, color: "bg-purple-100 text-purple-700" },
  task: { icon: ClipboardList, color: "bg-amber-100 text-amber-700" },
};

const urgencyConfig = {
  immediate: { label: "Now", color: "bg-red-100 text-red-700", icon: Zap },
  today: { label: "Today", color: "bg-amber-100 text-amber-700", icon: Clock },
  this_week: { label: "This Week", color: "bg-blue-100 text-blue-700", icon: Clock },
  optional: { label: "Optional", color: "bg-slate-100 text-slate-500", icon: Clock },
};

export default function FollowUpSuggestions({ followups, session, onCreated }) {
  const [creatingIdx, setCreatingIdx] = useState(null);
  const [createdIds, setCreatedIds] = useState(new Set());

  if (!followups || followups.length === 0) return null;

  const handleCreate = async (f, idx) => {
    if (!session?.client_id) return;
    setCreatingIdx(idx);
    const validTypes = ["email", "sms", "call", "task"];
    const validUrgencies = ["immediate", "today", "this_week", "optional"];
    await base44.entities.FollowUp.create({
      client_id: session.client_id,
      call_session_id: session.id,
      customer_id: session.customer_id || "",
      type: validTypes.includes(f.type) ? f.type : "task",
      urgency: validUrgencies.includes(f.urgency) ? f.urgency : "today",
      status: "pending",
      title: f.title || f.description?.slice(0, 60) || "Follow-up",
      description: f.description || "",
      draft_content: (f.type === "email" || f.type === "sms") ? (session.draft_response || "") : "",
      caller_name: session.caller_name || session.from_number || "Unknown",
      caller_contact: session.from_number || "",
      agent_id: session.agent_id || "",
      call_summary: session.summary || "",
      call_sentiment: session.sentiment || "neutral",
      call_category: session.category || "",
    });
    setCreatedIds((prev) => new Set([...prev, idx]));
    setCreatingIdx(null);
    toast.success("Follow-up created");
    onCreated?.();
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
        <Zap className="w-3 h-3" /> Suggested Follow-ups
      </p>
      <div className="space-y-1.5">
        {followups.map((f, i) => {
          const tCfg = typeConfig[f.type] || typeConfig.task;
          const uCfg = urgencyConfig[f.urgency] || urgencyConfig.optional;
          const TypeIcon = tCfg.icon;
          const isCreated = createdIds.has(i);
          return (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all"
            >
              <div className={cn("p-1 rounded", tCfg.color)}>
                <TypeIcon className="w-3 h-3" />
              </div>
              <span className="text-xs text-slate-700 flex-1">{f.description}</span>
              <Badge className={cn("text-[10px] px-1.5 py-0", uCfg.color)}>
                {uCfg.label}
              </Badge>
              {session && (
                isCreated ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-indigo-600 flex-shrink-0"
                    disabled={creatingIdx === i}
                    onClick={() => handleCreate(f, i)}
                  >
                    {creatingIdx === i ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}