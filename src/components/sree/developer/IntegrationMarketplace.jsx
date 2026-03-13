/**
 * Sree Integration Marketplace
 * Displays available integrations with live invoke testing.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INTEGRATION_REGISTRY, invokeIntegration } from "@/components/sree/integrations/integrationRegistry";
import { Loader2, Play, CheckCircle2, AlertTriangle, Plug } from "lucide-react";

const CATEGORY_COLORS = {
  core: "from-indigo-600 to-blue-600",
  telephony: "from-cyan-600 to-teal-600",
  crm: "from-violet-600 to-purple-600",
  analytics: "from-amber-600 to-orange-600",
  ai: "from-pink-600 to-rose-600",
};

export default function IntegrationMarketplace({ onClose }) {
  const [testing, setTesting] = useState(null);
  const [results, setResults] = useState({});

  const test = async (integration) => {
    setTesting(integration.id);
    try {
      const action = integration.capabilities[0];
      const r = await invokeIntegration(integration.id, action, { limit: 3 });
      setResults(prev => ({ ...prev, [integration.id]: { ok: true, data: r } }));
    } catch (err) {
      setResults(prev => ({ ...prev, [integration.id]: { ok: false, error: err.message } }));
    } finally {
      setTesting(null);
    }
  };

  const categories = [...new Set(INTEGRATION_REGISTRY.map(i => i.category))];

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] rounded-xl border border-white/[0.07] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white">Integrations</span>
          <Badge className="text-[9px] px-1.5 py-0 bg-white/20 text-white border-0 rounded-full">{INTEGRATION_REGISTRY.length}</Badge>
        </div>
        {onClose && <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-[11px]" onClick={onClose}>✕</Button>}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{cat}</p>
            <div className="space-y-1.5">
              {INTEGRATION_REGISTRY.filter(i => i.category === cat).map(intg => {
                const res = results[intg.id];
                const isTesting = testing === intg.id;
                return (
                  <div key={intg.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 flex items-center gap-2.5">
                    <span className="text-xl flex-shrink-0">{intg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{intg.name}</span>
                        {res?.ok === true && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {res?.ok === false && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{intg.description}</p>
                      <div className="flex gap-1 mt-0.5">
                        {intg.capabilities.map(c => (
                          <span key={c} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400">{c}</span>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      disabled={isTesting}
                      onClick={() => test(intg)}
                      className={cn("h-7 w-7 rounded-xl flex-shrink-0 bg-gradient-to-br border-0", CATEGORY_COLORS[cat] || "from-slate-600 to-slate-700")}
                      title={`Test ${intg.name}`}
                    >
                      {isTesting ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Play className="w-3 h-3 text-white" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}