import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle2, Download, Code, MessageSquare, Activity, Bot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WIDGET_TYPES = {
  chat: { label: "Chat Widget", icon: MessageSquare, desc: "Full chatbot widget with text & voice" },
  sree: { label: "Sree Assistant", icon: Bot, desc: "AI-powered Sree assistant widget" },
  monitor: { label: "Mini Monitor", icon: Activity, desc: "Lightweight status monitor bar" },
};

function buildSnippet(widgetType, config, clientId, agentId, loaderUrl) {
  const cfgObj = {
    clientId: clientId || "YOUR_CLIENT_ID",
    agentId: agentId || "YOUR_AGENT_ID",
    position: config.position || "bottom-right",
    buttonColor: config.buttonColor || "#06b6d4",
    buttonText: config.buttonText || (widgetType === "sree" ? "Sree" : "Chat"),
    buttonShape: config.buttonShape || "pill",
    panelWidth: config.panelWidth || 400,
    panelHeight: config.panelHeight || 600,
    offsetX: config.offsetX || 0,
    offsetY: config.offsetY || 0,
    greetingMessage: config.greetingMessage || "Hi! How can I help you today?",
    avatarUrl: config.avatarUrl || "",
    proactiveGreeting: config.proactiveDelay > 0,
    showAfterSeconds: config.proactiveDelay || 0,
    features: {
      voice: !!config.enableVoice,
      chat: config.enableChat !== false,
      leadCapture: !!config.leadCapture,
      miniMonitor: widgetType === "monitor",
    },
    language: {
      default: config.defaultLanguage || "en",
      autoDetect: config.autoDetectLanguage !== false,
    },
    theme: {
      primaryColor: config.primaryColor || "#6366f1",
      secondaryColor: config.secondaryColor || "#8b5cf6",
    },
  };

  if (widgetType === "sree") {
    cfgObj.mode = "sree-agentic";
    cfgObj.assistantType = "SreeWeb";
  }
  if (widgetType === "monitor") {
    cfgObj.widgetMode = "monitor";
    cfgObj.miniMonitorMode = true;
  }

  const knowledgeBaseIds = config.knowledgeBaseIds || [];
  if (knowledgeBaseIds.length > 0) {
    cfgObj.knowledgeBaseIds = knowledgeBaseIds;
  }

  const configJson = JSON.stringify(cfgObj, null, 4);

  return `<!-- AEVOICE ${WIDGET_TYPES[widgetType]?.label || "Widget"} -->
<script>
  window.aevoiceConfig = ${configJson};
</script>
<script
  src="${loaderUrl}"
  data-agent-id="${agentId || "YOUR_AGENT_ID"}"
  data-client-id="${clientId || "YOUR_CLIENT_ID"}"
  async>
</script>`;
}

export default function SnippetGenerator({ config, clientId, agentId, agents }) {
  const [widgetType, setWidgetType] = useState("chat");
  const [copied, setCopied] = useState(false);

  // Determine loader URL based on widget type
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const loaderUrl =
    widgetType === "sree"
      ? `${appOrigin}/api/sreeWidgetLoader`
      : `${appOrigin}/api/widgetLoader`;

  const snippet = buildSnippet(widgetType, config, clientId, agentId, loaderUrl);

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Embed code copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadSnippet = () => {
    const blob = new Blob([snippet], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aevoice-${widgetType}-widget.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    toast.success("Snippet downloaded!");
  };

  return (
    <Card className="border-2 border-emerald-500">
      <CardHeader className="bg-emerald-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5 text-emerald-600" />
          Embed Code Generator
        </CardTitle>
        <CardDescription>
          Choose a widget type, then copy the snippet into your website
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Widget Type Selector */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(WIDGET_TYPES).map(([key, wt]) => (
            <button
              key={key}
              onClick={() => setWidgetType(key)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                widgetType === key
                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <wt.icon className={cn("w-6 h-6", widgetType === key ? "text-emerald-600" : "text-slate-400")} />
              <span className="text-sm font-semibold">{wt.label}</span>
              <span className="text-[11px] text-slate-500 leading-tight">{wt.desc}</span>
            </button>
          ))}
        </div>

        {/* Config summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            Position: {config.position || "bottom-right"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Language: {config.defaultLanguage || "en"}
          </Badge>
          {config.enableVoice && (
            <Badge className="bg-purple-100 text-purple-700 text-xs">Voice Enabled</Badge>
          )}
          {config.leadCapture && (
            <Badge className="bg-blue-100 text-blue-700 text-xs">Lead Capture</Badge>
          )}
          {config.knowledgeBaseIds?.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              {config.knowledgeBaseIds.length} KB{config.knowledgeBaseIds.length > 1 ? "s" : ""} linked
            </Badge>
          )}
        </div>

        {/* Code Block */}
        <div className="relative">
          <pre className="bg-slate-900 text-green-400 rounded-lg p-4 overflow-x-auto text-xs font-mono max-h-80 leading-relaxed">
            <code>{snippet}</code>
          </pre>
          <div className="absolute top-3 right-3 flex gap-2">
            <Button size="sm" onClick={downloadSnippet} variant="outline" className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-xs gap-1">
              <Download className="w-3 h-3" /> Download
            </Button>
            <Button size="sm" onClick={copySnippet} className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs gap-1">
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}