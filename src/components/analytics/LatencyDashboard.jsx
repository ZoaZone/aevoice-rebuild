import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  Clock, 
  Zap, 
  AlertTriangle,
  TrendingUp,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LatencyDashboard({ clientId, dateRange }) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['callAnalytics', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return null;
      const result = await base44.functions.invoke('callAnalytics', {
        tenant_id: clientId,
        date_from: dateRange?.from,
        date_to: dateRange?.to
      });
      return result.data;
    },
    enabled: !!clientId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: calls = [] } = useQuery({
    queryKey: ['recentCalls', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return await base44.entities.CallSession.filter({ client_id: clientId }, '-started_at', 50);
    },
    enabled: !!clientId
  });

  // Calculate latency percentiles from calls
  const latencyData = React.useMemo(() => {
    const latencies = calls
      .filter(c => c.usage_stats?.total_latency_ms)
      .map(c => c.usage_stats.total_latency_ms)
      .sort((a, b) => a - b);

    if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };

    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    return {
      p50: latencies[p50Index] || 0,
      p95: latencies[p95Index] || 0,
      p99: latencies[p99Index] || 0,
      avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) || 0
    };
  }, [calls]);

  // SLA status
  const slaStatus = {
    p50: latencyData.p50 < 1000 ? "pass" : latencyData.p50 < 1500 ? "warning" : "fail",
    p95: latencyData.p95 < 2500 ? "pass" : latencyData.p95 < 3500 ? "warning" : "fail"
  };

  // Hourly latency breakdown (simulated from calls)
  const hourlyData = React.useMemo(() => {
    const hourBuckets = {};
    calls.forEach(call => {
      if (!call.started_at) return;
      const hour = new Date(call.started_at).getHours();
      if (!hourBuckets[hour]) {
        hourBuckets[hour] = { latencies: [], count: 0 };
      }
      hourBuckets[hour].count++;
      if (call.usage_stats?.total_latency_ms) {
        hourBuckets[hour].latencies.push(call.usage_stats.total_latency_ms);
      }
    });

    return Array.from({ length: 24 }, (_, hour) => {
      const bucket = hourBuckets[hour] || { latencies: [], count: 0 };
      const avgLatency = bucket.latencies.length > 0
        ? Math.round(bucket.latencies.reduce((a, b) => a + b, 0) / bucket.latencies.length)
        : 0;
      return {
        hour: `${hour}:00`,
        calls: bucket.count,
        latency: avgLatency
      };
    });
  }, [calls]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300 animate-pulse" />
          <p className="text-slate-500">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SLA Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={cn(
          "border-2",
          slaStatus.p50 === "pass" ? "border-emerald-200 bg-emerald-50/50" :
          slaStatus.p50 === "warning" ? "border-amber-200 bg-amber-50/50" :
          "border-red-200 bg-red-50/50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">P50 Latency</span>
              <Badge className={cn(
                slaStatus.p50 === "pass" ? "bg-emerald-100 text-emerald-700" :
                slaStatus.p50 === "warning" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {slaStatus.p50 === "pass" ? "SLA Met" : slaStatus.p50 === "warning" ? "Warning" : "SLA Breach"}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-slate-900">{latencyData.p50}ms</p>
            <p className="text-xs text-slate-500 mt-1">Target: &lt;1000ms</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          slaStatus.p95 === "pass" ? "border-emerald-200 bg-emerald-50/50" :
          slaStatus.p95 === "warning" ? "border-amber-200 bg-amber-50/50" :
          "border-red-200 bg-red-50/50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">P95 Latency</span>
              <Badge className={cn(
                slaStatus.p95 === "pass" ? "bg-emerald-100 text-emerald-700" :
                slaStatus.p95 === "warning" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {slaStatus.p95 === "pass" ? "SLA Met" : slaStatus.p95 === "warning" ? "Warning" : "SLA Breach"}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-slate-900">{latencyData.p95}ms</p>
            <p className="text-xs text-slate-500 mt-1">Target: &lt;2500ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Avg Latency</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{latencyData.avg}ms</p>
            <p className="text-xs text-slate-500 mt-1">All calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">P99 Latency</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{latencyData.p99}ms</p>
            <p className="text-xs text-slate-500 mt-1">Worst case</p>
          </CardContent>
        </Card>
      </div>

      {/* Latency by Hour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latency by Hour</CardTitle>
          <CardDescription>Average response time throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'latency' ? `${value}ms` : value,
                    name === 'latency' ? 'Avg Latency' : 'Calls'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={false}
                />
                <Bar dataKey="calls" fill="#e2e8f0" opacity={0.3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Breakdown */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Containment Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-900">
                  {analytics.metrics.containment_rate}%
                </p>
                <TrendingUp className="w-5 h-5 text-emerald-500 mb-1" />
              </div>
              <Progress value={analytics.metrics.containment_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-900">
                  {analytics.metrics.error_rate}%
                </p>
                {analytics.metrics.error_rate > 5 && (
                  <AlertTriangle className="w-5 h-5 text-amber-500 mb-1" />
                )}
              </div>
              <Progress 
                value={analytics.metrics.error_rate} 
                className={cn("mt-2", analytics.metrics.error_rate > 5 && "[&>div]:bg-red-500")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Token Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {(analytics.metrics.tokens.total_in + analytics.metrics.tokens.total_out).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Est. cost: ${analytics.metrics.tokens.estimated_cost_usd}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}