import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import MessageBubble from "@/components/assistant/MessageBubble";
import {
  Send,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  {
    label: "Generate a receptionist prompt",
    message: "Generate a professional system prompt for a receptionist agent. The business is a dental clinic. The agent should be warm, friendly, and able to book appointments, answer FAQs about services, and transfer to staff when needed.",
  },
  {
    label: "Improve my existing prompt",
    message: "I have an existing system prompt for my sales agent but it feels robotic. Can you help me improve it? Here's my current prompt:\n\n\"You are a sales agent. Answer questions about our products. Be helpful.\"\n\nMy business sells software subscriptions.",
  },
  {
    label: "Create FAQs from description",
    message: "Create FAQ entries for a knowledge base. My business is a pet grooming salon called 'Paws & Claws'. We offer dog and cat grooming, nail trimming, teeth cleaning, and flea treatments. Hours are Mon-Sat 9am-6pm. Prices range from $30-$80 depending on pet size and service.",
  },
];

export default function AgentConfigChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const messagesEndRef = useRef(null);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Subscribe to active conversation
  useEffect(() => {
    if (!activeConversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(
      activeConversation.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );
    return () => unsubscribe();
  }, [activeConversation?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    const list = await base44.agents.listConversations({
      agent_name: "agent_config_assistant",
    });
    setConversations(list || []);
    if (list?.length > 0) {
      await selectConversation(list[0]);
    }
    setIsLoadingConversations(false);
  };

  const selectConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConversation(full);
    setMessages(full.messages || []);
  };

  const createNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: "agent_config_assistant",
      metadata: {
        name: `Config Session ${new Date().toLocaleDateString()}`,
      },
    });
    setConversations((prev) => [conv, ...prev]);
    setActiveConversation(conv);
    setMessages([]);
  };

  const handleSend = async (text) => {
    const messageText = text || inputText.trim();
    if (!messageText || isSending) return;

    let conv = activeConversation;
    if (!conv) {
      conv = await base44.agents.createConversation({
        agent_name: "agent_config_assistant",
        metadata: { name: `Config Session ${new Date().toLocaleDateString()}` },
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConversation(conv);
    }

    setInputText("");
    setIsSending(true);

    await base44.agents.addMessage(conv, {
      role: "user",
      content: messageText,
    });

    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAssistantTyping =
    isSending ||
    (messages.length > 0 &&
      messages[messages.length - 1]?.role === "user");

  return (
    <div className="flex h-[650px] rounded-xl border overflow-hidden bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col bg-slate-50 shrink-0 hidden md:flex">
        <div className="p-3 border-b">
          <Button
            onClick={createNewConversation}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg text-sm transition-colors",
                  activeConversation?.id === conv.id
                    ? "bg-indigo-100 text-indigo-900"
                    : "hover:bg-slate-100 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {conv.metadata?.name || "Untitled"}
                  </span>
                </div>
              </button>
            ))}
            {conversations.length === 0 && !isLoadingConversations && (
              <p className="text-xs text-slate-400 text-center py-4">
                No sessions yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Agent Config Assistant
            </h3>
            <p className="text-xs text-slate-500">
              Generate prompts, improve agents, create FAQs
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto md:hidden"
            onClick={createNewConversation}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Agent Configuration Assistant
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                I can help you generate system prompts, improve existing
                configurations, and create FAQ entries for your knowledge base.
              </p>
              <div className="grid gap-2 w-full max-w-md">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(qp.message)}
                    className="text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-sm text-slate-700"
                  >
                    <span className="font-medium text-indigo-700">
                      {qp.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isAssistantTyping && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to generate a prompt, improve your agent, or create FAQs..."
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isSending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}