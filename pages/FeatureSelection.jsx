import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Phone, MessageSquare, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function FeatureSelection() {
  const [selectedFeature, setSelectedFeature] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const features = [
    {
      id: "voice_phone",
      icon: Phone,
      title: "Voice AI Phone System",
      description: "AI-powered phone receptionist that answers calls 24/7",
      benefits: ["Handle unlimited calls", "Book appointments", "Qualify leads", "Transfer calls"],
      color: "from-blue-500 to-cyan-500",
      nextPage: "Pricing"
    },
    {
      id: "voice_chatbot",
      icon: MessageSquare,
      title: "Website Voice Chatbot",
      description: "Interactive voice chat widget for your website",
      benefits: ["Engage website visitors", "Voice conversations", "Multi-language support", "Real-time AI responses"],
      color: "from-purple-500 to-pink-500",
      nextPage: "VoiceChatbotPlans"
    },
    {
      id: "both",
      icon: Zap,
      title: "Complete Voice AI Suite",
      description: "Get both phone system and website chatbot",
      benefits: ["All phone features", "All chatbot features", "Unified dashboard", "Best value pricing"],
      color: "from-emerald-500 to-teal-500",
      badge: "Recommended",
      nextPage: "Pricing"
    }
  ];

  const handleSelect = (feature) => {
    // Save selection preference
    if (user) {
      base44.auth.updateMe({ 
        feature_preference: feature.id 
      }).catch(err => console.error("Error saving preference:", err));
    }
    
    // Redirect to appropriate page
    window.location.href = createPageUrl(feature.nextPage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            What would you like to use?
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose the AI voice features that fit your business needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card 
              key={feature.id}
              className={cn(
                "relative border-2 transition-all hover:shadow-xl cursor-pointer group",
                selectedFeature === feature.id ? "border-indigo-500 shadow-lg" : "border-slate-200"
              )}
              onClick={() => setSelectedFeature(feature.id)}
            >
              {feature.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
                    {feature.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <div className={cn(
                  "w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform",
                  feature.color
                )}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-slate-600">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(feature);
                  }}
                  className={cn(
                    "w-full h-12 text-base font-semibold bg-gradient-to-r",
                    feature.color
                  )}
                >
                  Select
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Not sure? Start with any option - you can always add more features later.
          </p>
        </div>
      </div>
    </div>
  );
}