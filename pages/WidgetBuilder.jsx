import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Copy, 
  CheckCircle2, 
  Code, 
  Sparkles, 
  Palette,
  MessageSquare,
  Eye,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function WidgetBuilder() {
  const [widgetConfig, setWidgetConfig] = useState({
    position: 'bottom-right',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    buttonColor: '#06b6d4',
    greetingMessage: 'Hi! How can I help you today?',
    avatarUrl: '',
    proactiveDelay: 30,
    enableVoice: true,
    enableChat: true,
    leadCapture: true,
    agentId: ''
  });
  const [copied, setCopied] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Client.filter({ contact_email: user.email });
    },
    enabled: !!user,
  });

  const currentClient = clients[0];

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.Agent.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient,
  });

  const updateConfig = (key, value) => {
    setWidgetConfig(prev => ({ ...prev, [key]: value }));
  };

  const selectedAgent = agents.find(a => a.id === widgetConfig.agentId) || agents[0];
  const agentIdValue = widgetConfig.agentId || selectedAgent?.id || 'YOUR_AGENT_ID';
  const clientIdValue = currentClient?.id || 'YOUR_CLIENT_ID';

  const embedCode = `<!-- AEVOICE Widget -->
<div id="aevoice-widget"></div>
<script>
(function() {
  window.AEVOICE_CONFIG = {
    clientId: '${clientIdValue}',
    agentId: '${agentIdValue}',
    position: '${widgetConfig.position}',
    theme: {
      primaryColor: '${widgetConfig.primaryColor}',
      secondaryColor: '${widgetConfig.secondaryColor}',
      buttonColor: '${widgetConfig.buttonColor}'
    },
    greeting: '${widgetConfig.greetingMessage}',
    avatarUrl: '${widgetConfig.avatarUrl || ''}',
    features: {
      voice: ${widgetConfig.enableVoice},
      chat: ${widgetConfig.enableChat},
      leadCapture: ${widgetConfig.leadCapture}
    },
    proactive: {
      enabled: ${widgetConfig.proactiveDelay > 0},
      delaySeconds: ${widgetConfig.proactiveDelay}
    }
  };
  
  const script = document.createElement('script');
  script.src = 'https://cdn.aevoice.ai/widget-v2.min.js';
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Website Widget Builder</h1>
        <p className="text-slate-500 mt-2">
          Create a customized AI assistant widget for your website
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Widget Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Agent Selection */}
              <div className="space-y-2">
                <Label>Select Agent *</Label>
                <Select value={widgetConfig.agentId} onValueChange={(v) => updateConfig('agentId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label>Widget Position</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'bottom-right', label: 'Bottom Right' },
                    { value: 'bottom-left', label: 'Bottom Left' },
                    { value: 'top-right', label: 'Top Right' },
                    { value: 'top-left', label: 'Top Left' }
                  ].map(pos => (
                    <button
                      key={pos.value}
                      onClick={() => updateConfig('position', pos.value)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                        widgetConfig.position === pos.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color Theme
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Primary</Label>
                    <input
                      type="color"
                      value={widgetConfig.primaryColor}
                      onChange={(e) => updateConfig('primaryColor', e.target.value)}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Secondary</Label>
                    <input
                      type="color"
                      value={widgetConfig.secondaryColor}
                      onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Button</Label>
                    <input
                      type="color"
                      value={widgetConfig.buttonColor}
                      onChange={(e) => updateConfig('buttonColor', e.target.value)}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Greeting */}
              <div className="space-y-2">
                <Label>Greeting Message</Label>
                <Textarea
                  placeholder="Hi! How can I help you today?"
                  value={widgetConfig.greetingMessage}
                  onChange={(e) => updateConfig('greetingMessage', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Avatar Image URL (Optional)</Label>
                <Input
                  placeholder="https://yoursite.com/avatar.png"
                  value={widgetConfig.avatarUrl}
                  onChange={(e) => updateConfig('avatarUrl', e.target.value)}
                />
              </div>

              {/* Proactive Engagement */}
              <div className="space-y-2">
                <Label>Proactive Engagement (seconds)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={widgetConfig.proactiveDelay}
                    onChange={(e) => updateConfig('proactiveDelay', parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-500">
                    {widgetConfig.proactiveDelay > 0 
                      ? `Widget opens after ${widgetConfig.proactiveDelay}s on page` 
                      : 'Disabled'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card className="border-2 border-emerald-500">
            <CardHeader className="bg-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-600" />
                Embed Code
              </CardTitle>
              <CardDescription>
                Copy this code and paste before &lt;/body&gt; tag on your website
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative">
                <pre className="bg-slate-900 text-green-400 rounded-lg p-4 overflow-x-auto text-xs font-mono max-h-96">
                  <code>{embedCode}</code>
                </pre>
                <Button
                  size="sm"
                  onClick={copyToClipboard}
                  className="absolute top-3 right-3 bg-emerald-600 hover:bg-emerald-700"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl sticky top-6">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Live Preview
              </CardTitle>
              <CardDescription>See how your widget will look</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Preview Frame */}
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-8 h-[500px] overflow-hidden border-4 border-slate-300">
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm" />
                
                {/* Sample Website Content */}
                <div className="relative z-10 space-y-4">
                  <div className="w-32 h-8 bg-slate-300 rounded animate-pulse" />
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-slate-300 rounded animate-pulse" />
                    <div className="w-3/4 h-4 bg-slate-300 rounded animate-pulse" />
                    <div className="w-5/6 h-4 bg-slate-300 rounded animate-pulse" />
                  </div>
                </div>

                {/* Widget Button Preview */}
                <button
                  className={cn(
                    "absolute shadow-2xl rounded-full p-4 transition-all hover:scale-110 z-20",
                    widgetConfig.position === 'bottom-right' && "bottom-6 right-6",
                    widgetConfig.position === 'bottom-left' && "bottom-6 left-6",
                    widgetConfig.position === 'top-right' && "top-6 right-6",
                    widgetConfig.position === 'top-left' && "top-6 left-6"
                  )}
                  style={{ backgroundColor: widgetConfig.buttonColor }}
                >
                  <MessageSquare className="w-6 h-6 text-white" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                    1
                  </div>
                </button>

                {/* Chat Window Preview */}
                <div
                  className={cn(
                    "absolute bg-white rounded-2xl shadow-2xl border w-80 transition-all z-30",
                    widgetConfig.position.includes('right') ? "right-6" : "left-6",
                    widgetConfig.position.includes('bottom') ? "bottom-24" : "top-24"
                  )}
                >
                  {/* Header */}
                  <div 
                    className="p-4 rounded-t-2xl text-white flex items-center gap-3"
                    style={{ 
                      background: `linear-gradient(135deg, ${widgetConfig.primaryColor}, ${widgetConfig.secondaryColor})`
                    }}
                  >
                    {widgetConfig.avatarUrl ? (
                      <img src={widgetConfig.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{selectedAgent?.name || 'AI Assistant'}</p>
                      <p className="text-xs opacity-90">Online now</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3 h-64 overflow-y-auto bg-slate-50">
                    <div className="flex gap-2">
                      <div 
                        className="px-4 py-2 rounded-2xl rounded-tl-sm text-white text-sm max-w-[80%]"
                        style={{ backgroundColor: widgetConfig.primaryColor }}
                      >
                        {widgetConfig.greetingMessage}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <div className="px-4 py-2 rounded-2xl rounded-tr-sm bg-white border text-sm max-w-[80%]">
                        Hello! I need help
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Type your message..." 
                        className="flex-1 text-sm"
                        disabled
                      />
                      <Button 
                        size="icon" 
                        style={{ backgroundColor: widgetConfig.buttonColor }}
                        className="text-white"
                      >
                        ▶
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Position</p>
                  <p className="font-semibold text-sm capitalize">{widgetConfig.position.replace('-', ' ')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Delay</p>
                  <p className="font-semibold text-sm">{widgetConfig.proactiveDelay}s</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Features</p>
                  <p className="font-semibold text-sm">
                    {[widgetConfig.enableVoice && 'Voice', widgetConfig.enableChat && 'Chat'].filter(Boolean).join(' + ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Integration Instructions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50">
          <CardTitle>How to Integrate</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Copy the embed code above</h4>
                <p className="text-sm text-slate-600">Click the "Copy" button on the embed code</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Paste into your website HTML</h4>
                <p className="text-sm text-slate-600">Add the code just before the closing &lt;/body&gt; tag</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Test and deploy</h4>
                <p className="text-sm text-slate-600">The widget appears immediately - test it and go live!</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WordPress/CMS Instructions */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle>Platform-Specific Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="wordpress">
            <TabsList>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="shopify">Shopify</TabsTrigger>
              <TabsTrigger value="wix">Wix</TabsTrigger>
              <TabsTrigger value="squarespace">Squarespace</TabsTrigger>
            </TabsList>
            <TabsContent value="wordpress" className="space-y-2 text-sm">
              <p className="font-medium">1. Go to Appearance → Theme Editor</p>
              <p>2. Edit footer.php or use a plugin like "Insert Headers and Footers"</p>
              <p>3. Paste the embed code before &lt;/body&gt;</p>
              <p>4. Save changes</p>
            </TabsContent>
            <TabsContent value="shopify" className="space-y-2 text-sm">
              <p className="font-medium">1. Go to Online Store → Themes</p>
              <p>2. Click Actions → Edit Code</p>
              <p>3. Open theme.liquid file</p>
              <p>4. Paste code before &lt;/body&gt;</p>
            </TabsContent>
            <TabsContent value="wix" className="space-y-2 text-sm">
              <p className="font-medium">1. Go to Settings → Custom Code</p>
              <p>2. Click "+ Add Custom Code"</p>
              <p>3. Paste the embed code</p>
              <p>4. Select "Body - End" placement</p>
            </TabsContent>
            <TabsContent value="squarespace" className="space-y-2 text-sm">
              <p className="font-medium">1. Go to Settings → Advanced → Code Injection</p>
              <p>2. Paste into "Footer" section</p>
              <p>3. Click Save</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}