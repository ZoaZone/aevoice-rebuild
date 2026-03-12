import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

const Section = ({ badge, title, price, children, image, onTry, cta }) => (
  <Card className="overflow-hidden border-slate-200">
    <div className="grid md:grid-cols-2">
      <div className="p-6">
        <Badge className="mb-3 bg-indigo-500/10 border-indigo-500/20 text-indigo-700">{badge}</Badge>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        {price && (
          <div className="text-slate-700 mb-4"><span className="text-3xl font-extrabold">{price}</span></div>
        )}
        <div className="prose prose-slate max-w-none text-slate-700 mb-4">{children}</div>
        <div className="flex gap-2">
          <Button onClick={onTry} className="bg-indigo-600 hover:bg-indigo-700">Try this mode</Button>
          {cta}
        </div>
      </div>
      <div className="relative min-h-[220px] bg-slate-50">
        <img src={image} alt="illustration" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  </Card>
);

// Plan → pricing page link mapping
const PLAN_LINKS = {
  'Sri (Text Chat)': "Pricing",
  'Sri (Voice Chat)': "Pricing",
  'Sree (Local Knowledge)': "Pricing",
  'AI Sree (Agentic Assistant)': "Pricing",
};

export default function SreePlansFull(){
  const navigate = useNavigate();

  const handleTryPlan = async (planKey) => {
    // Check if user is logged in
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        // Logged-in user: go to dashboard's SreeDemo page
        navigate(createPageUrl("SreeDemo"));
        return;
      }
    } catch {}
    // Not logged in: redirect to pricing page so they can sign up
    navigate(createPageUrl(PLAN_LINKS[planKey] || "Pricing"));
  };

  return (
    <div className="space-y-8">
      <Section
        badge="Included"
        title="Sri (Text Chat)"
        price="Included in all AEVOICE plans"
        image="https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&q=60&auto=format&fit=crop"
        onTry={() => handleTryPlan('Sri (Text Chat)')}
      >
        <p>Simple, reliable text assistant for FAQs, scheduling, form filling, and customer support. Works across education, healthcare, retail, and government.</p>
        <ul>
          <li>Instant answers from your knowledge</li>
          <li>Smart forms and intake</li>
          <li>Guided flows</li>
        </ul>
      </Section>

      <Section
        badge="Add-on $15/mo"
        title="Sri (Voice Chat)"
        price="$15/month add-on"
        image="https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200&q=60&auto=format&fit=crop"
        onTry={() => handleTryPlan('Sri (Voice Chat)')}
      >
        <p>Natural voice with speech-to-text and high-quality TTS. Ideal for kiosks, accessibility, hands-free, and automotive use.</p>
        <ul>
          <li>Real-time voice understanding</li>
          <li>Waveform-style speaking feedback</li>
          <li>Multi-language support</li>
        </ul>
      </Section>

      <Section
        badge="$35/mo"
        title="Sree (Local Knowledge)"
        price="$35/month"
        image="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&q=60&auto=format&fit=crop"
        onTry={() => handleTryPlan('Sree (Local Knowledge)')}
      >
        <p>Privacy-first offline AI with local knowledge base. Supports text, voice, and image input. Perfect for HIPAA, finance, and legal compliance.</p>
        <ul>
          <li>Offline mode with local cache</li>
          <li>Image understanding</li>
          <li>No external data sharing</li>
        </ul>
      </Section>

      <Section
        badge="From $50/mo"
        title="AI Sree (Agentic Assistant)"
        price="From $50/month"
        image="https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=1200&q=60&auto=format&fit=crop"
        onTry={() => handleTryPlan('AI Sree (Agentic Assistant)')}
      >
        <p>Agentic Sree executes tasks using your business context. Choose without Knowledge Base for lightweight flows, or with Knowledge Base for RAG-powered answers.</p>
        <ul>
          <li>Actions, workflows, and mini monitor</li>
          <li>Optional Knowledge Base sync</li>
          <li>Transparent, usage-based AI billing</li>
        </ul>
      </Section>
    </div>
  );
}