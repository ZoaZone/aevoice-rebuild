import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Mail, MessageSquare, Phone, MessageCircle } from "lucide-react";

export default function BillingSummary() {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["usageSummary"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getCommunicationUsageSummary", {});
      return res.data?.summary || {};
    },
  });

  const fmt = (n) => (n ?? 0).toFixed(2);
  const fmtCount = (n) => (n ?? 0).toLocaleString();

  const channels = [
    {
      label: "Email",
      icon: Mail,
      count: summary?.email?.count,
      cost: summary?.email?.cost,
      color: "purple",
    },
    {
      label: "SMS",
      icon: MessageSquare,
      count: summary?.sms?.count,
      cost: summary?.sms?.cost,
      color: "blue",
    },
    {
      label: "Voice",
      icon: Phone,
      count: summary?.voice?.count,
      cost: summary?.voice?.cost,
      minutes: summary?.voice?.total_minutes,
      color: "cyan",
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      count: summary?.whatsapp?.count,
      cost: summary?.whatsapp?.cost,
      color: "green",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Communication Usage
        </CardTitle>
        <CardDescription>
          Estimated billable usage across email, SMS, voice, and WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {isError && (
          <div className="text-center py-4 text-red-500 text-sm">
            Failed to load usage data
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* Total Cost */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
              <div className="text-sm text-emerald-700 font-medium">Total Cost</div>
              <div className="text-3xl font-bold text-emerald-900">${fmt(summary?.total_cost)}</div>
              <div className="text-xs text-emerald-600 mt-1">
                {fmtCount(summary?.total_count)} total communications
              </div>
            </div>

            {/* Channel Breakdown */}
            <div className="space-y-3">
              {channels.map((channel) => (
                <div
                  key={channel.label}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${channel.color}-100`}>
                      <channel.icon className={`w-4 h-4 text-${channel.color}-600`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{channel.label}</div>
                      <div className="text-xs text-slate-500">
                        {fmtCount(channel.count || 0)} messages
                        {channel.minutes !== undefined && ` • ${fmtCount(channel.minutes)} min`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">${fmt(channel.cost)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}