import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Brain,
  MessageSquare,
  Upload,
  Plus,
  Trash2,
  Play,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function AgentTraining({ agent, onUpdate }) {
  const [activeTab, setActiveTab] = useState("scenarios");
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testConversation, setTestConversation] = useState([]);
  const [testInput, setTestInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [trainingData, setTrainingData] = useState({
    scenarios: agent?.training_scenarios || [],
    objections: agent?.objection_handling || [],
    faqs: agent?.faq_responses || [],
    callFlow: agent?.call_flow || {
      greeting: agent?.greeting_message || "",
      qualification: [],
      closing: "",
      fallback: ""
    }
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.update(agent.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      onUpdate?.();
    },
  });

  // Generate training scenarios using AI
  const generateScenarios = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 5 realistic training scenarios for an AI voice agent with the following profile:
        
Agent Type: ${agent?.agent_type || 'receptionist'}
Industry: ${agent?.industry || 'general business'}
Description: ${agent?.description || 'General purpose voice assistant'}

For each scenario, provide:
1. Scenario name
2. Caller intent
3. Expected agent response
4. Success criteria

Format as JSON array.`,
        response_json_schema: {
          type: "object",
          properties: {
            scenarios: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  caller_intent: { type: "string" },
                  agent_response: { type: "string" },
                  success_criteria: { type: "string" }
                }
              }
            }
          }
        }
      });

      setTrainingData(prev => ({
        ...prev,
        scenarios: [...prev.scenarios, ...(response.scenarios || [])]
      }));
    } catch (error) {
      console.error("Failed to generate scenarios:", error);
    }
    setIsGenerating(false);
  };

  // Generate objection handling
  const generateObjections = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 5 common objections and professional responses for an AI voice agent:
        
Agent Type: ${agent?.agent_type || 'receptionist'}
Industry: ${agent?.industry || 'general business'}

For each objection, provide:
1. The objection/concern
2. Empathetic acknowledgment
3. Professional response
4. Follow-up question

Format as JSON array.`,
        response_json_schema: {
          type: "object",
          properties: {
            objections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  objection: { type: "string" },
                  acknowledgment: { type: "string" },
                  response: { type: "string" },
                  followup: { type: "string" }
                }
              }
            }
          }
        }
      });

      setTrainingData(prev => ({
        ...prev,
        objections: [...prev.objections, ...(response.objections || [])]
      }));
    } catch (error) {
      console.error("Failed to generate objections:", error);
    }
    setIsGenerating(false);
  };

  // Test conversation with AI
  const sendTestMessage = async () => {
    if (!testInput.trim()) return;

    const userMessage = { role: "user", content: testInput };
    setTestConversation(prev => [...prev, userMessage]);
    setTestInput("");

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI voice agent with the following configuration:
        
Name: ${agent?.name}
Type: ${agent?.agent_type}
System Prompt: ${agent?.system_prompt}
Greeting: ${agent?.greeting_message}

Respond to this caller message naturally as the voice agent would:
"${testInput}"

Keep response conversational and under 3 sentences.`,
      });

      setTestConversation(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      setTestConversation(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }
  };

  // Save all training data
  const saveTraining = () => {
    updateMutation.mutate({
      training_scenarios: trainingData.scenarios,
      objection_handling: trainingData.objections,
      faq_responses: trainingData.faqs,
      call_flow: trainingData.callFlow
    });
  };

  // Add new scenario
  const addScenario = () => {
    setTrainingData(prev => ({
      ...prev,
      scenarios: [...prev.scenarios, {
        name: "",
        caller_intent: "",
        agent_response: "",
        success_criteria: ""
      }]
    }));
  };

  // Remove scenario
  const removeScenario = (index) => {
    setTrainingData(prev => ({
      ...prev,
      scenarios: prev.scenarios.filter((_, i) => i !== index)
    }));
  };

  // Calculate training completeness
  const trainingScore = () => {
    let score = 0;
    if (trainingData.scenarios.length >= 3) score += 25;
    if (trainingData.objections.length >= 3) score += 25;
    if (trainingData.callFlow.greeting) score += 15;
    if (trainingData.callFlow.closing) score += 15;
    if (agent?.knowledge_base_ids?.length > 0) score += 20;
    return score;
  };

  return (
    <div className="space-y-6">
      {/* Training Score */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-100">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Training Score</h3>
                <p className="text-sm text-slate-500">How well-trained is your agent</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-600">{trainingScore()}%</p>
              <Badge className={cn(
                trainingScore() >= 80 ? "bg-emerald-100 text-emerald-700" :
                trainingScore() >= 50 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {trainingScore() >= 80 ? "Well Trained" : trainingScore() >= 50 ? "Needs Work" : "Untrained"}
              </Badge>
            </div>
          </div>
          <Progress value={trainingScore()} className="h-2" />
          <div className="grid grid-cols-4 gap-4 mt-4 text-center text-xs">
            <div className={trainingData.scenarios.length >= 3 ? "text-emerald-600" : "text-slate-400"}>
              <CheckCircle className={cn("w-4 h-4 mx-auto mb-1", 
                trainingData.scenarios.length >= 3 ? "text-emerald-500" : "text-slate-300")} />
              Scenarios
            </div>
            <div className={trainingData.objections.length >= 3 ? "text-emerald-600" : "text-slate-400"}>
              <CheckCircle className={cn("w-4 h-4 mx-auto mb-1",
                trainingData.objections.length >= 3 ? "text-emerald-500" : "text-slate-300")} />
              Objections
            </div>
            <div className={trainingData.callFlow.greeting ? "text-emerald-600" : "text-slate-400"}>
              <CheckCircle className={cn("w-4 h-4 mx-auto mb-1",
                trainingData.callFlow.greeting ? "text-emerald-500" : "text-slate-300")} />
              Call Flow
            </div>
            <div className={agent?.knowledge_base_ids?.length > 0 ? "text-emerald-600" : "text-slate-400"}>
              <CheckCircle className={cn("w-4 h-4 mx-auto mb-1",
                agent?.knowledge_base_ids?.length > 0 ? "text-emerald-500" : "text-slate-300")} />
              Knowledge
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="scenarios" className="gap-2">
            <Target className="w-4 h-4" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="objections" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Objections
          </TabsTrigger>
          <TabsTrigger value="callflow" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Call Flow
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <Play className="w-4 h-4" />
            Test
          </TabsTrigger>
        </TabsList>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Training Scenarios</h3>
              <p className="text-sm text-slate-500">Define common call scenarios</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addScenario}>
                <Plus className="w-4 h-4 mr-2" />
                Add Scenario
              </Button>
              <Button 
                onClick={generateScenarios} 
                disabled={isGenerating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "AI Generate"}
              </Button>
            </div>
          </div>

          {trainingData.scenarios.map((scenario, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Input
                    placeholder="Scenario name"
                    value={scenario.name}
                    onChange={(e) => {
                      const updated = [...trainingData.scenarios];
                      updated[index].name = e.target.value;
                      setTrainingData(prev => ({ ...prev, scenarios: updated }));
                    }}
                    className="font-medium"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeScenario(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Caller Intent</Label>
                    <Textarea
                      placeholder="What the caller wants..."
                      value={scenario.caller_intent}
                      onChange={(e) => {
                        const updated = [...trainingData.scenarios];
                        updated[index].caller_intent = e.target.value;
                        setTrainingData(prev => ({ ...prev, scenarios: updated }));
                      }}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Agent Response</Label>
                    <Textarea
                      placeholder="How agent should respond..."
                      value={scenario.agent_response}
                      onChange={(e) => {
                        const updated = [...trainingData.scenarios];
                        updated[index].agent_response = e.target.value;
                        setTrainingData(prev => ({ ...prev, scenarios: updated }));
                      }}
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {trainingData.scenarios.length === 0 && (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Target className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No scenarios yet. Add or generate some!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Objections Tab */}
        <TabsContent value="objections" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Objection Handling</h3>
              <p className="text-sm text-slate-500">Prepare responses for common objections</p>
            </div>
            <Button 
              onClick={generateObjections} 
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "AI Generate"}
            </Button>
          </div>

          {trainingData.objections.map((obj, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-slate-900">{obj.objection}</span>
                </div>
                <div className="pl-6 space-y-2 text-sm">
                  <p><span className="text-slate-500">Acknowledge:</span> {obj.acknowledgment}</p>
                  <p><span className="text-slate-500">Response:</span> {obj.response}</p>
                  <p><span className="text-slate-500">Follow-up:</span> {obj.followup}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Call Flow Tab */}
        <TabsContent value="callflow" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Call Flow Structure</CardTitle>
              <CardDescription>Define how your agent handles calls from start to finish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Opening Greeting</Label>
                <Textarea
                  placeholder="Hello! Thank you for calling..."
                  value={trainingData.callFlow.greeting}
                  onChange={(e) => setTrainingData(prev => ({
                    ...prev,
                    callFlow: { ...prev.callFlow, greeting: e.target.value }
                  }))}
                  rows={2}
                />
              </div>
              <div>
                <Label>Closing Message</Label>
                <Textarea
                  placeholder="Thank you for calling. Have a great day!"
                  value={trainingData.callFlow.closing}
                  onChange={(e) => setTrainingData(prev => ({
                    ...prev,
                    callFlow: { ...prev.callFlow, closing: e.target.value }
                  }))}
                  rows={2}
                />
              </div>
              <div>
                <Label>Fallback Response</Label>
                <Textarea
                  placeholder="I'm not sure I understood that. Could you please repeat?"
                  value={trainingData.callFlow.fallback}
                  onChange={(e) => setTrainingData(prev => ({
                    ...prev,
                    callFlow: { ...prev.callFlow, fallback: e.target.value }
                  }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-600" />
                Test Conversation
              </CardTitle>
              <CardDescription>Simulate a conversation with your agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-4 h-64 overflow-y-auto mb-4 space-y-3">
                {testConversation.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p>Start a test conversation</p>
                  </div>
                ) : (
                  testConversation.map((msg, i) => (
                    <div key={i} className={cn(
                      "p-3 rounded-lg max-w-[80%]",
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white ml-auto" 
                        : "bg-white border"
                    )}>
                      {msg.content}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a test message..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendTestMessage()}
                />
                <Button onClick={sendTestMessage} className="bg-indigo-600 hover:bg-indigo-700">
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveTraining}
          disabled={updateMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Zap className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Training"}
        </Button>
      </div>
    </div>
  );
}