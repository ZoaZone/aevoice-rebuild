import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Bot,
  BookOpen,
  Upload,
  Code,
  Sparkles,
  MessageSquare,
  Zap,
  CheckCircle2,
  ArrowRight,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function AevathonDashboardContent({ 
  _user, 
  _currentClient, 
  agents = [], 
  calls = [], 
  _wallets = [], 
  _usageCounters = [], 
  _phoneNumbers = [],
  isLoadingData = false 
}) {
  const hasAgents = agents.length > 0;
  // Always show the dashboard - never flash onboarding steps
  const hasData = true;

  // Calculate onboarding progress
  const onboardingSteps = [
    { id: 'create_assistant', label: 'Create Assistant', completed: hasAgents },
    { id: 'upload_knowledge', label: 'Upload Knowledge', completed: hasAgents }, // Simplified check
    { id: 'test_assistant', label: 'Test Assistant', completed: calls.length > 0 },
    { id: 'embed_widget', label: 'Embed Widget', completed: false }, // Could check SreeSettings
  ];

  const completedSteps = onboardingSteps.filter(s => s.completed).length;
  const progressPercent = (completedSteps / onboardingSteps.length) * 100;

  if (!hasData && !isLoadingData) {
    return (
      <div className="min-h-[85vh] relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.4; box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
            50% { opacity: 0.8; box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
          .grid-dots {
            background-image: radial-gradient(circle, rgba(99, 102, 241, 0.1) 1px, transparent 1px);
            background-size: 30px 30px;
          }
        `}</style>

        <div className="absolute inset-0 grid-dots" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px]" />

        <div className="relative z-10 py-8">
          <div className="text-center mb-16">
            <div className="relative inline-block mb-8 animate-float">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/40 to-purple-500/40 rounded-3xl blur-2xl animate-pulse-glow" />
                <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 border-2 border-white/10">
                  <Bot className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>
            
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs mb-4 px-3 py-1">
              ASSISTANT BUILDER
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Welcome to Aevathon
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Build intelligent voice assistants in minutes. No code required.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-5 max-w-6xl mx-auto mb-12">
            <Card className="relative overflow-hidden border-2 border-indigo-500/50 bg-slate-800/60 backdrop-blur-sm hover:border-indigo-400 transition-all h-full">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-indigo-400" />
                </div>
                <Badge className="bg-indigo-500 text-white text-xs mb-3">Step 1</Badge>
                <h3 className="text-lg font-bold text-white mb-2">Create Assistant</h3>
                <p className="text-slate-400 text-sm mb-4">Build your AI-powered voice assistant</p>
                <Link to={createPageUrl("SreeDemo")}>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm hover:border-purple-500/50 transition-all h-full">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-purple-400" />
                </div>
                <Badge className="bg-purple-500/20 text-purple-300 text-xs mb-3">Step 2</Badge>
                <h3 className="text-lg font-bold text-white mb-2">Upload Knowledge</h3>
                <p className="text-slate-400 text-sm mb-4">Add documents and data sources</p>
                <Link to={createPageUrl("Knowledge")}>
                  <Button variant="outline" className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm hover:border-pink-500/50 transition-all h-full">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-pink-400" />
                </div>
                <Badge className="bg-pink-500/20 text-pink-300 text-xs mb-3">Step 3</Badge>
                <h3 className="text-lg font-bold text-white mb-2">Test & Refine</h3>
                <p className="text-slate-400 text-sm mb-4">Chat with your assistant</p>
                <Link to={createPageUrl("AgentTest")}>
                  <Button variant="outline" className="w-full border-pink-500/50 text-pink-300 hover:bg-pink-500/10">
                    <Play className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm hover:border-cyan-500/50 transition-all h-full">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Code className="w-6 h-6 text-cyan-400" />
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-300 text-xs mb-3">Step 4</Badge>
                <h3 className="text-lg font-bold text-white mb-2">Embed Widget</h3>
                <p className="text-slate-400 text-sm mb-4">Add to your website</p>
                <Link to={createPageUrl("WidgetBuilder")}>
                  <Button variant="outline" className="w-full border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10">
                    <Zap className="w-4 h-4 mr-2" />
                    Embed
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="border border-indigo-500/30 bg-slate-800/40 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Quick Start Guide</h3>
                      <p className="text-sm text-slate-400">Learn how to build your first assistant</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("HelpCenter")}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      Get Started
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
          <h1 className="text-3xl font-bold text-slate-900">Aevathon Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your voice assistants and widget deployments</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("SreeDemo")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Bot className="w-4 h-4" />
              New Assistant
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Progress */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Setup Progress</h3>
              <p className="text-sm text-slate-600">{completedSteps} of {onboardingSteps.length} steps completed</p>
            </div>
            <Badge className="bg-indigo-600">{Math.round(progressPercent)}%</Badge>
          </div>
          <Progress value={progressPercent} className="mb-4 h-2" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {onboardingSteps.map((step) => (
              <div key={step.id} className={`flex items-center gap-2 p-2 rounded-lg ${step.completed ? 'bg-green-100' : 'bg-slate-100'}`}>
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                )}
                <span className={`text-xs font-medium ${step.completed ? 'text-green-900' : 'text-slate-600'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              Assistants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-slate-900 mb-2">{agents.length}</p>
              <p className="text-sm text-slate-500">Active assistants</p>
              <Link to={createPageUrl("Agents")}>
                <Button variant="ghost" size="sm" className="mt-4 gap-1 text-indigo-600">
                  View all
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-slate-900 mb-2">{calls.length}</p>
              <p className="text-sm text-slate-500">Total conversations</p>
              <Link to={createPageUrl("CallHistory")}>
                <Button variant="ghost" size="sm" className="mt-4 gap-1 text-purple-600">
                  View history
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Code className="w-5 h-5 text-cyan-600" />
              Widgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-slate-900 mb-2">-</p>
              <p className="text-sm text-slate-500">Widget deployments</p>
              <Link to={createPageUrl("WidgetBuilder")}>
                <Button variant="ghost" size="sm" className="mt-4 gap-1 text-cyan-600">
                  Create widget
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-semibold">Your Assistants</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Manage and configure your voice assistants</p>
          </div>
          <Link to={createPageUrl("Agents")}>
            <Button variant="ghost" size="sm" className="gap-1 text-indigo-600">
              View all
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {agents.length > 0 ? (
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors">
                  <Avatar className="w-12 h-12 border-2 border-indigo-200 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      {agent.name?.[0]?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{agent.agent_type || "Voice Assistant"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <Badge variant="outline" className="text-xs">
                      {agent.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 mb-2 font-medium">No assistants yet</p>
              <p className="text-sm text-slate-500 mb-4">Create your first voice assistant to get started</p>
              <Link to={createPageUrl("SreeDemo")}>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Assistant
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}