import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, X, Send, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const AEVOICE_KNOWLEDGE = `
You are AEVA, the AEVOICE Support Assistant. You have comprehensive knowledge of the entire AEVOICE platform.

## PLATFORM OVERVIEW
AEVOICE is an AI Voice Platform that enables businesses to create intelligent voice agents for handling phone calls. It's a product of Zoa Zone Services LLC, USA. Contact: care@aevoice.ai

## SUBSCRIPTION PLANS
- **Aeva Mini** ($100/mo): 300 voice minutes, 1 AI Agent, 1 Phone Number, basic analytics
- **Aeva Micro** ($35/mo): Pay-as-you-go at $0.15/min, 3 AI Agents, 2 Phone Numbers, priority support
- **Aeva Medium** ($250/mo): 1,666 minutes, Unlimited Agents, white-label, API access
- **Aeva Mega** ($1,000/mo): 7,000+ minutes, 5% credit discount, dedicated support, voice cloning
- **Recording Add-on**: +$25/mo for Mini/Micro/Medium, +$100/mo for Mega

## CORE FEATURES

### AI Agents
- Create multi-purpose AI voice agents that can handle reception, sales, support, and appointments
- Choose from 20+ AI voices (OpenAI and ElevenLabs premium voices)
- Support for 50+ languages including English, Hindi, Telugu, Tamil, Spanish, French, etc.
- Customize personality traits: formality, friendliness, verbosity, empathy
- Configure greeting messages and system prompts
- Auto language detection and real-time voice switching

### Phone Numbers
- Connect phone numbers from providers like Twilio, Vonage, Plivo, Sinch
- Assign agents to phone numbers
- Configure routing rules and webhooks

### Knowledge Bases
- Train agents with FAQs, documents, and website content
- Upload PDFs, TXT, DOCX files
- Create FAQ entries manually
- Agents use this knowledge to answer caller questions accurately

### Call History & Analytics
- View all call sessions with transcripts and summaries
- Filter by status, direction, outcome
- See caller information and call duration
- Analytics dashboard with call volume trends, success rates, agent performance

### Integrations
- **CRM**: Salesforce, HubSpot, Zoho, Pipedrive, custom API
- **Calendar**: Cal.com, Google Calendar, Outlook, Apple Calendar
- **Contact Sync**: Google Contacts, Outlook Contacts, CSV import
- **Website Widget**: Embed AI agent on Wix, WordPress, Shopify, or custom sites

### Billing
- View subscription status and credit balance
- Top up credits ($0.15/min or $0.1425/min for Mega)
- Enable auto-recharge to never run out of credits
- View transaction history and manage payment methods

### Settings
- Agency information and branding
- White-label customization (colors, logo, custom domain)
- Telephony provider configuration
- Notification preferences, API keys and webhooks

## HOW-TO GUIDES

### Creating an Agent
1. Go to Dashboard → Click 'New Agent' or navigate to Agents page
2. Enter agent name and description
3. Choose a voice from 20+ options
4. Select primary language and enable additional languages
5. Configure personality traits with sliders
6. Set greeting message and system instructions
7. Connect knowledge bases for accurate responses
8. Activate agent

### Adding a Phone Number
1. Get a number from a provider (Twilio recommended)
2. Go to Phone Numbers → Add Number
3. Select your telephony provider
4. Enter API credentials (Account SID, Auth Token)
5. Enter phone number in E.164 format (+15551234567)
6. Assign to an AI agent

### Setting Up Auto-Recharge
1. Go to Billing page
2. Find Auto-Recharge card
3. Click 'Edit Settings'
4. Enable auto-recharge
5. Set threshold (e.g., 50 credits)
6. Set recharge amount (e.g., 100 credits)

### Embedding Website Widget
1. Go to Integrations page
2. Click 'Get Embed Code'
3. Select your AI agent
4. Copy the embed code
5. Paste into your website's HTML

## SUPPORT
For issues not covered here, contact support at care@aevoice.ai

Always be helpful, concise, and guide users step-by-step.
`;

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "👋 Hi! I'm AEVA, your AEVOICE Support Assistant. I can help you with anything on the platform!\n\nSelect a topic below or just ask me anything:\n\n🤖 **AI Agents** - Create, configure, train agents\n📞 **Phone Numbers** - Setup and routing\n📚 **Knowledge Bases** - Train with FAQs & docs\n📊 **Analytics** - Call metrics and reports\n💳 **Billing & Credits** - Plans, top-ups, auto-recharge\n🔗 **Integrations** - CRM, Calendar, Website widget\n⚙️ **Settings** - Branding, telephony, notifications\n\nHow can I help you today?"
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'AEVA'}: ${m.content}`).join('\n\n');
      
      const prompt = `${AEVOICE_KNOWLEDGE}

## CONVERSATION HISTORY
${conversationHistory}

User: ${userMessage}

Respond as AEVA, the friendly and helpful AEVOICE support assistant. Be concise but thorough. Use markdown formatting for clarity. If the question is about a specific feature, provide step-by-step guidance.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response 
      }]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize for the inconvenience. Please try again or contact our support team at care@aevoice.ai for assistance." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#0e4166] to-cyan-600 text-white shadow-lg shadow-[#0e4166]/30 flex items-center justify-center transition-all hover:scale-110",
          isOpen && "hidden"
        )}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0e4166] to-cyan-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">AEVA Support</h3>
                <p className="text-xs text-white/80">AI Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  msg.role === "user" 
                    ? "bg-[#0e4166] text-white" 
                    : "bg-slate-100 text-slate-800"
                )}>
                  {msg.role === "user" ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Topics & Input */}
          <div className="p-4 border-t border-slate-200 space-y-2">
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    Quick Topics
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => setInputValue("How do I create an AI agent?")}>
                    🤖 Creating AI Agents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInputValue("How do I add a phone number?")}>
                    📞 Phone Number Setup
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInputValue("How do I create a knowledge base?")}>
                    📚 Knowledge Base Training
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setInputValue("How do I top up my credits?")}>
                    💳 Credit Top-ups
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInputValue("How do I enable auto-recharge?")}>
                    🔄 Auto-Recharge Setup
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInputValue("What subscription plans are available?")}>
                    📋 Subscription Plans
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setInputValue("How do I connect a CRM integration?")}>
                    🔗 CRM Integration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInputValue("How do I sync my calendar?")}>
                    📅 Calendar Sync
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInputValue("How do I embed the website widget?")}>
                    🌐 Website Widget
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setInputValue("How do I view call analytics?")}>
                    📊 Call Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInputValue("How do I customize branding?")}>
                    🎨 White-label Branding
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything about AEVOICE..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !inputValue.trim()}
                className="bg-[#0e4166] hover:bg-[#0a2540]"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}