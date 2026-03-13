import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DeploymentManager({ agentId, clientId, widgetConfig }) {
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState("");
  const [newSiteName, setNewSiteName] = useState("");

  const { data: deployments = [], isLoading } = useQuery({
    queryKey: ["agentDeployments", agentId],
    queryFn: () => base44.entities.AgentDeployment.filter({ agent_id: agentId }),
    enabled: !!agentId,
  });

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AgentDeployment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentDeployments", agentId] });
      setNewDomain("");
      setNewSiteName("");
      toast.success("Deployment saved!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentDeployment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentDeployments", agentId] });
      toast.success("Deployment removed");
    },
  });

  const handleAdd = () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain");
      return;
    }
    const cleanDomain = newDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const loaderUrl = `${appOrigin}/api/widgetLoader`;

    const embedCode = `<!-- AEVOICE Widget for ${cleanDomain} -->
<script>
  window.aevoiceConfig = ${JSON.stringify({
    clientId,
    agentId,
    position: widgetConfig.position || "bottom-right",
    buttonColor: widgetConfig.buttonColor || "#06b6d4",
    theme: {
      primaryColor: widgetConfig.primaryColor || "#6366f1",
      secondaryColor: widgetConfig.secondaryColor || "#8b5cf6",
    },
    greetingMessage: widgetConfig.greetingMessage || "Hi! How can I help you today?",
    avatarUrl: widgetConfig.avatarUrl || "",
    features: {
      voice: !!widgetConfig.enableVoice,
      chat: widgetConfig.enableChat !== false,
      leadCapture: !!widgetConfig.leadCapture,
    },
  }, null, 2)};
</script>
<script src="${loaderUrl}" data-agent-id="${agentId}" data-client-id="${clientId}" async></script>`;

    createMutation.mutate({
      agent_id: agentId,
      client_id: clientId,
      domain: cleanDomain,
      site_name: newSiteName.trim() || cleanDomain,
      status: "active",
      embed_code: embedCode,
      widget_config: widgetConfig,
      installed_at: new Date().toISOString(),
    });
  };

  const copyEmbedCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Embed code copied!");
  };

  if (!agentId) {
    return (
      <Card className="border-dashed border-2 border-slate-300">
        <CardContent className="p-8 text-center">
          <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Select an agent first</p>
          <p className="text-sm text-slate-400">Choose an agent above to manage deployments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          Deployments
        </CardTitle>
        <CardDescription>
          Register domains where your widget is deployed
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Add new domain */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Domain</Label>
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Site Name (optional)</Label>
            <Input
              placeholder="My Website"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700 gap-1"
            onClick={handleAdd}
            disabled={createMutation.isPending}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        {/* Deployment list */}
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">Loading deployments...</p>
        ) : deployments.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No deployments yet. Add a domain above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deployments.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    dep.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                  )} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{dep.site_name || dep.domain}</p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {dep.domain}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={cn(
                    "text-xs",
                    dep.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  )}>
                    {dep.status}
                  </Badge>
                  {dep.embed_code && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyEmbedCode(dep.embed_code)}
                      title="Copy embed code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => deleteMutation.mutate(dep.id)}
                    disabled={deleteMutation.isPending}
                    title="Remove deployment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}