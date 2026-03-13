import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentVoiceTester from "./AgentVoiceTester";
import VoiceSelector from "./VoiceSelector";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Bot,
  Phone,
  MessageSquare,
  Calendar,
  Zap,
  Volume2,
  Languages,
  BookOpen,
  Save,
  Sparkles,
  Mic,
  Brain,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileSelect from "@/components/ui/MobileSelect";
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
    features: ["Call answering", "Message taking", "Call routing", "FAQ responses"],
  },
  {
    id: "sales",
    title: "Sales Agent",
    description: "Qualify leads, answer product questions, and schedule demos",
    icon: Zap,
    color: "from-amber-500 to-orange-500",
    features: ["Lead qualification", "Product info", "Demo scheduling", "Follow-up calls"],
  },
  {
    id: "support",
    title: "Support Agent",
    description: "Handle customer inquiries and resolve common issues",
    icon: MessageSquare,
    color: "from-purple-500 to-pink-500",
    features: ["Issue resolution", "Ticket creation", "Escalation", "Knowledge base"],
  },
  {
    id: "appointment",
    title: "Appointment Scheduler",
    description: "Book, modify, and confirm appointments",
    icon: Calendar,
    color: "from-emerald-500 to-teal-500",
    features: ["Booking", "Rescheduling", "Reminders", "Confirmations"],
  },
];

// Example voice list used by VoiceSelector
const voices = [
  { id: "nova", name: "Nova", description: "Friendly American female", gender: "female", provider: "openai", accent: "American" },
  { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral", provider: "openai", accent: "Neutral" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Priya", description: "Indian female", gender: "female", provider: "elevenlabs", accent: "Indian", premium: true },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Raj", description: "Indian male", gender: "male", provider: "elevenlabs", accent: "Indian", premium: true },
  { id: "Polly.Aditi", name: "Aditi (Twilio)", description: "Indian female", gender: "female", provider: "twilio", accent: "Indian" },
  { id: "Polly.Raveena", name: "Raveena (Twilio)", description: "Indian female", gender: "female", provider: "twilio", accent: "Indian" },
];

const languages = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧" },
  { code: "en-IN", name: "English (India)", flag: "🇮🇳" },
  { code: "hi-IN", name: "Hindi (हिंदी)", flag: "🇮🇳" },
  { code: "te-IN", name: "Telugu (తెలుగు)", flag: "🇮🇳" },
  { code: "ta-IN", name: "Tamil (தமிழ்)", flag: "🇮🇳" },
  { code: "kn-IN", name: "Kannada (ಕನ್ನಡ)", flag: "🇮🇳" },
  { code: "ml-IN", name: "Malayalam (മലയാളം)", flag: "🇮🇳" },
  { code: "mr-IN", name: "Marathi (मराठी)", flag: "🇮🇳" },
  { code: "bn-IN", name: "Bengali (বাংলা)", flag: "🇮🇳" },
  { code: "gu-IN", name: "Gujarati (ગુજરાતી)", flag: "🇮🇳" },
  { code: "pa-IN", name: "Punjabi (ਪੰਜਾਬੀ)", flag: "🇮🇳" },
  { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
  { code: "fr-FR", name: "French", flag: "🇫🇷" },
  { code: "de-DE", name: "German", flag: "🇩🇪" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹" },
  { code: "pt-BR", name: "Portuguese (BR)", flag: "🇧🇷" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
  { code: "zh-CN", name: "Chinese (Mandarin)", flag: "🇨🇳" },
  { code: "th-TH", name: "Thai", flag: "🇹🇭" },
  { code: "ar-SA", name: "Arabic", flag: "🇸🇦" },
];

export default function AgentBuilder() {
  const [currentStep, setCurrentStep] = useState(1);
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);
  const playTokenRef = useRef(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [websiteScanSuccess, setWebsiteScanSuccess] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Preload browser TTS voices once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("speechSynthesis" in window) {
      const preload = () => {
        try {
          window.speechSynthesis.getVoices();
        } catch {}
      };
      preload();
      window.speechSynthesis.onvoiceschanged = preload;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch {}
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      } catch {}
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    agent_type: "general",
    voice_provider: "openai",
    voice_id: "nova",
    language: "en-US",
    llm_config: {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500,
      timeout_ms: 2000,
      fallback_enabled: true,
    },
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
    guardrails: {
      restricted_topics: [],
      escalation_keywords: [],
      pii_handling: "redact",
    },
    greeting_message: "",
    system_prompt: "",
    knowledge_base_ids: [],
    tools_config: [],
    max_call_duration_sec: 900,
    status: "draft",
    supported_languages: ["en-US"],
    auto_language_detection: true,
    language_prompt_enabled: false,
    widget_bot_name: "Sree",
    phone_assistant_name: "Aeva",
  });

  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("edit");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const res = await base44.functions.invoke("getMyClient", {});
        if (res.data?.success && res.data?.client) return [res.data.client];
        return [];
      } catch (err) {
        console.error("Error fetching clients:", err);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const currentClient = clients[0];

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ["knowledgeBases", currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.KnowledgeBase.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const { data: existingAgent } = useQuery({
    queryKey: ["agent", editId],
    queryFn: () => base44.entities.Agent.filter({ id: editId }),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingAgent?.[0]) {
      try {
        const agentData = existingAgent[0];
        setFormData((prev) => ({
          ...prev,
          ...agentData,
          // Ensure defaults for missing fields
          voice_settings: agentData.voice_settings || {
            speed: 1,
            pitch: 1,
            stability: 0.75,
            similarity_boost: 0.75,
          },
          personality: agentData.personality || {
            formality: 50,
            friendliness: 70,
            verbosity: 50,
            empathy: 60,
          },
          llm_config: agentData.llm_config || {
            model: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 500,
            timeout_ms: 2000,
            fallback_enabled: true,
          },
          guardrails: agentData.guardrails || {
            restricted_topics: [],
            escalation_keywords: [],
            pii_handling: "redact",
          },
          tools_config: agentData.tools_config || [],
          supported_languages: agentData.supported_languages || ["en-US"],
          auto_language_detection: agentData.auto_language_detection !== false,
          language_prompt_enabled: agentData.language_prompt_enabled || false,
          knowledge_base_ids: agentData.knowledge_base_ids || [],
          transfer_config: agentData.transfer_config || {},
          learning_enabled: agentData.learning_enabled !== false,
          learning_sources: agentData.learning_sources || ["website", "conversations", "documents"],
          website_url: agentData.website_url || "",
          auto_update_website: agentData.auto_update_website !== false,
          update_frequency: agentData.update_frequency || "weekly",
          conversation_learning: agentData.conversation_learning !== false,
          knowledge_confidence_threshold: typeof agentData.knowledge_confidence_threshold === 'number' ? agentData.knowledge_confidence_threshold : 0.8,
          widget_bot_name: agentData.metadata?.widget_bot_name || prev.widget_bot_name || "Sree",
          phone_assistant_name: agentData.metadata?.phone_assistant_name || prev.phone_assistant_name || "Aeva",
          metadata: agentData.metadata || { widget_bot_name: prev.widget_bot_name || "Sree", phone_assistant_name: prev.phone_assistant_name || "Aeva" },
        }));
      } catch (error) {
        console.error("[AgentBuilder] Failed to load existing agent data:", error);
        toast.error("Failed to load agent data");
      }
    }
  }, [existingAgent]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.create(data),
    onMutate: async (newAgent) => {
      await queryClient.cancelQueries({ queryKey: ["agents"] });
      const previousAgents = queryClient.getQueryData(["agents"]) || [];
      const tempAgent = { ...newAgent, id: `temp-${Date.now()}` };
      queryClient.setQueryData(["agents"], [...previousAgents, tempAgent]);
      return { previousAgents };
    },
    onError: (err, newAgent, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(["agents"], context.previousAgents);
      }
      toast.error("Failed to create agent");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agent.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["agents"] });
      const previousAgents = queryClient.getQueryData(["agents"]) || [];
      const updatedAgents = previousAgents.map(agent => 
        agent.id === id ? { ...agent, ...data } : agent
      );
      queryClient.setQueryData(["agents"], updatedAgents);
      return { previousAgents };
    },
    onError: (err, variables, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(["agents"], context.previousAgents);
      }
      toast.error("Failed to update agent");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent updated successfully");
    },
  });

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      ...formData,
      agent_type: template.id,
      system_prompt: template.systemPrompt,
      personality: template.personality,
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
            personality: { type: "object" },
          },
        },
      });

      setFormData({
        ...formData,
        name: result.name,
        agent_type: result.agent_type,
        system_prompt: result.system_prompt,
        personality: result.personality,
      });
      setShowTemplates(false);
      toast.success("AI agent created!");
    } catch (error) {
      toast.error("Failed to generate agent: " + error.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const ensureClientId = async () => {
    if (currentClient?.id) return currentClient.id;
    let clientId;
    toast.info("Setting up your account...");
    const userData = await base44.auth.me();
    const newClient = await base44.entities.Client.create({
      name: formData.name || userData?.full_name || "My Business",
      slug: `client-${Date.now()}`,
      industry: "other",
      contact_email: userData?.email,
      status: "active",
      onboarding_status: "completed",
    });
    clientId = newClient.id;
    await base44.auth.updateMe({ client_id: clientId });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    return clientId;
  };

  const ensureKnowledgeBase = async (clientId, opts = {}) => {
    const name = opts.name || `${formData.name || "Agent"} Knowledge`;
    const existingList = await base44.entities.KnowledgeBase.filter({ client_id: clientId, name });
    const existing = existingList?.[0];
    if (existing) return { kb: existing, created: false };
    const kb = await base44.entities.KnowledgeBase.create({
      client_id: clientId,
      name,
      description: opts.description || "Auto-generated knowledge",
      type: opts.type || "documents",
      status: opts.status || "active",
      chunk_count: 0,
    });
    return { kb, created: true };
  };

  const normalizeAgentPayload = (clientId, statusOverride) => {
    return {
      client_id: clientId,
      name: formData.name,
      description: formData.description || "",
      agent_type: formData.agent_type || "general",
      system_prompt: formData.system_prompt || "",
      greeting_message: formData.greeting_message || "",
      voice_provider: formData.voice_provider || "openai",
      voice_id: formData.voice_id || "nova",
      voice_settings: formData.voice_settings || { speed: 1, pitch: 1, stability: 0.75, similarity_boost: 0.75 },
      language: formData.language || "en-US",
      supported_languages: formData.supported_languages?.length ? formData.supported_languages : [formData.language || "en-US"],
      auto_language_detection: formData.auto_language_detection !== false,
      language_prompt_enabled: formData.language_prompt_enabled || false,
      personality: formData.personality || { formality: 50, friendliness: 70, verbosity: 50, empathy: 60 },
      llm_config: formData.llm_config || { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 500, timeout_ms: 2000, fallback_enabled: true },
      tools_config: formData.tools_config || [],
      knowledge_base_ids: formData.knowledge_base_ids || [],
      transfer_config: formData.transfer_config || {},
      guardrails: formData.guardrails || { restricted_topics: [], escalation_keywords: [], pii_handling: "redact" },
      learning_enabled: formData.learning_enabled !== false,
      learning_sources: formData.learning_sources || ["website", "conversations", "documents"],
      website_url: formData.website_url || "",
      auto_update_website: formData.auto_update_website !== false,
      update_frequency: formData.update_frequency || "weekly",
      conversation_learning: formData.conversation_learning !== false,
      knowledge_confidence_threshold: typeof formData.knowledge_confidence_threshold === 'number' ? formData.knowledge_confidence_threshold : 0.8,
      max_call_duration_sec: formData.max_call_duration_sec || 900,
      status: statusOverride || formData.status || "draft",
      metadata: {
        ...(formData.metadata || {}),
        widget_bot_name: formData.widget_bot_name || "Sree",
        phone_assistant_name: formData.phone_assistant_name || "Aeva",
        shared_with_sree: (formData.shared_with_sree !== false),
      },
      version: formData.version || 1,
      schema_version: formData.schema_version || "1.0",
    };
  };

  const handleSave = async () => {
  // Basic validation to prevent silent failures
  if (!formData.name?.trim() || !formData.system_prompt?.trim()) {
    toast.error("Please enter agent name and system instructions before saving.");
    return;
  }
  try {
    let desiredStatus = "active";
    if (!formData.knowledge_base_ids || formData.knowledge_base_ids.length === 0) {
      toast.warning("No knowledge base attached. Saving as draft – you can activate after adding knowledge");
      desiredStatus = "draft";
    }

    let clientId;
    clientId = await ensureClientId();

    const payload = normalizeAgentPayload(clientId, desiredStatus);

    if (editId) {
      // Use backend function for consistency
      const res = await base44.functions.invoke('updateAgent', { id: editId, data: payload });
      if (res.status >= 400 || res.data?.success === false) {
        toast.error(res.data?.error || 'Failed to update agent');
        return;
      }
    } else {
      // ALWAYS use backend function for consistent validation
      const res = await base44.functions.invoke('createAgent', {
        client_id: payload.client_id,
        name: payload.name,
        description: payload.description,
        agent_type: payload.agent_type,
        system_prompt: payload.system_prompt,
        greeting_message: payload.greeting_message,
        voice_provider: payload.voice_provider,
        voice_id: payload.voice_id,
        voice_settings: payload.voice_settings,
        language: payload.language,
        supported_languages: payload.supported_languages,
        auto_language_detection: payload.auto_language_detection,
        language_prompt_enabled: payload.language_prompt_enabled,
        personality: payload.personality,
        llm_config: payload.llm_config,
        tools_config: payload.tools_config,
        knowledge_base_ids: payload.knowledge_base_ids,
        transfer_config: payload.transfer_config,
        guardrails: payload.guardrails,
        learning_enabled: payload.learning_enabled,
        learning_sources: payload.learning_sources,
        website_url: payload.website_url,
        auto_update_website: payload.auto_update_website,
        update_frequency: payload.update_frequency,
        conversation_learning: payload.conversation_learning,
        knowledge_confidence_threshold: payload.knowledge_confidence_threshold,
        max_call_duration_sec: payload.max_call_duration_sec,
        status: desiredStatus,
        metadata: payload.metadata,
        version: payload.version,
        schema_version: payload.schema_version,
      });
      
      if (res.status >= 400 || !res?.data?.success) {
        toast.error(res?.data?.error || "Failed to create agent");
        return;
      }
    }

    toast.success("Agent saved");
    window.location.href = createPageUrl("Agents");
  } catch (error) {
    console.error("[AgentBuilder] Save error:", error);
    toast.error(error.message || "An unexpected error occurred while saving the agent");
  }
};


  // Voice preview
  const playVoiceSample = async (voice) => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voice.id);
    playTokenRef.current += 1;
    const token = playTokenRef.current;
    const sampleText = "Hello! Thank you for calling. This is a sample of my voice. How may I help you today?";

    try {
      const res = await base44.functions.invoke("previewVoice", {
        text: sampleText,
        voice_id: voice.id,
        provider: voice.provider,
      });

      if (res.data?.use_browser_tts) {
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(sampleText);
          const v = window.speechSynthesis.getVoices();
          const suggestedName = res.data.suggested_voice || "";
          const matchingVoice = v.find(
            (vv) =>
              vv.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
              (voice.gender === "female" && vv.name.toLowerCase().includes("female")) ||
              (voice.gender === "male" && vv.name.toLowerCase().includes("male"))
          );
          if (matchingVoice) utterance.voice = matchingVoice;
          utterance.onend = () => {
            if (token === playTokenRef.current) setPlayingVoice(null);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setPlayingVoice(null);
          toast.info("Voice preview not available for this voice type");
        }
        return;
      }

      if (res.data?.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audio_base64}`);
        audioRef.current = audio;
        audio.onended = () => {
          if (token === playTokenRef.current) setPlayingVoice(null);
        };
        audio.onerror = () => {
          console.error("Audio playback error");
          if (token === playTokenRef.current) setPlayingVoice(null);
        };
        await audio.play();
      } else {
        throw new Error("No audio data");
      }
    } catch (error) {
      console.warn("Server preview failed, falling back to browser TTS", error);
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(sampleText);
        const v = window.speechSynthesis.getVoices();
        const genderMatch = v.find((vv) => {
          const name = vv.name.toLowerCase();
          if (voice.gender === "female") return name.includes("female") || name.includes("samantha") || name.includes("victoria");
          if (voice.gender === "male") return name.includes("male") || name.includes("daniel") || name.includes("alex");
          return false;
        });
        if (genderMatch) utterance.voice = genderMatch;
        utterance.onend = () => {
          if (token === playTokenRef.current) setPlayingVoice(null);
        };
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
      let clientId;
      try {
        clientId = await ensureClientId();
      } catch (err) {
        toast.error("Could not set up account: " + err.message);
        setUploadingFile(false);
        return;
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const fileExtension = file.name.toLowerCase().split(".").pop();
      const isDOCX = fileExtension === "docx";

      let result;
      let kbId;

      if (isDOCX) {
        const { kb } = await ensureKnowledgeBase(clientId, {
          name: `${formData.name || "Agent"} Knowledge`,
          description: `Auto-generated from uploaded file: ${file.name}`,
          type: "documents",
          status: "active",
        });
        kbId = kb.id;
        setFormData((prev) => ({
          ...prev,
          knowledge_base_ids: Array.from(new Set([...(prev.knowledge_base_ids || []), kbId])),
        }));
      }

      if (isDOCX) {
        result = await base44.functions.invoke("uploadDocument", {
          file_url,
          knowledge_base_id: kbId,
          file_name: file.name,
          mime_type: file.type,
        });

        if (result.data?.success) {
          const allChunks = await base44.entities.KnowledgeChunk.filter({ knowledge_base_id: kbId });
          await base44.entities.KnowledgeBase.update(kbId, {
            chunk_count: allChunks.length,
            total_words: allChunks.reduce((sum, c) => sum + (c.content?.split(" ").length || 0), 0),
          });
          queryClient.invalidateQueries({ queryKey: ["knowledgeBases"] });

          const successMessage = document.createElement("div");
          successMessage.className =
            "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2";
          successMessage.textContent = `✅ Successfully uploaded: ${file.name} - ${result.data.chunks_created} chunks created`;
          document.body.appendChild(successMessage);
          setTimeout(() => successMessage.remove(), 4000);
          setUploadingFile(false);
          return;
        } else {
          throw new Error(result.data?.error || "Failed to process DOCX file");
        }
      }

      // Non-DOCX path
      result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The full text content of the document" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, content: { type: "string" } },
              },
            },
          },
        },
      });

      if (result.status === "success" && result.output) {
        const { kb } = await ensureKnowledgeBase(clientId, {
          name: `${formData.name || "Agent"} Knowledge`,
          description: `Auto-generated from uploaded file: ${file.name}`,
          type: "documents",
          status: "active",
        });
        const ensuredKbId = kb.id;
        setFormData((prev) => ({
          ...prev,
          knowledge_base_ids: Array.from(new Set([...(prev.knowledge_base_ids || []), ensuredKbId])),
        }));

        // Create chunks
        let chunksCreated = 0;
        if (result.output.sections) {
          for (const section of result.output.sections) {
            await base44.entities.KnowledgeChunk.create({
              knowledge_base_id: ensuredKbId,
              source_type: "file",
              source_ref: file.name,
              title: section.title,
              content: section.content,
            });
            chunksCreated++;
          }
        } else if (result.output.content) {
          await base44.entities.KnowledgeChunk.create({
            knowledge_base_id: ensuredKbId,
            source_type: "file",
            source_ref: file.name,
            content: result.output.content,
          });
          chunksCreated = 1;
        }

        const allChunks = await base44.entities.KnowledgeChunk.filter({ knowledge_base_id: ensuredKbId });
        await base44.entities.KnowledgeBase.update(ensuredKbId, {
          chunk_count: allChunks.length,
          total_words: allChunks.reduce((sum, c) => sum + (c.content?.split(" ").length || 0), 0),
        });

        queryClient.invalidateQueries({ queryKey: ["knowledgeBases"] });

        const successMessage = document.createElement("div");
        successMessage.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2";
        successMessage.textContent = `✅ Successfully uploaded: ${file.name} - ${chunksCreated} chunks created`;
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 4000);
      } else {
        const errorMessage = document.createElement("div");
        errorMessage.className = "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
        errorMessage.textContent = "❌ Could not extract content. Please try a different file.";
        document.body.appendChild(errorMessage);
        setTimeout(() => errorMessage.remove(), 4000);
      }
    } catch (error) {
      console.error("File upload error:", error);
      const errorMessage = document.createElement("div");
      errorMessage.className = "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      errorMessage.textContent = `❌ Error: ${error.message}`;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 4000);
    }
    setUploadingFile(false);
  };

  const progress = (currentStep / steps.length) * 100;
  const previewAgent = useMemo(() => ({ ...formData, id: editId || 'preview' }), [formData, editId]);
  const canContinue = useMemo(() => {
    if (currentStep === 1) return Boolean(formData.name?.trim());
    if (currentStep === 2) return Boolean(formData.voice_id && formData.voice_provider);
    if (currentStep === 4) return Boolean(formData.system_prompt?.trim());
    return true;
  }, [currentStep, formData.name, formData.voice_id, formData.voice_provider, formData.system_prompt]);

  const generateSystemPrompt = () => {
    const type = agentTypes.find((t) => t.id === formData.agent_type);
    const personality = formData.personality || { formality: 50, friendliness: 70, verbosity: 50, empathy: 60 };

    const prompt = `You are a professional ${type?.title || "AI assistant"} for a business. \n\n   Your role is to ${type?.description || "help callers with their inquiries"}.\n\n   Key responsibilities:\n   ${type?.features?.map((f) => `- ${f}`).join("\n") || "- Assist callers professionally"}\n\n   Communication guidelines:\n   - Be ${personality.friendliness > 60 ? "warm and friendly" : "professional and courteous"}\n   - ${personality.formality > 60 ? "Use formal language" : "Keep conversations natural and approachable"}\n   - ${personality.verbosity > 60 ? "Provide detailed explanations" : "Be concise and to the point"}\n   - ${personality.empathy > 60 ? "Show empathy and understanding" : "Focus on efficiency and solutions"}\n\n   CRITICAL conversation rules:\n   - Give natural, human-like replies - avoid robotic phrases\n   - STOP IMMEDIATELY if caller interrupts or speaks over you\n   - Avoid long pauses - respond promptly (under 1 second)\n   - Listen actively - detect when caller wants to speak\n   - Keep responses brief unless caller asks for details\n   - Never repeat yourself or use filler words\n\n   Always:\n   - Identify yourself at the start of the call\n   - Listen carefully to the caller's needs\n   - Provide accurate information\n   - Offer to transfer to a human if needed`;

    updateFormData("system_prompt", prompt);
  };

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
            <h1 className="text-2xl font-bold text-slate-900">{editId ? "Edit Agent" : "Create New Agent"}</h1>
            <p className="text-slate-500">Build your AI voice agent in a few simple steps</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    currentStep === step.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : currentStep > step.id
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-500"
                  )
                }
              >
                <step.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={cn("h-0.5 w-8 rounded-full", currentStep > step.id ? "bg-indigo-400" : "bg-slate-200")} />
              )}
            </React.Fragment>
          ))}
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Create Your AI Agent</h2>
              <p className="text-slate-500">Your AI agent can handle all types of calls - reception, sales, support, and appointments</p>
            </div>

            <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Multi-Purpose AI Agent</h3>
                    <p className="text-sm text-slate-600 mb-3">Your AEVOICE agent is capable of handling all business communication needs:</p>
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
                    <Input id="name" placeholder="e.g., Sarah - Front Desk" value={formData.name} onChange={(e) => updateFormData("name", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Brief description of what this agent does..." value={formData.description} onChange={(e) => updateFormData("description", e.target.value)} rows={3} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="widget_bot_name" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Website Chatbot Name
                      </Label>
                      <Input id="widget_bot_name" placeholder="Sree" value={formData.widget_bot_name || "Sree"} onChange={(e) => updateFormData("widget_bot_name", e.target.value)} />
                      <p className="text-xs text-slate-500">Name shown in website chat widget (default: Sree) — Sree has been retired</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone_assistant_name" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-500" />
                        Phone Assistant Name
                      </Label>
                      <Input id="phone_assistant_name" placeholder="Aeva" value={formData.phone_assistant_name || "Aeva"} onChange={(e) => updateFormData("phone_assistant_name", e.target.value)} />
                      <p className="text-xs text-slate-500">Name used in phone calls and transcripts (default: Aeva)</p>
                    </div>
                  </div>

                  {/* Website Auto-Learning */}
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-500" />
                      Auto-Learn from Website
                    </Label>
                    <div className="flex gap-2">
                      <Input placeholder="https://yourwebsite.com" value={formData.website_url || ""} onChange={(e) => updateFormData("website_url", e.target.value)} />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!formData.website_url || uploadingFile}
                        onClick={async () => {
                          try {
                            const clientId = await ensureClientId();
                            setUploadingFile(true);
                            let websiteUrl = (formData.website_url || "").trim();
                            if (!/^https?:\/\//i.test(websiteUrl)) websiteUrl = `https://${websiteUrl.replace(/^(www\.)?/i, "")}`;
                            websiteUrl = websiteUrl.replace(/\/+$/, "");
                            const host = (() => {
                              try {
                                return new URL(websiteUrl).hostname;
                              } catch {
                                return websiteUrl;
                              }
                            })();

                            const { kb, created } = await ensureKnowledgeBase(clientId, {
                              name: `${formData.name || "Agent"} - Website Knowledge (${host})`,
                              description: `Auto-learned from ${websiteUrl}`,
                              type: "website",
                              status: "processing",
                            });

                            const result = await base44.functions.invoke("scrapeWebsiteKnowledge", {
                              url: websiteUrl,
                              knowledge_base_id: kb.id,
                            });

                            if (result.data?.success) {
                              setFormData((prev) => ({
                                ...prev,
                                knowledge_base_ids: Array.from(new Set([...(prev.knowledge_base_ids || []), kb.id])),
                              }));
                              queryClient.invalidateQueries({ queryKey: ["knowledgeBases"] });
                              setWebsiteScanSuccess({ chunks: result.data.chunks_created || 0, url: websiteUrl });
                              toast.success(`✅ Successfully learned ${result.data.chunks_created || 0} topics from website`);
                            } else {
                              if (created) {
                                await base44.entities.KnowledgeBase.delete(kb.id).catch(() => {});
                              }
                              setWebsiteScanSuccess(null);
                              setFormData((prev) => ({ ...prev, knowledge_base_ids: (prev.knowledge_base_ids || []).filter((id) => id !== kb.id) }));
                              toast.error(result.data?.error || "Could not scan website - check the URL");
                            }
                          } catch (error) {
                            console.error("Website scan error:", error);
                            toast.error(`Error: ${error.message}`);
                          } finally {
                            setUploadingFile(false);
                          }
                        }}
                      >
                        {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">AI will scan your website and automatically learn your business info, FAQs, services, and contact details</p>
                    {websiteScanSuccess && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 mt-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <p className="text-sm text-emerald-800 font-medium">✅ Website scan successful!</p>
                        </div>
                        <p className="text-xs text-emerald-700 mt-1">Learned {websiteScanSuccess.chunks} topics from {websiteScanSuccess.url}</p>
                      </div>
                    )}
                  </div>

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
                        accept=".pdf,.txt,.csv,.docx,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-4 text-center transition-all",
                          uploadingFile ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        )}
                      >
                        {uploadingFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                            <span className="text-sm text-indigo-600">Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Click to upload PDF, TXT, CSV, DOCX</span>
                          </div>
                        )}
                      </div>
                    </label>
                    <p className="text-xs text-slate-500">Upload FAQs, product docs, or policies for accurate answers</p>
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
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Choose a voice</h2>
              <p className="text-slate-500">Select the voice and language for your agent</p>
            </div>

            <VoiceSelector
              selectedVoice={formData.voice_id}
              selectedProvider={formData.voice_provider}
              voiceSettings={formData.voice_settings}
              onVoiceChange={(id) => updateFormData("voice_id", id)}
              onProviderChange={(p) => updateFormData("voice_provider", p)}
              onSettingsChange={(s) => updateFormData("voice_settings", s)}
            />
          </div>
        )}

        {/* Step 3: Languages */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Multi-Language Support</h2>
              <p className="text-slate-500">Configure language detection and multi-language voice settings</p>
            </div>

            <Card className="border-2 border-indigo-100 bg-indigo-50/30">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-indigo-100">
                      <Sparkles className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">AI Language Detection</h4>
                      <p className="text-sm text-slate-600 mt-1">Automatically detect caller's language and switch voice in real-time</p>
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
                  <Switch checked={formData.auto_language_detection} onCheckedChange={(checked) => updateFormData("auto_language_detection", checked)} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Supported Languages</CardTitle>
                <CardDescription>Select all languages your agent should support (including regional languages)</CardDescription>
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
                          updateFormData(
                            "supported_languages",
                            isSelected && !isPrimary ? current.filter((l) => l !== lang.code) : [...current.filter((l) => l !== lang.code), lang.code]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all",
                          isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{lang.name}</p>
                          <p className="text-xs text-slate-500">{lang.code}</p>
                        </div>
                        {isPrimary && <Badge className="bg-indigo-600 text-white text-xs">Primary</Badge>}
                        {isSelected && !isPrimary && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Language Selection Prompt</h4>
                    <p className="text-sm text-slate-500 mt-1">Ask callers to select their preferred language at the start</p>
                    {formData.language_prompt_enabled && (
                      <p className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2 rounded">
                        "For English, press 1. हिंदी के लिए 2 दबाएं। తెలుగు కోసం 3 నొక్కండి।"
                      </p>
                    )}
                  </div>
                  <Switch checked={formData.language_prompt_enabled} onCheckedChange={(checked) => updateFormData("language_prompt_enabled", checked)} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Behavior */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Define behavior</h2>
              <p className="text-slate-500">Customize how your agent communicates</p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-2">
                  <Label>Greeting Message</Label>
                  <Textarea
                    placeholder="Hello! Thank you for calling. How may I help you today?"
                    value={formData.greeting_message}
                    onChange={(e) => updateFormData("greeting_message", e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">This is the first thing your agent will say when answering a call</p>
                </div>

                <div className="space-y-6">
                  <Label>Personality Traits</Label>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Formality</span>
                      <span className="text-sm text-slate-500">
                        {(formData.personality?.formality || 50) < 40 ? "Casual" : (formData.personality?.formality || 50) > 60 ? "Formal" : "Balanced"}
                      </span>
                    </div>
                    <Slider
                      value={[formData.personality?.formality || 50]}
                      onValueChange={([v]) =>
                        setFormData((prev) => ({ ...prev, personality: { ...prev.personality, formality: v } }))
                      }
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
                        {(formData.personality?.friendliness || 70) < 40 ? "Reserved" : (formData.personality?.friendliness || 70) > 60 ? "Warm" : "Balanced"}
                      </span>
                    </div>
                    <Slider
                      value={[formData.personality?.friendliness || 70]}
                      onValueChange={([v]) =>
                        setFormData((prev) => ({ ...prev, personality: { ...prev.personality, friendliness: v } }))
                      }
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
                        {(formData.personality?.verbosity || 50) < 40 ? "Concise" : (formData.personality?.verbosity || 50) > 60 ? "Detailed" : "Balanced"}
                      </span>
                    </div>
                    <Slider
                      value={[formData.personality?.verbosity || 50]}
                      onValueChange={([v]) =>
                        setFormData((prev) => ({ ...prev, personality: { ...prev.personality, verbosity: v } }))
                      }
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
                    <Button variant="ghost" size="sm" onClick={generateSystemPrompt} className="gap-1 text-indigo-600">
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Detailed instructions for how the agent should behave..."
                    value={formData.system_prompt}
                    onChange={(e) => updateFormData("system_prompt", e.target.value)}
                    rows={8}
                  />
                </div>

                <div className="border-t pt-6 mt-6">
                  <Label className="mb-4 block">LLM Profile (Advanced)</Label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-sm text-slate-600">Model</Label>
                      <MobileSelect
                        value={formData.llm_config?.model || "gpt-4o-mini"}
                        placeholder="Select model"
                        options={[
                          { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast)" },
                          { value: "gpt-4o", label: "GPT-4o (Quality)" },
                          { value: "gpt-4-turbo", label: "GPT-4 Turbo (Balanced)" },
                        ]}
                        onValueChange={(v) =>
                          setFormData((prev) => ({
                            ...prev,
                            llm_config: { ...(prev.llm_config || { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 500, timeout_ms: 2000, fallback_enabled: true }), model: v },
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm text-slate-600">Response Timeout</Label>
                      <MobileSelect
                        value={String(formData.llm_config?.timeout_ms || 2000)}
                        placeholder="Select timeout"
                        options={[
                          { value: "1500", label: "1.5s (Ultra Fast)" },
                          { value: "2000", label: "2s (Recommended)" },
                          { value: "3000", label: "3s (Quality)" },
                          { value: "5000", label: "5s (Complex)" },
                        ]}
                        onValueChange={(v) =>
                          setFormData((prev) => ({
                            ...prev,
                            llm_config: { ...(prev.llm_config || { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 500, timeout_ms: 2000, fallback_enabled: true }), timeout_ms: parseInt(v) },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">Temperature</span>
                        <span className="text-sm text-slate-500">{(formData.llm_config?.temperature || 0.7).toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[formData.llm_config?.temperature || 0.7]}
                        onValueChange={([v]) =>
                          setFormData((prev) => ({
                            ...prev,
                            llm_config: {
                              ...(prev.llm_config || {
                                model: "gpt-4o-mini",
                                temperature: 0.7,
                                max_tokens: 500,
                                timeout_ms: 2000,
                                fallback_enabled: true,
                              }),
                              temperature: v,
                            },
                          }))
                        }
                        min={0}
                        max={1}
                        step={0.1}
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Focused</span>
                        <span>Creative</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Fallback Enabled</p>
                        <p className="text-xs text-slate-500">Use KB answer if LLM times out</p>
                      </div>
                      <Switch
                        checked={formData.llm_config?.fallback_enabled !== false}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            llm_config: {
                              ...(prev.llm_config || {
                                model: "gpt-4o-mini",
                                temperature: 0.7,
                                max_tokens: 500,
                                timeout_ms: 2000,
                                fallback_enabled: true,
                              }),
                              fallback_enabled: checked,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Guardrails */}
                <div className="border-t pt-6 mt-6">
                  <Label className="mb-4 block">Topic Guardrails</Label>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="text-sm text-slate-600">Restricted Topics (comma-separated)</Label>
                      <Input
                        placeholder="e.g., competitor pricing, internal policies, legal advice"
                        value={formData.guardrails?.restricted_topics?.join(", ") || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            guardrails: {
                              ...(prev.guardrails || { restricted_topics: [], escalation_keywords: [], pii_handling: "redact" }),
                              restricted_topics: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                      />
                      <p className="text-xs text-slate-500">Agent will politely decline questions about these topics</p>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm text-slate-600">Escalation Keywords</Label>
                      <Input
                        placeholder="e.g., speak to human, manager, complaint"
                        value={formData.guardrails?.escalation_keywords?.join(", ") || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            guardrails: {
                              ...(prev.guardrails || { restricted_topics: [], escalation_keywords: [], pii_handling: "redact" }),
                              escalation_keywords: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                      />
                      <p className="text-xs text-slate-500">These keywords will trigger transfer to human agent</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Knowledge */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Add knowledge</h2>
              <p className="text-slate-500">Upload files or connect knowledge bases so your agent can answer questions accurately</p>
            </div>

            <Card className="border-2 border-dashed border-indigo-200 bg-indigo-50/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-100 flex items-center justify-center">
                    {uploadingFile ? <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /> : <Upload className="w-6 h-6 text-indigo-600" />}
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">Upload Training Files</h3>
                  <p className="text-sm text-slate-500 mb-4">Upload PDF, TXT, or CSV files to train your agent</p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".pdf,.txt,.csv,.docx,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <Button variant="outline" disabled={uploadingFile} className="cursor-pointer" asChild>
                      <span>
                        <FileText className="w-4 h-4 mr-2" />
                        {uploadingFile ? "Processing..." : "Choose File"}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-slate-400 mt-2">Supported: PDF, TXT, CSV, DOCX (Max 10MB)</p>
                </div>
              </CardContent>
            </Card>

            {knowledgeBases.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-sm text-slate-400">or select existing</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid gap-3">
                  {knowledgeBases.map((kb) => {
                    const isSelected = formData.knowledge_base_ids?.includes(kb.id);
                    return (
                      <button
                        key={kb.id}
                        onClick={() => {
                          const ids = formData.knowledge_base_ids || [];
                          updateFormData("knowledge_base_ids", isSelected ? ids.filter((id) => id !== kb.id) : [...ids, kb.id]);
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                          isSelected ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="p-3 rounded-xl bg-slate-100">
                          <BookOpen className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{kb.name}</p>
                          <p className="text-sm text-slate-500">{kb.chunk_count || 0} chunks • {kb.type || "faq"}</p>
                          {kb.shared_with_sree && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Shared with Sree
                            </Badge>
                          )}
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {knowledgeBases.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">
                  No existing knowledge bases. <Link to={createPageUrl("Knowledge")} className="text-indigo-600 hover:underline">Create one manually</Link>
                </p>
              </div>
            )}

            <Card className="border-2 border-purple-200 bg-purple-50/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                      <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg"
                        alt="Sree"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Share Knowledge with Sree Assistant</h4>
                      <p className="text-sm text-slate-600 mt-1">Enable Sree (website chatbot) to access this agent's knowledge base</p>
                    </div>
                  </div>
                  <Switch
                   checked={formData.shared_with_sree !== false}
                   onCheckedChange={async (checked) => {
                     // Persist to KBs and to agent metadata flag
                     for (const kbId of formData.knowledge_base_ids || []) {
                       await base44.entities.KnowledgeBase.update(kbId, { shared_with_sree: checked });
                     }
                     setFormData(prev => ({ ...prev, shared_with_sree: checked, metadata: { ...(prev.metadata||{}), shared_with_sree: checked } }));
                     queryClient.invalidateQueries({ queryKey: ["knowledgeBases"] });
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
                    <h3 className="font-medium text-slate-900 mb-1">Pro tip: Train with real data</h3>
                    <p className="text-sm text-slate-600">
                      Upload your FAQs, product docs, and policies to help your agent answer questions accurately without hallucinating.
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
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Test & Review Your Agent</h2>
              <p className="text-slate-500">Test your agent with voice before activating</p>
            </div>

            {formData.name && formData.system_prompt && (
              <AgentVoiceTester agent={previewAgent} />
            )}

            <div className="grid gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-2xl bg-gradient-to-br",
                        agentTypes.find((t) => t.id === formData.agent_type)?.color || "from-slate-500 to-slate-600"
                      )}
                    >
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">{formData.name || "Unnamed Agent"}</h3>
                      <p className="text-slate-500 mt-1">{formData.description || "No description"}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          {agentTypes.find((t) => t.id === formData.agent_type)?.title || "General"}
                        </Badge>
                        <Badge variant="secondary">
                          <Volume2 className="w-3 h-3 mr-1" />
                          {voices.find((v) => v.id === formData.voice_id)?.name || formData.voice_id}
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
                    <CardTitle className="text-sm font-medium text-slate-500">Greeting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700">"{formData.greeting_message || "Hello! How may I help you today?"}"</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Knowledge Bases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700">{formData.knowledge_base_ids?.length || 0} connected</p>
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
                      <p className="text-sm text-slate-600">Your agent is configured and ready to take calls</p>
                    </div>
                    <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || !formData.name?.trim() || !formData.system_prompt?.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                      {createMutation.isPending || updateMutation.isPending ? (
                        "Saving..."
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Agent
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
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={handleNext} disabled={!canContinue} className="bg-indigo-600 hover:bg-indigo-700">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || !formData.name?.trim() || !formData.system_prompt?.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Agent"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}