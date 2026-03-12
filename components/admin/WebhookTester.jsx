import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, Play, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";

export default function WebhookTester({ phoneNumber }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const webhookUrl = `https://aevoice.base44.app/api/functions/twilioWebhook?token=${phoneNumber.webhook_token}`;

  const testWebhook = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          CallSid: 'TEST_' + Date.now(),
          From: '+1234567890',
          To: phoneNumber.number_e164,
          Direction: 'inbound',
          CallerName: 'Test Caller'
        })
      });

      const text = await response.text();
      
      setResult({
        success: response.ok,
        status: response.status,
        body: text
      });

      if (response.ok && text.includes('<Response>')) {
        toast.success('Webhook is working correctly!');
      } else {
        toast.error('Webhook returned unexpected response');
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
      toast.error('Webhook test failed: ' + error.message);
    }

    setTesting(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied!');
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Webhook Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Twilio Voice Webhook URL</Label>
          <div className="flex gap-2">
            <Input 
              value={webhookUrl}
              readOnly
              className="font-mono text-xs bg-white"
            />
            <Button size="sm" variant="outline" onClick={copyUrl}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Use this URL in Twilio Console → Phone Numbers → {phoneNumber.number_e164} → Voice Configuration
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={testWebhook} 
            disabled={testing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-3 h-3 mr-2" />
            {testing ? 'Testing...' : 'Test Webhook'}
          </Button>
        </div>

        {result && (
          <div className={`p-3 rounded-lg border text-xs ${
            result.success 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={result.success ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                {result.success ? 'Success' : 'Failed'}
              </span>
              <Badge variant="outline" className="ml-auto">
                HTTP {result.status}
              </Badge>
            </div>
            <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
              {result.body || result.error}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}