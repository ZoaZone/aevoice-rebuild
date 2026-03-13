import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Tag, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import moment from "moment";

export default function KBAISummary({ kb, chunks }) {
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const runAnalysis = async () => {
    if (!chunks || chunks.length === 0) {
      toast.error("No content to analyze. Add some knowledge first.");
      return;
    }

    setAnalyzing(true);
    const contentSample = chunks
      .slice(0, 20)
      .map((c) => (c.title ? `[${c.title}] ${c.content}` : c.content))
      .join("\n\n")
      .slice(0, 8000);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this knowledge base content and provide:
1. A concise 2-3 sentence summary of what this knowledge base covers
2. The top 10 most important keywords
3. The main topics/categories covered (max 8)

Content:
${contentSample}`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          topics: { type: "array", items: { type: "string" } },
        },
      },
    });

    await base44.entities.KnowledgeBase.update(kb.id, {
      ai_summary: result.summary,
      ai_keywords: result.keywords,
      ai_topics: result.topics,
      last_ai_analysis_at: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: ["knowledgeBases"] });
    toast.success("AI analysis complete");
    setAnalyzing(false);
  };

  const hasSummary = kb.ai_summary || kb.ai_keywords?.length > 0;

  return (
    <Card className="border-2 border-purple-200 bg-purple-50/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI Content Analysis
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={runAnalysis}
            disabled={analyzing}
            className="gap-1"
          >
            {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {analyzing ? "Analyzing..." : hasSummary ? "Re-analyze" : "Analyze"}
          </Button>
        </div>

        {hasSummary ? (
          <div className="space-y-3">
            {kb.ai_summary && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Summary
                </p>
                <p className="text-sm text-slate-700 bg-white rounded p-2 border border-purple-100">
                  {kb.ai_summary}
                </p>
              </div>
            )}

            {kb.ai_topics?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {kb.ai_topics.map((t, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-700 text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {kb.ai_keywords?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Keywords
                </p>
                <div className="flex flex-wrap gap-1">
                  {kb.ai_keywords.map((k, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {kb.last_ai_analysis_at && (
              <p className="text-xs text-slate-400">
                Last analyzed {moment(kb.last_ai_analysis_at).fromNow()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">
            Click "Analyze" to generate an AI summary, extract keywords, and identify topics.
          </p>
        )}
      </CardContent>
    </Card>
  );
}