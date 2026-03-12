import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Search,
  BookOpen,
  Bot,
  Phone,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  PlayCircle,
  FileText,
  ExternalLink,
  ArrowRight,
  Lightbulb,
  Zap,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const categories = [
  { id: "getting_started", label: "Getting Started", icon: Zap, color: "bg-emerald-100 text-emerald-600" },
  { id: "agents", label: "AI Agents", icon: Bot, color: "bg-indigo-100 text-indigo-600" },
  { id: "telephony", label: "Phone Numbers", icon: Phone, color: "bg-blue-100 text-blue-600" },
  { id: "billing", label: "Billing & Credits", icon: CreditCard, color: "bg-amber-100 text-amber-600" },
  { id: "knowledge", label: "Knowledge Bases", icon: BookOpen, color: "bg-purple-100 text-purple-600" },
  { id: "analytics", label: "Analytics", icon: BarChart3, color: "bg-pink-100 text-pink-600" },
];

const quickStartGuides = [
  {
    title: "Create Your First AI Agent",
    description: "Step-by-step guide to building a voice agent in 5 minutes",
    duration: "5 min",
    steps: [
      { title: "Navigate to Agents", description: "Click 'Agents' in the sidebar" },
      { title: "Click 'Create Agent'", description: "Start the agent builder wizard" },
      { title: "Choose Agent Type", description: "Select receptionist, sales, or support" },
      { title: "Configure Voice", description: "Pick a voice and language" },
      { title: "Set Behavior", description: "Customize greeting and personality" },
      { title: "Add Knowledge", description: "Connect FAQs for accurate responses" },
      { title: "Activate", description: "Turn on your agent and test!" },
    ]
  },
  {
    title: "Set Up Auto-Recharge",
    description: "Never run out of credits with automatic top-ups",
    duration: "2 min",
    steps: [
      { title: "Go to Billing", description: "Click 'Billing' in the sidebar" },
      { title: "Find Auto-Recharge", description: "Locate the Auto-Recharge card" },
      { title: "Enable Toggle", description: "Turn on auto-recharge" },
      { title: "Set Threshold", description: "Choose when to trigger (e.g., $50)" },
      { title: "Set Amount", description: "Choose how much to add (e.g., $100)" },
      { title: "Add Payment Method", description: "Enter your card details" },
    ]
  },
  {
    title: "Connect a Phone Number",
    description: "Get a phone number for your AI agent",
    duration: "3 min",
    steps: [
      { title: "Go to Phone Numbers", description: "Click 'Phone Numbers' in sidebar" },
      { title: "Click 'Add Number'", description: "Start the number setup" },
      { title: "Enter Number", description: "Add your phone number in E.164 format" },
      { title: "Assign Agent", description: "Select which AI agent answers" },
      { title: "Configure Routing", description: "Set up call routing rules" },
    ]
  },
];

const faqItems = [
  {
    question: "How does billing work?",
    answer: "You're billed monthly based on your Aeva plan. Aeva Mini ($100/mo) includes 300 minutes, Aeva Micro ($35/mo) is pay-as-you-go at $0.15/min, Aeva Medium ($250/mo) includes 1,666 minutes, and Aeva Mega ($1,000/mo) includes 7,000+ minutes. Auto-recharge keeps your credits topped up automatically."
  },
  {
    question: "Can I change my AI agent's voice?",
    answer: "Yes! Go to Agents → Select your agent → Edit → Voice tab. You can choose from multiple voice options including OpenAI and ElevenLabs voices, and adjust speed, pitch, and other settings."
  },
  {
    question: "What happens if I run out of credits?",
    answer: "If you have auto-recharge enabled, we'll automatically add credits when you hit the threshold. Without auto-recharge, your agents may become unavailable until you add credits manually."
  },
  {
    question: "How do I train my agent with custom knowledge?",
    answer: "Go to Knowledge → Create a Knowledge Base → Add FAQs or upload documents. Then link the knowledge base to your agent in the agent settings."
  },
  {
    question: "Can I use my own Twilio account?",
    answer: "Yes! AEVOICE supports BYO Twilio. Go to Settings → Telephony → 'Bring Your Own Twilio' and enter your credentials. Phone numbers are obtained from your chosen telephony provider. All telecom regulations, compliance, and usage are governed by you and your provider - AEVOICE is an intermediary platform only."
  },
  {
    question: "How many phone numbers can I attach?",
    answer: "Aeva Mini: 1 number, Aeva Micro: up to 2 numbers, Aeva Medium & Mega: Unlimited numbers. You obtain phone numbers from third-party providers (like Twilio) and attach them to your AEVOICE agents."
  },
  {
    question: "What is the Recording Add-on?",
    answer: "For $25/month, you can add call recording and transcription to any Aeva plan (Mini, Micro, or Medium). Aeva Mega includes recording at 10% of the package price. Recordings are auto-deleted based on your retention policy (daily, weekly, or monthly)."
  },
  {
    question: "Can I transfer unused credits?",
    answer: "Yes! Unused credits never expire and can be transferred to a different plan or to another account within the AEVOICE platform. Contact support to initiate a transfer."
  },
  {
    question: "What is the refund policy?",
    answer: "AEVOICE is a SaaS platform. All purchases are final and non-refundable. This includes subscription fees and purchased credits. However, unused credits are fully transferable within the platform."
  },
  {
    question: "How do I add AI to my website (Wix, WordPress, etc.)?",
    answer: "Go to Integrations → Website Widget → Get Embed Code. Copy the code and paste it into your website. Works with Wix, WordPress, Shopify, and any custom website. The widget enables voice or chat interaction with your AI agent."
  },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("getting_started");

  const { data: articles = [] } = useQuery({
    queryKey: ['helpArticles'],
    queryFn: () => base44.entities.HelpArticle.list(),
  });

  const filteredArticles = selectedCategory 
    ? articles.filter(article => article.category === selectedCategory)
    : articles.filter(article =>
        article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          Help Center
        </h1>
        <p className="text-slate-500 mb-6">
          Find guides, tutorials, and answers to get the most out of your AI voice platform
        </p>
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search for help articles, guides, FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-6 text-lg"
          />
        </div>
      </div>

      {/* Quick Start Guides */}
      {!selectedGuide && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Quick Start Guides
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {quickStartGuides.map((guide, index) => (
              <Card 
                key={index}
                className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedGuide(guide)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                      {guide.duration}
                    </Badge>
                    <Badge variant="outline">{guide.steps.length} steps</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-slate-500">{guide.description}</p>
                  <div className="flex items-center gap-1 mt-4 text-sm text-indigo-600 font-medium">
                    View Guide
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Guide Detail */}
      {selectedGuide && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedGuide(null)}
                  className="mb-2"
                >
                  ← Back to guides
                </Button>
                <CardTitle>{selectedGuide.title}</CardTitle>
                <CardDescription>{selectedGuide.description}</CardDescription>
              </div>
              <Badge className="bg-indigo-100 text-indigo-700">
                {selectedGuide.steps.length} steps
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {selectedGuide.steps.map((step, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{step.title}</h4>
                    <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-900">You're all set!</p>
                  <p className="text-sm text-emerald-700">
                    Follow these steps and you'll be up and running in no time.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {!selectedGuide && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "p-4 rounded-xl border-2 text-center transition-all",
                  selectedCategory === category.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                  category.color
                )}>
                  <category.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">{category.label}</p>
              </button>
            ))}
          </div>

          {/* Category Articles */}
          {selectedCategory && filteredArticles.length > 0 && (
            <div className="mt-6 grid gap-3">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-slate-900 mb-1">{article.title}</h3>
                    <p className="text-sm text-slate-600">{article.summary || article.content?.substring(0, 150)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {selectedCategory && filteredArticles.length === 0 && (
            <div className="mt-6 text-center p-8 bg-slate-50 rounded-xl">
              <p className="text-slate-500">No articles in this category yet</p>
            </div>
          )}
        </div>
      )}

      {/* FAQ Section */}
      {!selectedGuide && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-slate-400" />
            Frequently Asked Questions
          </h2>
          <Card className="border-0 shadow-md">
            <CardContent className="p-0 divide-y">
              {faqItems.map((faq, index) => (
                <details key={index} className="group">
                  <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50">
                    <span className="font-medium text-slate-900">{faq.question}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-5 pb-5 text-slate-600">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact Support */}
      {!selectedGuide && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-[#0e4166] to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Still need help?</h3>
                <p className="text-indigo-100">
                  Our support team is here to help you succeed
                </p>
              </div>
              <div className="flex gap-3">
                <Button className="bg-white text-indigo-700 hover:bg-indigo-50">
                  <FileText className="w-4 h-4 mr-2" />
                  Submit Ticket
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Watch Tutorials
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}