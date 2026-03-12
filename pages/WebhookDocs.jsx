import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code,
  Globe,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Play
} from "lucide-react";
import { toast } from "sonner";

export default function WebhookDocs() {
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    event_type: "lead_captured",
    target_url: "",
    secret_key: ""
  });

  const queryClient = useQueryClient();

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

  const { data: webhooks = [] } = useQuery({
    queryKey: ['webhooks', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.CRMWebhook.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const createWebhookMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMWebhook.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setShowAddWebhook(false);
      setNewWebhook({ name: "", event_type: "lead_captured", target_url: "", secret_key: "" });
      toast.success("Webhook created!");
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id) => base44.entities.CRMWebhook.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success("Webhook deleted");
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const examplePayload = {
    event_type: "lead_captured",
    timestamp: 1735000000000,
    data: {
      customer_name: "John Doe",
      customer_email: "john@example.com",
      customer_phone: "+15551234567",
      source: "voice_call",
      call_session_id: "call_12345"
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">CRM Webhook Integration</h1>
        <p className="text-slate-600 mt-1">Connect AEVOICE to your CRM with real-time webhooks</p>
      </div>

      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">Your Webhooks</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
          <TabsTrigger value="examples">Code Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Webhooks</CardTitle>
                  <CardDescription>Configure webhooks to send data to your CRM</CardDescription>
                </div>
                <Button onClick={() => setShowAddWebhook(!showAddWebhook)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddWebhook && (
                <Card className="border-2 border-indigo-200 bg-indigo-50/30 mb-4">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid gap-2">
                      <Label>Webhook Name</Label>
                      <Input
                        placeholder="e.g., Send to Salesforce"
                        value={newWebhook.name}
                        onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Event Type</Label>
                      <select
                        className="w-full p-2 border rounded-lg"
                        value={newWebhook.event_type}
                        onChange={(e) => setNewWebhook({ ...newWebhook, event_type: e.target.value })}
                      >
                        <option value="lead_captured">Lead Captured</option>
                        <option value="call_completed">Call Completed</option>
                        <option value="appointment_booked">Appointment Booked</option>
                        <option value="form_submitted">Form Submitted</option>
                        <option value="payment_received">Payment Received</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Target URL</Label>
                      <Input
                        placeholder="https://your-crm.com/webhooks/aevoice"
                        value={newWebhook.target_url}
                        onChange={(e) => setNewWebhook({ ...newWebhook, target_url: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Secret Key (for signature validation)</Label>
                      <Input
                        placeholder="your-secret-key"
                        value={newWebhook.secret_key}
                        onChange={(e) => setNewWebhook({ ...newWebhook, secret_key: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => createWebhookMutation.mutate({
                        ...newWebhook,
                        client_id: currentClient.id,
                        active: true
                      })}
                      disabled={!newWebhook.name || !newWebhook.target_url || createWebhookMutation.isPending}
                      className="w-full"
                    >
                      Create Webhook
                    </Button>
                  </CardContent>
                </Card>
              )}

              {webhooks.length > 0 ? (
                <div className="space-y-3">
                  {webhooks.map(webhook => (
                    <div key={webhook.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{webhook.name}</h4>
                            <Badge className={webhook.active ? 'bg-emerald-500' : 'bg-slate-400'}>
                              {webhook.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{webhook.target_url}</p>
                          <div className="flex gap-3 text-xs text-slate-500">
                            <span className="capitalize">{webhook.event_type?.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{webhook.success_count || 0} success</span>
                            <span>•</span>
                            <span>{webhook.failure_count || 0} failed</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showAddWebhook && (
                <div className="text-center py-8 text-slate-500">
                  No webhooks configured. Click "Add Webhook" to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { event: "lead_captured", desc: "When a new lead is captured from a call or form" },
                { event: "call_completed", desc: "When an AI agent call is completed" },
                { event: "appointment_booked", desc: "When an appointment is scheduled" },
                { event: "form_submitted", desc: "When a website form is submitted" },
                { event: "payment_received", desc: "When a payment is processed" },
              ].map(item => (
                <div key={item.event} className="p-4 bg-slate-50 rounded-lg">
                  <code className="text-sm font-mono text-indigo-600">{item.event}</code>
                  <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payload Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(JSON.stringify(examplePayload, null, 2))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(examplePayload, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signature Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Each webhook request includes HMAC SHA256 signature in headers:
              </p>
              <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono">
                X-Webhook-Signature: {'{sha256_hex_signature}'}
                <br />
                X-Webhook-Timestamp: {'{unix_timestamp}'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle>Node.js Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`const crypto = require('crypto');

app.post('/webhooks/aevoice', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', 'YOUR_SECRET_KEY');
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the webhook
  const { event_type, data } = req.body;
  
  if (event_type === 'lead_captured') {
    // Add lead to your CRM
    console.log('New lead:', data.customer_email);
  }
  
  res.status(200).send('OK');
});`)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
{`const crypto = require('crypto');

app.post('/webhooks/aevoice', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', 'YOUR_SECRET_KEY');
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the webhook
  const { event_type, data } = req.body;
  
  if (event_type === 'lead_captured') {
    // Add lead to your CRM
    console.log('New lead:', data.customer_email);
  }
  
  res.status(200).send('OK');
});`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}