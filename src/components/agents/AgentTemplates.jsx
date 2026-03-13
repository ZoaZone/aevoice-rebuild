import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ShoppingCart, Stethoscope, Phone, Sparkles } from "lucide-react";

const templates = [
  {
    id: "receptionist",
    name: "Receptionist",
    icon: Phone,
    description: "Answer calls, book appointments, transfer to staff",
    systemPrompt: "You are a friendly receptionist. Greet callers warmly, help them book appointments, answer basic questions, and transfer calls when needed. Always be polite and professional.",
    personality: { formality: 70, friendliness: 80, verbosity: 50, empathy: 75 },
    color: "from-blue-500 to-cyan-600"
  },
  {
    id: "sales",
    name: "Sales Assistant",
    icon: ShoppingCart,
    description: "Handle inquiries, qualify leads, schedule demos",
    systemPrompt: "You are an enthusiastic sales assistant. Help prospects understand our products, qualify their needs, answer questions about pricing and features, and schedule product demos. Be persuasive but not pushy.",
    personality: { formality: 60, friendliness: 85, verbosity: 65, empathy: 70 },
    color: "from-green-500 to-emerald-600"
  },
  {
    id: "support",
    name: "Customer Support",
    icon: Stethoscope,
    description: "Resolve issues, provide technical help, escalate when needed",
    systemPrompt: "You are a patient customer support agent. Listen carefully to customer issues, provide step-by-step troubleshooting, access knowledge base for solutions, and escalate complex issues to human agents. Always prioritize customer satisfaction.",
    personality: { formality: 70, friendliness: 75, verbosity: 60, empathy: 90 },
    color: "from-purple-500 to-pink-600"
  },
  {
    id: "appointment",
    name: "Appointment Scheduler",
    icon: Building2,
    description: "Schedule, reschedule, and manage appointments",
    systemPrompt: "You are an efficient appointment scheduler. Help customers book, reschedule, or cancel appointments. Check availability, confirm details, send reminders, and handle scheduling conflicts professionally.",
    personality: { formality: 75, friendliness: 70, verbosity: 45, empathy: 65 },
    color: "from-amber-500 to-orange-600"
  },
  {
    id: "custom",
    name: "Custom Agent",
    icon: Sparkles,
    description: "AI-generated agent based on your description",
    systemPrompt: "",
    personality: { formality: 60, friendliness: 70, verbosity: 50, empathy: 70 },
    color: "from-indigo-500 to-purple-600"
  }
];

export default function AgentTemplates({ onSelect, onAIGenerate }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Choose a Template</h3>
        <p className="text-slate-500">Start with a pre-configured agent or let AI create one for you</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className="border-2 hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg group"
            onClick={() => {
              if (template.id === 'custom') {
                onAIGenerate();
              } else {
                onSelect(template);
              }
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
                  <template.icon className="w-6 h-6" />
                </div>
                {template.id === 'custom' && (
                  <Badge className="bg-purple-100 text-purple-700">AI Powered</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{template.description}</p>
              {template.id === 'custom' && (
                <div className="mt-3 p-2 bg-purple-50 rounded-lg text-xs text-purple-700">
                  Describe what you want your agent to do, and AI will create it!
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { templates };