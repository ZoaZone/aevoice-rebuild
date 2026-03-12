import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const PLANS = [
  { name: 'Sree Voice Chatbot', price: 10, desc: 'Basic voice chatbot for your website with usage-based AI billing', features: ['1 site', 'Voice widget', 'Usage-based AI pricing', 'Credits used at $0.12/min'] },
  { name: 'Agentic Sree (no KB)', price: 50, desc: 'Agentic assistant without knowledge base — includes AI usage costs', features: ['Agent actions', 'Mini monitor', 'Workflows', 'Credits used at $0.12/min'] },
  { name: 'Agentic Sree (with KB)', price: 100, desc: 'Full agentic assistant with knowledge base and transparent billing', features: ['KB sync', 'RAG answers', 'Automations', 'Credits used at $0.12/min'] },
];

async function setModeAndOpenByPlan(name){
  // Map plan name → server-safe mode + UI label
  let serverMode = 'Sree';
  let uiMode = 'Sree (Local Knowledge)';
  if (name.includes('Voice')) { serverMode = 'Voice Chat'; uiMode = 'Voice Chat'; }
  else if (name.includes('Agentic')) { serverMode = 'Agentic Sree'; uiMode = 'AI Sree (Agentic Assistant)'; }

  // Only persist mode if authenticated; otherwise just open demo UI
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (isAuth) {
      await base44.functions.invoke('setAssistantMode', { mode: serverMode });
    }
  } catch {}

  // Open the widget first, then set mode
  window.dispatchEvent(new CustomEvent('sree:open'));
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('sree:setMode', { detail: uiMode }));
  }, 300);
}

export default function SreePlans(){
  return (
    <section className="relative z-10 px-8 lg:px-16 py-16 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-6">AEVATHON Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p)=> (
            <Card key={p.name} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                <p className="text-slate-400 text-sm mb-3">{p.desc}</p>
                <div className="text-3xl font-bold text-white mb-4">${p.price}<span className="text-sm text-slate-400">/mo</span></div>
                <ul className="text-sm text-slate-300 space-y-1 mb-4">
                  {p.features.map(f => <li key={f}>• {f}</li>)}
                </ul>
                <Button onClick={() => setModeAndOpenByPlan(p.name)} className="bg-gradient-to-r from-cyan-500 to-blue-600">Try Assistant</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}