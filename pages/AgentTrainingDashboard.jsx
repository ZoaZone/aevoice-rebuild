import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Globe,
  FileText,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Upload,
  Loader2,
  BookOpen,
  Target,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentTrainingDashboard() {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [retraining, setRetraining] = useState(false);
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

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.Agent.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['knowledgeBases', selectedAgent?.knowledge_base_ids],
    queryFn: async () => {
      if (!selectedAgent?.knowledge_base_ids?.length) return [];
      const kbs = await Promise.all(
        selectedAgent.knowledge_base_ids.map(id => 
          base44.entities.KnowledgeBase.filter({ id })
        )
      );
      return kbs.flat();
    },
    enabled: !!selectedAgent?.knowledge_base_ids?.length,
  });

  const { data: knowledgeGaps = [] } = useQuery({
    queryKey: ['knowledgeGaps', selectedAgent?.id],
    queryFn: async () => {
      if (!selectedAgent?.id) return [];
      return await base44.entities.KnowledgeGap.filter({ agent_id: selectedAgent.id }, '-frequency');
    },
    enabled: !!selectedAgent?.id,
  });

  const { data: recentCalls = [] } = useQuery({
    queryKey: ['recentCalls', selectedAgent?.id],
    queryFn: async () => {
      if (!selectedAgent?.id) return [];
      return await base44.entities.CallSession.filter({ agent_id: selectedAgent.id }, '-started_at', 20);
    },
    enabled: !!selectedAgent?.id,
  });

  const handleRetrainFromWebsite = async () => {
    if (!selectedAgent?.website_url) {
      alert("Website URL not configured for this agent");
      return;
    }

    // Get or create knowledge base for this agent
    let kbId = selectedAgent.knowledge_base_ids?.[0];
    if (!kbId && currentClient?.id) {
      const newKb = await base44.entities.KnowledgeBase.create({
        client_id: currentClient.id,
        name: `${selectedAgent.name} - Website Knowledge`,
        description: `Auto-learned from ${selectedAgent.website_url}`,
        type: 'website',
        status: 'processing'
      });
      kbId = newKb.id;
    }

    if (!kbId) {
      alert("Cannot create knowledge base. Please complete setup first.");
      return;
    }

    setRetraining(true);
    try {
      const result = await base44.functions.invoke('scrapeWebsiteKnowledge', {
        url: selectedAgent.website_url,
        knowledge_base_id: kbId
      });

      if (result.data.success) {
        queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        alert(`✅ Successfully re-trained! ${result.data.chunks_created} topics learned from website.`);
      } else {
        alert(`❌ Training failed: ${result.data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
    setRetraining(false);
  };

  const coverageScore = selectedAgent?.knowledge_coverage_score || 0;
  const totalChunks = knowledgeBases.reduce((sum, kb) => sum + (kb.chunk_count || 0), 0);
  const pendingGaps = knowledgeGaps.filter(g => g.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agent Training Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Monitor and improve your AI agent's knowledge and performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgentId || selectedAgent?.id} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedAgent && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-600" />
            <p className="text-amber-900">Please select an agent to view training data</p>
          </CardContent>
        </Card>
      )}

      {selectedAgent && (
        <>
          {/* Overview Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500">Knowledge Coverage</p>
                  <Target className="w-5 h-5 text-cyan-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-2">{coverageScore}%</p>
                <Progress value={coverageScore} className="h-2" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500">Knowledge Chunks</p>
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{totalChunks}</p>
                <p className="text-xs text-slate-500">{knowledgeBases.length} sources</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500">Knowledge Gaps</p>
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{pendingGaps}</p>
                <p className="text-xs text-slate-500">Need attention</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500">Recent Calls</p>
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{recentCalls.length}</p>
                <p className="text-xs text-slate-500">Last 20 analyzed</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="sources">
            <TabsList>
              <TabsTrigger value="sources">Learning Sources</TabsTrigger>
              <TabsTrigger value="gaps">Knowledge Gaps</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Learning Sources */}
            <TabsContent value="sources" className="space-y-4">
              {/* Website Source */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-500" />
                    Website Auto-Learning
                  </CardTitle>
                  <CardDescription>
                    Automatically scrape and learn from your website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedAgent.website_url ? (
                    <>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">Website URL</p>
                            <p className="text-sm text-slate-600">{selectedAgent.website_url}</p>
                          </div>
                          <Badge className={selectedAgent.auto_update_website ? "bg-emerald-500" : "bg-slate-400"}>
                            {selectedAgent.auto_update_website ? 'Auto-Update ON' : 'Manual Only'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Update Frequency</p>
                            <p className="font-medium capitalize">{selectedAgent.update_frequency || 'Weekly'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Last Updated</p>
                            <p className="font-medium">
                              {selectedAgent.last_learning_update 
                                ? new Date(selectedAgent.last_learning_update).toLocaleDateString()
                                : 'Never'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleRetrainFromWebsite}
                        disabled={retraining}
                        className="w-full"
                      >
                        {retraining ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Re-scanning Website...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Re-train from Website Now
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-600 mb-4">No website URL configured</p>
                      <Button variant="outline">
                        Add Website URL
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Knowledge Bases */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    Connected Knowledge Bases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {knowledgeBases.length > 0 ? (
                    <div className="space-y-3">
                      {knowledgeBases.map(kb => (
                        <div key={kb.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{kb.name}</p>
                              <p className="text-sm text-slate-500">{kb.type} • {kb.chunk_count || 0} chunks</p>
                            </div>
                          </div>
                          <Badge variant={kb.status === 'active' ? 'default' : 'secondary'}>
                            {kb.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-600">No knowledge bases connected</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conversation Learning */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-500" />
                    Conversation Learning
                  </CardTitle>
                  <CardDescription>
                    Agent learns from call transcripts automatically
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-emerald-900">
                          {selectedAgent.conversation_learning ? '✅ Enabled' : '❌ Disabled'}
                        </p>
                        <p className="text-sm text-emerald-700">
                          {recentCalls.length} recent calls analyzed
                        </p>
                      </div>
                      <Sparkles className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-sm space-y-1 text-emerald-800">
                      <p>• Extracts common questions from calls</p>
                      <p>• Identifies knowledge gaps automatically</p>
                      <p>• Improves responses over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Knowledge Gaps */}
            <TabsContent value="gaps" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Unanswered Questions
                  </CardTitle>
                  <CardDescription>
                    Questions your agent couldn't answer confidently
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {knowledgeGaps.length > 0 ? (
                    <div className="space-y-3">
                      {knowledgeGaps.map(gap => (
                        <div 
                          key={gap.id}
                          className={cn(
                            "p-4 rounded-lg border-2",
                            gap.status === 'pending' ? "bg-amber-50 border-amber-200" : 
                            gap.status === 'resolved' ? "bg-emerald-50 border-emerald-200" : 
                            "bg-slate-50 border-slate-200"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{gap.question}</p>
                              <p className="text-sm text-slate-500 mt-1">
                                Asked {gap.frequency} time{gap.frequency > 1 ? 's' : ''}
                              </p>
                            </div>
                            <Badge className={
                              gap.status === 'pending' ? 'bg-amber-500' :
                              gap.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-400'
                            }>
                              {gap.status}
                            </Badge>
                          </div>
                          {gap.suggested_answer && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <p className="text-xs text-slate-500 mb-1">Suggested Answer:</p>
                              <p className="text-sm text-slate-700">{gap.suggested_answer}</p>
                            </div>
                          )}
                          {gap.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" variant="outline">
                                Add to Knowledge Base
                              </Button>
                              <Button size="sm" variant="ghost">
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        No Knowledge Gaps Found
                      </h3>
                      <p className="text-slate-600">
                        Your agent is handling all questions confidently!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance */}
            <TabsContent value="performance" className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500">Confidence Score</p>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {((selectedAgent.knowledge_confidence_threshold || 0.8) * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Minimum threshold</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500">Learning Status</p>
                      <Brain className="w-4 h-4 text-purple-500" />
                    </div>
                    <Badge className={selectedAgent.learning_enabled ? "bg-emerald-500" : "bg-slate-400"}>
                      {selectedAgent.learning_enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-2">
                      {selectedAgent.learning_sources?.length || 0} sources
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500">Calls Analyzed</p>
                      <MessageSquare className="w-4 h-4 text-cyan-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{recentCalls.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Call Performance Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Call Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentCalls.length > 0 ? (
                    <div className="space-y-2">
                      {recentCalls.slice(0, 10).map(call => (
                        <div key={call.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{call.from_number || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">
                              {call.started_at ? new Date(call.started_at).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              call.sentiment === 'positive' ? 'bg-emerald-500' :
                              call.sentiment === 'neutral' ? 'bg-slate-400' :
                              call.sentiment === 'negative' ? 'bg-red-500' : 'bg-slate-300'
                            }>
                              {call.sentiment || 'Unknown'}
                            </Badge>
                            <Badge variant="outline">
                              {call.outcome || 'No outcome'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-600">No recent calls to analyze</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-500" />
                    Auto-Learning Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <h4 className="font-semibold text-indigo-900 mb-3">Current Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Learning Enabled:</span>
                        <span className="font-medium">
                          {selectedAgent.learning_enabled ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Auto-Update Website:</span>
                        <span className="font-medium">
                          {selectedAgent.auto_update_website ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Update Frequency:</span>
                        <span className="font-medium capitalize">
                          {selectedAgent.update_frequency || 'Weekly'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Conversation Learning:</span>
                        <span className="font-medium">
                          {selectedAgent.conversation_learning ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Confidence Threshold:</span>
                        <span className="font-medium">
                          {((selectedAgent.knowledge_confidence_threshold || 0.8) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <h4 className="font-medium text-cyan-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Learning Sources Active
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedAgent.learning_sources || []).map(source => (
                        <Badge key={source} className="bg-cyan-600">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    Edit Learning Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Training Actions</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm">Upload Documents</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Globe className="w-5 h-5 text-cyan-600" />
                  <span className="text-sm">Add Website</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <span className="text-sm">Add Manual FAQ</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}