import { PhoneCall, Brain, Clock, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: PhoneCall,
    title: "Answer Every Call",
    description: "Never miss a customer call again. Your AI agent picks up 24/7, handles inquiries, and books appointments.",
  },
  {
    icon: Brain,
    title: "Learns Your Business",
    description: "Upload documents, FAQs, or a website URL. Your agent automatically learns and answers accurately.",
  },
  {
    icon: Clock,
    title: "Saves Hours Daily",
    description: "Automate repetitive calls — scheduling, FAQs, lead capture — so your team focuses on what matters.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "HIPAA-ready, SOC 2 aligned. Your data stays private with end-to-end encryption.",
  },
];

export default function WhatIsVoiceAI() {
  return (
    <div>
      <div className="text-center mb-14">
        <p className="text-cyan-400 font-mono text-sm tracking-widest mb-3">WHAT IS VOICE AI?</p>
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
          AI That Talks Like a Human, Works Like a Machine
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Voice AI uses natural language processing to understand callers, respond naturally, and take actions — all without human intervention.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/30 transition-colors">
            <div className="w-12 h-12 mb-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <f.icon className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}