import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Phone,
  MessageSquare,
  Mail,
  Globe,
  Smartphone,
  Hash,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";

const CHANNELS = [
  {
    key: "voice",
    label: "Voice / Phone",
    description: "Handle inbound & outbound phone calls with AI voice",
    icon: Phone,
    color: "bg-blue-500",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    available: true,
  },
  {
    key: "sms",
    label: "SMS / Text",
    description: "Auto-reply to incoming text messages with AI",
    icon: Smartphone,
    color: "bg-emerald-500",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    available: true,
  },
  {
    key: "web_chat",
    label: "Web Chat Widget",
    description: "Embed a chat widget on your website for live AI support",
    icon: Globe,
    color: "bg-cyan-500",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    available: true,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "Respond to WhatsApp messages automatically",
    icon: MessageSquare,
    color: "bg-green-500",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    available: true,
  },
  {
    key: "email",
    label: "Email",
    description: "AI-powered email response drafting and auto-replies",
    icon: Mail,
    color: "bg-purple-500",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    available: true,
  },
  {
    key: "facebook_dm",
    label: "Facebook Messenger",
    description: "Respond to Facebook page messages with AI",
    icon: Hash,
    color: "bg-blue-600",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    available: true,
    needsAuth: true,
  },
  {
    key: "instagram_dm",
    label: "Instagram DM",
    description: "Respond to Instagram direct messages with AI",
    icon: Hash,
    color: "bg-pink-500",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
    available: true,
    needsAuth: true,
  },
];

export default function ChannelConfigurator({ channels, channelConfig, onChannelsChange, onChannelConfigChange }) {
  const [expandedChannel, setExpandedChannel] = useState(null);

  const toggleChannel = (key) => {
    const updated = { ...(channels || {}) };
    updated[key] = !updated[key];
    onChannelsChange(updated);
  };

  const updateConfig = (channelKey, field, value) => {
    const current = { ...(channelConfig || {}) };
    current[channelKey] = { ...(current[channelKey] || {}), [field]: value };
    onChannelConfigChange(current);
  };

  const enabledCount = Object.values(channels || {}).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Communication Channels</h3>
          <p className="text-sm text-slate-500">
            Enable channels for your agent to interact with customers
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {enabledCount} active
        </Badge>
      </div>

      <div className="grid gap-3">
        {CHANNELS.map((ch) => {
          const isEnabled = channels?.[ch.key] || false;
          const isExpanded = expandedChannel === ch.key;
          const Icon = ch.icon;

          return (
            <Card
              key={ch.key}
              className={cn(
                "border-2 transition-all",
                isEnabled ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200",
                ch.comingSoon && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-xl text-white", ch.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{ch.label}</p>
                      {ch.comingSoon && (
                        <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          Coming Soon
                        </Badge>
                      )}
                      {ch.needsAuth && isEnabled && (
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <Lock className="w-3 h-3 mr-1" /> Auth Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{ch.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEnabled && ch.available && (
                      <button
                        onClick={() => setExpandedChannel(isExpanded ? null : ch.key)}
                        className="p-1 rounded hover:bg-slate-200 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => ch.available && toggleChannel(ch.key)}
                      disabled={ch.comingSoon}
                    />
                  </div>
                </div>

                {/* Expanded config for each channel */}
                {isEnabled && isExpanded && ch.available && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    {ch.key === "sms" && (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-sm">SMS Greeting</Label>
                          <Input
                            placeholder="Hi! I'm your AI assistant. How can I help?"
                            value={channelConfig?.sms?.greeting || ""}
                            onChange={(e) => updateConfig("sms", "greeting", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Auto-reply enabled</Label>
                          <Switch
                            checked={channelConfig?.sms?.auto_reply_enabled !== false}
                            onCheckedChange={(v) => updateConfig("sms", "auto_reply_enabled", v)}
                          />
                        </div>
                      </>
                    )}

                    {ch.key === "web_chat" && (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-sm">Chat Widget Greeting</Label>
                          <Input
                            placeholder="Hello! How can I assist you today?"
                            value={channelConfig?.web_chat?.greeting || ""}
                            onChange={(e) => updateConfig("web_chat", "greeting", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-sm">Widget Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={channelConfig?.web_chat?.widget_color || "#0ea5e9"}
                              onChange={(e) => updateConfig("web_chat", "widget_color", e.target.value)}
                              className="w-10 h-10 rounded border cursor-pointer"
                            />
                            <Input
                              value={channelConfig?.web_chat?.widget_color || "#0ea5e9"}
                              onChange={(e) => updateConfig("web_chat", "widget_color", e.target.value)}
                              className="w-28 font-mono text-sm"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {ch.key === "whatsapp" && (
                      <div className="grid gap-2">
                        <Label className="text-sm">WhatsApp Greeting</Label>
                        <Input
                          placeholder="Welcome! Ask me anything about our services."
                          value={channelConfig?.whatsapp?.greeting || ""}
                          onChange={(e) => updateConfig("whatsapp", "greeting", e.target.value)}
                        />
                      </div>
                    )}

                    {ch.key === "email" && (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-sm">Email Greeting</Label>
                          <Input
                            placeholder="Thank you for reaching out!"
                            value={channelConfig?.email?.greeting || ""}
                            onChange={(e) => updateConfig("email", "greeting", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-sm">Email Signature</Label>
                          <Textarea
                            placeholder="Best regards,\nYour AI Assistant"
                            value={channelConfig?.email?.signature || ""}
                            onChange={(e) => updateConfig("email", "signature", e.target.value)}
                            rows={2}
                          />
                        </div>
                      </>
                    )}

                    {ch.key === "voice" && (
                      <p className="text-sm text-slate-500">
                        Voice configuration is managed in the Voice and Phone Numbers sections.
                      </p>
                    )}

                    {ch.key === "facebook_dm" && (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-sm">Facebook Page Access Token</Label>
                          <Input
                            type="password"
                            placeholder="Paste your Facebook Page access token"
                            value={channelConfig?.facebook_dm?.access_token || ""}
                            onChange={(e) => updateConfig("facebook_dm", "access_token", e.target.value)}
                          />
                          <p className="text-xs text-slate-500">Get this from Facebook Developer Console → Apps → Your App → Messenger → Settings</p>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-sm">Facebook Page ID</Label>
                          <Input
                            placeholder="Your Facebook Page ID"
                            value={channelConfig?.facebook_dm?.page_id || ""}
                            onChange={(e) => updateConfig("facebook_dm", "page_id", e.target.value)}
                          />
                        </div>
                        <Button size="sm" variant="outline" className="w-full">
                          Verify Connection
                        </Button>
                      </>
                    )}

                    {ch.key === "instagram_dm" && (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-sm">Instagram Business Account Access Token</Label>
                          <Input
                            type="password"
                            placeholder="Paste your Instagram access token"
                            value={channelConfig?.instagram_dm?.access_token || ""}
                            onChange={(e) => updateConfig("instagram_dm", "access_token", e.target.value)}
                          />
                          <p className="text-xs text-slate-500">Get this from Facebook Developer Console → Apps → Your App → Instagram Basic Display</p>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-sm">Instagram Account ID</Label>
                          <Input
                            placeholder="Your Instagram Business Account ID"
                            value={channelConfig?.instagram_dm?.account_id || ""}
                            onChange={(e) => updateConfig("instagram_dm", "account_id", e.target.value)}
                          />
                        </div>
                        <Button size="sm" variant="outline" className="w-full">
                          Verify Connection
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}