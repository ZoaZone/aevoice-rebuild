import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Link2, Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function KBAgentLinker({ knowledgeBases, agents, agentKBIds, onLink }) {
  const queryClient = useQueryClient();

  const toggleLink = async (kbId) => {
    const current = agentKBIds || [];
    const updated = current.includes(kbId)
      ? current.filter((id) => id !== kbId)
      : [...current, kbId];
    onLink(updated);
  };

  if (!knowledgeBases || knowledgeBases.length === 0) {
    return (
      <Card className="border-dashed border-2 border-slate-200">
        <CardContent className="py-10 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">No knowledge bases available</p>
          <p className="text-xs text-slate-400 mt-1">Create one from the Knowledge page first</p>
        </CardContent>
      </Card>
    );
  }

  const typeIcons = {
    faq: "📋",
    documents: "📄",
    website: "🌐",
    api: "🔗",
    mixed: "📚",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-600" />
          Link Knowledge Bases
        </h4>
        <Badge variant="secondary" className="text-xs">
          {agentKBIds?.length || 0} linked
        </Badge>
      </div>
      <p className="text-sm text-slate-500">
        Select which knowledge bases this agent should use to answer questions
      </p>

      <div className="space-y-2">
        {knowledgeBases.map((kb) => {
          const isLinked = agentKBIds?.includes(kb.id);
          const linkedAgentCount = (kb.linked_agent_ids || []).length;

          return (
            <button
              key={kb.id}
              onClick={() => toggleLink(kb.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                isLinked
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <span className="text-xl flex-shrink-0">{typeIcons[kb.type] || "📚"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{kb.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">
                    {kb.chunk_count || 0} chunks · {kb.type}
                  </span>
                  {kb.ai_keywords?.length > 0 && (
                    <span className="text-xs text-slate-400 truncate">
                      {kb.ai_keywords.slice(0, 3).join(", ")}
                    </span>
                  )}
                </div>
                {kb.ai_summary && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{kb.ai_summary}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {kb.status === "active" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">{kb.status}</Badge>
                )}
                {isLinked && <Check className="w-5 h-5 text-indigo-600" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}