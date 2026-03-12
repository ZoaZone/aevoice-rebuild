import React, { useState } from "react";
import {
  Volume2,
  Play,
  Pause,
  Star,
  Globe,
  Mic,
  Sparkles,
  Check,
  Crown,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Comprehensive voice library
const voiceLibrary = {
  openai: [
    { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral", accent: "American", preview: true },
    { id: "echo", name: "Echo", description: "Warm and friendly", gender: "male", accent: "American", preview: true },
    { id: "fable", name: "Fable", description: "British accent", gender: "male", accent: "British", preview: true },
    { id: "onyx", name: "Onyx", description: "Deep and authoritative", gender: "male", accent: "American", preview: true },
    { id: "nova", name: "Nova", description: "Friendly and upbeat", gender: "female", accent: "American", preview: true },
    { id: "shimmer", name: "Shimmer", description: "Soft and soothing", gender: "female", accent: "American", preview: true },
  ],
  elevenlabs: [
    // English Voices
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm American female", gender: "female", accent: "American", language: "en", premium: true },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Strong American female", gender: "female", accent: "American", language: "en", premium: true },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft American female", gender: "female", accent: "American", language: "en", premium: true },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Well-rounded male", gender: "male", accent: "American", language: "en", premium: true },
    { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", description: "Emotional female", gender: "female", accent: "American", language: "en", premium: true },
    { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Deep American male", gender: "male", accent: "American", language: "en", premium: true },
    { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", description: "Crisp male", gender: "male", accent: "American", language: "en", premium: true },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Deep male", gender: "male", accent: "American", language: "en", premium: true },
    { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", description: "Raspy male", gender: "male", accent: "American", language: "en", premium: true },
    // British Voices
    { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", description: "British female", gender: "female", accent: "British", language: "en-GB", premium: true },
    { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan", description: "British male", gender: "male", accent: "British", language: "en-GB", premium: true },
    // Indian Voices
    { id: "nPczCjzI2devNBz1zQrb", name: "Priya", description: "Indian female", gender: "female", accent: "Indian", language: "hi-IN", premium: true },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "Raj", description: "Indian male", gender: "male", accent: "Indian", language: "hi-IN", premium: true },
    // Spanish Voices
    { id: "jBpfuIE2acCO8z3wKNLl", name: "Sofia", description: "Spanish female", gender: "female", accent: "Spanish", language: "es", premium: true },
    { id: "wViXBPUzp2ZZixB1xQuM", name: "Carlos", description: "Spanish male", gender: "male", accent: "Spanish", language: "es", premium: true },
    // German Voices
    { id: "XrExE9yKIg1WjnnlVkGX", name: "Hannah", description: "German female", gender: "female", accent: "German", language: "de", premium: true },
    // French Voices
    { id: "pFZP5JQG7iQjIQuC4Bku", name: "Marie", description: "French female", gender: "female", accent: "French", language: "fr", premium: true },
    // Arabic Voices
    { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Fatima", description: "Arabic female", gender: "female", accent: "Arabic", language: "ar", premium: true },
  ],
  cloned: [
    // Placeholder for user cloned voices
  ]
};

const languageFlags = {
  "en": "🇺🇸",
  "en-GB": "🇬🇧",
  "hi-IN": "🇮🇳",
  "es": "🇪🇸",
  "de": "🇩🇪",
  "fr": "🇫🇷",
  "ar": "🇸🇦",
};

export default function VoiceSelector({ 
  selectedVoice, 
  selectedProvider, 
  voiceSettings,
  onVoiceChange, 
  onProviderChange,
  onSettingsChange 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [filterAccent, setFilterAccent] = useState("all");
  const [playingVoice, setPlayingVoice] = useState(null);

  const allVoices = [
    ...voiceLibrary.openai.map(v => ({ ...v, provider: "openai" })),
    ...voiceLibrary.elevenlabs.map(v => ({ ...v, provider: "elevenlabs" })),
  ];

  const filteredVoices = allVoices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = filterGender === "all" || voice.gender === filterGender;
    const matchesAccent = filterAccent === "all" || voice.accent === filterAccent;
    return matchesSearch && matchesGender && matchesAccent;
  });

  const accents = [...new Set(allVoices.map(v => v.accent))];

  const handleVoiceSelect = (voice) => {
    onVoiceChange(voice.id);
    onProviderChange(voice.provider);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Volume2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="neutral">Neutral</option>
        </select>
        <select
          value={filterAccent}
          onChange={(e) => setFilterAccent(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">All Accents</option>
          {accents.map(accent => (
            <option key={accent} value={accent}>{accent}</option>
          ))}
        </select>
      </div>

      {/* Voice Grid */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Voices</TabsTrigger>
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="elevenlabs">
            ElevenLabs
            <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">Premium</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredVoices.map((voice) => (
              <VoiceCard
                key={`${voice.provider}-${voice.id}`}
                voice={voice}
                isSelected={selectedVoice === voice.id && selectedProvider === voice.provider}
                isPlaying={playingVoice === voice.id}
                onSelect={() => handleVoiceSelect(voice)}
                onPlay={() => setPlayingVoice(playingVoice === voice.id ? null : voice.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="openai" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredVoices.filter(v => v.provider === "openai").map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                isSelected={selectedVoice === voice.id}
                isPlaying={playingVoice === voice.id}
                onSelect={() => handleVoiceSelect(voice)}
                onPlay={() => setPlayingVoice(playingVoice === voice.id ? null : voice.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="elevenlabs" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredVoices.filter(v => v.provider === "elevenlabs").map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                isSelected={selectedVoice === voice.id}
                isPlaying={playingVoice === voice.id}
                onSelect={() => handleVoiceSelect(voice)}
                onPlay={() => setPlayingVoice(playingVoice === voice.id ? null : voice.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Voice Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Voice Settings</CardTitle>
          <CardDescription>Fine-tune how your agent sounds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-600">Speed</span>
              <span className="text-sm text-slate-500">{voiceSettings?.speed?.toFixed(1) || 1}x</span>
            </div>
            <Slider
              value={[voiceSettings?.speed || 1]}
              onValueChange={([v]) => onSettingsChange({ ...voiceSettings, speed: v })}
              min={0.5}
              max={2}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Slower</span>
              <span>Faster</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-600">Stability</span>
              <span className="text-sm text-slate-500">{Math.round((voiceSettings?.stability || 0.75) * 100)}%</span>
            </div>
            <Slider
              value={[voiceSettings?.stability || 0.75]}
              onValueChange={([v]) => onSettingsChange({ ...voiceSettings, stability: v })}
              min={0}
              max={1}
              step={0.05}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>More Variable</span>
              <span>More Stable</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-600">Clarity + Similarity</span>
              <span className="text-sm text-slate-500">{Math.round((voiceSettings?.similarity_boost || 0.75) * 100)}%</span>
            </div>
            <Slider
              value={[voiceSettings?.similarity_boost || 0.75]}
              onValueChange={([v]) => onSettingsChange({ ...voiceSettings, similarity_boost: v })}
              min={0}
              max={1}
              step={0.05}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Lower</span>
              <span>Higher</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Cloning Promo */}
      <Card className="border-2 border-dashed border-indigo-200 bg-indigo-50/50">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Custom Voice Cloning</h3>
          <p className="text-sm text-slate-500 mb-4">
            Clone your own voice or create a unique brand voice for your agents
          </p>
          <Badge className="bg-amber-100 text-amber-700">Coming Soon - Enterprise Feature</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function VoiceCard({ voice, isSelected, isPlaying, onSelect, onPlay }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all",
        isSelected
          ? "border-indigo-500 bg-indigo-50/50 shadow-md"
          : "border-slate-200 hover:border-slate-300 bg-white"
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {voice.premium && (
        <Badge className="absolute top-2 left-2 bg-amber-100 text-amber-700 text-xs">
          <Crown className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      )}

      <div className="flex items-center gap-2 mb-2 mt-4">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          voice.gender === 'female' ? "bg-pink-100" : 
          voice.gender === 'male' ? "bg-blue-100" : "bg-slate-100"
        )}>
          <Mic className={cn(
            "w-4 h-4",
            voice.gender === 'female' ? "text-pink-600" : 
            voice.gender === 'male' ? "text-blue-600" : "text-slate-600"
          )} />
        </div>
        {voice.language && languageFlags[voice.language] && (
          <span className="text-lg">{languageFlags[voice.language]}</span>
        )}
      </div>

      <p className="font-medium text-slate-900">{voice.name}</p>
      <p className="text-xs text-slate-500 mb-2">{voice.description}</p>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {voice.accent}
        </Badge>
        <Badge variant="secondary" className="text-xs capitalize">
          {voice.provider}
        </Badge>
      </div>
    </button>
  );
}