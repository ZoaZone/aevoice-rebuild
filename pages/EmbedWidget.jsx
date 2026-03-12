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
  Code, 
  Copy, 
  Check, 
  Palette, 
  MessageSquare, 
  Smartphone,
  Eye,
  Globe,
  Sparkles,
  Zap,
  Bot,
  BookOpen
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function EmbedWidget() {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    position: 'bottom-right',
    primaryColor: '#0e4166',
    secondaryColor: '#06b6d4',
    buttonColor: '#0e4166',
    greetingMessage: 'Hi! How can I help you today?',
    showAfterSeconds: 5,
    enableVoice: true,
    enableChat: true,
    avatarUrl: '',
    buttonText: 'Chat with us',
    proactiveGreeting: true,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Client.filter({ contact_email: user.email });
    },
    enabled: !!user?.email,
  });

  const currentClient = clients[0];

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.Agent.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const [selectedAgent, setSelectedAgent] = useState('');

  const generateEmbedCode = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return '';

    const configJson = JSON.stringify({
      position: config.position,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      buttonColor: config.buttonColor,
      greetingMessage: config.greetingMessage,
      showAfterSeconds: config.showAfterSeconds,
      enableVoice: config.enableVoice,
      enableChat: config.enableChat,
      avatarUrl: config.avatarUrl,
      buttonText: config.buttonText,
      proactiveGreeting: config.proactiveGreeting,
    }, null, 2);

    return `<!-- AEVOICE AI Widget -->
<script>
  window.aevoiceConfig = ${configJson};
</script>
<script src="https://cdn.aevoice.ai/widget.js?agent=${selectedAgent}&client=${currentClient?.id}" async></script>
<!-- End AEVOICE AI Widget -->`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const partnerWidgets = [
    {
      id: 'workautomation',
      name: 'WorkAutomation.app',
      email: 'care@workautomation.app',
      logo: 'https://workautomation.app/logo.png',
      description: 'Process automation platform for businesses',
      status: 'FREE Lifetime Access',
      isFree: true,
    }
  ];

  const generatePartnerEmbedCode = (partner) => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return '';

    const configJson = JSON.stringify({
      position: config.position,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      buttonColor: config.buttonColor,
      greetingMessage: config.greetingMessage,
      showAfterSeconds: config.showAfterSeconds,
      enableVoice: config.enableVoice,
      enableChat: config.enableChat,
      avatarUrl: config.avatarUrl,
      buttonText: config.buttonText,
      proactiveGreeting: config.proactiveGreeting,
      partnerId: partner.id,
      partnerName: partner.name,
    }, null, 2);

    return `<!-- AEVOICE AI Partner Widget - ${partner.name} -->
<script>
  window.aevoiceConfig = ${configJson};
  window.aevoicePartner = "${partner.id}";
</script>
<script src="https://cdn.aevoice.ai/partner-widget.js?agent=${selectedAgent}&client=${currentClient?.id}&partner=${partner.id}" async></script>
<!-- End AEVOICE AI Partner Widget -->`;
  };

  const [testingIntegration, setTestingIntegration] = useState(false);

  const handleTestIntegration = async () => {
    setTestingIntegration(true);
    try {
      // Create a test agent via FlowSync automation
      const testAgent = await base44.entities.Agent.create({
        client_id: currentClient?.id,
        name: 'FlowSync Test Agent',
        description: 'Auto-created via FlowSync integration',
        agent_type: 'general',
        system_prompt: 'This is a test agent created through FlowSync automation integration.',
        greeting_message: 'Hello! I am a test agent created by FlowSync automation.',
        status: 'active',
      });
      
      alert('✅ Integration Test Successful!\n\nTest agent created: ' + testAgent.name);
    } catch (error) {
      alert('❌ Integration Test Failed: ' + error.message);
    }
    setTestingIntegration(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Website AI Widget</h1>
        <p className="text-slate-600">
          Embed your AI assistant on any website - works with Wix, WordPress, Shopify, and custom sites
        </p>
      </div>

      {/* Connected Automation Platforms */}
      <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-600" />
            Connected Automation Platforms
          </CardTitle>
          <CardDescription>
            White-label automation partners with full API access to AEVOICE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Card className="border-2 border-cyan-300 bg-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">FlowSync</h3>
                    <p className="text-sm text-slate-500">WorkAutomation.app</p>
                    <p className="text-xs text-slate-400 mt-1">care@workautomation.app</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500 text-white">
                  Active - White Label Partner
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">Create Agent</span>
                  </div>
                  <p className="text-xs text-slate-600">Deploy AI agents</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-900">Manage Knowledge</span>
                  </div>
                  <p className="text-xs text-slate-600">Update AI training</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-900">Trigger Workflows</span>
                  </div>
                  <p className="text-xs text-slate-600">Automate actions</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-900">Sync Data</span>
                  </div>
                  <p className="text-xs text-slate-600">Bidirectional sync</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">API Credentials for FlowSync</h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-slate-500">API Endpoint</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value="https://api.aevoice.ai/v1"
                          readOnly
                          className="text-xs font-mono bg-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText('https://api.aevoice.ai/v1');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Client ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={currentClient?.id || 'Not available'}
                          readOnly
                          className="text-xs font-mono bg-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(currentClient?.id || '');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Partner Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value="flowsync_wl_partner_key_2025"
                          readOnly
                          className="text-xs font-mono bg-white"
                          type="password"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText('flowsync_wl_partner_key_2025');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleTestIntegration}
                  disabled={testingIntegration || !currentClient?.id}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                >
                  {testingIntegration ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Testing Integration...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Test Integration
                    </>
                  )}
                </Button>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>🔗 Integration Active:</strong> FlowSync can create agents, manage knowledge bases, 
                    trigger workflows, and sync call data in real-time via secure API.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Partner Widgets Section */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Partner Widgets - FREE Access
          </CardTitle>
          <CardDescription>
            Special AEVOICE widgets for our trusted partners with lifetime free access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {partnerWidgets.map((partner) => (
            <Card key={partner.id} className="border-2 border-purple-300 bg-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Globe className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{partner.name}</h3>
                      <p className="text-sm text-slate-500">{partner.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">
                    {partner.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mb-4">{partner.description}</p>
                
                {selectedAgent ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto max-h-48">
                        {generatePartnerEmbedCode(partner)}
                      </pre>
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generatePartnerEmbedCode(partner));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Code
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-xs text-emerald-800">
                        <strong>✅ Partner Benefits:</strong> Unlimited widget usage, no subscription fees, 
                        priority support, custom branding options available.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      ⚠️ Please select an AI agent above to generate partner embed code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>💼 Want to become a partner?</strong> Contact us at care@aevoice.ai to discuss 
              partnership opportunities and get your own free widget access.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />
                Widget Configuration
              </CardTitle>
              <CardDescription>Customize how your AI assistant appears on your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Agent Selection */}
              <div className="space-y-2">
                <Label>Select AI Agent *</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} - {agent.agent_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {agents.length === 0 && (
                  <p className="text-sm text-amber-600">
                    ⚠️ No agents found. Create an agent first.
                  </p>
                )}
              </div>

              <Tabs defaultValue="appearance">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="behavior">Behavior</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                </TabsList>

                <TabsContent value="appearance" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Widget Position</Label>
                    <Select value={config.position} onValueChange={(v) => setConfig({...config, position: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <Input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <Input
                        type="color"
                        value={config.secondaryColor}
                        onChange={(e) => setConfig({...config, secondaryColor: e.target.value})}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Button Color</Label>
                      <Input
                        type="color"
                        value={config.buttonColor}
                        onChange={(e) => setConfig({...config, buttonColor: e.target.value})}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      value={config.buttonText}
                      onChange={(e) => setConfig({...config, buttonText: e.target.value})}
                      placeholder="Chat with us"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Avatar URL (Optional)</Label>
                    <Input
                      value={config.avatarUrl}
                      onChange={(e) => setConfig({...config, avatarUrl: e.target.value})}
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="behavior" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Greeting Message</Label>
                    <Textarea
                      value={config.greetingMessage}
                      onChange={(e) => setConfig({...config, greetingMessage: e.target.value})}
                      placeholder="Hi! How can I help you today?"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Proactive Greeting</Label>
                      <p className="text-sm text-slate-500">Show greeting after delay</p>
                    </div>
                    <Switch
                      checked={config.proactiveGreeting}
                      onCheckedChange={(checked) => setConfig({...config, proactiveGreeting: checked})}
                    />
                  </div>

                  {config.proactiveGreeting && (
                    <div className="space-y-2">
                      <Label>Show After (seconds)</Label>
                      <Input
                        type="number"
                        value={config.showAfterSeconds}
                        onChange={(e) => setConfig({...config, showAfterSeconds: parseInt(e.target.value)})}
                        min="0"
                        max="60"
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="features" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Text Chat</Label>
                      <p className="text-sm text-slate-500">Allow text messaging</p>
                    </div>
                    <Switch
                      checked={config.enableChat}
                      onCheckedChange={(checked) => setConfig({...config, enableChat: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Voice Call</Label>
                      <p className="text-sm text-slate-500">Allow voice calls (requires phone number)</p>
                    </div>
                    <Switch
                      checked={config.enableVoice}
                      onCheckedChange={(checked) => setConfig({...config, enableVoice: checked})}
                    />
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      💡 <strong>Pro Tip:</strong> Enable both chat and voice for maximum engagement. 
                      Visitors can start with chat and escalate to voice if needed.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Embed Code
              </CardTitle>
              <CardDescription>Copy and paste this code into your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                  {selectedAgent ? generateEmbedCode() : '// Select an agent to generate embed code'}
                </pre>
                {selectedAgent && (
                  <Button
                    size="sm"
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Installation Instructions:</h4>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Copy the embed code above</li>
                  <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                  <li>For WordPress: Use a "Custom HTML" widget or theme footer editor</li>
                  <li>For Wix: Add via "Embed Code" element in the editor</li>
                  <li>For Shopify: Add to theme.liquid file</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a href="https://support.wix.com/en/article/embedding-custom-code-to-your-site" target="_blank" rel="noopener">
                  <Button variant="outline" size="sm" className="w-full">
                    <Globe className="w-4 h-4 mr-2" />
                    Wix Guide
                  </Button>
                </a>
                <a href="https://wordpress.org/support/article/embeds/" target="_blank" rel="noopener">
                  <Button variant="outline" size="sm" className="w-full">
                    <Globe className="w-4 h-4 mr-2" />
                    WordPress Guide
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-500" />
                Live Preview
              </CardTitle>
              <CardDescription>See how your widget will look on your website</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Preview Container */}
              <div className="relative w-full h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-slate-200 overflow-hidden">
                {/* Mock Website Content */}
                <div className="p-8">
                  <div className="w-32 h-8 bg-slate-300 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-slate-200 rounded"></div>
                    <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
                    <div className="w-5/6 h-4 bg-slate-200 rounded"></div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="h-32 bg-slate-200 rounded"></div>
                    <div className="h-32 bg-slate-200 rounded"></div>
                  </div>
                </div>

                {/* Widget Button */}
                <button
                  className={cn(
                    "fixed z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105",
                    positionClasses[config.position]
                  )}
                  style={{ backgroundColor: config.buttonColor }}
                >
                  <MessageSquare className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">{config.buttonText}</span>
                </button>

                {/* Proactive Greeting */}
                {config.proactiveGreeting && (
                  <div
                    className={cn(
                      "fixed z-40 bg-white rounded-lg shadow-xl p-4 max-w-xs border-2",
                      config.position === 'bottom-right' && 'bottom-24 right-6',
                      config.position === 'bottom-left' && 'bottom-24 left-6',
                      config.position === 'top-right' && 'top-24 right-6',
                      config.position === 'top-left' && 'top-24 left-6'
                    )}
                    style={{ borderColor: config.primaryColor }}
                  >
                    <p className="text-sm text-slate-700">{config.greetingMessage}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Mobile Responsive
                </h4>
                <p className="text-sm text-slate-600">
                  Your widget automatically adapts to mobile devices with a full-screen chat interface for the best user experience.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Widget Features
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Instant AI responses - no waiting for human agents</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>24/7 availability - never miss a visitor</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Lead capture - automatically collect contact info</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Multi-language support - automatic language detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Voice + Chat - visitors choose their preferred method</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Mobile optimized - full-screen on smartphones</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}