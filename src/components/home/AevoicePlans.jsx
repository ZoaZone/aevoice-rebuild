import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const AEVOICE_PLANS = [
  {
    name: "Aeva Mini",
    price: "$35",
    period: "/mo",
    badge: "Starter",
    badgeColor: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    borderColor: "border-cyan-500/30",
    features: [
      "1 AI Agent",
      "1 Phone Number",
      "100 minutes included",
      "Basic Knowledge Base",
      "Email support",
    ],
  },
  {
    name: "Aeva Micro",
    price: "$100",
    period: "/mo",
    badge: "Growth",
    badgeColor: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    borderColor: "border-blue-500/30",
    features: [
      "3 AI Agents",
      "2 Phone Numbers",
      "300 minutes included",
      "Advanced Knowledge Base",
      "Priority support",
      "Multi-language support",
    ],
  },
  {
    name: "Aeva Medium",
    price: "$250",
    period: "/mo",
    badge: "Popular",
    badgeColor: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    borderColor: "border-purple-500/50",
    highlight: true,
    features: [
      "Unlimited AI Agents",
      "Unlimited Phone Numbers",
      "1,666 minutes ($0.15/min)",
      "Call recording & analytics",
      "All premium voices",
      "Sree Assistant INCLUDED",
    ],
  },
  {
    name: "Aeva Mega",
    price: "$1,000",
    period: "/mo",
    badge: "Enterprise",
    badgeColor: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    borderColor: "border-amber-500/30",
    features: [
      "7,000+ minutes (5% discount)",
      "Unlimited everything",
      "Dedicated account manager",
      "White-label & API access",
      "All premium voices (ElevenLabs)",
      "Sree Assistant INCLUDED",
    ],
  },
];

export default function AevoicePlans() {
  return (
    <div>
      <div className="text-center mb-10">
        <p className="text-cyan-400 font-mono text-sm tracking-widest mb-3">AEVOICE PLANS</p>
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">Voice AI for Every Business</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">Choose the plan that fits your call volume and agent needs.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {AEVOICE_PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={`relative overflow-hidden bg-slate-900/60 ${plan.highlight ? `border-2 ${plan.borderColor}` : "border-slate-800"}`}
          >
            {plan.highlight && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
            )}
            <CardContent className="p-6">
              <Badge className={`mb-3 ${plan.badgeColor}`}>{plan.badge}</Badge>
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={createPageUrl("Pricing")}>
                <Button
                  className={`w-full ${plan.highlight ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" : "bg-white/10 hover:bg-white/20 border border-white/20"}`}
                >
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}