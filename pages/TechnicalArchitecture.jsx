import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Server,
  Lock,
  DollarSign,
  BarChart3,
  Power,
  Globe,
  Code,
  Database,
  Zap,
  ShieldCheck,
  Phone
} from "lucide-react";

export default function TechnicalArchitecture() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Technical Architecture</h1>
        <p className="text-slate-500 mt-1">How AEVOICE widgets and voice assistants work</p>
      </div>

      <Tabs defaultValue="widget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="widget"><Globe className="w-4 h-4 mr-2" />Widget Architecture</TabsTrigger>
          <TabsTrigger value="voice"><Phone className="w-4 h-4 mr-2" />Voice System</TabsTrigger>
          <TabsTrigger value="auth"><Lock className="w-4 h-4 mr-2" />Authentication</TabsTrigger>
          <TabsTrigger value="credits"><DollarSign className="w-4 h-4 mr-2" />Credits</TabsTrigger>
          <TabsTrigger value="control"><Power className="w-4 h-4 mr-2" />Remote Control</TabsTrigger>
        </TabsList>

        {/* Widget Architecture */}
        <TabsContent value="widget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                Sri Widget to Backend Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Connection Flow:</h4>
                <ol className="text-sm text-slate-700 space-y-2 ml-4 list-decimal">
                  <li>Widget loads on customer's website via embed code</li>
                  <li>Generates unique session_id for tracking</li>
                  <li>User sends message → Frontend calls backend function</li>
                  <li>Backend function queries knowledge bases</li>
                  <li>LLM generates response with context</li>
                  <li>Response streams back to widget</li>
                </ol>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Backend Functions:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">POST</Badge>
                    <code className="text-xs bg-white px-2 py-1 rounded">/api/streamingChatResponse</code>
                    <span className="text-slate-600">- Handles chat messages with streaming</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">POST</Badge>
                    <code className="text-xs bg-white px-2 py-1 rounded">/api/captureWidgetLead</code>
                    <span className="text-slate-600">- Saves lead information</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">POST</Badge>
                    <code className="text-xs bg-white px-2 py-1 rounded">/api/autoLearnWebsite</code>
                    <span className="text-slate-600">- Crawls websites for knowledge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">POST</Badge>
                    <code className="text-xs bg-white px-2 py-1 rounded">/api/widgetRemoteControl</code>
                    <span className="text-slate-600">- Checks if widget should be active</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-2">⚠️ Key Technical Details:</h4>
                <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                  <li>No authentication required for widget users (public access)</li>
                  <li>Session tracking via unique session_id (UUID)</li>
                  <li>Backend uses <code>base44.asServiceRole</code> for elevated privileges</li>
                  <li>Knowledge bases filtered by <code>shared_with_sri: true</code></li>
                  <li>Conversation data stored in WidgetConversation entity</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice System */}
        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Twilio Voice Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Voice Call Flow:</h4>
                <ol className="text-sm text-slate-700 space-y-2 ml-4 list-decimal">
                  <li>Incoming call hits Twilio webhook with unique token</li>
                  <li>Webhook looks up PhoneNumber entity by token or To number</li>
                  <li>Retrieves associated Agent configuration</li>
                  <li>Agent greets caller with configured voice</li>
                  <li>Speech recognition converts voice to text</li>
                  <li>LLM processes with knowledge base context</li>
                  <li>Response converted to speech via TTS</li>
                  <li>Call continues until hangup or timeout</li>
                </ol>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Webhook Configuration:</h4>
                <code className="text-xs bg-white px-3 py-2 rounded block mb-2">
                  https://aevoice.base44.app/api/apps/[APP_ID]/functions/twilioWebhook?token=[WEBHOOK_TOKEN]
                </code>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><strong>Authentication:</strong> Via webhook_token (stored in PhoneNumber entity)</p>
                  <p><strong>Fallback:</strong> If token lookup fails, tries To number (number_e164)</p>
                  <p><strong>Provider Support:</strong> Twilio, with 25+ Polly voices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authentication */}
        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-600" />
                Authentication & Security Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Widget (Public)</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>✓ No user authentication required</li>
                    <li>✓ Session tracked by UUID</li>
                    <li>✓ IP-based rate limiting</li>
                    <li>✓ Backend uses service role</li>
                  </ul>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Voice (Token-Based)</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>✓ Webhook token validation</li>
                    <li>✓ PhoneNumber lookup by token</li>
                    <li>✓ Agent authorization check</li>
                    <li>✓ Service role for DB operations</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Service Role Operations:</h4>
                <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
{`// Backend functions use service role for admin operations
const base44 = createClientFromRequest(req);

// Service role - full database access
await base44.asServiceRole.entities.Agent.filter({...});
await base44.asServiceRole.entities.KnowledgeBase.filter({...});

// This allows widgets/webhooks to work without user login`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Credit Deduction & LLM Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">How Credits are Deducted:</h4>
                <ol className="text-sm text-slate-700 space-y-2 ml-4 list-decimal">
                  <li>
                    <strong>LLM Calls:</strong> When backend calls 
                    <code className="bg-white px-1 rounded mx-1">base44.integrations.Core.InvokeLLM</code>
                    the platform automatically deducts credits
                  </li>
                  <li>
                    <strong>Voice Minutes:</strong> Twilio reports call duration → platform calculates cost
                  </li>
                  <li>
                    <strong>Wallet Entity:</strong> Each Client has a Wallet with credits_balance
                  </li>
                  <li>
                    <strong>Automatic Deduction:</strong> Platform intercepts API calls and decrements balance
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Usage Tracking:</h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><strong>WidgetAnalytics Entity:</strong> Tracks daily metrics</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>total_conversations</li>
                    <li>leads_captured</li>
                    <li>average_response_time_ms</li>
                    <li>total_messages</li>
                  </ul>
                  <p className="mt-2"><strong>CallSession Entity:</strong> Tracks voice usage</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>duration_seconds</li>
                    <li>usage_stats (LLM tokens, TTS chars)</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Pricing Model:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-white rounded border">
                    <p className="font-medium text-slate-900">Voice Calls</p>
                    <p className="text-slate-600">$0.15 per minute</p>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <p className="font-medium text-slate-900">Widget Chat</p>
                    <p className="text-slate-600">Included in plan</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remote Control */}
        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="w-5 h-5 text-red-600" />
                Remote Widget Control & Kill Switch
              </CardTitle>
              <CardDescription>
                How to remotely disable or delete deployed widgets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2">✅ YES - You Can Remotely Control Widgets!</h4>
                <p className="text-sm text-red-800">
                  All deployed widgets check their status on initialization and can be disabled instantly from the admin dashboard.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">Widget Embed Code Structure:</h4>
                <pre className="text-xs bg-white p-3 rounded overflow-x-auto border">
{`<!-- Embedded on customer's website -->
<script>
  window.aevoiceConfig = {
    agentId: "agent_abc123",
    clientId: "client_xyz789",
    position: "bottom-right"
  };
</script>
<script src="https://cdn.aevoice.ai/widget.js" async></script>`}</pre>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">Remote Control Logic:</h4>
                <pre className="text-xs bg-white p-3 rounded overflow-x-auto border">
{`// Inside widget.js (your deployed CDN file)
async function initWidget(agentId, clientId) {
  // Check if widget should be active
  const status = await fetch('/api/widgetRemoteControl', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId, client_id: clientId })
  }).then(r => r.json());

  if (!status.active) {
    console.log('Widget disabled:', status.reason);
    return; // Don't render widget
  }

  // Widget is active - render Sri
  renderSriAssistant(status.agent, status.client);
}`}</pre>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">How to Disable a Widget:</h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><strong>Method 1: Deactivate Agent</strong></p>
                  <pre className="bg-white p-2 rounded text-xs">
{`await base44.entities.Agent.update(agentId, { 
  status: 'inactive' 
})`}</pre>
                  
                  <p className="mt-3"><strong>Method 2: Suspend Client</strong></p>
                  <pre className="bg-white p-2 rounded text-xs">
{`await base44.entities.Client.update(clientId, { 
  status: 'suspended' 
})`}</pre>

                  <p className="mt-3"><strong>Method 3: Delete Agent (Permanent)</strong></p>
                  <pre className="bg-white p-2 rounded text-xs">
{`await base44.entities.Agent.delete(agentId)`}</pre>
                </div>
              </div>

              <div className="p-4 bg-cyan-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Automatic Deactivation Triggers:</h4>
                <ul className="text-sm text-slate-700 ml-4 list-disc space-y-1">
                  <li>Client credits balance reaches $0</li>
                  <li>Agent status changed to 'inactive' or 'draft'</li>
                  <li>Client account suspended or deleted</li>
                  <li>Knowledge base shared_with_sri set to false</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Widget Remote Control API</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Badge className="mb-2">POST /api/widgetRemoteControl</Badge>
                  <p className="text-sm text-slate-600 mb-2">Check if widget should be active</p>
                  <pre className="text-xs bg-slate-50 p-3 rounded">
{`// Request
{
  "agent_id": "abc123",
  "client_id": "xyz789"
}

// Response (Active)
{
  "active": true,
  "agent": {
    "id": "abc123",
    "name": "Sri Assistant",
    "greeting_message": "Hi! How can I help?"
  }
}

// Response (Disabled)
{
  "active": false,
  "reason": "Client account is suspended",
  "disabled_at": "2025-12-24T10:30:00Z"
}`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authentication Details */}
        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Architecture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold mb-2">Backend Function Auth Pattern:</h4>
                <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
{`import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // For authenticated endpoints (user must be logged in)
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // For public endpoints (widgets, webhooks)
  // Use base44.asServiceRole for database access
  const data = await base44.asServiceRole.entities.Something.list();
  
  return Response.json({ success: true });
});`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits System */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit & Usage Tracking System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold mb-2">Wallet Entity Schema:</h4>
                <pre className="text-xs bg-white p-3 rounded">
{`{
  "owner_type": "client",
  "owner_id": "client_abc123",
  "credits_balance": 500,  // 500 minutes remaining
  "currency": "USD",
  "auto_recharge": {
    "enabled": true,
    "threshold": 50,
    "amount": 200
  }
}`}</pre>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Credit Deduction Flow:</h4>
                <div className="text-sm text-slate-700 space-y-2">
                  <p>1. Backend function calls <code>base44.integrations.Core.InvokeLLM</code></p>
                  <p>2. Platform intercepts the call</p>
                  <p>3. Identifies owner (Client) from service role context</p>
                  <p>4. Calculates cost (tokens used × rate)</p>
                  <p>5. Updates Wallet.credits_balance</p>
                  <p>6. If balance &lt; threshold, triggers auto-recharge or alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Reference */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            Quick Reference: Critical Entities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p><strong className="text-indigo-700">Agent:</strong> AI configuration (voice, language, prompts)</p>
              <p><strong className="text-indigo-700">Client:</strong> Business account (1 per user)</p>
              <p><strong className="text-indigo-700">PhoneNumber:</strong> Links Twilio number to Agent</p>
              <p><strong className="text-indigo-700">KnowledgeBase:</strong> Training data collection</p>
            </div>
            <div className="space-y-2">
              <p><strong className="text-purple-700">KnowledgeChunk:</strong> Individual knowledge entries</p>
              <p><strong className="text-purple-700">Wallet:</strong> Credit balance per Client</p>
              <p><strong className="text-purple-700">WidgetConversation:</strong> Chat session data</p>
              <p><strong className="text-purple-700">CallSession:</strong> Voice call records</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}