import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Wraps children with a plan-gated overlay.
 * If `allowed` is false, shows an upgrade prompt instead of children.
 */
export default function PlanGate({ allowed, featureName, children }) {
  if (allowed) return children;

  return (
    <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50">
      <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-amber-800">
          {featureName || "This feature"} requires a plan upgrade
        </p>
        <p className="text-xs text-amber-600 text-center max-w-xs">
          Upgrade your subscription to unlock this feature and get the most out of AEVOICE.
        </p>
        <Link to={createPageUrl("Billing")}>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            View Plans
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}