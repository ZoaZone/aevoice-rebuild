import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, GitBranch, Trash2, Clock, MoreHorizontal, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const statusColors = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-600",
};

export default function WorkflowListView({ workflows, isLoading, onNew, onOpen, onDelete }) {
  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">AI-Powered</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Workflow Builder</h1>
          <p className="text-indigo-200 text-sm max-w-lg mb-5">
            Visually design conversation flows, connect external APIs, and automate complex customer interactions with drag-and-drop simplicity.
          </p>
          <Button onClick={onNew} className="bg-white text-indigo-700 hover:bg-indigo-50 gap-1.5 shadow-lg">
            <Plus className="w-4 h-4" /> Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100"><Zap className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{workflows.length}</p><p className="text-xs text-slate-500">Total</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100"><GitBranch className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{workflows.filter(w => w.status === "active").length}</p><p className="text-xs text-slate-500">Active</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-100"><Sparkles className="w-5 h-5 text-violet-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{workflows.reduce((a, w) => a + (w.nodes?.length || 0), 0)}</p><p className="text-xs text-slate-500">Total Nodes</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{workflows.reduce((a, w) => a + (w.run_count || 0), 0)}</p><p className="text-xs text-slate-500">Total Runs</p></div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-700 mb-1">No workflows yet</h3>
            <p className="text-sm text-slate-400 mb-4">Create your first AI-powered workflow to automate customer interactions.</p>
            <Button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"><Plus className="w-4 h-4" /> Create Workflow</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <Card
              key={wf.id}
              className="group cursor-pointer hover:shadow-lg transition-all border-slate-200 hover:border-indigo-200"
              onClick={() => onOpen(wf)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50"><Zap className="w-4 h-4 text-indigo-600" /></div>
                    <CardTitle className="text-sm">{wf.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onOpen(wf)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => onDelete(wf.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="text-xs">{wf.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{wf.nodes?.length || 0} nodes</span>
                    <span>·</span>
                    <span>{wf.run_count || 0} runs</span>
                  </div>
                  <Badge className={cn("text-[10px]", statusColors[wf.status] || statusColors.draft)}>{wf.status || "draft"}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}