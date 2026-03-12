import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Play, Square, Volume2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function VoiceTester({ agent }) {
  const [testing, setTesting] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [response, setResponse] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const testVoice = async () => {
    if (!testInput.trim()) {
      toast.error("Please enter a test message");
      return;
    }

    setTesting(true);
    setResponse("");

    try {
      // Get knowledge base if configured
      let knowledgeContext = '';
      if (agent.knowledge_base_ids && agent.knowledge_base_ids.length > 0) {
        const chunks = await base44.entities.KnowledgeChunk.filter({
          knowledge_base_id: agent.knowledge_base_ids[0]
        });
        if (chunks && chunks.length > 0) {
          knowledgeContext = chunks.map(c => c.content).join('\n\n');
        }
      }

      const prompt = knowledgeContext
        ? `${agent.system_prompt}\n\nKNOWLEDGE BASE:\n${knowledgeContext}\n\nUser: ${testInput}\n\nAssistant:`
        : `${agent.system_prompt}\n\nUser: ${testInput}\n\nAssistant:`;

      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const aiResponse = llmResponse.data || llmResponse;
      setResponse(aiResponse);
      toast.success("Response generated!");
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Test failed: " + error.message);
    } finally {
      setTesting(false);
    }
  };

  const speakResponse = () => {
    if (!response) return;
    
    setSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(response);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="w-4 h-4" />
          Test Voice Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">Test Input</Label>
          <Input
            placeholder="e.g., What are your business hours?"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && testVoice()}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={testVoice}
            disabled={testing || !testInput.trim()}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            {testing ? "Testing..." : "Test Agent"}
          </Button>
          {response && (
            <Button
              onClick={speaking ? stopSpeaking : speakResponse}
              variant="outline"
              disabled={testing}
            >
              {speaking ? (
                <><Square className="w-4 h-4 mr-2" /> Stop</>
              ) : (
                <><Volume2 className="w-4 h-4 mr-2" /> Speak</>
              )}
            </Button>
          )}
        </div>

        {response && (
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <p className="text-xs text-slate-500 mb-1">Agent Response:</p>
            <p className="text-sm text-slate-900">{response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}