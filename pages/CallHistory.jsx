import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Search,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Bot,
  Play,
  Download,
  Filter,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusConfig = {
  completed: { icon: Phone, color: "text-emerald-600 bg-emerald-100", label: "Completed" },
  in_progress: { icon: Phone, color: "text-blue-600 bg-blue-100", label: "In Progress" },
  failed: { icon: PhoneMissed, color: "text-red-600 bg-red-100", label: "Failed" },
  no_answer: { icon: PhoneMissed, color: "text-amber-600 bg-amber-100", label: "No Answer" },
  transferred: { icon: Phone, color: "text-purple-600 bg-purple-100", label: "Transferred" },
};

const outcomeConfig = {
  appointment_booked: { color: "bg-emerald-100 text-emerald-700", label: "Appointment Booked" },
  information_provided: { color: "bg-blue-100 text-blue-700", label: "Info Provided" },
  transferred: { color: "bg-purple-100 text-purple-700", label: "Transferred" },
  callback_requested: { color: "bg-amber-100 text-amber-700", label: "Callback" },
  issue_resolved: { color: "bg-teal-100 text-teal-700", label: "Resolved" },
  no_outcome: { color: "bg-slate-100 text-slate-700", label: "No Outcome" },
};

const sentimentIcons = {
  positive: { icon: ThumbsUp, color: "text-emerald-500" },
  neutral: { icon: Minus, color: "text-slate-400" },
  negative: { icon: ThumbsDown, color: "text-red-500" },
};

export default function CallHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState(null);

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

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['callSessions', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.CallSession.filter({ client_id: currentClient.id }, '-started_at', 100);
    },
    enabled: !!currentClient?.id,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.Agent.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const getAgentById = (id) => agents.find(a => a.id === id);

  const filteredCalls = calls.filter(call => {
    const matchesSearch = 
      call.from_number?.includes(searchQuery) || 
      call.to_number?.includes(searchQuery) ||
      call.caller_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || call.status === statusFilter;
    const matchesDirection = directionFilter === "all" || call.direction === directionFilter;
    return matchesSearch && matchesStatus && matchesDirection;
  });

  const formatDuration = (seconds) => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
  const avgDuration = calls.length ? Math.round(totalDuration / calls.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Call History</h1>
          <p className="text-slate-500 mt-1">View and analyze all voice agent calls</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Last 7 days
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100">
                <Phone className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{calls.length}</p>
                <p className="text-xs text-slate-500">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <PhoneIncoming className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {calls.filter(c => c.direction === 'inbound').length}
                </p>
                <p className="text-xs text-slate-500">Inbound</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatDuration(avgDuration)}</p>
                <p className="text-xs text-slate-500">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100">
                <ThumbsUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {calls.filter(c => c.sentiment === 'positive').length}
                </p>
                <p className="text-xs text-slate-500">Positive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by phone number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Calls</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="no_answer">No Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls List */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredCalls.map((call) => {
            const agent = getAgentById(call.agent_id);
            const client = getClientById(call.client_id);
            const status = statusConfig[call.status] || statusConfig.completed;
            const outcome = outcomeConfig[call.outcome];
            const sentiment = sentimentIcons[call.sentiment];

            return (
              <button
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors text-left"
              >
                <div className={`p-2.5 rounded-xl ${
                  call.direction === 'inbound' ? 'bg-blue-100' : 'bg-emerald-100'
                }`}>
                  {call.direction === 'inbound' ? (
                    <PhoneIncoming className="w-5 h-5 text-blue-600" />
                  ) : (
                    <PhoneOutgoing className="w-5 h-5 text-emerald-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {call.from_number || "Unknown"}
                    </span>
                    {call.caller_name && (
                      <span className="text-sm text-slate-500">
                        ({call.caller_name})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {agent && (
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Bot className="w-3.5 h-3.5" />
                        {agent.name || "AI Agent"}
                      </div>
                    )}
                    {!agent && (
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <Bot className="w-3.5 h-3.5" />
                        AI Agent
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-3">
                  {outcome && (
                    <Badge className={`${outcome.color} border-0 text-xs`}>
                      {outcome.label}
                    </Badge>
                  )}
                  {sentiment && (
                    <sentiment.icon className={`w-4 h-4 ${sentiment.color}`} />
                  )}
                </div>

                <div className="text-right min-w-[80px]">
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(call.duration_seconds)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {call.started_at ? format(new Date(call.started_at), 'MMM d, HH:mm') : '--'}
                  </p>
                </div>

                <Badge 
                  variant="secondary"
                  className={`${status.color} text-xs min-w-[80px] justify-center`}
                >
                  {status.label}
                </Badge>
              </button>
            );
          })}
        </div>

        {filteredCalls.length === 0 && !isLoading && (
          <div className="py-16 text-center">
            <Phone className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No calls found</h3>
            <p className="text-slate-500">
              {searchQuery ? "Try adjusting your search" : "Call history will appear here"}
            </p>
          </div>
        )}
      </Card>

      {/* Call Details Sheet */}
      <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedCall && (
            <>
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedCall.direction === 'inbound' ? 'bg-blue-100' : 'bg-emerald-100'
                  }`}>
                    {selectedCall.direction === 'inbound' ? (
                      <PhoneIncoming className="w-5 h-5 text-blue-600" />
                    ) : (
                      <PhoneOutgoing className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p>{selectedCall.from_number || "Unknown"}</p>
                    <p className="text-sm font-normal text-slate-500">
                      {selectedCall.started_at && format(new Date(selectedCall.started_at), 'PPpp')}
                    </p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="transcript" className="flex-1">Transcript</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Duration</p>
                      <p className="font-medium">{formatDuration(selectedCall.duration_seconds)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <Badge className={statusConfig[selectedCall.status]?.color}>
                        {statusConfig[selectedCall.status]?.label}
                      </Badge>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Outcome</p>
                      <p className="font-medium capitalize">
                        {selectedCall.outcome?.replace(/_/g, ' ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Sentiment</p>
                      <p className="font-medium capitalize">{selectedCall.sentiment || 'N/A'}</p>
                    </div>
                  </div>

                  {selectedCall.summary && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Summary</p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        {selectedCall.summary}
                      </p>
                    </div>
                  )}

                  {selectedCall.extracted_data && Object.keys(selectedCall.extracted_data).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Extracted Data</p>
                      <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                        {Object.entries(selectedCall.extracted_data).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCall.recording_url && (
                    <Button variant="outline" className="w-full gap-2">
                      <Play className="w-4 h-4" />
                      Play Recording
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="transcript" className="mt-4">
                  <ScrollArea className="h-[400px]">
                    {selectedCall.transcript ? (
                      <div className="space-y-4 pr-4">
                        {selectedCall.transcript.split('\n').filter(Boolean).map((line, i) => {
                          const isAgent = line.toLowerCase().startsWith('agent:') || 
                                         line.toLowerCase().startsWith('ai:');
                          return (
                            <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[80%] p-3 rounded-2xl ${
                                isAgent 
                                  ? 'bg-slate-100 rounded-bl-none' 
                                  : 'bg-indigo-600 text-white rounded-br-none'
                              }`}>
                                <p className="text-sm">{line.replace(/^(agent:|ai:|user:|caller:)/i, '').trim()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p>No transcript available</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}