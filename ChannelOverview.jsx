import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Mail, Globe, Smartphone, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNEL_META = {
  voice:        { label: "Voice",      icon: Phone,          color: "from-blue-500 to-blue-600" },
  sms:          { label: "SMS",        icon: Smartphone,     color: "from-emerald-500 to-emerald-600" },
  web_chat:     { label: "Web Chat",   icon: Globe,          color: "from-cyan-500 to-cyan-600" },
  whatsapp:     { label: "WhatsApp",   icon: MessageSquare,  color: "from-green-500 to-green-600" },
  email:        { label: "Email",      icon: Mail,           color: "from-purple-500 to-purple-600" },
  facebook_dm:  { label: "Facebook",   icon: Hash,           color: "from-blue-600 to-blue-700" },
  instagram_dm: { label: "Instagram",  icon: Hash,           color: "from-pink-500 to-pink-600" },
};

export default function ChannelOverview({ agents = [] }) {
  // Count how many agents have each channel enabled
  const channelCounts = {};
  const channelKeys = Object.keys(CHANNEL_META);

  channelKeys.forEach((key) => {
    channelCounts[key] = agents.filter(
      (a) => a.channels?.[key] === true && a.status === "active"
    ).length;
  });

  const totalActiveChannels = Object.values(channelCounts).reduce((sum, c) => sum + c, 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Channel Coverage</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Active agent-channel connections across your platform
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalActiveChannels} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {channelKeys.map((key) => {
            const meta = CHANNEL_META[key];
            const count = channelCounts[key];
            const Icon = meta.icon;

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  count > 0
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50 opacity-50"
                )}
              >
                <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", meta.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{meta.label}</p>
                  <p className="text-xs text-slate-500">
                    {count} agent{count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}