import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Phone,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Users,
  Target,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

// These will be populated from real data when available
const defaultCallVolumeData = [];
const defaultHourlyData = [];
const defaultOutcomeData = [];
const defaultAgentPerformance = [];
const defaultSentimentTrend = [];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7d");

  const { data: calls = [] } = useQuery({
    queryKey: ['callSessions'],
    queryFn: () => base44.entities.CallSession.list('-started_at', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  // Generate call volume data from actual calls
  const callVolumeData = React.useMemo(() => {
    if (calls.length === 0) return [];
    const days = {};
    calls.forEach(call => {
      if (call.started_at) {
        const date = new Date(call.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!days[date]) days[date] = { date, calls: 0, minutes: 0 };
        days[date].calls++;
        days[date].minutes += Math.round((call.duration_seconds || 0) / 60);
      }
    });
    return Object.values(days).slice(-14);
  }, [calls]);

  // Generate hourly data from actual calls
  const hourlyData = React.useMemo(() => {
    if (calls.length === 0) return [];
    const hours = {};
    calls.forEach(call => {
      if (call.started_at) {
        const hour = new Date(call.started_at).getHours();
        const hourLabel = hour < 12 ? `${hour || 12}am` : `${hour === 12 ? 12 : hour - 12}pm`;
        if (!hours[hourLabel]) hours[hourLabel] = { hour: hourLabel, calls: 0 };
        hours[hourLabel].calls++;
      }
    });
    return Object.values(hours);
  }, [calls]);

  // Generate outcome data from actual calls
  const outcomeData = React.useMemo(() => {
    if (calls.length === 0) return [];
    const outcomes = {};
    const colors = {
      appointment_booked: "#22c55e",
      information_provided: "#3b82f6",
      transferred: "#a855f7",
      callback_requested: "#f59e0b",
      issue_resolved: "#14b8a6",
      no_outcome: "#94a3b8"
    };
    calls.forEach(call => {
      const outcome = call.outcome || 'no_outcome';
      if (!outcomes[outcome]) outcomes[outcome] = { name: outcome.replace(/_/g, ' '), value: 0, color: colors[outcome] || "#94a3b8" };
      outcomes[outcome].value++;
    });
    return Object.values(outcomes);
  }, [calls]);

  // Generate agent performance from actual data
  const agentPerformance = React.useMemo(() => {
    if (agents.length === 0) return [];
    return agents.map(agent => {
      const agentCalls = calls.filter(c => c.agent_id === agent.id);
      const completed = agentCalls.filter(c => c.status === 'completed').length;
      const totalDuration = agentCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
      return {
        name: agent.name,
        calls: agentCalls.length,
        successRate: agentCalls.length > 0 ? Math.round((completed / agentCalls.length) * 100) : 0,
        avgDuration: agentCalls.length > 0 ? (totalDuration / agentCalls.length / 60).toFixed(1) : 0
      };
    }).filter(a => a.calls > 0);
  }, [agents, calls]);

  const totalCalls = calls.length;
  const totalMinutes = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60;
  const avgDuration = totalCalls > 0 ? totalMinutes / totalCalls : 0;
  const completedCalls = calls.filter(c => c.status === 'completed').length;
  const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  const stats = [
    {
      title: "Total Calls",
      value: totalCalls.toLocaleString(),
      change: "+12.5%",
      trend: "up",
      icon: Phone,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Total Minutes",
      value: Math.round(totalMinutes).toLocaleString(),
      change: "+8.3%",
      trend: "up",
      icon: Clock,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Avg Duration",
      value: `${avgDuration.toFixed(1)} min`,
      change: "-0.5 min",
      trend: "down",
      icon: Target,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      change: "+2.1%",
      trend: "up",
      icon: Zap,
      color: "from-emerald-500 to-teal-500"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-slate-500 mt-1">Insights and performance metrics for your voice agents</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === "up" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${
                      stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume Chart */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Call Volume & Duration</CardTitle>
          </CardHeader>
          <CardContent>
            {callVolumeData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={callVolumeData}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCalls)"
                      name="Calls"
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMinutes)"
                      name="Minutes"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Phone className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No call data available yet</p>
                  <p className="text-sm">Data will appear here once calls are made</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Outcomes */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Call Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {outcomeData.length > 0 ? (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {outcomeData.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-slate-600 truncate">{item.name}</span>
                      <span className="text-xs font-medium text-slate-900 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Target className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No outcome data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Hourly Call Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="calls" 
                      fill="#6366f1" 
                      radius={[4, 4, 0, 0]}
                      name="Calls"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Phone className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No call data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Status Overview */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Call Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {calls.length > 0 ? (
              <div className="space-y-4">
                {['completed', 'in_progress', 'failed', 'no_answer'].map(status => {
                  const count = calls.filter(c => c.status === status).length;
                  const percent = (count / calls.length) * 100;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-sm capitalize text-slate-600 w-24">{status.replace('_', ' ')}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            status === 'completed' ? 'bg-emerald-500' :
                            status === 'in_progress' ? 'bg-blue-500' :
                            status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-900 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Phone className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No call data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {agentPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Agent</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Total Calls</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Success Rate</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((agent, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-medium text-slate-900">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-slate-900">{agent.calls}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Badge className={`${
                          agent.successRate >= 90 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {agent.successRate}%
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-slate-600">{agent.avgDuration} min</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No agent performance data</p>
              <p className="text-sm">Create agents and receive calls to see performance metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}