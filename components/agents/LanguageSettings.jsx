import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Globe,
  Languages,
  Plus,
  X,
  Check,
  Volume2,
  Mic,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Comprehensive language list including Indian regional languages
const availableLanguages = [
  // English variants
  { code: "en-US", name: "English (US)", flag: "🇺🇸", region: "Americas" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧", region: "Europe" },
  { code: "en-IN", name: "English (India)", flag: "🇮🇳", region: "Asia" },
  { code: "en-AU", name: "English (Australia)", flag: "🇦🇺", region: "Oceania" },
  
  // Indian Regional Languages
  { code: "hi-IN", name: "Hindi", flag: "🇮🇳", region: "India" },
  { code: "te-IN", name: "Telugu", flag: "🇮🇳", region: "India" },
  { code: "ta-IN", name: "Tamil", flag: "🇮🇳", region: "India" },
  { code: "kn-IN", name: "Kannada", flag: "🇮🇳", region: "India" },
  { code: "ml-IN", name: "Malayalam", flag: "🇮🇳", region: "India" },
  { code: "mr-IN", name: "Marathi", flag: "🇮🇳", region: "India" },
  { code: "bn-IN", name: "Bengali", flag: "🇮🇳", region: "India" },
  { code: "gu-IN", name: "Gujarati", flag: "🇮🇳", region: "India" },
  { code: "pa-IN", name: "Punjabi", flag: "🇮🇳", region: "India" },
  { code: "or-IN", name: "Odia", flag: "🇮🇳", region: "India" },
  
  // European Languages
  { code: "es-ES", name: "Spanish (Spain)", flag: "🇪🇸", region: "Europe" },
  { code: "es-MX", name: "Spanish (Mexico)", flag: "🇲🇽", region: "Americas" },
  { code: "fr-FR", name: "French", flag: "🇫🇷", region: "Europe" },
  { code: "de-DE", name: "German", flag: "🇩🇪", region: "Europe" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹", region: "Europe" },
  { code: "pt-BR", name: "Portuguese (Brazil)", flag: "🇧🇷", region: "Americas" },
  { code: "pt-PT", name: "Portuguese (Portugal)", flag: "🇵🇹", region: "Europe" },
  { code: "nl-NL", name: "Dutch", flag: "🇳🇱", region: "Europe" },
  { code: "ru-RU", name: "Russian", flag: "🇷🇺", region: "Europe" },
  { code: "pl-PL", name: "Polish", flag: "🇵🇱", region: "Europe" },
  
  // Asian Languages
  { code: "zh-CN", name: "Chinese (Mandarin)", flag: "🇨🇳", region: "Asia" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵", region: "Asia" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷", region: "Asia" },
  { code: "th-TH", name: "Thai", flag: "🇹🇭", region: "Asia" },
  { code: "vi-VN", name: "Vietnamese", flag: "🇻🇳", region: "Asia" },
  { code: "id-ID", name: "Indonesian", flag: "🇮🇩", region: "Asia" },
  { code: "ms-MY", name: "Malay", flag: "🇲🇾", region: "Asia" },
  { code: "fil-PH", name: "Filipino", flag: "🇵🇭", region: "Asia" },
  
  // Middle Eastern
  { code: "ar-SA", name: "Arabic", flag: "🇸🇦", region: "Middle East" },
  { code: "he-IL", name: "Hebrew", flag: "🇮🇱", region: "Middle East" },
  { code: "tr-TR", name: "Turkish", flag: "🇹🇷", region: "Middle East" },
  { code: "fa-IR", name: "Persian (Farsi)", flag: "🇮🇷", region: "Middle East" },
];

const voiceOptions = {
  "en-US": ["alloy", "echo", "nova", "shimmer"],
  "en-IN": ["ravi", "priya", "amit"],
  "hi-IN": ["aditi", "raveena", "kajal"],
  "te-IN": ["sravya", "mahesh"],
  "ta-IN": ["priya_tamil", "kumar"],
  "kn-IN": ["shreya", "ramesh"],
  // Add more voice mappings as needed
};

export default function LanguageSettings({ agentId, languageConfig, onUpdate }) {
  const [config, setConfig] = useState(languageConfig || {
    primary_language: "en-US",
    supported_languages: ["en-US"],
    auto_detect_enabled: true,
    language_prompt_enabled: false,
    fallback_language: "en-US",
    voice_mappings: {},
    greeting_translations: {}
  });

  const [showAddLanguage, setShowAddLanguage] = useState(false);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (languageConfig?.id) {
        return base44.entities.LanguageConfig.update(languageConfig.id, data);
      } else {
        return base44.entities.LanguageConfig.create({ agent_id: agentId, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languageConfig'] });
      onUpdate?.();
    },
  });

  const addLanguage = (langCode) => {
    if (!config.supported_languages.includes(langCode)) {
      setConfig({
        ...config,
        supported_languages: [...config.supported_languages, langCode]
      });
    }
    setShowAddLanguage(false);
  };

  const removeLanguage = (langCode) => {
    if (langCode !== config.primary_language) {
      setConfig({
        ...config,
        supported_languages: config.supported_languages.filter(l => l !== langCode)
      });
    }
  };

  const getLanguageInfo = (code) => availableLanguages.find(l => l.code === code);

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  // Group languages by region for easier selection
  const languagesByRegion = availableLanguages.reduce((acc, lang) => {
    if (!acc[lang.region]) acc[lang.region] = [];
    acc[lang.region].push(lang);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Multi-Language Support
          </h3>
          <p className="text-sm text-slate-500">
            Configure language detection and voice settings for your AI agent
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Auto-Detection Card */}
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
                  Automatically detect the caller's language and switch the AI voice in real-time
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Badge className="bg-white text-indigo-700">
                    <Mic className="w-3 h-3 mr-1" />
                    Speech Recognition
                  </Badge>
                  <Badge className="bg-white text-indigo-700">
                    <Volume2 className="w-3 h-3 mr-1" />
                    Auto Voice Switch
                  </Badge>
                </div>
              </div>
            </div>
            <Switch
              checked={config.auto_detect_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, auto_detect_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Primary Language */}
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label className="flex items-center gap-2">
            Primary Language
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>
                  The default language your agent will use when starting a call
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select 
            value={config.primary_language} 
            onValueChange={(v) => setConfig({ ...config, primary_language: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.supported_languages.map((code) => {
                const lang = getLanguageInfo(code);
                return (
                  <SelectItem key={code} value={code}>
                    <span className="flex items-center gap-2">
                      <span>{lang?.flag}</span>
                      {lang?.name || code}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Supported Languages */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Supported Languages</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAddLanguage(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Language
            </Button>
          </div>
          <CardDescription>
            Your agent can speak and understand these languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {config.supported_languages.map((code) => {
              const lang = getLanguageInfo(code);
              const isPrimary = code === config.primary_language;
              
              return (
                <div 
                  key={code}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border-2",
                    isPrimary 
                      ? "border-indigo-300 bg-indigo-50" 
                      : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{lang?.flag}</span>
                    <div>
                      <p className="font-medium text-sm">{lang?.name}</p>
                      <p className="text-xs text-slate-500">{code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isPrimary && (
                      <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                        Primary
                      </Badge>
                    )}
                    {!isPrimary && (
                      <button
                        onClick={() => removeLanguage(code)}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Language Modal */}
      {showAddLanguage && (
        <Card className="border-2 border-dashed border-indigo-300 bg-indigo-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add Language</CardTitle>
              <button onClick={() => setShowAddLanguage(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {Object.entries(languagesByRegion).map(([region, languages]) => (
              <div key={region} className="mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">{region}</p>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => {
                    const isAdded = config.supported_languages.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        onClick={() => !isAdded && addLanguage(lang.code)}
                        disabled={isAdded}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                          isAdded
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                        )}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {isAdded && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Language Prompt Option */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Language Selection Prompt</h4>
              <p className="text-sm text-slate-500 mt-1">
                Ask callers to select their preferred language at the start of the call
              </p>
            </div>
            <Switch
              checked={config.language_prompt_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, language_prompt_enabled: checked })}
            />
          </div>
          
          {config.language_prompt_enabled && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Example prompt:</p>
              <p className="text-sm italic text-slate-700">
                "For English, press 1. हिंदी के लिए, 2 दबाएं। తెలుగు కోసం, 3 నొక్కండి।"
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Greeting Translations */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Greeting Translations</CardTitle>
          <CardDescription>
            Customize your agent's greeting in each language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.supported_languages.map((code) => {
            const lang = getLanguageInfo(code);
            return (
              <div key={code} className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <span>{lang?.flag}</span>
                  {lang?.name}
                </Label>
                <Textarea
                  placeholder={`Enter greeting in ${lang?.name}...`}
                  value={config.greeting_translations?.[code] || ""}
                  onChange={(e) => setConfig({
                    ...config,
                    greeting_translations: {
                      ...config.greeting_translations,
                      [code]: e.target.value
                    }
                  })}
                  rows={2}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}