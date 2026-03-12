import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Loader2, PlayCircle, StopCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AgentVoiceTester({ agent }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthesisRef.current) window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const speak = async (text) => {
    // Stop previous
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);

    try {
      // Try server-side preview first for premium quality
      const res = await base44.functions.invoke('previewVoice', {
        text,
        voice_id: agent.voice_id,
        provider: agent.voice_provider
      });

      // Check if server requested browser TTS (e.g. for Twilio voices)
      if (res.data?.use_browser_tts) {
          console.log("Server requested Browser TTS fallback for", agent.voice_provider);
          // Fall through to browser TTS
      } else if (res.data?.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio_base64}`);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          console.error("Audio playback error");
          setIsSpeaking(false);
        };
        await audio.play();
        return;
      }
      } catch (e) {
      console.warn("Server preview failed, falling back to browser TTS", e);
      }

      // Fallback to Browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = agent.language || 'en-US';
      utterance.rate = agent.voice_settings?.speed || 1.0;

      // Attempt to find a matching voice
      const voices = window.speechSynthesis.getVoices();
      // Try to match specific voice names if possible (e.g. Google US English, etc.)
      // or try to match the agent's gender/name roughly if possible
      if (voices.length > 0) {
        // Simple heuristic
        const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
        if (preferred) utterance.voice = preferred;
      }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Voice recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = agent.language || 'en-US';

      recognition.onresult = async (event) => {
        const userSpeech = event.results[0][0].transcript;
        setTranscript(userSpeech);
        setIsListening(false);
        await processVoiceInput(userSpeech);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied');
        } else {
          toast.error('Recognition error: ' + event.error);
        }
      };

      recognition.onend = () => setIsListening(false);

      recognition.start();
      setIsListening(true);
    } catch (error) {
      toast.error('Could not start voice recognition');
      setIsListening(false);
    }
  };

  const processVoiceInput = async (userInput) => {
    setIsProcessing(true);
    
    try {
      // Get knowledge base context
      let knowledgeContext = '';
      if (agent.knowledge_base_ids?.length > 0) {
        for (const kbId of agent.knowledge_base_ids.slice(0, 2)) {
          const chunks = await base44.entities.KnowledgeChunk.filter({ 
            knowledge_base_id: kbId 
          });
          
          if (chunks.length > 0) {
            knowledgeContext += chunks.map(c => 
              `${c.title ? c.title + ':\n' : ''}${c.content}`
            ).join('\n\n---\n\n');
          }
        }
      }

      // Build conversation context
      const conversationContext = conversationHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      const systemPrompt = agent.system_prompt || 'You are a helpful assistant.';
      const fullPrompt = `${systemPrompt}

${knowledgeContext ? `=== KNOWLEDGE BASE ===\n${knowledgeContext.substring(0, 10000)}\n=== END KNOWLEDGE BASE ===\n\nUSE THE KNOWLEDGE BASE ABOVE TO ANSWER ACCURATELY.\n\n` : ''}

${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}

User: ${userInput}

Provide a brief, natural, conversational response:`;

      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      const assistantResponse = typeof llmResponse === 'string' ? llmResponse : 
                               llmResponse?.data ? String(llmResponse.data) : 
                               String(llmResponse);

      setResponse(assistantResponse);
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: userInput },
        { role: 'assistant', content: assistantResponse }
      ]);

      // Speak the response
      speak(assistantResponse);

      } catch (error) {
      toast.error('Processing error: ' + error.message);
      const errorMsg = "I apologize, I'm having trouble processing that request.";
      setResponse(errorMsg);
      speak(errorMsg);
    }
    
    setIsProcessing(false);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const resetTest = () => {
    stopListening();
    stopSpeaking();
    setTranscript("");
    setResponse("");
    setConversationHistory([]);
  };

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-emerald-600" />
          Test Voice Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-4 p-6">
          {!isListening && !isProcessing && !isSpeaking ? (
            <Button
              onClick={startListening}
              size="lg"
              className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl"
            >
              <div className="flex flex-col items-center gap-2">
                <Mic className="w-10 h-10 text-white" />
                <span className="text-white text-sm">Start Test</span>
              </div>
            </Button>
          ) : isListening ? (
            <Button
              onClick={stopListening}
              size="lg"
              className="w-32 h-32 rounded-full bg-red-500 hover:bg-red-600 shadow-xl animate-pulse"
            >
              <div className="flex flex-col items-center gap-2">
                <MicOff className="w-10 h-10 text-white" />
                <span className="text-white text-sm">Listening...</span>
              </div>
            </Button>
          ) : isProcessing ? (
            <div className="w-32 h-32 rounded-full bg-blue-500 shadow-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
                <span className="text-white text-sm">Processing...</span>
              </div>
            </div>
          ) : isSpeaking ? (
            <Button
              onClick={stopSpeaking}
              size="lg"
              className="w-32 h-32 rounded-full bg-purple-500 hover:bg-purple-600 shadow-xl"
            >
              <div className="flex flex-col items-center gap-2">
                <Volume2 className="w-10 h-10 text-white animate-pulse" />
                <span className="text-white text-sm">Speaking...</span>
              </div>
            </Button>
          ) : null}
        </div>

        {conversationHistory.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto bg-white rounded-lg p-4">
            {conversationHistory.map((msg, i) => (
              <div key={i} className={cn(
                "flex gap-2 items-start",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "max-w-[80%] px-3 py-2 rounded-lg text-sm",
                  msg.role === 'user' 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-100 text-slate-900"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' ? <Volume2 className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    <span className="text-xs opacity-70">{msg.role === 'user' ? 'You' : agent.name}</span>
                  </div>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={resetTest} variant="outline" className="flex-1">
            Reset Test
          </Button>
          <Button 
            onClick={() => speak(agent.greeting_message || "Hello! How can I help you today?")}
            variant="outline" 
            className="flex-1"
            disabled={isSpeaking}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Test Greeting
          </Button>
        </div>

        <div className="p-3 bg-white rounded-lg border space-y-2">
          <div>
            <p className="text-xs text-slate-500 mb-1">Testing configuration:</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">{agent.voice_id}</Badge>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">{agent.language}</Badge>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{agent.knowledge_base_ids?.length || 0} Knowledge Bases</Badge>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
            <Volume2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p>
              Note: This tester uses your browser's built-in text-to-speech engine for instant feedback. 
              The actual phone calls will use the high-quality <strong>{agent.voice_provider}</strong> voice you selected.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}