import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Building2,
  Palette,
  Globe,
  Bell,
  Shield,
  Key,
  Users,
  Webhook,
  Save,
  Upload,
  Check,
  AlertTriangle,
  Link2,
  Mail,
  Phone,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => base44.entities.Agency.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const agency = agencies[0];

  const [agencyData, setAgencyData] = useState({
    name: agency?.name || "",
    primary_email: agency?.primary_email || "",
    custom_domain: agency?.custom_domain || "",
    theme_config: agency?.theme_config || {
      primary_color: "#6366f1",
      secondary_color: "#a855f7",
    },
    settings: agency?.settings || {
      default_timezone: "America/New_York",
      default_language: "en-US",
    }
  });

  const [notifications, setNotifications] = useState({
    email_calls: true,
    email_usage: true,
    email_billing: true,
    slack_integration: false,
  });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success("Settings saved successfully");
    },
  });

  const handleSave = () => {
    if (agency?.id) {
      updateAgencyMutation.mutate({ id: agency.id, data: agencyData });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your agency settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="telephony" className="gap-2">
            <Phone className="w-4 h-4" />
            Telephony
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Agency Information</CardTitle>
              <CardDescription>Basic information about your agency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Agency Name</Label>
                  <Input
                    id="name"
                    value={agencyData.name}
                    onChange={(e) => setAgencyData({ ...agencyData, name: e.target.value })}
                    placeholder="Your Agency Name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Primary Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={agencyData.primary_email}
                    onChange={(e) => setAgencyData({ ...agencyData, primary_email: e.target.value })}
                    placeholder="contact@agency.com"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label>Default Timezone</Label>
                  <Select 
                    value={agencyData.settings.default_timezone}
                    onValueChange={(v) => setAgencyData({
                      ...agencyData,
                      settings: { ...agencyData.settings, default_timezone: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Default Language</Label>
                  <Select 
                    value={agencyData.settings.default_language}
                    onValueChange={(v) => setAgencyData({
                      ...agencyData,
                      settings: { ...agencyData.settings, default_language: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleSave}
                disabled={updateAgencyMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateAgencyMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding">
          <div className="grid gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>White-Label Branding</CardTitle>
                <CardDescription>Customize the look and feel for your clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">Upload Logo</Button>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={agencyData.theme_config.primary_color}
                        onChange={(e) => setAgencyData({
                          ...agencyData,
                          theme_config: { ...agencyData.theme_config, primary_color: e.target.value }
                        })}
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                      />
                      <Input
                        value={agencyData.theme_config.primary_color}
                        onChange={(e) => setAgencyData({
                          ...agencyData,
                          theme_config: { ...agencyData.theme_config, primary_color: e.target.value }
                        })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={agencyData.theme_config.secondary_color}
                        onChange={(e) => setAgencyData({
                          ...agencyData,
                          theme_config: { ...agencyData.theme_config, secondary_color: e.target.value }
                        })}
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                      />
                      <Input
                        value={agencyData.theme_config.secondary_color}
                        onChange={(e) => setAgencyData({
                          ...agencyData,
                          theme_config: { ...agencyData.theme_config, secondary_color: e.target.value }
                        })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={updateAgencyMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Branding
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Custom Domain</CardTitle>
                <CardDescription>Use your own domain for the client portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={agencyData.custom_domain}
                    onChange={(e) => setAgencyData({ ...agencyData, custom_domain: e.target.value })}
                    placeholder="app.yourdomain.com"
                  />
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">DNS Configuration Required</p>
                      <p className="text-amber-600 mt-1">
                        Add a CNAME record pointing to: <code className="bg-amber-100 px-1 rounded">cname.voiceai.app</code>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Telephony Settings */}
        <TabsContent value="telephony">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Telephony Provider</CardTitle>
              <CardDescription>Configure how calls are handled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="p-4 border-2 border-indigo-500 rounded-xl bg-indigo-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Platform Twilio</p>
                        <p className="text-sm text-slate-500">Use our managed Twilio infrastructure</p>
                      </div>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-700">Active</Badge>
                  </div>
                </div>

                <div className="p-4 border-2 border-slate-200 rounded-xl hover:border-slate-300 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Key className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Bring Your Own Twilio</p>
                        <p className="text-sm text-slate-500">Use your own Twilio account</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>

                <div className="p-4 border-2 border-slate-200 rounded-xl hover:border-slate-300 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Custom SIP</p>
                        <p className="text-sm text-slate-500">Connect your own SIP trunk</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Call Summaries</p>
                      <p className="text-sm text-slate-500">Get email summaries of calls</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.email_calls}
                    onCheckedChange={(v) => setNotifications({ ...notifications, email_calls: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Usage Alerts</p>
                      <p className="text-sm text-slate-500">Notify when usage exceeds thresholds</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.email_usage}
                    onCheckedChange={(v) => setNotifications({ ...notifications, email_usage: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Billing Updates</p>
                      <p className="text-sm text-slate-500">Invoices and payment reminders</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.email_billing}
                    onCheckedChange={(v) => setNotifications({ ...notifications, email_billing: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="grid gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API access for integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-slate-900">sk_live_••••••••••••••••</p>
                      <p className="text-xs text-slate-500 mt-1">Created on Jan 15, 2025</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Reveal</Button>
                      <Button variant="outline" size="sm" className="text-red-600">Revoke</Button>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="gap-2">
                  <Key className="w-4 h-4" />
                  Generate New API Key
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>Receive real-time events to your server</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Webhook URL</Label>
                  <Input placeholder="https://your-server.com/webhooks" />
                </div>
                <div className="grid gap-2">
                  <Label>Events to receive</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="cursor-pointer">call.started</Badge>
                    <Badge variant="secondary" className="cursor-pointer">call.ended</Badge>
                    <Badge variant="secondary" className="cursor-pointer">agent.created</Badge>
                    <Badge variant="outline" className="cursor-pointer">+ Add more</Badge>
                  </div>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Webhook className="w-4 h-4 mr-2" />
                  Save Webhook
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}