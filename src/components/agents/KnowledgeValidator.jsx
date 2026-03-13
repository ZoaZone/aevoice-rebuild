import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Lightbulb, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KnowledgeValidator({ knowledgeBaseId, chunks }) {
  const [validating, setValidating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const validateKnowledge = async () => {
    setValidating(true);
    try {
      // Analyze knowledge base content
      const chunkTexts = chunks.map(c => c.content).join("\n\n");
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a knowledge base quality analyst. Analyze this knowledge base content and provide structured feedback.

Knowledge Base Content:
${chunkTexts.substring(0, 4000)}

Provide feedback in the following format:
1. Quality Score (1-10)
2. Strengths (list 2-3 key strengths)
3. Issues (list any problems found)
4. Improvement Tips (3-5 actionable suggestions)
5. Coverage Assessment (what topics are well covered, what's missing)

Return ONLY valid JSON with these fields:
- quality_score: number
- strengths: array of strings
- issues: array of strings
- tips: array of strings
- coverage: object with "covered" and "missing" arrays`,
        response_json_schema: {
          type: "object",
          properties: {
            quality_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            issues: { type: "array", items: { type: "string" } },
            tips: { type: "array", items: { type: "string" } },
            coverage: {
              type: "object",
              properties: {
                covered: { type: "array", items: { type: "string" } },
                missing: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setFeedback(result);
    } catch (error) {
      console.error("Validation error:", error);
      setFeedback({
        quality_score: 0,
        issues: ["Failed to validate knowledge base: " + error.message],
        tips: ["Try again or contact support"]
      });
    }
    setValidating(false);
  };

  if (!chunks || chunks.length === 0) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          No knowledge content yet. Add FAQs or upload documents to train your agent.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-slate-900">Knowledge Quality Check</h3>
        </div>
        <Button
          onClick={validateKnowledge}
          disabled={validating}
          variant="outline"
          size="sm"
        >
          {validating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Knowledge"
          )}
        </Button>
      </div>

      {feedback && (
        <div className="space-y-4">
          {/* Quality Score */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Quality Score</span>
              <Badge className={cn(
                "text-lg px-3 py-1",
                feedback.quality_score >= 8 ? "bg-emerald-100 text-emerald-700" :
                feedback.quality_score >= 6 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {feedback.quality_score}/10
              </Badge>
            </div>
          </div>

          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-emerald-900">Strengths</span>
              </div>
              <ul className="space-y-1 text-sm text-emerald-800">
                {feedback.strengths.map((strength, i) => (
                  <li key={i}>• {strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues */}
          {feedback.issues && feedback.issues.length > 0 && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900">Issues Found</span>
              </div>
              <ul className="space-y-1 text-sm text-red-800">
                {feedback.issues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvement Tips */}
          {feedback.tips && feedback.tips.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Improvement Tips</span>
              </div>
              <ul className="space-y-1 text-sm text-blue-800">
                {feedback.tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Coverage Assessment */}
          {feedback.coverage && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">Coverage Assessment</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {feedback.coverage.covered && feedback.coverage.covered.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-emerald-700 mb-1">Well Covered:</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {feedback.coverage.covered.map((topic, i) => (
                        <li key={i}>✓ {topic}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {feedback.coverage.missing && feedback.coverage.missing.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-1">Consider Adding:</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {feedback.coverage.missing.map((topic, i) => (
                        <li key={i}>○ {topic}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}