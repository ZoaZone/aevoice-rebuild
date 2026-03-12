import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  CheckCircle2, 
  Globe, 
  Phone, 
  MessageSquare, 
  Sparkles,
  Key,
  Code,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function APIIntegration() {
  const [copied, setCopied] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

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

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ['phoneNumbers'],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.PhoneNumber.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient,
  });

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(""), 2000);
  };

  const apiKey = currentClient?.id || "YOUR_API_KEY";
  const agentIdValue = selectedAgent || agents[0]?.id || "YOUR_AGENT_ID";
  const phoneValue = selectedPhone || phoneNumbers[0]?.number_e164 || "YOUR_PHONE_NUMBER";

  const sriEmbedCode = `<!-- Sri Chatbot - AEVOICE.AI -->
<script>
(function() {
  window.AEVOICE_SRI_CONFIG = {
    apiKey: '${apiKey}',
    agentId: '${agentIdValue}',
    position: 'bottom-right',
    theme: 'purple',
    autoSync: ${websiteUrl ? 'true' : 'false'},
    knowledgeUrl: '${websiteUrl || 'auto'}'
  };
  const script = document.createElement('script');
  script.src = 'https://cdn.aevoice.ai/sri-v1.min.js';
  script.async = true;
  document.body.appendChild(script);
})();
</script>`;

  const aevaVoiceCode = `<!-- AEVA Voice Assistant - AEVOICE.AI -->
<script>
(function() {
  window.AEVOICE_AEVA_CONFIG = {
    apiKey: '${apiKey}',
    agentId: '${agentIdValue}',
    phoneNumber: '${phoneValue}',
    provider: 'twilio'
  };
  const script = document.createElement('script');
  script.src = 'https://cdn.aevoice.ai/aeva-v1.min.js';
  script.async = true;
  document.body.appendChild(script);
})();
</script>`;

  const combinedCode = `<!-- AEVOICE Complete Suite (Sri + AEVA) -->
<script>
(function() {
  window.AEVOICE_CONFIG = {
    apiKey: '${apiKey}',
    agentId: '${agentIdValue}',
    phoneNumber: '${phoneValue}',
    modules: {
      sri: { enabled: true, theme: 'purple' },
      aeva: { enabled: true, provider: 'twilio' }
    },
    autoSyncKnowledge: ${websiteUrl ? 'true' : 'false'},
    knowledgeUrl: '${websiteUrl || 'auto'}'
  };
  const script = document.createElement('script');
  script.src = 'https://cdn.aevoice.ai/complete-v1.min.js';
  script.async = true;
  document.body.appendChild(script);
})();
</script>`;

  const restApiExamples = {
    createAgent: `POST https://api.aevoice.ai/v1/agents
Authorization: Bearer ${apiKey}
Content-Type: application/json

{
  "name": "My Voice Agent",
  "language": "en-US",
  "voice_provider": "elevenlabs",
  "system_prompt": "You are a helpful assistant"
}`,
    
    sendMessage: `POST https://api.aevoice.ai/v1/agents/${agentIdValue}/chat
Authorization: Bearer ${apiKey}
Content-Type: application/json

{
  "message": "Hello, how can I book an appointment?",
  "user_id": "user_123"
}`,

    makeCall: `POST https://api.aevoice.ai/v1/calls
Authorization: Bearer ${apiKey}
Content-Type: application/json

{
  "agent_id": "${agentIdValue}",
  "to_number": "+1234567890",
  "from_number": "${phoneValue}"
}`
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">API Integration</h1>
        <p className="text-slate-500 mt-2">
          Integrate AEVOICE into any website or application with our APIs
        </p>
      </div>

      {/* Configuration */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            Your Integration Settings
          </CardTitle>
          <CardDescription>
            Copy these values to integrate AEVOICE into your website or application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Keys Info Box */}
          <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              API Keys Explained
            </h4>
            <div className="text-sm space-y-2 text-slate-700">
              <p><strong>AEVOICE_API_KEY:</strong> Your unique client API key (shown below) - use this in all integrations</p>
              <p><strong>APP_URL:</strong> Your app base URL is <code className="bg-cyan-100 px-1 rounded">https://aevoice.ai</code></p>
              <p className="text-xs text-slate-600 mt-2">
                ⚠️ Note: OPENAI_KEY and ANTHROPIC_KEY are internal platform secrets - you don't need them for integration
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>AEVOICE_API_KEY</Label>
              <div className="flex gap-2 mt-2">
                <Input value={apiKey} readOnly className="font-mono text-xs" />
                <Button 
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(apiKey, "API Key")}
                >
                  {copied === "API Key" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Select Agent</Label>
              <select 
                className="w-full mt-2 px-3 py-2 border rounded-md"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">Choose agent...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Website URL (Optional)</Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sri" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sri">
            <MessageSquare className="w-4 h-4 mr-2" />
            Sri Embed
          </TabsTrigger>
          <TabsTrigger value="aeva">
            <Phone className="w-4 h-4 mr-2" />
            AEVA Embed
          </TabsTrigger>
          <TabsTrigger value="combined">
            <Sparkles className="w-4 h-4 mr-2" />
            Combined
          </TabsTrigger>
          <TabsTrigger value="rest">
            <Code className="w-4 h-4 mr-2" />
            REST API
          </TabsTrigger>
        </TabsList>

        {/* Sri Chatbot */}
        <TabsContent value="sri">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sri - Website Chatbot</CardTitle>
                  <CardDescription>Add text & voice chat widget to your website</CardDescription>
                </div>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  Chatbot
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-green-400 rounded-lg p-4 overflow-x-auto text-sm font-mono">
                  <code>{sriEmbedCode}</code>
                </pre>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(sriEmbedCode, "Sri Code")}
                  className="absolute top-3 right-3 bg-purple-600 hover:bg-purple-700"
                >
                  {copied === "Sri Code" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                <h4 className="font-semibold text-slate-900">Features:</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li>✓ Text chat with AI responses</li>
                  <li>✓ Voice input/output support</li>
                  <li>✓ FAQ quick answers</li>
                  <li>✓ Real-time website content learning</li>
                  <li>✓ Multi-language support</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AEVA Voice */}
        <TabsContent value="aeva">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AEVA - Voice Call Assistant</CardTitle>
                  <CardDescription>AI phone receptionist integration</CardDescription>
                </div>
                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  Voice Calls
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-cyan-400 rounded-lg p-4 overflow-x-auto text-sm font-mono">
                  <code>{aevaVoiceCode}</code>
                </pre>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(aevaVoiceCode, "AEVA Code")}
                  className="absolute top-3 right-3 bg-cyan-600 hover:bg-cyan-700"
                >
                  {copied === "AEVA Code" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200 space-y-2">
                <h4 className="font-semibold text-slate-900">Features:</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li>✓ Handles incoming phone calls 24/7</li>
                  <li>✓ Books appointments automatically</li>
                  <li>✓ Transfers to human when needed</li>
                  <li>✓ Call recording & transcription</li>
                  <li>✓ 50+ language support</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Combined */}
        <TabsContent value="combined">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Complete AEVOICE Suite</CardTitle>
                  <CardDescription>Sri + AEVA + Auto Knowledge Sync</CardDescription>
                </div>
                <Badge className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white">
                  Full Integration
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-emerald-400 rounded-lg p-4 overflow-x-auto text-sm font-mono">
                  <code>{combinedCode}</code>
                </pre>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(combinedCode, "Combined Code")}
                  className="absolute top-3 right-3 bg-emerald-600 hover:bg-emerald-700"
                >
                  {copied === "Combined Code" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 rounded-lg border-2 border-purple-200">
                <h4 className="font-semibold text-slate-900 mb-3">Complete Feature Set:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium text-purple-700">Sri Chatbot:</p>
                    <ul className="space-y-1 text-slate-700">
                      <li>✓ Text & voice chat widget</li>
                      <li>✓ FAQ integration</li>
                      <li>✓ Multi-language support</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-cyan-700">AEVA Voice:</p>
                    <ul className="space-y-1 text-slate-700">
                      <li>✓ 24/7 call handling</li>
                      <li>✓ Appointment booking</li>
                      <li>✓ Call analytics</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    Auto Knowledge Sync
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Automatically learns from your website content in real-time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REST API */}
        <TabsContent value="rest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>REST API Endpoints</CardTitle>
              <CardDescription>Direct API access for custom integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Base URL */}
              <div>
                <Label>Base URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    value="https://api.aevoice.ai/v1" 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard("https://api.aevoice.ai/v1", "Base URL")}
                  >
                    {copied === "Base URL" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Create Agent */}
              <div>
                <Label className="text-base font-semibold">1. Create Agent</Label>
                <div className="relative mt-2">
                  <pre className="bg-slate-900 text-emerald-400 rounded-lg p-4 overflow-x-auto text-xs font-mono">
                    <code>{restApiExamples.createAgent}</code>
                  </pre>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(restApiExamples.createAgent, "Create Agent")}
                    className="absolute top-3 right-3"
                  >
                    {copied === "Create Agent" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Send Message */}
              <div>
                <Label className="text-base font-semibold">2. Send Message to Agent</Label>
                <div className="relative mt-2">
                  <pre className="bg-slate-900 text-purple-400 rounded-lg p-4 overflow-x-auto text-xs font-mono">
                    <code>{restApiExamples.sendMessage}</code>
                  </pre>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(restApiExamples.sendMessage, "Send Message")}
                    className="absolute top-3 right-3"
                  >
                    {copied === "Send Message" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Make Call */}
              <div>
                <Label className="text-base font-semibold">3. Make Outbound Call</Label>
                <div className="relative mt-2">
                  <pre className="bg-slate-900 text-cyan-400 rounded-lg p-4 overflow-x-auto text-xs font-mono">
                    <code>{restApiExamples.makeCall}</code>
                  </pre>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(restApiExamples.makeCall, "Make Call")}
                    className="absolute top-3 right-3"
                  >
                    {copied === "Make Call" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Documentation Link */}
          <Card className="border-0 shadow-lg bg-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">Full API Documentation</h3>
                  <p className="text-slate-400 text-sm">
                    Complete reference with all endpoints, parameters, and examples
                  </p>
                </div>
                <a href="https://docs.aevoice.ai/api" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Globe className="w-4 h-4 mr-2" />
                    View Docs
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration Steps */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50">
          <CardTitle>Integration Steps</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Copy Your Integration Code</h4>
                <p className="text-sm text-slate-600 mt-1">
                  Choose Sri, AEVA, or Combined integration from the tabs above
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Paste Before Closing &lt;/body&gt; Tag</h4>
                <p className="text-sm text-slate-600 mt-1">
                  Add the code snippet to your website's HTML before the closing body tag
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Test & Deploy</h4>
                <p className="text-sm text-slate-600 mt-1">
                  Sri/AEVA will appear on your site immediately. Test the chat and voice features!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Zap className="w-10 h-10 text-cyan-600" />
            <div>
              <h4 className="font-semibold text-slate-900">Need Help?</h4>
              <p className="text-sm text-slate-600">
                Contact us at <a href="mailto:care@aevoice.ai" className="text-cyan-600 hover:underline">care@aevoice.ai</a> for integration support
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}