import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentVoiceTester from "../components/agents/AgentVoiceTester";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Bot,
  Phone,
  MessageSquare,
  Calendar,
  Zap,
  Volume2,
  Languages,
  Sliders,
  BookOpen,
  Settings2,
  PlayCircle,
  Save,
  Sparkles,
  Mic,
  Brain,
  Play,
  Pause,
  Upload,
  FileText,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Basics", icon: Bot },
  { id: 2, title: "Voice", icon: Volume2 },
  { id: 3, title: "Languages", icon: Languages },
  { id: 4, title: "Behavior", icon: Brain },
  { id: 5, title: "Knowledge", icon: BookOpen },
  { id: 6, title: "Review", icon: Check },
];

const agentTypes = [
  {
    id: "receptionist",
    title: "Receptionist",
    description: "Answer calls, take messages, and route inquiries",
    icon: Phone,
    color: "from-blue-500 to-cyan-500",
    features: ["Call answering", "Message taking", "Call routing", "FAQ responses"]
  },
  {
    id: "sales",
    title: "Sales Agent",
    description: "Qualify leads, answer product questions, and schedule demos",
    icon: Zap,
    color: "from-amber-500 to-orange-500",
    features: ["Lead qualification", "Product info", "Demo scheduling", "Follow-up calls"]
  },
  {
    id: "support",
    title: "Support Agent",
    description: "Handle customer inquiries and resolve common issues",
    icon: MessageSquare,
    color: "from-purple-500 to-pink-500",
    features: ["Issue resolution", "Ticket creation", "Escalation", "Knowledge base"]
  },
  {
    id: "appointment",
    title: "Appointment Scheduler",
    description: "Book, modify, and confirm appointments",
    icon: Calendar,
    color: "from-emerald-500 to-teal-500",
    features: ["Booking", "Rescheduling", "Reminders", "Confirmations"]
  },
];

const voices = [
  // OpenAI Voices - Free
  { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral", provider: "openai" },
  { id: "echo", name: "Echo", description: "Warm and friendly", gender: "male", provider: "openai" },
  { id: "fable", name: "Fable", description: "British accent", gender: "male", provider: "openai" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative", gender: "male", provider: "openai" },
  { id: "nova", name: "Nova", description: "Friendly American female", gender: "female", provider: "openai" },
  { id: "shimmer", name: "Shimmer", description: "Soft and soothing female", gender: "female", provider: "openai" },
  // ElevenLabs Premium Voices
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm American female", gender: "female", provider: "elevenlabs", premium: true },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft American female", gender: "female", provider: "elevenlabs", premium: true },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Well-rounded male", gender: "male", provider: "elevenlabs", premium: true },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Deep American male", gender: "male", provider: "elevenlabs", premium: true },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", description: "British female", gender: "female", provider: "elevenlabs", premium: true },
  { id: "nPczCjzI2devNBz1zQrb", name: "Priya", description: "Indian female", gender: "female", provider: "elevenlabs", premium: true },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Raj", description: "Indian male", gender: "male", provider: "elevenlabs", premium: true },
  { id: "jBpfuIE2acCO8z3wKNLl", name: "Sofia", description: "Spanish female", gender: "female", provider: "elevenlabs", premium: true },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Marie", description: "French female", gender: "female", provider: "elevenlabs", premium: true },
  // Additional Twilio Polly Voices
  { id: "Polly.Joanna", name: "Joanna (Twilio)", description: "American female", gender: "female", provider: "twilio" },
  { id: "Polly.Matthew", name: "Matthew (Twilio)", description: "American male", gender: "male", provider: "twilio" },
  { id: "Polly.Ivy", name: "Ivy (Twilio)", description: "American female child", gender: "female", provider: "twilio" },
  { id: "Polly.Justin", name: "Justin (Twilio)", description: "American male child", gender: "male", provider: "twilio" },
  { id: "Polly.Kendra", name: "Kendra (Twilio)", description: "American female", gender: "female", provider: "twilio" },
  { id: "Polly.Kimberly", name: "Kimberly (Twilio)", description: "American female", gender: "female", provider: "twilio" },
  { id: "Polly.Salli", name: "Salli (Twilio)", description: "American female", gender: "female", provider: "twilio" },
  { id: "Polly.Joey", name: "Joey (Twilio)", description: "American male", gender: "male", provider: "twilio" },
  { id: "Polly.Brian", name: "Brian (Twilio)", description: "British male", gender: "male", provider: "twilio" },
  { id: "Polly.Amy", name: "Amy (Twilio)", description: "British female", gender: "female", provider: "twilio" },
  { id: "Polly.Emma", name: "Emma (Twilio)", description: "British female", gender: "female", provider: "twilio" },
  { id: "Polly.Raveena", name: "Raveena (Twilio)", description: "Indian female", gender: "female", provider: "twilio" },
  { id: "Polly.Aditi", name: "Aditi (Twilio)", description: "Indian female", gender: "female", provider: "twilio" },
  { id: "Polly.Lupe", name: "Lupe (Twilio)", description: "Spanish female", gender: "female", provider: "twilio" },
  { id: "Polly.Miguel", name: "Miguel (Twilio)", description: "Spanish male", gender: "male", provider: "twilio" },
  { id: "Polly.Penelope", name: "Penelope (Twilio)", description: "Spanish female", gender: "female", provider: "twilio" },
  { id: "Polly.Chantal", name: "Chantal (Twilio)", description: "French Canadian female", gender: "female", provider: "twilio" },
  { id: "Polly.Celine", name: "Celine (Twilio)", description: "French female", gender: "female", provider: "twilio" },
  { id: "Polly.Mathieu", name: "Mathieu (Twilio)", description: "French male", gender: "male", provider: "twilio" },
  { id: "Polly.Vicki", name: "Vicki (Twilio)", description: "German female", gender: "female", provider: "twilio" },
  { id: "Polly.Hans", name: "Hans (Twilio)", description: "German male", gender: "male", provider: "twilio" },
  { id: "Polly.Mizuki", name: "Mizuki (Twilio)", description: "Japanese female", gender: "female", provider: "twilio" },
  { id: "Polly.Takumi", name: "Takumi (Twilio)", description: "Japanese male", gender: "male", provider: "twilio" },
  { id: "Polly.Seoyeon", name: "Seoyeon (Twilio)", description: "Korean female", gender: "female", provider: "twilio" },
  { id: "Polly.Carla", name: "Carla (Twilio)", description: "Italian female", gender: "female", provider: "twilio" },
  { id: "Polly.Giorgio", name: "Giorgio (Twilio)", description: "Italian male", gender: "male", provider: "twilio" },
];

const languages = [
  // English variants
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧" },
  { code: "en-IN", name: "English (India)", flag: "🇮🇳" },
  // Indian Regional Languages
  { code: "hi-IN", name: "Hindi (हिंदी)", flag: "🇮🇳" },
  { code: "te-IN", name: "Telugu (తెలుగు)", flag: "🇮🇳" },
  { code: "ta-IN", name: "Tamil (தமிழ்)", flag: "🇮🇳" },
  { code: "kn-IN", name: "Kannada (ಕನ್ನಡ)", flag: "🇮🇳" },
  { code: "ml-IN", name: "Malayalam (മലയാളം)", flag: "🇮🇳" },
  { code: "mr-IN", name: "Marathi (मराठी)", flag: "🇮🇳" },
  { code: "bn-IN", name: "Bengali (বাংলা)", flag: "🇮🇳" },
  { code: "gu-IN", name: "Gujarati (ગુજરાતી)", flag: "🇮🇳" },
  { code: "pa-IN", name: "Punjabi (ਪੰਜਾਬੀ)", flag: "🇮🇳" },
  // European Languages
  { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
  { code: "fr-FR", name: "French", flag: "🇫🇷" },
  { code: "de-DE", name: "German", flag: "🇩🇪" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹" },
  { code: "pt-BR", name: "Portuguese (BR)", flag: "🇧🇷" },
  // Asian Languages
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
  { code: "zh-CN", name: "Chinese (Mandarin)", flag: "🇨🇳" },
  { code: "th-TH", name: "Thai", flag: "🇹🇭" },
  // Middle Eastern
  { code: "ar-SA", name: "Arabic", flag: "🇸🇦" },
];

export default function AgentBuilder() {
  const [currentStep, setCurrentStep] = useState(1);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [audioRef, setAudioRef] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    agent_type: "general",
    voice_provider: "elevenlabs",
    voice_id: "nova",
    language: "en-US",
    voice_settings: {
      speed: 1,
      pitch: 1,
      stability: 0.75,
      similarity_boost: 0.75,
    },
    personality: {
      formality: 50,
      friendliness: 70,
      verbosity: 50,
      empathy: 60,
    },
    greeting_message: "",
    system_prompt: "",
    knowledge_base_ids: [],
    tools_config: [],
    max_call_duration_sec: 900,
    status: "draft",
    // Multi-language settings
    supported_languages: ["en-US"],
    auto_language_detection: true,
    language_prompt_enabled: false,
  });

  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

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

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['knowledgeBases', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.KnowledgeBase.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const { data: existingAgent } = useQuery({
    queryKey: ['agent', editId],
    queryFn: () => base44.entities.Agent.filter({ id: editId }),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingAgent?.[0]) {
      const agentData = existingAgent[0];
      setFormData({
        ...formData,
        ...agentData,
        // Ensure voice_settings is never null
        voice_settings: agentData.voice_settings || {
          speed: 1,
          pitch: 1,
          stability: 0.75,
          similarity_boost: 0.75,
        },
        // Ensure personality is never null
        personality: agentData.personality || {
          formality: 50,
          friendliness: 70,
          verbosity: 50,
          empathy: 60,
        }
      });
    }
  }, [existingAgent]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      ...formData,
      agent_type: template.id,
      system_prompt: template.systemPrompt,
      personality: template.personality
    });
    setShowTemplates(false);
  };

  const handleAIGenerate = async () => {
    const description = prompt("Describe what you want your AI voice agent to do:");
    if (!description) return;

    setGeneratingAI(true);
    try {
      const aiPrompt = `Create a professional AI voice agent configuration based on this description: "${description}"\n\nReturn a JSON object with:\n- name: agent name\n- agent_type: one of (receptionist, sales, support, appointment, general)\n- system_prompt: detailed instructions for the agent\n- personality: {formality: 0-100, friendliness: 0-100, verbosity: 0-100, empathy: 0-100}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            agent_type: { type: "string" },
            system_prompt: { type: "string" },
            personality: { type: "object" }
          }
        }
      });

      setFormData({
        ...formData,
        name: result.name,
        agent_type: result.agent_type,
        system_prompt: result.system_prompt,
        personality: result.personality
      });
      setShowTemplates(false);
      toast.success("AI agent created!");
    } catch (error) {
      toast.error("Failed to generate agent: " + error.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    let clientId = currentClient?.id;
    
    // If no client exists, create one first
    if (!clientId) {
      const userData = await base44.auth.me();
      const newClient = await base44.entities.Client.create({
        agency_id: "default",
        name: userData?.full_name || "My Business",
        slug: `client-${Date.now()}`,
        industry: "other",
        contact_email: userData?.email,
        status: "active"
      });
      clientId = newClient.id;
    }
    
    const data = {
      ...formData,
      client_id: clientId,
      status: 'active',
    };

    if (editId) {
      await updateMutation.mutateAsync({ id: editId, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    
    // After creating agent, redirect to Phone Numbers to connect
    window.location.href = createPageUrl("PhoneNumbers");
  };

  // Generate voice sample
  const playVoiceSample = async (voice) => {
    // Stop all previous audio
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioRef) {
      audioRef.pause();
      setAudioRef(null);
    }

    // Toggle off
    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voice.id);
    const sampleText = "Hello! Thank you for calling. This is a sample of my voice. How may I help you today?";

    try {
      // Try server-side preview first
      const res = await base44.functions.invoke('previewVoice', {
        text: sampleText,
        voice_id: voice.id,
        provider: voice.provider
      });

      if (res.data?.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio_base64}`);
        setAudioRef(audio);
        audio.onended = () => setPlayingVoice(null);
        audio.onerror = () => {
          console.error("Audio playback error");
          setPlayingVoice(null);
        };
        await audio.play();
      } else {
        throw new Error("No audio data");
      }
    } catch (error) {
      console.warn("Server preview failed, falling back to browser TTS", error);
      // Fallback to browser TTS (simplified)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.onend = () => setPlayingVoice(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setPlayingVoice(null);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Extract data from file
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The full text content of the document" },
            sections: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        // Create a knowledge base if none exists
        let kbId = formData.knowledge_base_ids?.[0];
        if (!kbId) {
          if (!currentClient?.id) {
            throw new Error("Please complete account setup first");
          }
          const newKb = await base44.entities.KnowledgeBase.create({
            client_id: currentClient.id,
            name: `${formData.name || 'Agent'} Knowledge`,
            description: `Auto-generated from uploaded file: ${file.name}`,
            type: "documents",
            status: "active"
          });
          kbId = newKb.id;
          updateFormData('knowledge_base_ids', [kbId]);
        }

        // Create knowledge chunks from extracted content
        let chunksCreated = 0;
        if (result.output.sections) {
          for (const section of result.output.sections) {
            await base44.entities.KnowledgeChunk.create({
              knowledge_base_id: kbId,
              source_type: "file",
              source_ref: file.name,
              title: section.title,
              content: section.content
            });
            chunksCreated++;
          }
        } else if (result.output.content) {
          await base44.entities.KnowledgeChunk.create({
            knowledge_base_id: kbId,
            source_type: "file",
            source_ref: file.name,
            content: result.output.content
          });
          chunksCreated = 1;
        }

        // Update KB with accurate chunk count
        const allChunks = await base44.entities.KnowledgeChunk.filter({ knowledge_base_id: kbId });
        await base44.entities.KnowledgeBase.update(kbId, {
          chunk_count: allChunks.length,
          total_words: allChunks.reduce((sum, c) => sum + (c.content?.split(' ').length || 0), 0)
        });

        // CRITICAL: Ensure KB is linked to agent
        const existingKbIds = formData.knowledge_base_ids || [];
        if (!existingKbIds.includes(kbId)) {
          updateFormData('knowledge_base_ids', [...existingKbIds, kbId]);
        }

        // Refresh knowledge bases
        queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
        
        // Use custom toast instead of alert
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2';
        successMessage.textContent = `✅ Successfully uploaded: ${file.name} - ${result.output.sections?.length || 1} chunks created`;
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 4000);
      } else {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorMessage.textContent = '❌ Could not extract content. Please try a different file.';
        document.body.appendChild(errorMessage);
        setTimeout(() => errorMessage.remove(), 4000);
      }
    } catch (error) {
      console.error("File upload error:", error);
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = `❌ Error: ${error.message}`;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 4000);
    }
    setUploadingFile(false);
  };

  const generateSystemPrompt = () => {
    const type = agentTypes.find(t => t.id === formData.agent_type);
    const personality = formData.personality || { formality: 50, friendliness: 70, verbosity: 50, empathy: 60 };

    const prompt = `You are a professional ${type?.title || 'AI assistant'} for a business. 

   Your role is to ${type?.description || 'help callers with their inquiries'}.

   Key responsibilities:
   ${type?.features?.map(f => `- ${f}`).join('\n') || '- Assist callers professionally'}

   Communication guidelines:
   - Be ${personality.friendliness > 60 ? 'warm and friendly' : 'professional and courteous'}
   - ${personality.formality > 60 ? 'Use formal language' : 'Keep conversations natural and approachable'}
   - ${personality.verbosity > 60 ? 'Provide detailed explanations' : 'Be concise and to the point'}
   - ${personality.empathy > 60 ? 'Show empathy and understanding' : 'Focus on efficiency and solutions'}

   CRITICAL conversation rules:
   - Give natural, human-like replies - avoid robotic phrases
   - STOP IMMEDIATELY if caller interrupts or speaks over you
   - Avoid long pauses - respond promptly (under 1 second)
   - Listen actively - detect when caller wants to speak
   - Keep responses brief unless caller asks for details
   - Never repeat yourself or use filler words

   Always:
   - Identify yourself at the start of the call
   - Listen carefully to the caller's needs
   - Provide accurate information
   - Offer to transfer to a human if needed`;

    updateFormData('system_prompt', prompt);
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link to={createPageUrl("Agents")}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {editId ? 'Edit Agent' : 'Create New Agent'}
            </h1>
            <p className="text-slate-500">
              Build your AI voice agent in a few simple steps
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  currentStep === step.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : currentStep > step.id
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                <step.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={cn(
                  "h-0.5 w-8 rounded-full",
                  currentStep > step.id ? "bg-indigo-400" : "bg-slate-200"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {/* Step 1: Agent Basics */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Create Your AI Agent
              </h2>
              <p className="text-slate-500">
                Your AI agent can handle all types of calls - reception, sales, support, and appointments
              </p>
            </div>

            {/* Capabilities Info Card */}
            <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Multi-Purpose AI Agent</h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Your AEVOICE agent is capable of handling all business communication needs:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-blue-500" />
                        <span>Reception</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Sales</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        <span>Support</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span>Appointments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Agent Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Sarah - Front Desk"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of what this agent does..."
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  {/* Website Auto-Learning */}
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-500" />
                      Auto-Learn from Website
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://yourwebsite.com"
                        value={formData.website_url || ''}
                        onChange={(e) => updateFormData('website_url', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!formData.website_url || uploadingFile}
                        onClick={async () => {
                          if (!currentClient?.id) {
                            const successMsg = document.createElement('div');
                            successMsg.className = 'fixed top-4 right-4 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                            successMsg.textContent = '⚠️ Please complete account setup first - subscribe to a plan';
                            document.body.appendChild(successMsg);
                            setTimeout(() => successMsg.remove(), 4000);
                            return;
                          }
                          setUploadingFile(true);
                          try {
                            const kb = await base44.entities.KnowledgeBase.create({
                              client_id: currentClient.id,
                              name: `${formData.name || 'Agent'} - Website Knowledge`,
                              description: `Auto-learned from ${formData.website_url}`,
                              type: 'website',
                              status: 'processing',
                              chunk_count: 0
                            });

                            const result = await base44.functions.invoke('scrapeWebsiteKnowledge', {
                              url: formData.website_url,
                              knowledge_base_id: kb.id
                            });

                            if (result.data.success) {
                              updateFormData('knowledge_base_ids', [...(formData.knowledge_base_ids || []), kb.id]);
                              queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });

                              const successMsg = document.createElement('div');
                              successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                              successMsg.innerHTML = `<strong>✅ Success!</strong><br/>Learned ${result.data.chunks_created} topics from website`;
                              document.body.appendChild(successMsg);
                              setTimeout(() => successMsg.remove(), 5000);
                            } else {
                              const errorMsg = document.createElement('div');
                              errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                              errorMsg.textContent = `❌ ${result.data.error || 'Could not scan website'}`;
                              document.body.appendChild(errorMsg);
                              setTimeout(() => errorMsg.remove(), 4000);
                            }
                          } catch (error) {
                            const errorMsg = document.createElement('div');
                            errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                            errorMsg.textContent = `❌ Error: ${error.message}`;
                            document.body.appendChild(errorMsg);
                            setTimeout(() => errorMsg.remove(), 4000);
                          }
                          setUploadingFile(false);
                        }}
                      >
                        {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      AI will scan your website and automatically learn your business info, FAQs, services, and contact details
                    </p>
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs text-slate-400">OR</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* File Upload */}
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Documents
                    </Label>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.txt,.csv,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                      <div className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center transition-all",
                        uploadingFile 
                          ? "border-indigo-300 bg-indigo-50" 
                          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      )}>
                        {uploadingFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                            <span className="text-sm text-indigo-600">Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Click to upload PDF, TXT, CSV</span>
                          </div>
                        )}
                      </div>
                    </label>
                    <p className="text-xs text-slate-500">
                      Upload FAQs, product docs, or policies for accurate answers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Voice */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Choose a voice
              </h2>
              <p className="text-slate-500">
                Select the voice and language for your agent
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {voices.map((voice) => {
                const isSelected = formData.voice_id === voice.id;
                const isPlaying = playingVoice === voice.id;
                return (
                  <div
                    key={voice.id}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all relative",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {voice.premium && (
                      <Badge className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-xs">
                        Premium
                      </Badge>
                    )}
                    <button
                      onClick={() => {
                        updateFormData('voice_id', voice.id);
                        updateFormData('voice_provider', voice.provider);
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          voice.gender === 'female' ? "bg-pink-100" : 
                          voice.gender === 'male' ? "bg-blue-100" : "bg-slate-100"
                        )}>
                          <Mic className={cn(
                            "w-5 h-5",
                            voice.gender === 'female' ? "text-pink-600" : 
                            voice.gender === 'male' ? "text-blue-600" : "text-slate-600"
                          )} />
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-indigo-600 ml-auto" />
                        )}
                      </div>
                      <p className="font-medium text-slate-900">{voice.name}</p>
                      <p className="text-sm text-slate-500">{voice.description}</p>
                    </button>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {voice.provider}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playVoiceSample(voice);
                        }}
                        className={cn(
                          "p-1.5 rounded-full transition-all",
                          isPlaying 
                            ? "bg-indigo-600 text-white" 
                            : "bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600"
                        )}
                        title="Preview voice"
                      >
                        {isPlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-2">
                  <Label>Primary Language (User Editable)</Label>
                  <Select 
                    value={formData.language || 'en-US'} 
                    onValueChange={(v) => {
                      updateFormData('language', v);
                      // Auto-add to supported languages if not already there
                      if (!formData.supported_languages?.includes(v)) {
                        updateFormData('supported_languages', [...(formData.supported_languages || []), v]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            {lang.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Choose your agent's default greeting language - fully customizable
                  </p>
                </div>

                <div className="grid gap-4">
                  <Label>Voice Settings</Label>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">Speed</span>
                        <span className="text-sm text-slate-500">
                          {(formData.voice_settings?.speed || 1).toFixed(1)}x
                        </span>
                      </div>
                      <Slider
                        value={[formData.voice_settings?.speed || 1]}
                        onValueChange={([v]) => updateFormData('voice_settings', {
                          ...formData.voice_settings, speed: v
                        })}
                        min={0.5}
                        max={2}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">Stability</span>
                        <span className="text-sm text-slate-500">
                          {Math.round((formData.voice_settings?.stability || 0.75) * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[formData.voice_settings?.stability || 0.75]}
                        onValueChange={([v]) => updateFormData('voice_settings', {
                          ...formData.voice_settings, stability: v
                        })}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Languages */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Multi-Language Support
              </h2>
              <p className="text-slate-500">
                Configure language detection and multi-language voice settings
              </p>
            </div>

            {/* Auto Detection Card */}
            <Card className="border-2 border-indigo-100 bg-indigo-50/30">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-indigo-100">
                      <Sparkles className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">AI Language Detection</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Automatically detect caller's language and switch voice in real-time
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-white text-indigo-700 text-xs">
                          <Mic className="w-3 h-3 mr-1" />
                          Speech Recognition
                        </Badge>
                        <Badge className="bg-white text-indigo-700 text-xs">
                          <Volume2 className="w-3 h-3 mr-1" />
                          Auto Voice Switch
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={formData.auto_language_detection}
                    onCheckedChange={(checked) => updateFormData('auto_language_detection', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Supported Languages */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Supported Languages</CardTitle>
                <CardDescription>
                  Select all languages your agent should support (including regional languages)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {languages.map((lang) => {
                    const isSelected = formData.supported_languages?.includes(lang.code);
                    const isPrimary = formData.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          const current = formData.supported_languages || [];
                          updateFormData('supported_languages', 
                            isSelected && !isPrimary
                              ? current.filter(l => l !== lang.code)
                              : [...current.filter(l => l !== lang.code), lang.code]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all",
                          isSelected
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{lang.name}</p>
                          <p className="text-xs text-slate-500">{lang.code}</p>
                        </div>
                        {isPrimary && (
                          <Badge className="bg-indigo-600 text-white text-xs">Primary</Badge>
                        )}
                        {isSelected && !isPrimary && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Language Prompt Option */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Language Selection Prompt</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      Ask callers to select their preferred language at the start
                    </p>
                    {formData.language_prompt_enabled && (
                      <p className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2 rounded">
                        "For English, press 1. हिंदी के लिए 2 दबाएं। తెలుగు కోసం 3 నొక్కండి।"
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={formData.language_prompt_enabled}
                    onCheckedChange={(checked) => updateFormData('language_prompt_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Behavior */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Define behavior
              </h2>
              <p className="text-slate-500">
                Customize how your agent communicates
              </p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-2">
                  <Label>Greeting Message</Label>
                  <Textarea
                    placeholder="Hello! Thank you for calling. How may I help you today?"
                    value={formData.greeting_message}
                    onChange={(e) => updateFormData('greeting_message', e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">
                    This is the first thing your agent will say when answering a call
                  </p>
                </div>

                <div className="space-y-6">
                  <Label>Personality Traits</Label>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Formality</span>
                      <span className="text-sm text-slate-500">
                        {(formData.personality?.formality || 50) < 40 ? 'Casual' : 
                         (formData.personality?.formality || 50) > 60 ? 'Formal' : 'Balanced'}
                      </span>
                    </div>
                    <Slider
                      value={[formData.personality?.formality || 50]}
                      onValueChange={([v]) => updateFormData('personality', {
                        ...formData.personality, formality: v
                      })}
                      max={100}
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Casual</span>
                      <span>Formal</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Friendliness</span>
                      <span className="text-sm text-slate-500">
                        {(formData.personality?.friendliness || 70) < 40 ? 'Reserved' : 
                         (formData.personality?.friendliness || 70) > 60 ? 'Warm' : 'Balanced'}
                      </span>
                    </div>
                    <Slider
                      value={[formData.personality?.friendliness || 70]}
                      onValueChange={([v]) => updateFormData('personality', {
                        ...formData.personality, friendliness: v
                      })}
                      max={100}
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Reserved</span>
                      <span>Warm</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Verbosity</span>
                      <span className="text-sm text-slate-500">
                        {(formData.personality?.verbosity || 50) < 40 ? 'Concise' : 
                         (formData.personality?.verbosity || 50) > 60 ? 'Detailed' : 'Balanced'}
                      </span>
                    </div>
                    <Slider
                      value={[formData.personality?.verbosity || 50]}
                      onValueChange={([v]) => updateFormData('personality', {
                        ...formData.personality, verbosity: v
                      })}
                      max={100}
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Concise</span>
                      <span>Detailed</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>System Instructions</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={generateSystemPrompt}
                      className="gap-1 text-indigo-600"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Detailed instructions for how the agent should behave..."
                    value={formData.system_prompt}
                    onChange={(e) => updateFormData('system_prompt', e.target.value)}
                    rows={8}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Knowledge */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Add knowledge
              </h2>
              <p className="text-slate-500">
                Upload files or connect knowledge bases so your agent can answer questions accurately
              </p>
            </div>

            {/* File Upload Section */}
            <Card className="border-2 border-dashed border-indigo-200 bg-indigo-50/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-100 flex items-center justify-center">
                    {uploadingFile ? (
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-indigo-600" />
                    )}
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">
                    Upload Training Files
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Upload PDF, TXT, or CSV files to train your agent
                  </p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".pdf,.txt,.csv,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      disabled={uploadingFile}
                      className="cursor-pointer"
                      asChild
                    >
                      <span>
                        <FileText className="w-4 h-4 mr-2" />
                        {uploadingFile ? "Processing..." : "Choose File"}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-slate-400 mt-2">
                    Supported: PDF, TXT, CSV, DOC (Max 10MB)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Existing Knowledge Bases - Filter out demo data */}
            {knowledgeBases.filter(kb => 
              !kb.name?.toLowerCase().includes('dental') && 
              !kb.name?.toLowerCase().includes('property') &&
              !kb.name?.toLowerCase().includes('sample') &&
              !kb.name?.toLowerCase().includes('demo')
            ).length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-sm text-slate-400">or select existing</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid gap-3">
                  {knowledgeBases.filter(kb => 
                    !kb.name?.toLowerCase().includes('dental') && 
                    !kb.name?.toLowerCase().includes('property') &&
                    !kb.name?.toLowerCase().includes('sample') &&
                    !kb.name?.toLowerCase().includes('demo')
                  ).map((kb) => {
                    const isSelected = formData.knowledge_base_ids?.includes(kb.id);
                    return (
                      <button
                        key={kb.id}
                        onClick={() => {
                          const ids = formData.knowledge_base_ids || [];
                          updateFormData('knowledge_base_ids', 
                            isSelected 
                              ? ids.filter(id => id !== kb.id)
                              : [...ids, kb.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="p-3 rounded-xl bg-slate-100">
                          <BookOpen className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{kb.name}</p>
                          <p className="text-sm text-slate-500">
                           {kb.chunk_count || 0} chunks • {kb.type || 'faq'}
                          </p>
                          {kb.shared_with_sri && (
                           <Badge variant="secondary" className="text-xs mt-1">
                             Shared with Sri
                           </Badge>
                          )}
                          </div>
                          {isSelected && (
                          <Check className="w-5 h-5 text-indigo-600" />
                          )}
                          </button>
                    );
                  })}
                </div>
              </>
            )}

            {knowledgeBases.filter(kb => 
              !kb.name?.toLowerCase().includes('dental') && 
              !kb.name?.toLowerCase().includes('property') &&
              !kb.name?.toLowerCase().includes('sample') &&
              !kb.name?.toLowerCase().includes('demo')
            ).length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">
                  No existing knowledge bases.{" "}
                  <Link to={createPageUrl("Knowledge")} className="text-indigo-600 hover:underline">
                    Create one manually
                  </Link>
                </p>
              </div>
            )}

            {/* Share with Sri Toggle */}
            <Card className="border-2 border-purple-200 bg-purple-50/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
                        alt="Sri"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Share Knowledge with Sri Assistant</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Enable Sri (website chatbot) to access this agent's knowledge base
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.knowledge_base_ids?.some(id => {
                      const kb = knowledgeBases.find(k => k.id === id);
                      return kb?.shared_with_sri !== false;
                    }) || true}
                    onCheckedChange={async (checked) => {
                      // Update all linked knowledge bases
                      for (const kbId of formData.knowledge_base_ids || []) {
                        await base44.entities.KnowledgeBase.update(kbId, {
                          shared_with_sri: checked
                        });
                      }
                      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white shadow-sm">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">
                      Pro tip: Train with real data
                    </h3>
                    <p className="text-sm text-slate-600">
                      Upload your FAQs, product docs, and policies to help your agent 
                      answer questions accurately without hallucinating.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 6: Review & Test */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Test & Review Your Agent
              </h2>
              <p className="text-slate-500">
                Test your agent with voice before activating
              </p>
            </div>

            {/* Voice Testing Component */}
            {formData.name && formData.system_prompt && (
              <AgentVoiceTester 
                agent={{
                  ...formData,
                  id: editId || 'preview'
                }} 
              />
            )}

            <div className="grid gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-4 rounded-2xl bg-gradient-to-br",
                      agentTypes.find(t => t.id === formData.agent_type)?.color || "from-slate-500 to-slate-600"
                    )}>
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">
                        {formData.name || "Unnamed Agent"}
                      </h3>
                      <p className="text-slate-500 mt-1">
                        {formData.description || "No description"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          {agentTypes.find(t => t.id === formData.agent_type)?.title || "General"}
                        </Badge>
                        <Badge variant="secondary">
                          <Volume2 className="w-3 h-3 mr-1" />
                          {voices.find(v => v.id === formData.voice_id)?.name || formData.voice_id}
                        </Badge>
                        <Badge variant="secondary">
                          <Languages className="w-3 h-3 mr-1" />
                          {formData.language}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Greeting
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700">
                      "{formData.greeting_message || "Hello! How may I help you today?"}"
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Knowledge Bases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700">
                      {formData.knowledge_base_ids?.length || 0} connected
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm bg-emerald-50 border-emerald-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-100">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">Ready to activate</h3>
                      <p className="text-sm text-slate-600">
                        Your agent is configured and ready to take calls
                      </p>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        "Saving..."
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Activate Agent
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={currentStep === 1 && !formData.name}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Agent"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}