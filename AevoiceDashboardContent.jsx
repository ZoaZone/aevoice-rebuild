import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Bot,
  CreditCard,
  ArrowRight,
  Zap,
  BarChart3,
  Sparkles,
  BookOpen,
  Radio,
  Users,
  ShieldCheck,
  Gift,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import AutoTrainingInsights from "@/components/onboarding/AutoTrainingInsights";
import ChannelOverview from "@/components/channels/ChannelOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import TwilioNumberSelector from "@/components/telephony/TwilioNumberSelector";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function AevoiceDashboardContent({ 
  user: _user, 
  currentClient, 
  agents = [], 
  calls = [], 
  wallets = [], 
  usageCounters = [], 
  phoneNumbers = [],
  isLoadingData = false,
  isPremium = false,
  isPrivileged = false,
}) {
  const [openNumberWizard, setOpenNumberWizard] = useState(false);

  const totalCredits = wallets.reduce((sum, w) => sum + (w.credits_balance || 0), 0);
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const totalMinutesUsed = usageCounters.reduce((sum, u) => sum + (u.minutes_used || 0), 0);
  const todayCalls = calls.filter((c) => {
    if (!c.started_at) return false;
    const callDate = new Date(c.started_at).toDateString();
    return callDate === new Date().toDateString();
  }).length;

  const callData = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      const dayCalls = calls.filter((c) => {
        if (!c.started_at) return false;
        return new Date(c.started_at).toDateString() === date.toDateString();
      });
      const totalDuration = dayCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
      data.push({
        date: dayName,
        calls: dayCalls.length,
        duration: Math.round(totalDuration / 60)
      });
    }
    return data;
  })();

  const hasAgents = agents.length > 0;
  const hasPhoneNumbersConnected = phoneNumbers.length > 0;
  // Always show the stats dashboard - never flash onboarding steps
  const hasData = true;

  const stats = [
    {
      title: "Total Calls Today",
      value: todayCalls.toString(),
      change: calls.length > 0 ? `${calls.length} total` : "No calls yet",
      icon: Phone,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Active Agents",
      value: activeAgents.toString(),
      change: `${agents.length} total`,
      icon: Bot,
      gradient: "from-cyan-500 to-sky-500",
    },
    {
      title: "Minutes Used",
      value: totalMinutesUsed.toLocaleString(),
      change: "this billing cycle",
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Credits Balance",
      value: totalCredits.toFixed(0),
      change: "minutes remaining",
      icon: CreditCard,
      gradient: "from-emerald-500 to-teal-500",
    }
  ];

  const getAgentById = (id) => agents.find((a) => a.id === id);

  if (!hasData && !isLoadingData) {
    return (
      <div className="min-h-[85vh] relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          @keyframes glow {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-glow { animation: glow 4s ease-in-out infinite; }
          .grid-pattern {
            background-image: 
              linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
          }
        `}</style>

        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-glow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] animate-glow" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 py-8">
          <div className="text-center mb-12">
            <div className="relative inline-block mb-8 animate-float">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-3xl blur-xl" />
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG"
                    alt="AEVOICE"
                    className="w-28 h-28 rounded-3xl object-cover" />
                </div>
              </div>
            </div>
            
            <p className="text-cyan-400 font-mono text-xs tracking-[0.3em] mb-4">VOICE AI PLATFORM</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight flex items-center justify-center">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/e41d7c8f7_IMG_5886.jpg" 
                alt="AEVOICE" 
                className="h-28 md:h-40 object-contain"
              />
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Your AI Voice Assistant is just a few clicks away. Let's set up your first agent.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            <Card className="relative overflow-hidden border-2 border-purple-500/50 bg-slate-800/50 backdrop-blur-sm h-full">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
              <CardContent className="p-8 text-center">
                <Badge className="bg-purple-500 text-white text-xs mb-4">Start Here</Badge>
                <span className="inline-block text-purple-400 font-mono text-2xl font-bold mb-3">01</span>
                <h3 className="text-xl font-bold text-white mb-3">Choose Your Plan</h3>
                <p className="text-slate-400 mb-6 text-sm">Start from $35/mo. Pay only for what you use.</p>
                <Link to={createPageUrl("Pricing")}>
                  <Button className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600">
                    <Sparkles className="w-5 h-5 mr-2" />
                    View Plans
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm h-full">
              <CardContent className="p-8 text-center">
                <span className="inline-block text-cyan-400 font-mono text-2xl font-bold mb-3">02</span>
                <h3 className="text-xl font-bold text-white mb-3">Create Your AI Agent</h3>
                <p className="text-slate-400 mb-6 text-sm">Build a voice assistant that learns your business.</p>
                <Link to={createPageUrl("AgentBuilder")}>
                  <Button variant="outline" className="w-full h-12 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                    <Zap className="w-5 h-5 mr-2" />
                    Create Agent
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm h-full">
              <CardContent className="p-8 text-center">
                <span className="inline-block text-emerald-400 font-mono text-2xl font-bold mb-3">03</span>
                <h3 className="text-xl font-bold text-white mb-3">Connect Phone Number</h3>
                <p className="text-slate-400 mb-6 text-sm">Get a number from Twilio or use yours.</p>
                <Link to={createPageUrl("PhoneNumbers")}>
                  <Button variant="outline" className="w-full h-12 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                    <Phone className="w-5 h-5 mr-2" />
                    Add Number
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Need Help Getting Started?</h3>
                      <p className="text-sm text-slate-400">Explore guides and FAQs</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("HelpCenter")}>
                    <Button className="bg-white/10 hover:bg-white/20 text-white">
                      Help Center
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's what's happening with your voice agents.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Analytics")}>
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Full Report
            </Button>
          </Link>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setOpenNumberWizard(true)}>
            <Phone className="w-4 h-4" />
            Get a Phone Number
          </Button>
        </div>
      </div>

      <Dialog open={openNumberWizard} onOpenChange={setOpenNumberWizard}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Get a Phone Number</DialogTitle>
            <DialogDescription>Search, purchase and auto-connect a number to your agents.</DialogDescription>
          </DialogHeader>
          <TwilioNumberSelector 
            clientId={currentClient?.id}
            onNumberSelected={() => setOpenNumberWizard(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border-0 shadow-lg">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-2">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Call Volume</CardTitle>
          <p className="text-sm text-slate-500">Daily call activity this week</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={callData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="calls" stroke="#0e4166" fill="#0e4166" fillOpacity={0.2} />
                <Area type="monotone" dataKey="duration" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to={createPageUrl("CRM")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Customer CRM</h3>
                <p className="text-sm text-slate-500">Manage contacts & interaction history</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl("Channels")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Omnichannel Hub</h3>
                <p className="text-sm text-slate-500">Voice, SMS, chat, email & more</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-500 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Channel Overview */}
      <ChannelOverview agents={agents} />

      {hasAgents && (
        <AutoTrainingInsights agentId={agents[0]?.id} compact={false} />
      )}

      {/* Admin / Privileged Quick Links — only shown for admin/free_partner */}
      {isPrivileged && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={createPageUrl("AdminDashboard")}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Admin Dashboard</h3>
                  <p className="text-xs text-slate-500 truncate">Invitations, users, plans</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl("PromoManagement")}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100">
                  <Gift className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Promo Management</h3>
                  <p className="text-xs text-slate-500 truncate">Signup links & promotions</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl("FreePartnerWhitelist")}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Partner Whitelist</h3>
                  <p className="text-xs text-slate-500 truncate">Manage free partner access</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <a href={createPageUrl("Pricing")} target="_blank" rel="noopener noreferrer">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-indigo-50 to-blue-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100">
                  <ExternalLink className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">White Glove Plans</h3>
                  <p className="text-xs text-slate-500 truncate">View all plan details</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          </a>
        </div>
      )}

      {hasAgents && !hasPhoneNumbersConnected && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Next: Connect a Phone Number</h3>
                  <p className="text-slate-600">Your AI agent is ready! Connect a number to start receiving calls.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenNumberWizard(true)}>
                  Get a Phone Number
                </Button>
                <Link to={createPageUrl("PhoneNumbers")}>
                  <Button variant="outline">
                    Use Existing Number
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Recent Calls</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Latest activity</p>
            </div>
            <Link to={createPageUrl("CallHistory")}>
              <Button variant="ghost" size="sm" className="gap-1 text-cyan-600">
                View all
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {calls.length > 0 ? (
              <div className="space-y-3">
                {calls.slice(0, 5).map((call) => {
                  const agent = getAgentById(call.agent_id);
                  return (
                    <div key={call.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className={`p-2 rounded-lg ${call.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {call.direction === 'inbound' ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{call.from_number || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{agent?.name || "AI Agent"}</p>
                      </div>
                      <Badge className="text-xs">{call.status}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Phone className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-600 mb-2">No calls yet</p>
                <Link to={createPageUrl("PhoneNumbers")}>
                  <Button variant="outline" size="sm">Connect Number</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">AI Agents</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Your voice agents</p>
            </div>
            <Link to={createPageUrl("Agents")}>
              <Button variant="ghost" size="sm" className="gap-1 text-cyan-600">
                View all
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {agents.length > 0 ? (
              <div className="space-y-3">
                {agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                        {agent.name?.[0]?.toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{agent.agent_type || "General"}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-600 mb-2">No agents yet</p>
                <Link to={createPageUrl("AgentBuilder")}>
                  <Button size="sm" className="bg-cyan-600">Create Agent</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}