import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  VolumeX,
  Loader2,
  Bot,
  User,
  Phone,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function WidgetPreview({ agent, config, clientId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mode, setMode] = useState('chat'); // 'chat' or 'voice'
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  console.log('[WidgetPreview] Initialized with:', { 
    hasAgent: !!agent, 
    agentId: agent?.id, 
    clientId, 
    config 
  });

  // Fetch knowledge bases for this agent
  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['agentKnowledgeBases', agent?.id],
    queryFn: async () => {
      console.log('[WidgetPreview] Fetching knowledge bases for agent:', agent?.id);
      if (!agent?.knowledge_base_ids?.length) {
        console.log('[WidgetPreview] No knowledge base IDs configured for agent');
        return [];
      }
      const kbs = [];
      for (const kbId of agent.knowledge_base_ids) {
        try {
          const results = await base44.entities.KnowledgeBase.filter({ id: kbId });
          if (results[0]) {
            console.log('[WidgetPreview] Knowledge base fetched:', { id: results[0].id, name: results[0].name });
            kbs.push(results[0]);
          }
        } catch (e) {
          console.error("[WidgetPreview] Error fetching KB:", kbId, e);
        }
      }
      console.log('[WidgetPreview] Total knowledge bases fetched:', kbs.length);
      return kbs;
    },
    enabled: !!agent?.knowledge_base_ids?.length,
  });

  // Fetch knowledge chunks for context
  const { data: knowledgeChunks = [] } = useQuery({
    queryKey: ['agentKnowledgeChunks', agent?.knowledge_base_ids],
    queryFn: async () => {
      console.log('[WidgetPreview] Fetching knowledge chunks for agent:', agent?.id);
      if (!agent?.knowledge_base_ids?.length) {
        console.log('[WidgetPreview] No knowledge base IDs configured');
        return [];
      }
      const chunks = [];
      for (const kbId of agent.knowledge_base_ids) {
        try {
          const results = await base44.entities.KnowledgeChunk.filter({ knowledge_base_id: kbId });
          console.log('[WidgetPreview] Chunks fetched for KB:', { kbId, count: results.length });
          chunks.push(...results);
        } catch (e) {
          console.error("[WidgetPreview] Error fetching chunks:", kbId, e);
        }
      }
      console.log('[WidgetPreview] Total knowledge chunks fetched:', chunks.length);
      return chunks;
    },
    enabled: !!agent?.knowledge_base_ids?.length,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with greeting when opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && agent) {
      setMessages([{
        role: 'assistant',
        content: agent.greeting_message || config.greetingMessage || "Hi! How can I help you today?"
      }]);
    }
  }, [isOpen, agent, config.greetingMessage]);

  // Build context from knowledge base
  const buildKBContext = () => {
    if (!knowledgeChunks.length) return "";
    
    const contextParts = knowledgeChunks.slice(0, 10).map(chunk => {
      return `${chunk.title ? `## ${chunk.title}\n` : ''}${chunk.content}`;
    });
    
    return `\n\nKNOWLEDGE BASE CONTEXT:\n${contextParts.join('\n\n')}`;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    console.log('[WidgetPreview] Sending message:', { text, agentId: agent?.id, mode });

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const kbContext = buildKBContext();
      console.log('[WidgetPreview] KB context built:', { 
        hasContext: !!kbContext, 
        contextLength: kbContext.length 
      });
      
      const systemPrompt = agent?.system_prompt || `You are a helpful AI assistant for ${agent?.name || 'this business'}.`;
      
      const fullPrompt = `${systemPrompt}
${kbContext}

CONVERSATION HISTORY:
${conversationHistory}

User: ${text}

Respond helpfully and naturally. If you have relevant information from the knowledge base, use it. Keep responses concise.`;

      console.log('[WidgetPreview] Invoking LLM with prompt length:', fullPrompt.length);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false,
      });

      console.log('[WidgetPreview] LLM response received:', { 
        responseLength: response?.length 
      });

      const assistantMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);

      // Text-to-speech if in voice mode
      if (mode === 'voice' && config.enableVoice) {
        console.log('[WidgetPreview] Speaking response in voice mode');
        speakText(response);
      }
    } catch (error) {
      console.error("[WidgetPreview] Error sending message:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error. Please try again." 
      }]);
    }

    setIsLoading(false);
    console.log('[WidgetPreview] Message processing complete');
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to match voice settings
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('samantha')
      ) || voices[0];
      
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = agent?.voice_settings?.speed || 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in your browser. Please use Chrome.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true; // FIX: Enable continuous listening instead of stopping after each message
    recognitionRef.current.interimResults = true; // FIX: Show interim results for better UX
    recognitionRef.current.lang = agent?.language || 'en-US';

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = (e) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    };

    recognitionRef.current.onresult = (event) => {
      // FIX: In continuous mode, only process final results to avoid duplicate messages
      const lastResultIndex = event.results.length - 1;
      const result = event.results[lastResultIndex];
      
      if (result.isFinal) {
        const transcript = result[0].transcript;
        sendMessage(transcript);
      } else {
        // Show interim results in input (optional enhancement)
        const interimTranscript = result[0].transcript;
        setInputValue(interimTranscript);
      }
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const resetChat = () => {
    setMessages([]);
    if (agent) {
      setMessages([{
        role: 'assistant',
        content: agent.greeting_message || config.greetingMessage || "Hi! How can I help you today?"
      }]);
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  const chatPosition = {
    'bottom-right': 'bottom-16 right-4',
    'bottom-left': 'bottom-16 left-4',
    'top-right': 'top-16 right-4',
    'top-left': 'top-16 left-4',
  };

  if (!agent) {
    return (
      <div className="relative w-full h-[500px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
        <div className="text-center p-6">
          <Bot className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Select an AI Agent</p>
          <p className="text-sm text-slate-400">Choose an agent to see the live preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[550px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 overflow-hidden">
      {/* Mock Website Content */}
      <div className="p-6">
        <div className="w-28 h-6 bg-slate-300 rounded mb-3"></div>
        <div className="space-y-2">
          <div className="w-full h-3 bg-slate-200 rounded"></div>
          <div className="w-3/4 h-3 bg-slate-200 rounded"></div>
          <div className="w-5/6 h-3 bg-slate-200 rounded"></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="h-24 bg-slate-200 rounded"></div>
          <div className="h-24 bg-slate-200 rounded"></div>
        </div>
      </div>

      {/* Knowledge Base Info Badge */}
      {knowledgeBases.length > 0 && (
        <div className="absolute top-2 left-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Bot className="w-3 h-3" />
          {knowledgeChunks.length} KB chunks loaded
        </div>
      )}

      {/* Widget Button */}
      <button
        className={cn(
          "absolute z-10 flex items-center gap-2 px-4 py-3 rounded-full shadow-xl transition-all hover:scale-105",
          positionClasses[config.position]
        )}
        style={{ backgroundColor: config.buttonColor }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageSquare className="w-5 h-5 text-white" />
            <span className="text-white font-medium text-sm">{config.buttonText}</span>
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            "absolute z-20 w-[300px] h-[420px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200",
            chatPosition[config.position]
          )}
        >
          {/* Header */}
          <div 
            className="p-3 text-white flex justify-between items-center"
            style={{ backgroundColor: config.primaryColor }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm">{agent.name}</span>
                <p className="text-xs opacity-80">{mode === 'voice' ? 'Voice Mode' : 'Chat Mode'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={resetChat}
                className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
                title="Reset conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setMode('chat')}
              className={cn(
                "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors",
                mode === 'chat' 
                  ? "text-white" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
              style={{ backgroundColor: mode === 'chat' ? config.secondaryColor : 'transparent' }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Text Chat
            </button>
            {config.enableVoice && (
              <button
                onClick={() => setMode('voice')}
                className={cn(
                  "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors",
                  mode === 'voice' 
                    ? "text-white" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
                style={{ backgroundColor: mode === 'voice' ? config.secondaryColor : 'transparent' }}
              >
                <Phone className="w-3.5 h-3.5" />
                Voice
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 bg-slate-50 space-y-3 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div 
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div 
                  className={cn(
                    "p-2.5 rounded-xl text-sm max-w-[200px]",
                    msg.role === 'user' 
                      ? "bg-slate-700 text-white rounded-br-sm"
                      : "bg-white border border-slate-200 rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-600 flex-shrink-0 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div 
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 border-t bg-white">
            {mode === 'chat' ? (
              <div className="flex items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 h-9 text-sm"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  style={{ backgroundColor: config.buttonColor }}
                  className="h-9 w-9 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 py-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    isListening 
                      ? "bg-red-500 animate-pulse" 
                      : "bg-slate-700 hover:bg-slate-600"
                  )}
                >
                  {isListening ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-600"
                  >
                    <VolumeX className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            )}
            <p className="text-center text-[10px] text-slate-400 mt-1">
              {mode === 'voice' ? 'Tap mic to speak' : 'Press Enter to send'}
            </p>
          </div>
        </div>
      )}

      {/* Proactive Greeting Bubble */}
      {config.proactiveGreeting && !isOpen && (
        <div
          className={cn(
            "absolute z-10 bg-white rounded-xl shadow-xl p-3 max-w-[180px] border-2 animate-bounce",
            config.position === 'bottom-right' && 'bottom-16 right-4',
            config.position === 'bottom-left' && 'bottom-16 left-4',
            config.position === 'top-right' && 'top-16 right-4',
            config.position === 'top-left' && 'top-16 left-4'
          )}
          style={{ borderColor: config.primaryColor }}
        >
          <p className="text-xs text-slate-700">{config.greetingMessage}</p>
          <div 
            className="absolute -bottom-2 right-4 w-4 h-4 rotate-45 border-r-2 border-b-2 bg-white"
            style={{ borderColor: config.primaryColor }}
          />
        </div>
      )}
    </div>
  );
}