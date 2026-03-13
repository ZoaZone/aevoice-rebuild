import { Loader2 } from "lucide-react";

export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center p-4 text-slate-500">
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      <span>{label}</span>
    </div>
  );
}