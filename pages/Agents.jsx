import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Search,
  Bot,
  MoreHorizontal,
  Phone,
  PlayCircle,
  PauseCircle,
  Copy,
  Edit,
  Trash2,
  Activity,
  Zap,
  MessageSquare,
  Clock,
  Volume2,
  Settings2,
  Filter,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const agentTypeConfig = {
  receptionist: { 
    icon: Phone, 
    color: "from-blue-500 to-cyan-500",
    badge: "bg-blue-100 text-blue-700 border-blue-200"
  },
  sales: { 
    icon: Zap, 
    color: "from-amber-500 to-orange-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200"
  },
  support: { 
    icon: MessageSquare, 
    color: "from-purple-500 to-pink-500",
    badge: "bg-purple-100 text-purple-700 border-purple-200"
  },
  appointment: { 
    icon: Clock, 
    color: "from-emerald-500 to-teal-500",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200"
  },
  general: { 
    icon: Bot, 
    color: "from-slate-500 to-slate-600",
    badge: "bg-slate-100 text-slate-700 border-slate-200"
  },
};

export default function Agents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Client.filter({ contact_email: user.email });
    },
    enabled: !!user?.email,
  });

  const currentClient = clients[0];

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', currentClient?.id, user?.role],
    queryFn: async () => {
      // If admin, fetch all agents (or you could implement pagination/search for scale)
      if (user?.role === 'admin') {
        return await base44.entities.Agent.list();
      }
      if (!currentClient?.id) return [];
      return await base44.entities.Agent.filter({ client_id: currentClient.id });
    },
    enabled: !!user,
  });

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ['phoneNumbers', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.PhoneNumber.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Agent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unassigned";
  };

  const getAssignedNumbers = (agentId) => {
    return phoneNumbers.filter(p => p.agent_id === agentId);
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || agent.agent_type === typeFilter;
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const toggleAgentStatus = (agent) => {
    updateMutation.mutate({
      id: agent.id,
      data: { status: agent.status === 'active' ? 'inactive' : 'active' }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Agents</h1>
          <p className="text-slate-500 mt-1">Create and manage your voice AI agents</p>
        </div>
        <Link to={createPageUrl("AgentBuilder")}>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25">
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Agent Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agent Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100">
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{agents.length}</p>
                <p className="text-xs text-slate-500">Total Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {agents.filter(a => a.status === 'active').length}
                </p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {agents.filter(a => getAssignedNumbers(a.id).length > 0).length}
                </p>
                <p className="text-xs text-slate-500">With Numbers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">0</p>
                <p className="text-xs text-slate-500">Calls Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredAgents.map((agent) => {
          const config = agentTypeConfig[agent.agent_type] || agentTypeConfig.general;
          const assignedNumbers = getAssignedNumbers(agent.id);
          const Icon = config.icon;

          return (
            <Card key={agent.id} className="border-0 shadow-md hover:shadow-lg transition-all duration-300 group overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${config.color}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${config.color} shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                      <p className="text-sm text-slate-500">{getClientName(agent.client_id)}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link to={createPageUrl(`AgentBuilder?edit=${agent.id}`)}>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Agent
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings2 className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate(agent.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 mb-4 min-h-[40px]">
                  {agent.description || agent.greeting_message || "No description"}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className={`${config.badge} border text-xs capitalize`}>
                    {agent.agent_type || 'general'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border border-slate-200">
                    <Volume2 className="w-3 h-3 mr-1" />
                    {agent.voice_provider || 'elevenlabs'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border border-slate-200">
                    {agent.language || 'en-US'}
                  </Badge>
                </div>

                {assignedNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {assignedNumbers.slice(0, 2).map((num) => (
                      <Badge key={num.id} variant="outline" className="text-xs font-mono">
                        <Phone className="w-3 h-3 mr-1" />
                        {num.number_e164 || num.label}
                      </Badge>
                    ))}
                    {assignedNumbers.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{assignedNumbers.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={agent.status === 'active'}
                      onCheckedChange={() => toggleAgentStatus(agent)}
                    />
                    <span className={`text-sm font-medium ${
                      agent.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                      {agent.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Link to={createPageUrl(`AgentBuilder?edit=${agent.id}`)}>
                    <Button variant="ghost" size="sm" className="gap-1 text-indigo-600 hover:text-indigo-700">
                      Configure
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAgents.length === 0 && !isLoading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No agents found</h3>
            <p className="text-slate-500 mb-4">
              {searchQuery ? "Try adjusting your search" : "Create your first AI voice agent"}
            </p>
            <Link to={createPageUrl("AgentBuilder")}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}