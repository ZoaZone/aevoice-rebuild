import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function VoiceChatbot({ agentId, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [muted, setMuted] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const agents = await base44.entities.Agent.filter({ id: agentId });
      return agents[0];
    },
    enabled: !!agentId,
  });

  const { data: knowledgeChunks = [] } = useQuery({
    queryKey: ['agentKnowledge', agent?.knowledge_base_ids],
    queryFn: async () => {
      if (!agent?.knowledge_base_ids?.length) return [];
      const allChunks = await Promise.all(
        agent.knowledge_base_ids.map(id => 
          base44.entities.KnowledgeChunk.filter({ knowledge_base_id: id })
        )
      );
      return allChunks.flat();
    },
    enabled: !!agent?.knowledge_base_ids?.length,
  });

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['agentKnowledgeBases', agent?.knowledge_base_ids],
    queryFn: async () => {
      if (!agent?.knowledge_base_ids?.length) return [];
      const bases = await Promise.all(
        agent.knowledge_base_ids.map(id => base44.entities.KnowledgeBase.filter({ id }))
      );
      return bases.flat();
    },
    enabled: !!agent?.knowledge_base_ids?.length,
  });

  // Auto-detect language
  useEffect(() => {
    const detectLanguage = () => {
      if (agent?.language && agent.language !== 'en-US') {
        return agent.language;
      }
      return navigator.language || 'en-US';
    };
    
    setCurrentLanguage(detectLanguage());
  }, [agent]);

  // Ensure speech synthesis voices are loaded
  useEffect(() => {
    const loadVoices = () => {
      synthRef.current.getVoices();
    };
    
    // Load voices immediately
    loadVoices();
    
    // Also listen for voiceschanged event (needed in Chrome)
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = currentLanguage;

      recognitionRef.current.onresult = async (event) => {
        const userSpeech = event.results[event.results.length - 1][0].transcript;
        setTranscript(prev => [...prev, { role: 'user', text: userSpeech }]);

        try {
          const knowledgeContext = knowledgeChunks.map(chunk => 
            `${chunk.title || 'Info'}: ${chunk.content}`
          ).join('\n\n');

          const businessContext = knowledgeBases.map(kb => {
            let context = `${kb.name}: ${kb.description || ''}`;
            if (kb.business_name) context += `\nBusiness: ${kb.business_name}`;
            if (kb.industry) context += `\nIndustry: ${kb.industry}`;
            if (kb.services?.length) context += `\nServices: ${kb.services.join(', ')}`;
            if (kb.business_hours) context += `\nHours: ${JSON.stringify(kb.business_hours)}`;
            if (kb.faqs?.length) {
              context += `\nFAQs:\n${kb.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n')}`;
            }
            return context;
          }).join('\n\n');

          const languageInstruction = currentLanguage !== 'en-US' 
            ? `CRITICAL: Respond in ${currentLanguage}. ` : '';

          const fullPrompt = `${languageInstruction}You are ${agent?.name || 'an AI assistant'}.
${agent?.system_prompt || 'Be helpful and friendly.'}

Business Context: ${businessContext}

Knowledge: ${knowledgeContext}

User: ${userSpeech}

Respond naturally in ${currentLanguage}.`;

          const response = await base44.integrations.Core.InvokeLLM({
            prompt: fullPrompt,
            add_context_from_internet: false
          });

          const aiResponse = response;
          setTranscript(prev => [...prev, { role: 'assistant', text: aiResponse }]);

          if (!muted) {
            speak(aiResponse);
          }
        } catch (error) {
          console.error('Voice error:', error);
          toast.error('Failed to process');
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            setIsListening(false);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
    };
  }, [agentId, currentLanguage, muted, agent, knowledgeChunks, knowledgeBases, isListening]);

  const speak = (text) => {
    if (!text || text.trim().length === 0) {
      console.warn('VoiceChatbot: Empty text provided to speak()');
      return;
    }
    
    setIsSpeaking(true);
    synthRef.current.cancel();
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLanguage;
      utterance.rate = agent?.voice_settings?.speed || 1.0;
      utterance.pitch = agent?.voice_settings?.pitch || 1.0;
      
      const voices = synthRef.current.getVoices();
      const matchingVoice = voices.find(v => v.lang.startsWith(currentLanguage.split('-')[0]));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        toast.error('Speech output failed');
      };
      
      synthRef.current.speak(utterance);
    } catch (error) {
      console.error('Error in speak():', error);
      setIsSpeaking(false);
      toast.error('Could not produce speech');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        toast.error('Could not start voice');
      }
    }
  };

  const endCall = () => {
    recognitionRef.current?.stop();
    synthRef.current.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    onClose();
  };

  return (
    <Card className="fixed bottom-6 right-6 w-96 shadow-2xl border-2 border-blue-500 bg-white z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              isListening ? "bg-green-500" : "bg-slate-300"
            )} />
            <span className="font-semibold text-slate-900">AI Voice Assistant</span>
            <Badge variant="outline" className="text-xs">
              <Globe className="w-3 h-3 mr-1" />
              {currentLanguage.split('-')[0].toUpperCase()}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={endCall}
            className="text-red-600 hover:bg-red-100"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-64 overflow-y-auto mb-4 space-y-2 bg-slate-50 rounded-lg p-3 border">
          {transcript.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              Click microphone to start...
            </p>
          )}
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "p-2 rounded-lg text-sm",
                msg.role === 'user'
                  ? "bg-blue-100 text-blue-900 ml-8"
                  : "bg-slate-100 text-slate-900 mr-8"
              )}
            >
              {msg.text}
            </div>
          ))}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-sm text-indigo-600 animate-pulse">
              <Volume2 className="w-4 h-4" />
              <span>Speaking...</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={toggleListening}
            className={cn(
              "w-16 h-16 rounded-full shadow-lg transition-all",
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={() => setMuted(!muted)}
            className={muted ? "bg-red-50" : ""}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        {isListening && !isSpeaking && (
          <div className="mt-3 text-center">
            <p className="text-xs text-slate-500">Listening...</p>
          </div>
        )}
      </div>
    </Card>
  );
}