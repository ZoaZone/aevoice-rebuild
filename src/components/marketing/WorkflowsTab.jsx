import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Zap, AlertCircle } from "lucide-react";
import WorkflowBuilder from "./WorkflowBuilder";

export default function WorkflowsTab({
  workflows,
  isLoading,
  isError,
  showWorkflowBuilder,
  setShowWorkflowBuilder,
  clientId,
  onWorkflowComplete
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marketing Workflows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marketing Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 py-8 justify-center">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load workflows. Please try again.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Marketing Workflows</CardTitle>
          <CardDescription>
            Automate follow-ups, reminders, and sequences
          </CardDescription>
        </div>
        <Button onClick={() => setShowWorkflowBuilder(!showWorkflowBuilder)}>
          <Plus className="w-4 h-4 mr-2" />
          {showWorkflowBuilder ? "Cancel" : "Create Workflow"}
        </Button>
      </CardHeader>
      <CardContent>
        {showWorkflowBuilder && (
          <WorkflowBuilder clientId={clientId} onComplete={onWorkflowComplete} />
        )}

        {!showWorkflowBuilder && (
          <>
            {workflows.length > 0 ? (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <WorkflowRow key={workflow.id} workflow={workflow} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">
                  No workflows yet
                </h3>
                <p className="text-slate-500 mb-4">
                  Create automated sequences for appointments and follow-ups
                </p>
                <Button onClick={() => setShowWorkflowBuilder(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Workflow
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowRow({ workflow }) {
  return (
    <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium">{workflow.name}</h4>
          <Badge
            className={
              workflow.status === "active" ? "bg-emerald-500" : "bg-slate-400"
            }
          >
            {workflow.status}
          </Badge>
        </div>
        <p className="text-sm text-slate-500 capitalize">
          Trigger: {workflow.trigger_type?.replace("_", " ")}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {workflow.actions?.length || 0} actions • Ran{" "}
          {workflow.runs_count || 0} times
        </p>
      </div>
    </div>
  );
}