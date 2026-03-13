import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Plus,
  Trash2,
  Mail,
  Clock,
  CheckSquare,
  Globe,
  Save
} from "lucide-react";
import { toast } from "sonner";

const actionTypes = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "send_sms", label: "Send SMS", icon: Mail },
  { value: "wait", label: "Wait", icon: Clock },
  { value: "create_task", label: "Create Task", icon: CheckSquare },
  { value: "update_contact", label: "Update Contact", icon: CheckSquare },
  { value: "webhook", label: "Call Webhook", icon: Globe },
];

export default function WorkflowBuilder({ clientId, onComplete }) {
  const [workflowData, setWorkflowData] = useState({
    name: "",
    description: "",
    trigger_type: "appointment_booked",
    trigger_conditions: {},
    actions: [],
    status: "active"
  });

  const queryClient = useQueryClient();

  const createWorkflowMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketingWorkflow.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success("Workflow created successfully!");
      if (onComplete) onComplete();
    },
  });

  const addAction = () => {
    setWorkflowData({
      ...workflowData,
      actions: [...workflowData.actions, {
        type: "send_email",
        delay_minutes: 0,
        config: {}
      }]
    });
  };

  const updateAction = (index, field, value) => {
    const updated = [...workflowData.actions];
    if (field === 'type' || field === 'delay_minutes') {
      updated[index][field] = value;
    } else {
      updated[index].config = { ...updated[index].config, [field]: value };
    }
    setWorkflowData({ ...workflowData, actions: updated });
  };

  const removeAction = (index) => {
    setWorkflowData({
      ...workflowData,
      actions: workflowData.actions.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    createWorkflowMutation.mutate({
      ...workflowData,
      client_id: clientId
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            New Marketing Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Workflow Name</Label>
            <Input
              placeholder="e.g., Appointment Confirmation Sequence"
              value={workflowData.name}
              onChange={(e) => setWorkflowData({ ...workflowData, name: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What does this workflow do?"
              value={workflowData.description}
              onChange={(e) => setWorkflowData({ ...workflowData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label>Trigger Event</Label>
            <Select 
              value={workflowData.trigger_type} 
              onValueChange={(v) => setWorkflowData({ ...workflowData, trigger_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment_booked">Appointment Booked</SelectItem>
                <SelectItem value="call_completed">Call Completed</SelectItem>
                <SelectItem value="lead_captured">Lead Captured</SelectItem>
                <SelectItem value="form_submitted">Form Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Workflow Actions</CardTitle>
            <Button variant="outline" size="sm" onClick={addAction}>
              <Plus className="w-4 h-4 mr-1" />
              Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workflowData.actions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No actions yet. Click "Add Action" to begin.
            </div>
          ) : (
            workflowData.actions.map((action, index) => (
              <div key={index} className="p-4 border-2 border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-indigo-100 text-indigo-700">Action {index + 1}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAction(index)}
                    className="h-7 w-7"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>

                <div className="grid gap-3">
                  <Select 
                    value={action.type} 
                    onValueChange={(v) => updateAction(index, 'type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map(at => (
                        <SelectItem key={at.value} value={at.value}>
                          {at.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {action.type === 'wait' && (
                    <div className="grid gap-2">
                      <Label>Wait Duration (minutes)</Label>
                      <Input
                        type="number"
                        placeholder="1440 for 24 hours"
                        value={action.delay_minutes}
                        onChange={(e) => updateAction(index, 'delay_minutes', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {action.type === 'send_email' && (
                    <>
                      <Input
                        placeholder="Email Subject"
                        value={action.config.subject || ''}
                        onChange={(e) => updateAction(index, 'subject', e.target.value)}
                      />
                      <Textarea
                        placeholder="Email Body (use {customer_name}, {appointment_date}, etc.)"
                        value={action.config.body || ''}
                        onChange={(e) => updateAction(index, 'body', e.target.value)}
                        rows={4}
                      />
                    </>
                  )}

                  {action.type === 'webhook' && (
                    <Input
                      placeholder="Webhook URL"
                      value={action.config.url || ''}
                      onChange={(e) => updateAction(index, 'url', e.target.value)}
                    />
                  )}

                  {index < workflowData.actions.length - 1 && (
                    <Input
                      type="number"
                      placeholder="Delay before next action (minutes)"
                      value={action.delay_minutes || 0}
                      onChange={(e) => updateAction(index, 'delay_minutes', parseInt(e.target.value) || 0)}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={!workflowData.name || workflowData.actions.length === 0 || createWorkflowMutation.isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        <Save className="w-4 h-4 mr-2" />
        {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
      </Button>
    </div>
  );
}