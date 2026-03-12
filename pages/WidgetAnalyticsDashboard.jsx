import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  ThumbsUp,
  Zap,
  Phone,
  Mail,
  Search,
  Download,
  Filter
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

export default function WidgetAnalyticsDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("7d");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch analytics for date range
  const { data: analytics = [] } = useQuery({
    queryKey: ['widgetAnalytics', dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
      const data = await base44.entities.WidgetAnalytics.list();
      return data.filter(a => a.date >= startDate).sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['widgetConversations'],
    queryFn: () => base44.entities.WidgetConversation.list('-created_date', 100),
  });

  // Calculate totals
  const totals = analytics.reduce((acc, day) => ({
    conversations: acc.conversations + (day.total_conversations || 0),
    leads: acc.leads + (day.leads_captured || 0),
    appointments: acc.appointments + (day.appointments_booked || 0),
    avgResponseTime: (acc.avgResponseTime + (day.average_response_time_ms || 0)) / 2,
    messages: acc.messages + (day.total_messages || 0)
  }), {
    conversations: 0,
    leads: 0,
    appointments: 0,
    avgResponseTime: 0,
    messages: 0
  });

  // Active conversations (last 24 hours)
  const activeConversations = conversations.filter(c => 
    c.status === 'active' && 
    moment(c.created_date).isAfter(moment().subtract(24, 'hours'))
  ).length;

  // Filter conversations by search
  const filteredConversations = conversations.filter(c =>
    c.lead_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lead_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.session_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    {
      title: "Active Conversations",
      value: activeConversations,
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Total Leads Captured",
      value: totals.leads,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      title: "Appointments Booked",
      value: totals.appointments,
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      title: "Avg Response Time",
      value: `${Math.round(totals.avgResponseTime)}ms`,
      icon: Zap,
      color: "text-amber-600",
      bg: "bg-amber-50"
    }
  ];

  // Chart data
  const chartData = analytics.map(a => ({
    date: moment(a.date).format('MMM DD'),
    conversations: a.total_conversations || 0,
    leads: a.leads_captured || 0
  }));

  const exportConversations = () => {
    const csv = [
      ['Session ID', 'Date', 'Messages', 'Lead Name', 'Lead Email', 'Status', 'Sentiment'].join(','),
      ...filteredConversations.map(c => [
        c.session_id,
        moment(c.created_date).format('YYYY-MM-DD HH:mm'),
        c.message_count || 0,
        c.lead_name || '-',
        c.lead_email || '-',
        c.status,
        c.sentiment || 'neutral'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `widget-conversations-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sri Widget Analytics</h1>
          <p className="text-slate-500">Real-time insights into widget performance</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={exportConversations} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Conversation Trends</CardTitle>
            <CardDescription>Daily conversation volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="conversations" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Lead Capture Performance</CardTitle>
            <CardDescription>Leads captured daily</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="leads" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>View and analyze widget conversations</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by email or session..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredConversations.slice(0, 20).map((conv) => (
              <div
                key={conv.id}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">
                        {conv.lead_name || 'Anonymous'}
                      </span>
                      {conv.lead_captured && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          Lead Captured
                        </Badge>
                      )}
                      {conv.sentiment === 'frustrated' && (
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          Frustrated
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {conv.lead_email || conv.session_id}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {moment(conv.created_date).fromNow()}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {conv.message_count || 0} messages
                  </div>
                  {conv.lead_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {conv.lead_phone}
                    </div>
                  )}
                  {conv.website_url && conv.website_url !== 'unknown' && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {new URL(conv.website_url).hostname}
                    </div>
                  )}
                </div>

                {conv.messages && conv.messages.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {conv.messages[conv.messages.length - 1]?.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}