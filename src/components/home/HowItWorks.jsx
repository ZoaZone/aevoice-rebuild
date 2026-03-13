import { Bot, Phone, Zap } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Zap,
    title: "Choose Your Plan",
    description: "Select the plan that matches your business needs — from small teams to enterprise.",
    color: "from-purple-500 to-pink-500",
  },
  {
    number: "02",
    icon: Bot,
    title: "Create Your AI Agent",
    description: "Build a voice assistant trained on your business knowledge in minutes.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    number: "03",
    icon: Phone,
    title: "Connect a Phone Number",
    description: "Get a number from Twilio or bring your own. Start taking calls instantly.",
    color: "from-emerald-500 to-teal-500",
  },
];

export default function HowItWorks() {
  return (
    <div>
      <div className="text-center mb-14">
        <p className="text-cyan-400 font-mono text-sm tracking-widest mb-3">HOW IT WORKS</p>
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">Up and Running in 3 Steps</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          No coding required. Set up your AI voice assistant in under 10 minutes.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {STEPS.map((step) => (
          <div key={step.number} className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
              <step.icon className="w-8 h-8 text-white" />
            </div>
            <span className="text-cyan-400 font-mono text-sm font-bold">{step.number}</span>
            <h3 className="text-xl font-bold text-white mt-2 mb-2">{step.title}</h3>
            <p className="text-slate-400 text-sm">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}