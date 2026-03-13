import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Save, Play, ArrowLeft, Loader2, Undo2, Redo2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkflowToolbar({
  name,
  onNameChange,
  status,
  nodeCount,
  edgeCount,
  saving,
  onSave,
  onTest,
  onBack,
  onClear,
  testOpen,
}) {
  const statusColors = {
    draft: "bg-slate-100 text-slate-600",
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="h-12 border-b border-slate-200 bg-white flex items-center gap-2 px-3 flex-shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="h-5 w-px bg-slate-200" />
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="h-8 w-56 text-sm font-medium border-transparent hover:border-slate-200 focus:border-indigo-300"
        placeholder="Untitled Workflow"
      />
      <Badge className={cn("text-[10px]", statusColors[status] || statusColors.draft)}>{status}</Badge>
      <div className="text-[10px] text-slate-400 ml-1">{nodeCount} nodes · {edgeCount} edges</div>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onClear}>
        <Trash2 className="w-3.5 h-3.5" /> Clear
      </Button>
      <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1", testOpen && "bg-indigo-50 border-indigo-200")} onClick={onTest}>
        <Play className="w-3.5 h-3.5" /> Test
      </Button>
      <Button size="sm" className="h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}