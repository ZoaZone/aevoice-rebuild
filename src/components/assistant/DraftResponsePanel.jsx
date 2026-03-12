import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, MessageSquare, Copy, Send, Sparkles, Loader2, Check, RefreshCw
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function DraftResponsePanel({ session, onUpdated }) {
  const [draft, setDraft] = useState(session.draft_response || "");
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const isEmail = session.draft_response_type !== "sms";

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async (type) => {
    setRegenerating(true);
    const transcript = session.transcript || session.summary || "";
    const callerName = session.caller_name || "Customer";

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a professional follow-up ${type} for a customer interaction.

Context:
- Caller: ${callerName}
- Channel: ${session.channel || "voice"}
- Summary: ${session.summary || "No summary available"}
- Sentiment: ${session.sentiment || "neutral"}
- Outcome: ${session.outcome || "no_outcome"}
- Action items: ${(session.action_items || []).join(", ") || "None"}

${type === "sms" 
  ? "Keep the SMS under 160 characters. Be concise and friendly." 
  : "Write a complete professional email with subject line. Be warm but business-appropriate. Include any relevant follow-up details from the conversation."}

Write ONLY the ${type} content, nothing else.`,
      response_json_schema: {
        type: "object",
        properties: {
          content: { type: "string" }
        }
      }
    });

    const newDraft = result.content || "";
    setDraft(newDraft);
    await base44.entities.CallSession.update(session.id, {
      draft_response: newDraft,
      draft_response_type: type,
    });
    onUpdated?.();
    setRegenerating(false);
    toast.success(`${type === "sms" ? "SMS" : "Email"} draft regenerated`);
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);

    const recipientEmail = session.extracted_data?.email
      || session.extracted_data?.caller_email;
    const recipientPhone = session.from_number;

    if (isEmail && recipientEmail) {
      const subjectMatch = draft.match(/^Subject:\s*(.+)/im);
      const subject = subjectMatch ? subjectMatch[1].trim() : "Follow-up from your recent interaction";
      const body = subjectMatch ? draft.replace(/^Subject:\s*.+\n*/im, "").trim() : draft;

      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject,
        body,
      });
      toast.success(`Email sent to ${recipientEmail}`);
    } else if (!isEmail && recipientPhone) {
      toast.info("SMS queued for delivery");
    } else {
      toast.error(isEmail ? "No email address available" : "No phone number available");
    }
    setSending(false);
  };

  if (!session.summary) return null;

  return (
    <Card className="border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEmail ? (
              <Mail className="w-4 h-4 text-indigo-600" />
            ) : (
              <MessageSquare className="w-4 h-4 text-indigo-600" />
            )}
            <span className="font-medium text-sm text-slate-900">
              Draft {isEmail ? "Email" : "SMS"} Response
            </span>
            <Badge variant="outline" className="text-xs">AI Generated</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRegenerate("email")}
              disabled={regenerating}
              className="h-7 text-xs gap-1"
            >
              <Mail className="w-3 h-3" /> Email
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRegenerate("sms")}
              disabled={regenerating}
              className="h-7 text-xs gap-1"
            >
              <MessageSquare className="w-3 h-3" /> SMS
            </Button>
          </div>
        </div>

        {regenerating ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
            <span className="text-sm text-slate-500">Generating draft...</span>
          </div>
        ) : (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={isEmail ? 8 : 3}
            className="text-sm bg-white"
            placeholder={`Type your ${isEmail ? "email" : "SMS"} response...`}
          />
        )}

        <div className="flex items-center justify-between">
          {!isEmail && (
            <span className={cn("text-xs", draft.length > 160 ? "text-red-500" : "text-slate-400")}>
              {draft.length}/160 chars
            </span>
          )}
          {isEmail && <span className="text-xs text-slate-400">Editable before sending</span>}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 text-xs gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}