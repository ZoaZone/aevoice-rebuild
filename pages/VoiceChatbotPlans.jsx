import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  Mic,
  MessageSquare,
  Check,
  Zap,
  DollarSign,
  Clock,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function VoiceChatbotPlans() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const plans = [
    {
      id: "chatbot_monthly",
      name: "Monthly Chatbot",
      price: 10,
      billing: "monthly",
      description: "Best for regular website engagement",
      features: [
        "Website voice chatbot widget",
        "Unlimited conversations",
        "Pay $0.12 per minute of chat",
        "Real-time voice interaction",
        "Multi-language support",
        "Analytics dashboard"
      ],
      credits_per_month: 0,
      color: "from-blue-500 to-cyan-500",
      badge: "Popular"
    },
    {
      id: "chatbot_onetime",
      name: "One-Time Access",
      price: 50,
      billing: "one_time",
      description: "Lifetime access, pay-as-you-go",
      features: [
        "Lifetime chatbot access",
        "No recurring fees",
        "Pay only $0.12 per minute used",
        "All monthly features included",
        "Priority support",
        "Custom branding"
      ],
      credits_per_month: 0,
      color: "from-purple-500 to-pink-500",
      badge: "Best Value"
    },
    {
      id: "chatbot_addon",
      name: "Plan Add-on",
      price: 0,
      billing: "addon",
      description: "Enhance Mini/Micro/Medium/Mega",
      features: [
        "Add to existing subscription",
        "Uses plan's credit balance",
        "Same $0.12/min rate applies",
        "Integrated billing",
        "Unified dashboard",
        "No extra subscription"
      ],
      credits_per_month: null,
      color: "from-emerald-500 to-teal-500",
      badge: "Add-on"
    }
  ];

  const handleSelectPlan = async (plan) => {
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl("VoiceChatbotPlans"));
      return;
    }

    setIsProcessing(true);
    setSelectedPlan(plan.id);

    try {
      if (plan.billing === "addon") {
        // Enable chatbot on existing subscription
        toast.success("Voice chatbot enabled on your plan!");
        setTimeout(() => {
          window.location.href = createPageUrl("Dashboard");
        }, 1500);
      } else {
        // Create Stripe checkout session
        const response = await base44.functions.invoke('createChatbotCheckout', {
          plan_id: plan.id,
          plan_type: plan.billing,
          price: plan.price,
          user_email: user.email,
          success_url: `${window.location.origin}${createPageUrl('Dashboard')}?chatbot_success=true`,
          cancel_url: `${window.location.origin}${createPageUrl('VoiceChatbotPlans')}`
        });

        if (response.data?.checkout_url) {
          window.location.href = response.data.checkout_url;
        } else {
          throw new Error("Failed to create checkout session");
        }
      }
    } catch (error) {
      console.error("Plan selection error:", error);
      toast.error(error.message || "Failed to process plan selection");
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-cyan-500/10 border-cyan-500/20 text-cyan-700">
            <MessageSquare className="w-3 h-3 mr-2" />
            Voice Chatbot Plans
          </Badge>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Add Voice Intelligence to Your Website
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Engage visitors with natural voice conversations. Choose the plan that fits your needs.
          </p>
        </div>

        {/* Key Features Banner */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Mic, label: "Voice Recognition", desc: "Natural speech understanding" },
            { icon: Sparkles, label: "AI-Powered", desc: "Intelligent responses" },
            { icon: Clock, label: "$0.12/minute", desc: "Pay-as-you-go pricing" }
          ].map((item, i) => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                "relative border-2 transition-all hover:shadow-xl",
                plan.badge === "Best Value" ? "border-purple-500/50 shadow-lg" : "border-slate-200"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={cn(
                    "border-0 text-white px-4 py-1",
                    plan.badge === "Best Value" ? "bg-gradient-to-r from-purple-600 to-pink-600" :
                    plan.badge === "Popular" ? "bg-gradient-to-r from-blue-600 to-cyan-600" :
                    "bg-gradient-to-r from-emerald-600 to-teal-600"
                  )}>
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <div className={cn(
                  "w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                  plan.color
                )}>
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  {plan.price > 0 ? (
                    <>
                      <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                      <span className="text-slate-500 ml-1">
                        {plan.billing === "monthly" ? "/month" : "one-time"}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-emerald-600">Free Add-on</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isProcessing && selectedPlan === plan.id}
                  className={cn(
                    "w-full h-12 text-base font-semibold",
                    plan.badge === "Best Value" ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" :
                    plan.badge === "Popular" ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700" :
                    "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  )}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    "Processing..."
                  ) : plan.billing === "addon" ? (
                    "Enable Add-on"
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agency Option */}
        <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Agency / White-Label Option</CardTitle>
                <CardDescription className="text-slate-600">
                  Resell voice chatbot to your clients
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">What You Get:</h4>
                <ul className="space-y-2">
                  {[
                    "White-label chatbot widget",
                    "Client management dashboard",
                    "Custom branding per client",
                    "15% platform fee on revenue",
                    "Dedicated support channel"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-amber-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-center">
                <div className="p-4 bg-white rounded-xl border border-amber-200 mb-4">
                  <p className="text-sm text-slate-600 mb-2">Example Pricing:</p>
                  <p className="text-lg font-bold text-slate-900">
                    Charge clients $15-25/month
                  </p>
                  <p className="text-sm text-slate-500">
                    Platform fee: 15% • Your profit: 85%
                  </p>
                </div>
                <Button 
                  onClick={() => window.location.href = createPageUrl("AgencySignup")}
                  className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Register as Agency
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Details */}
        <Card className="mt-8 bg-slate-50 border-slate-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-600" />
              How Pricing Works
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm mb-6">
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">Monthly Plan</p>
                <p className="text-slate-600 mb-2">$10/month subscription + $0.12 per minute</p>
                <p className="text-xs text-slate-500">Best for regular engagement</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">One-Time</p>
                <p className="text-slate-600 mb-2">$50 once + $0.12 per minute used</p>
                <p className="text-xs text-slate-500">Lifetime access, no recurring fee</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">Add-on (Mini/Micro)</p>
                <p className="text-slate-600 mb-2">Free addon, uses plan credits at $0.12/min</p>
                <p className="text-xs text-slate-500">Integrated with existing subscription</p>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <p className="text-sm text-slate-700 mb-2">
                <strong className="text-purple-700">Medium & Mega Plans:</strong> Voice Chatbot is <span className="text-emerald-600 font-semibold">INCLUDED FREE</span> - uses your plan credits at $0.12/min. No additional subscription needed!
              </p>
              <p className="text-xs text-slate-600">
                <strong>Note:</strong> Mini & Micro plans must subscribe separately ($10/mo or $50 one-time) as a standalone chatbot service.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}