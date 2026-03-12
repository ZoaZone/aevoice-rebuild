import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Loader2, Phone, PhoneIncoming, PhoneOutgoing,
  Clock, CheckCircle2, ArrowRight, Tag,
  ThumbsUp, ThumbsDown, Minus, MessageSquare,
  ChevronDown, ChevronUp, AlertTriangle, Flag
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import FollowUpSuggestions from "./FollowUpSuggestions";
import DraftResponsePanel from "./DraftResponsePanel";

const sentimentConfig = {
  positive: { icon: ThumbsUp, color: "bg-emerald-100 text-emerald-700", barColor: "bg-emerald-500" },
  neutral: { icon: Minus, color: "bg-slate-100 text-slate-700", barColor: "bg-slate-400" },
  negative: { icon: ThumbsDown, color: "bg-red-100 text-red-700", barColor: "bg-red-500" },
};

const outcomeLabels = {
  appointment_booked: "Appointment Booked",
  information_provided: "Info Provided",
  transferred: "Transferred",
  callback_requested: "Callback Requested",
  issue_resolved: "Issue Resolved",
  no_outcome: "No Outcome",
};

const categoryLabels = {
  sales_inquiry: "Sales",
  support_request: "Support",
  appointment: "Appointment",
  billing: "Billing",
  complaint: "Complaint",
  general_inquiry: "General",
  follow_up: "Follow-up",
  urgent: "Urgent",
  spam: "Spam",
};

const categoryColors = {
  sales_inquiry: "bg-blue-100 text-blue-700",
  support_request: "bg-purple-100 text-purple-700",
  appointment: "bg-cyan-100 text-cyan-700",
  billing: "bg-amber-100 text-amber-700",
  complaint: "bg-red-100 text-red-700",
  general_inquiry: "bg-slate-100 text-slate-700",
  follow_up: "bg-indigo-100 text-indigo-700",
  urgent: "bg-red-200 text-red-800",
  spam: "bg-gray-100 text-gray-500",
};

const priorityConfig = {
  critical: { color: "bg-red-600 text-white", icon: AlertTriangle },
  high: { color: "bg-orange-100 text-orange-700", icon: Flag },
  medium: { color: "bg-blue-100 text-blue-600", icon: Flag },
  low: { color: "bg-slate-100 text-slate-500", icon: Flag },
};

const channelIcons = {
  voice: Phone,
  sms: MessageSquare,
  web_chat: MessageSquare,
  whatsapp: MessageSquare,
  email: MessageSquare,
};

export default function CallSummaryCard({ session, agents, onSummarized }) {
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const agent = agents?.find((a) => a.id === session.agent_id);
  const sentiment = sentimentConfig[session.sentiment] || sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;
  const DirectionIcon = session.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
  const ChannelIcon = channelIcons[session.channel] || Phone;
  const priority = priorityConfig[session.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("summarizeCallSession", {
        call_session_id: session.id,
      });
      if (res.data?.success) {
        toast.success("Analysis complete");
        onSummarized?.();
      } else {
        toast.error(res.data?.error || "Failed to generate");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
    setGenerating(false);
  };

  const hasSummary = !!session.summary;
  const scorePercent = session.sentiment_score != null
    ? Math.round(((session.sentiment_score + 1) / 2) * 100)
    : null;
  const hasFollowups = session.suggested_followups?.length > 0;
  const hasDraft = !!session.draft_response;

  return (
    <Card className={cn(
      "border transition-all hover:shadow-md",
      session.priority === "critical" ? "border-red-300 bg-red-50/30" :
      session.priority === "high" ? "border-orange-200" :
      hasSummary ? "border-slate-200" : "border-dashed border-slate-300"
    )}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <DirectionIcon className={cn("w-4 h-4",
              session.direction === "inbound" ? "text-blue-600" : "text-emerald-600"
            )} />
            <span className="font-medium text-sm text-slate-900">
              {session.caller_name || session.from_number || "Unknown Caller"}
            </span>
            <Badge variant="outline" className="text-xs capitalize gap-1">
              <ChannelIcon className="w-3 h-3" />
              {session.channel || "voice"}
            </Badge>
            {agent && (
              <Badge variant="secondary" className="text-xs">{agent.name}</Badge>
            )}
            {session.category && (
              <Badge className={cn("text-xs", categoryColors[session.category] || "bg-slate-100 text-slate-600")}>
                {categoryLabels[session.category] || session.category}
              </Badge>
            )}
            {session.priority && session.priority !== "medium" && (
              <Badge className={cn("text-xs gap-0.5", priority.color)}>
                <PriorityIcon className="w-2.5 h-2.5" />
                {session.priority}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {session.started_at
              ? moment(session.started_at).format("MMM D, h:mm A")
              : moment(session.created_date).format("MMM D, h:mm A")}
            {session.duration_seconds != null && (
              <span className="ml-1">({Math.ceil(session.duration_seconds / 60)}m)</span>
            )}
          </div>
        </div>

        {hasSummary ? (
          <div className="space-y-3">
            {/* Summary */}
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">
              {session.summary}
            </p>

            {/* Sentiment + Outcome row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("gap-1", sentiment.color)}>
                <SentimentIcon className="w-3 h-3" />
                {session.sentiment}
                {scorePercent != null && (
                  <span className="ml-1 opacity-75">({scorePercent}%)</span>
                )}
              </Badge>
              {session.outcome && session.outcome !== "no_outcome" && (
                <Badge variant="outline" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {outcomeLabels[session.outcome] || session.outcome}
                </Badge>
              )}
              {session.sentiment_details && (
                <span className="text-xs text-slate-500 italic">{session.sentiment_details}</span>
              )}
            </div>

            {/* Sentiment bar */}
            {scorePercent != null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-8">Neg</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", sentiment.barColor)}
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">Pos</span>
              </div>
            )}

            {/* Topics */}
            {session.key_topics?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3 h-3 text-slate-400" />
                {session.key_topics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            {/* Action Items */}
            {session.action_items?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs font-medium text-amber-800 mb-1.5">Action Items</p>
                <ul className="space-y-1">
                  {session.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                      <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expand toggle for follow-ups and draft */}
            {(hasFollowups || hasDraft) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Hide" : "Show"} follow-ups & draft response
              </button>
            )}

            {expanded && (
              <div className="space-y-3 pt-1">
                <FollowUpSuggestions followups={session.suggested_followups} session={session} onCreated={onSummarized} />
                <DraftResponsePanel session={session} onUpdated={onSummarized} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between py-2">
            <p className="text-sm text-slate-400">
              {session.transcript
                ? "Transcript available — generate AI analysis"
                : "No transcript available yet"}
            </p>
            {session.transcript && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                disabled={generating}
                className="gap-1"
              >
                {generating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {generating ? "Analyzing..." : "Analyze Call"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}