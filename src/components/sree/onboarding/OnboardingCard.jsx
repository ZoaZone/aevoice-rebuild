import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function OnboardingCard({ title, description, statusList = [], demoContent, onDismiss }) {
  return (
    <Card className="border border-slate-700 bg-slate-900/80 text-slate-100">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-xs text-slate-300 mt-1">{description}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onDismiss} className="h-7 px-2 text-xs">
            Dismiss
          </Button>
        </div>

        {statusList.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {statusList.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs rounded-md border border-slate-700 px-2 py-1 bg-slate-800/60">
                {s.active ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="text-slate-200">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {demoContent && (
          <div className="mt-3 text-xs text-slate-200 space-y-2">
            {demoContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}