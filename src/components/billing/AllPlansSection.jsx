import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Bot, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_ICONS = {
  "aeva-mini": Bot,
  "aeva-micro": Bot,
  "aeva-medium": Bot,
  "aeva-mega": Bot,
  "sree-starter": MessageSquare,
  "sree-professional": MessageSquare,
  "sree-enterprise": MessageSquare,
  "free-partner": Users,
};

const PLAN_COLORS = {
  "aeva-mini": "border-indigo-200 hover:border-indigo-400",
  "aeva-micro": "border-indigo-300 shadow-lg shadow-indigo-100",
  "aeva-medium": "border-purple-200 hover:border-purple-400",
  "aeva-mega": "border-amber-200 hover:border-amber-400",
  "sree-starter": "border-emerald-200 hover:border-emerald-400",
  "sree-professional": "border-emerald-300 shadow-lg shadow-emerald-100",
  "sree-enterprise": "border-teal-200 hover:border-teal-400",
  "free-partner": "border-cyan-200 hover:border-cyan-400",
};

export default function AllPlansSection({ stripeSubscription }) {
  const { data: dbPlans = [] } = useQuery({
    queryKey: ["allPlans"],
    queryFn: () => base44.entities.Plan.list(),
  });

  const sortedPlans = [...dbPlans].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const aevoicePlans = sortedPlans.filter(p => p.slug?.startsWith("aeva-"));
  const sreePlans = sortedPlans.filter(p => p.slug?.startsWith("sree-"));
  const otherPlans = sortedPlans.filter(p => !p.slug?.startsWith("aeva-") && !p.slug?.startsWith("sree-"));

  const PlanCard = ({ plan, popular }) => {
    const Icon = PLAN_ICONS[plan.slug] || Bot;
    const colorClass = PLAN_COLORS[plan.slug] || "border-slate-200";
    const isFreePlan = plan.price_monthly <= 1;

    return (
      <Card className={cn("relative border-2 transition-all", colorClass, popular && "ring-2 ring-indigo-500")}>
        {popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-indigo-600 text-white gap-1 shadow"><Star className="w-3 h-3" />Popular</Badge>
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">{plan.name}</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{plan.description}</p>
          <div className="mb-4">
            <span className="text-3xl font-bold text-slate-900">${isFreePlan ? "0" : plan.price_monthly}</span>
            <span className="text-slate-500 text-sm">/month</span>
          </div>
          <ul className="space-y-2 mb-4 text-sm">
            <li className="flex items-center gap-2 text-slate-600">
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              {plan.max_agents >= 999 ? "Unlimited" : plan.max_agents} AI Agent{plan.max_agents > 1 ? "s" : ""}
            </li>
            {plan.included_minutes > 0 && plan.included_minutes < 999999 && (
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {plan.included_minutes.toLocaleString()} minutes included
              </li>
            )}
            {plan.included_minutes >= 999999 && (
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                Unlimited minutes
              </li>
            )}
            {plan.max_phone_numbers > 0 && (
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {plan.max_phone_numbers >= 10 ? "Unlimited" : plan.max_phone_numbers} Phone Number{plan.max_phone_numbers > 1 ? "s" : ""}
              </li>
            )}
            {plan.max_knowledge_bases > 0 && (
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {plan.max_knowledge_bases >= 999 ? "Unlimited" : plan.max_knowledge_bases} Knowledge Base{plan.max_knowledge_bases > 1 ? "s" : ""}
              </li>
            )}
            {plan.features?.white_label && (
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                White-label
              </li>
            )}
            {plan.features?.api_access && (
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                API access
              </li>
            )}
            {plan.features?.priority_support && (
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                Priority support
              </li>
            )}
          </ul>
          <Link to={createPageUrl("Pricing")} className="block">
            <Button className={cn("w-full", popular ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800")} size="sm">
              {stripeSubscription ? "Change Plan" : isFreePlan ? "Contact Us" : "Subscribe"}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* AEVOICE Voice Plans */}
      {aevoicePlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">AEVOICE Voice Plans</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aevoicePlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} popular={plan.slug === "aeva-micro"} />
            ))}
          </div>
        </div>
      )}

      {/* Sree Website Assistant Plans */}
      {sreePlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Sree Website Assistant Plans</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sreePlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} popular={plan.slug === "sree-professional"} />
            ))}
          </div>
        </div>
      )}

      {/* Other Plans (Free Partner, etc.) */}
      {otherPlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-bold text-slate-900">Partner & Special Plans</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otherPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}