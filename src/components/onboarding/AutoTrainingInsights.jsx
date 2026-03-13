import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle2,
  Circle,
  Globe,
  FileText,
  MessageSquare,
  Building2,
  Sparkles,
  BookOpen,
  Bot,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AutoTrainingInsights({ agentId, compact = false }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["autoTrainingInsights", agentId],
    queryFn: async () => {
      const params = agentId ? { agent_id: agentId } : {};
      const res = await base44.functions.invoke("getAutoTrainingInsights", params);
      return res.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 5000,
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <div>
              <p className="text-lg font-medium text-indigo-900">Analyzing your AI training...</p>
              <p className="text-sm text-indigo-600">This may take a moment</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>Failed to load training insights</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = data?.insights;

  if (!insights?.has_training) {
    return (
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Bot className="w-5 h-5" />
            AI Training Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-amber-800">{insights?.message || "Add your website to train your AI agent."}</p>
          <div className="flex gap-3">
            <Link to={createPageUrl("AgentBuilder")}>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Create & Train Agent
              </Button>
            </Link>
            <Link to={createPageUrl("Knowledge")}>
              <Button variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />
                Add Knowledge
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { extracted_info, stats, completeness, training_status } = insights;

  const statusConfig = {
    ready: { color: "green", label: "Ready", icon: CheckCircle2 },
    partial: { color: "amber", label: "Partial", icon: AlertCircle },
    minimal: { color: "red", label: "Minimal", icon: Circle },
  };

  const status = statusConfig[training_status] || statusConfig.minimal;

  if (compact) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-${status.color}-100`}>
                <status.icon className={`w-5 h-5 text-${status.color}-600`} />
              </div>
              <div>
                <p className="font-medium">{insights.agent_name}</p>
                <p className="text-xs text-slate-500">
                  {stats.completeness_score}% trained • {stats.knowledge_chunks} chunks
                </p>
              </div>
            </div>
            <Badge className={`bg-${status.color}-100 text-${status.color}-700`}>{status.label}</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card
        className={cn(
          "border-2 bg-gradient-to-br",
          training_status === "ready"
            ? "border-green-200 from-green-50 via-emerald-50 to-teal-50"
            : training_status === "partial"
            ? "border-amber-200 from-amber-50 via-yellow-50 to-orange-50"
            : "border-red-200 from-red-50 via-rose-50 to-pink-50"
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {training_status === "ready" ? "🎉" : training_status === "partial" ? "⚠️" : "🚀"}{" "}
                {training_status === "ready"
                  ? "Your AI is Ready!"
                  : training_status === "partial"
                  ? "Training In Progress"
                  : "Training Needed"}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {training_status === "ready"
                  ? "Your AI agent has successfully learned about your business."
                  : "Add more information to improve your AI agent's knowledge."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
              </Button>
              <Badge className={`bg-${status.color}-100 text-${status.color}-700 text-lg px-3 py-1`}>
                {stats.completeness_score}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Training Progress</span>
              <span className="font-medium">{stats.completeness_score}% Complete</span>
            </div>
            <Progress value={stats.completeness_score} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Globe}
              value={stats.pages_analyzed}
              label="Pages Analyzed"
              color="blue"
            />
            <StatCard
              icon={Building2}
              value={stats.services_found}
              label="Services Found"
              color="green"
            />
            <StatCard
              icon={MessageSquare}
              value={stats.faqs_found}
              label="FAQs Learned"
              color="purple"
            />
            <StatCard
              icon={FileText}
              value={stats.knowledge_chunks}
              label="Knowledge Chunks"
              color="orange"
            />
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              What Your AI Has Learned
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              <ChecklistItem
                checked={completeness.has_company_info}
                label="Company information"
                detail={completeness.has_company_info ? extracted_info.company_name : null}
              />
              <ChecklistItem
                checked={completeness.has_services}
                label="Services & offerings"
                detail={completeness.has_services ? `${stats.services_found} services` : null}
              />
              <ChecklistItem
                checked={completeness.has_faqs}
                label="Common questions"
                detail={completeness.has_faqs ? `${stats.faqs_found} FAQs` : null}
              />
              <ChecklistItem
                checked={completeness.has_contact}
                label="Contact information"
                detail={completeness.has_contact ? "Available" : null}
              />
              <ChecklistItem
                checked={completeness.has_knowledge_chunks}
                label="Knowledge base"
                detail={completeness.has_knowledge_chunks ? `${stats.knowledge_chunks} chunks` : null}
              />
              <ChecklistItem
                checked={completeness.pages_analyzed > 0}
                label="Website content"
                detail={completeness.pages_analyzed > 0 ? `${completeness.pages_analyzed} pages` : null}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link to={createPageUrl("Agents")}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Bot className="w-4 h-4 mr-2" />
                Talk to Your AI
              </Button>
            </Link>
            <Link to={createPageUrl("Knowledge")}>
              <Button variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />
                Add More Knowledge
              </Button>
            </Link>
            {insights.website_url && (
              <Button variant="ghost" asChild>
                <a href={insights.website_url} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4 mr-2" />
                  View Source Website
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      {extracted_info.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              Services & Products Learned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-2">
              {extracted_info.services.slice(0, 8).map((service, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-slate-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{service}</span>
                </div>
              ))}
              {extracted_info.services.length > 8 && (
                <div className="text-sm text-slate-500 p-2">
                  +{extracted_info.services.length - 8} more services
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQs Preview */}
      {extracted_info.faqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              FAQs Your AI Can Answer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extracted_info.faqs.slice(0, 5).map((faq, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-sm">{faq.question}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{faq.answer}</p>
                </div>
              ))}
              {extracted_info.faqs.length > 5 && (
                <p className="text-sm text-slate-500">+{extracted_info.faqs.length - 5} more FAQs</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-900",
    green: "bg-green-100 text-green-900",
    purple: "bg-purple-100 text-purple-900",
    orange: "bg-orange-100 text-orange-900",
  };

  return (
    <div className={cn("p-4 rounded-xl", colorClasses[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

function ChecklistItem({ checked, label, detail }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
      )}
      <span className={cn("text-sm", !checked && "text-slate-400")}>{label}</span>
      {detail && <span className="text-xs text-slate-500 ml-auto">{detail}</span>}
    </div>
  );
}