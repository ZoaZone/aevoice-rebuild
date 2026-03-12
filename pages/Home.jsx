import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  ArrowRight,
  Play,
  Phone,
  Bot,
  Zap,
  Globe,
  Mic,
  Volume2,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  FileText,
  BookOpen,
  MessageSquare,
  Clock,
  Users,
  Brain,
  Upload,
  Link2,
  TrendingUp,
  Shield,
  Cpu,
  Activity,
  BarChart3,
  Menu,
  X,
  Gift
} from "lucide-react";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import SriAssistant from "@/components/assistant/SriAssistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [currentWord, setCurrentWord] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const words = ["Answer Calls", "Book Appointments", "Handle Support", "Qualify Leads"];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await base44.auth.isAuthenticated();
        setIsAuthenticated(auth);
      } catch (e) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(createPageUrl("Dashboard"));
    } else {
      base44.auth.redirectToLogin(createPageUrl("FeatureSelection"));
    }
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      navigate(createPageUrl("Dashboard"));
    } else {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse">
                <Cpu className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" />
          </div>
          <p className="text-slate-500 mt-6 font-mono text-sm tracking-widest">INITIALIZING...</p>
        </div>
      </div>
    );
  }

  const plans = [
    {
      name: "Sri Plan",
      price: "10-50",
      description: "Website Voice Assistant",
      features: ["Embed on your website", "Learn from your site", "Handle tasks & queries", "Voice + Chat interface"],
      special: true,
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
    },
    {
      name: "Aeva Mini",
      price: 100,
      description: "Perfect for small businesses",
      features: ["300 voice minutes", "1 AI Agent", "1 Phone Number", "Basic analytics"],
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/c0440c7bb_IMG_5882.PNG"
    },
    {
      name: "Aeva Micro",
      price: 35,
      description: "Pay-as-you-go flexibility",
      features: ["Pay $0.15/min", "3 AI Agents", "2 Phone Numbers", "Priority support"],
      popular: true,
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/fc03c9ad7_IMG_5883.PNG"
    },
    {
      name: "Aeva Medium",
      price: 250,
      description: "For growing organizations",
      features: ["1,666 minutes", "Unlimited Agents", "Sri Assistant INCLUDED", "API access"],
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/0b561957e_IMG_5884.PNG"
    },
    {
      name: "Aeva Mega",
      price: 1000,
      description: "Enterprise scale",
      features: ["7,000+ minutes", "Sri Assistant INCLUDED", "Dedicated support", "Voice cloning"],
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/4ed2a541f_IMG_5885.PNG"
    }
  ];

  const efficiencyStats = [
    { icon: Clock, value: "80%", label: "Time Saved", desc: "On call handling" },
    { icon: TrendingUp, value: "3x", label: "More Leads", desc: "Captured automatically" },
    { icon: Users, value: "24/7", label: "Availability", desc: "Never miss a call" },
    { icon: BarChart3, value: "60%", label: "Cost Reduction", desc: "vs. human agents" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>AEVOICE - AI Voice Agents for Business | Automated Receptionist & Sales Calls</title>
        <meta name="title" content="AEVOICE - AI Voice Agents for Business | Automated Receptionist & Sales Calls" />
        <meta name="description" content="Transform your business with AI-powered voice agents. Automate calls, handle customer support, book appointments, and close sales 24/7 with AEVOICE's intelligent voice platform." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aevoice.ai/" />
        <meta property="og:title" content="AEVOICE - AI Voice Agents That Never Sleep | Automate Your Business Calls" />
        <meta property="og:description" content="Stop missing calls. AEVOICE AI agents answer every call, qualify leads, book appointments, and provide 24/7 customer support. Start from $35/month." />
        <meta property="og:image" content="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://aevoice.ai/" />
        <meta property="twitter:title" content="AEVOICE - AI Voice Agents for Modern Businesses" />
        <meta property="twitter:description" content="Automate calls, support, and sales with AI voice agents. Answer every call, qualify leads, and never miss an opportunity. Plans from $35/month." />
        <meta property="twitter:image" content="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" />
        
        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "AEVOICE",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "USD",
              "lowPrice": "35",
              "highPrice": "1000"
            },
            "description": "AI-powered voice agent platform for businesses. Automate receptionist duties, sales calls, customer support, and appointment scheduling with intelligent voice AI.",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "127"
            },
            "provider": {
              "@type": "Organization",
              "name": "Zoa Zone Services LLC",
              "url": "https://aevoice.ai",
              "logo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG",
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "care@aevoice.ai",
                "contactType": "Customer Service"
              },
              "sameAs": [
                "https://www.linkedin.com/company/aevoice",
                "https://twitter.com/aevoice"
              ]
            },
            "featureList": [
              "AI Voice Agents",
              "24/7 Call Handling",
              "Appointment Scheduling",
              "Lead Qualification",
              "Multi-language Support",
              "CRM Integration",
              "Call Recording & Transcription"
            ]
          })}
        </script>
      </Helmet>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        .font-display { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }
        
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        
        .hero-gradient {
          background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(6, 182, 212, 0.15), transparent);
        }
      `}</style>

      {/* Background Effects */}
      <div className="fixed inset-0 grid-pattern" />
      <div className="fixed inset-0 hero-gradient" />
      
      {/* Animated Orbs */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px] animate-glow" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] animate-glow" style={{ animationDelay: '1.5s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[180px]" />

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-4 sm:px-8 lg:px-16 py-4 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-40" />
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
              alt="AEVOICE" 
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover"
            />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight font-display">AEVOICE</span>
            <p className="text-[8px] sm:text-[10px] text-cyan-400 font-mono tracking-[0.2em] sm:tracking-[0.3em] -mt-1">VOICE AI PLATFORM</p>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          <a href="#what-is-voice-ai" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
            What is Voice AI?
          </a>
          <a href="#efficiency" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
            Benefits
          </a>
          <a href="#plans" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
            Pricing
          </a>
          {isAuthenticated ? (
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/25 font-medium">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          ) : (
            <>
              <Button variant="ghost" onClick={handleLogin} className="text-slate-400 hover:text-white hover:bg-white/5">
                Login
              </Button>
              <Button onClick={handleGetStarted} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/25 font-medium">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#020617]/95 backdrop-blur-lg pt-20 px-6">
          <div className="flex flex-col gap-4">
            <a href="#what-is-voice-ai" onClick={() => setMobileMenuOpen(false)} className="text-lg text-slate-300 hover:text-white transition-colors font-medium py-3 border-b border-slate-800">
              What is Voice AI?
            </a>
            <a href="#efficiency" onClick={() => setMobileMenuOpen(false)} className="text-lg text-slate-300 hover:text-white transition-colors font-medium py-3 border-b border-slate-800">
              Benefits
            </a>
            <a href="#plans" onClick={() => setMobileMenuOpen(false)} className="text-lg text-slate-300 hover:text-white transition-colors font-medium py-3 border-b border-slate-800">
              Pricing
            </a>
            <Button variant="ghost" onClick={() => { handleLogin(); setMobileMenuOpen(false); }} className="justify-start text-lg text-slate-300 hover:text-white hover:bg-white/5 py-3">
              Login
            </Button>
            <Button onClick={() => { handleGetStarted(); setMobileMenuOpen(false); }} className="mt-4 h-14 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/25 font-medium">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-8 lg:px-16 pt-10 sm:pt-20 pb-16 sm:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <Badge className="mb-4 sm:mb-6 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[10px] sm:text-xs tracking-wider">
                <Cpu className="w-3 h-3 mr-1 sm:mr-2" />
                NEXT-GEN AI VOICE TECHNOLOGY
              </Badge>
              
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 font-display leading-[1.1]">
                <span className="text-white">Your AI That Can</span>
                <br />
                <span className="relative">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {words[currentWord]}
                  </span>
                  <span className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full opacity-50" />
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-slate-400 mb-6 sm:mb-8 leading-relaxed font-display">
                <span className="text-white font-semibold">AEVOICE</span> is an intelligent voice assistant that handles 
                your business calls autonomously — answering inquiries, booking appointments, and supporting customers 
                around the clock with human-like conversation.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-10 justify-center lg:justify-start">
                <Button size="lg" onClick={handleGetStarted} className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/30 border-0 font-semibold">
                  <Zap className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  Start Building — From $35/mo
                </Button>
                <a href="#what-is-voice-ai">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white font-medium">
                    <Play className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                    Learn More
                  </Button>
                </a>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-6 sm:gap-8 justify-center lg:justify-start">
                {[
                  { value: "<200ms", label: "Response" },
                  { value: "50+", label: "Languages" },
                  { value: "99.9%", label: "Uptime" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-white font-mono">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative hidden lg:block">
              <div className="relative animate-float">
                {/* Main Visual Container */}
                <div className="relative w-full aspect-square max-w-lg mx-auto">
                  {/* Outer Ring */}
                  <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
                  <div className="absolute inset-4 rounded-full border border-cyan-500/10" />
                  <div className="absolute inset-8 rounded-full border border-cyan-500/5" />
                  
                  {/* Pulse Rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-pulse-ring" />
                  
                  {/* Center Logo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute -inset-8 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-full blur-2xl" />
                      <div className="relative w-40 h-40 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                        <img 
                          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
                          alt="AEVOICE" 
                          className="w-28 h-28 rounded-2xl object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Floating Icons */}
                  <div className="absolute top-10 left-10 p-3 rounded-xl bg-slate-800/80 border border-slate-700 backdrop-blur-sm shadow-lg">
                    <Phone className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="absolute top-20 right-8 p-3 rounded-xl bg-slate-800/80 border border-slate-700 backdrop-blur-sm shadow-lg">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="absolute bottom-20 left-8 p-3 rounded-xl bg-slate-800/80 border border-slate-700 backdrop-blur-sm shadow-lg">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="absolute bottom-10 right-10 p-3 rounded-xl bg-slate-800/80 border border-slate-700 backdrop-blur-sm shadow-lg">
                    <Volume2 className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Voice AI Section */}
      <section id="what-is-voice-ai" className="relative z-10 px-8 lg:px-16 py-24 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-mono text-sm tracking-widest mb-4">UNDERSTANDING THE TECHNOLOGY</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-display">
              <span className="text-white">What is</span>{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Voice AI?</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
              Voice AI combines speech recognition, natural language understanding, and text-to-speech 
              to create intelligent assistants that can have natural phone conversations — just like a human.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                icon: Mic,
                title: "Speech Recognition",
                description: "Advanced AI listens and understands what callers say, including accents, dialects, and industry-specific terminology.",
                color: "from-cyan-500 to-blue-500"
              },
              {
                icon: Brain,
                title: "Natural Language Processing",
                description: "Comprehends context, intent, and nuance. It doesn't just hear words — it understands meaning and responds intelligently.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Volume2,
                title: "Human-Like Voice",
                description: "Responds with natural, expressive speech. Choose from 20+ voices in 50+ languages that sound genuinely human.",
                color: "from-emerald-500 to-teal-500"
              }
            ].map((item, i) => (
              <Card key={i} className="group bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 transition-all duration-500 overflow-hidden">
                <CardContent className="p-8">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 group-hover:scale-110 transition-transform",
                    item.color
                  )}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3 font-display">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Visual Diagram */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/30 border border-slate-700/50">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700">
                <Phone className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-white font-medium">Caller Speaks</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600" />
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700">
                <Mic className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-white font-medium">AI Listens</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600" />
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-white font-medium">AI Understands</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600" />
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700">
                <Cpu className="w-5 h-5 text-pink-400" />
                <span className="text-sm text-white font-medium">AI Decides</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600" />
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700">
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-white font-medium">AI Responds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Efficiency Section */}
      <section id="efficiency" className="relative z-10 px-8 lg:px-16 py-24 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-mono text-sm tracking-widest mb-4">MEASURABLE IMPACT</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-display">
              <span className="text-white">How Voice AI</span>{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Improves Efficiency</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto">
              Businesses using AI voice assistants see dramatic improvements in productivity, 
              customer satisfaction, and bottom-line results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {efficiencyStats.map((stat, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 transition-all group">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <stat.icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <p className="text-4xl font-bold text-white font-mono mb-1">{stat.value}</p>
                  <p className="text-white font-semibold mb-1">{stat.label}</p>
                  <p className="text-sm text-slate-500">{stat.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benefits List */}
          <div className="mt-16 grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white mb-6 font-display">For Your Business</h3>
              {[
                "Never miss a call — AI answers 24/7/365",
                "Handle unlimited simultaneous calls",
                "Instant scalability without hiring",
                "Consistent, professional responses every time",
                "Detailed analytics on every conversation"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white mb-6 font-display">For Your Customers</h3>
              {[
                "Zero wait time — instant connection",
                "Natural, conversational experience",
                "Accurate answers from your knowledge base",
                "Seamless handoff to humans when needed",
                "Consistent service quality at any hour"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 px-8 lg:px-16 py-24 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-mono text-sm tracking-widest mb-4">SIMPLE SETUP</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-display">
              <span className="text-white">Get Started in</span>{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">3 Easy Steps</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Agent",
                description: "Name your AI, select a voice, set the greeting. Customize personality and behavior to match your brand.",
                color: "from-cyan-500 to-blue-600"
              },
              {
                step: "02",
                title: "Train With Knowledge",
                description: "Upload PDFs, paste URLs, or add FAQs. Your AI learns everything about your business to answer accurately.",
                color: "from-purple-500 to-pink-600"
              },
              {
                step: "03",
                title: "Connect & Go Live",
                description: "Get a phone number or embed on your website. Start receiving calls immediately. Your AI handles the rest.",
                color: "from-emerald-500 to-teal-600"
              }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="absolute -inset-px bg-gradient-to-br opacity-0 group-hover:opacity-100 rounded-2xl blur-sm transition-opacity" style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                <Card className="relative bg-slate-900/80 border-slate-800 group-hover:border-transparent transition-all h-full">
                  <CardContent className="p-8">
                    <div className={cn("text-6xl font-bold font-mono mb-6 bg-gradient-to-r bg-clip-text text-transparent", item.color)}>
                      {item.step}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4 font-display">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="plans" className="relative z-10 px-8 lg:px-16 py-24 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-mono text-sm tracking-widest mb-4">TRANSPARENT PRICING</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-display">
              <span className="text-white">Simple Plans,</span>{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Powerful Features</span>
            </h2>
            <p className="text-slate-400 text-lg">Choose a plan that matches your call volume. Scale anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {plans.map((plan, i) => (
              <Card 
                key={i} 
                className={cn(
                  "relative bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 transition-all hover:-translate-y-1 group",
                  plan.popular && "border-cyan-500/50 shadow-lg shadow-cyan-500/10",
                  plan.special && "border-purple-500/50 shadow-lg shadow-purple-500/10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 font-medium">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {plan.special && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 font-medium">
                      New: Website AI
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="w-14 h-14 mb-4 rounded-xl overflow-hidden">
                    <img src={plan.logo} alt={plan.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-display">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white font-mono">${plan.price}</span>
                    <span className="text-slate-400">{plan.special ? '/mo' : '/mo'}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={handleGetStarted}
                    className={cn(
                      "w-full font-medium",
                      plan.popular 
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                    )}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-12 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Sri Website Assistant
                  </Badge>
                  <h3 className="text-2xl font-bold text-white mb-3">What Makes Sri Different?</h3>
                  <div className="space-y-3 text-slate-300">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-white">Auto-Learn from Your Website</p>
                        <p className="text-sm text-slate-400">Sri scans your site and learns your business automatically</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-white">Task Automation Capability</p>
                        <p className="text-sm text-slate-400">Handle bookings, forms, and actions within your site</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-white">Voice + Chat Interface</p>
                        <p className="text-sm text-slate-400">Users can type or speak - natural conversations either way</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-white">Standalone Platform</p>
                        <p className="text-sm text-slate-400">Works independently on websites - no phone system needed</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
                    alt="Sri AI Assistant"
                    className="w-40 h-40 rounded-full mx-auto mb-4 border-4 border-purple-500/30 shadow-2xl shadow-purple-500/50"
                  />
                  <p className="text-white font-semibold mb-2">Meet Sri</p>
                  <p className="text-sm text-slate-400 mb-4">Your intelligent website companion</p>
                  <Link to={createPageUrl("VoiceChatbotPlans")}>
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500">
                      Explore Sri Plan
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-10 text-center space-y-4">
            <p className="text-slate-500 text-sm font-medium">
              All plans include: 20+ AI voices • Multi-language support • Analytics dashboard • Email support
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-8 lg:px-16 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-3xl" />
            <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/50 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 font-display">
                <span className="text-white">Ready to Transform Your Calls?</span>
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                Join forward-thinking businesses that save hours daily with AI voice assistants. 
                Set up in minutes, not months.
              </p>
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="h-14 px-12 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/30 border-0 font-semibold"
              >
                Start Free Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 px-4 sm:px-8 lg:px-16 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
                alt="AEVOICE" 
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <span className="text-white font-semibold">AEVOICE</span>
                <p className="text-xs text-slate-500">© 2025 All rights reserved.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
              <Link to={createPageUrl("Pricing")} className="text-sm text-slate-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to={createPageUrl("HelpCenter")} className="text-sm text-slate-400 hover:text-white transition-colors">
                Help Center
              </Link>
              <a href="mailto:care@aevoice.ai" className="text-sm text-slate-400 hover:text-white transition-colors">
                Contact Us
              </a>
              <Link to={createPageUrl("AffiliatePortal")} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                <Gift className="w-3 h-3" />
                Affiliate with Us
              </Link>
              <span className="text-sm text-slate-500">Privacy</span>
              <span className="text-sm text-slate-500">Terms</span>
            </div>
          </div>

          {/* Social Media Share */}
          <div className="flex justify-center gap-4 mb-6">
            <a 
              href="https://twitter.com/intent/tweet?text=Check%20out%20AEVOICE%20-%20AI%20Voice%20Assistants%20for%20your%20business!&url=https://aevoice.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a 
              href="https://www.facebook.com/sharer/sharer.php?u=https://aevoice.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a 
              href="https://www.linkedin.com/sharing/share-offsite/?url=https://aevoice.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a 
              href="https://wa.me/?text=Check%20out%20AEVOICE%20-%20AI%20Voice%20Assistants%20for%20your%20business!%20https://aevoice.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <a 
              href="https://www.youtube.com/@aevoice" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>

          <div className="pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              AEVOICE is a product of <span className="text-slate-400 font-medium">Zoa Zone Services LLC, USA</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Contact: <a href="mailto:care@aevoice.ai" className="text-cyan-400 hover:text-cyan-300 transition-colors">care@aevoice.ai</a>
            </p>
          </div>
        </div>
      </footer>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Sri AI Assistant */}
      <SriAssistant />
    </div>
  );
}