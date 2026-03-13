import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

function getPlatform() {
  if (typeof window === "undefined") return "universal";
  const host = window.location.hostname || "";
  if (host.includes("aevoice")) return "aevoice";
  if (host.includes("hellobiz")) return host.includes("pay") ? "payhellobiz" : "hellobiz";
  if (host.includes("workautomation")) return "workautomation";
  if (host.includes("aevathon")) return "aevathon";
  return "universal";
}

const FALLBACK_TESTIMONIALS = [
  {
    company: "VetNPet Hospital",
    website: "vetnpethospital.com",
    quote: "AEVOICE handles our after-hours calls perfectly. Pet emergencies are now handled 24/7."
  },
  {
    company: "Animal Welfare Society (AWS)",
    website: "animalwelfaresociety.in",
    quote: "The AI receptionist has transformed our adoption inquiries. We've seen 3x more successful placements."
  },
  {
    company: "ZoaZone Services",
    website: "zoazoneservices.com",
    quote: "Our customer response time dropped from hours to seconds. Game changer."
  },
  {
    company: "Hyderabad Estate",
    website: "hyderabadestate.in",
    quote: "Property inquiries are now handled instantly. Our agents focus on closing deals."
  },
  {
    company: "Pay HelloBiz",
    website: "pay.hellobiz.app",
    quote: "Billing inquiries automated completely. 80% reduction in support tickets."
  },
  {
    company: "HelloBiz",
    website: "hellobiz.app",
    quote: "The most intuitive AI voice platform we've used. Setup took 10 minutes."
  }
];

export default function Testimonials() {
  const platform = getPlatform();

  const { data } = useQuery({
    queryKey: ["testimonials", platform],
    queryFn: async () => {
      const rows = await base44.entities.Testimonials.filter({ is_active: true });
      return (rows || [])
        .filter(t => t.show_on_homepage !== false)
        .filter(t => t.platform === "universal" || t.platform === platform)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
    initialData: []
  });

  const items = (data && data.length > 0) ? data : FALLBACK_TESTIMONIALS;

  return (
    <section id="testimonials" className="relative z-10 px-8 lg:px-16 py-24 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-cyan-400 font-mono text-sm tracking-widest mb-4">TRUSTED BY TEAMS</p>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 font-display">
            <span className="text-white">What Our Customers Say</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto">
            Real results from real businesses using AEVOICE.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t, idx) => (
            <Card key={idx} className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/30 transition-all">
              <CardContent className="p-6">
                <Quote className="w-6 h-6 text-cyan-400 mb-4" />
                <p className="text-slate-200 leading-relaxed">{t.quote}</p>
                <div className="mt-4 text-sm text-slate-400 font-medium flex items-center justify-between gap-3">
                  <span>{t.company}</span>
                  {t.website && (
                    <a
                      href={`https://${t.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      {t.website}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
