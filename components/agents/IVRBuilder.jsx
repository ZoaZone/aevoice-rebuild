import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Phone,
  Plus,
  Trash2,
  Save,
  Play,
  Settings,
  ArrowRight,
  MessageSquare,
  User,
  PhoneForwarded,
  Voicemail,
  Power,
  HelpCircle,
  GripVertical,
  Volume2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const actionConfig = {
  agent: { label: "Connect to AI Agent", icon: MessageSquare, color: "bg-indigo-100 text-indigo-700" },
  transfer: { label: "Transfer to Number", icon: PhoneForwarded, color: "bg-blue-100 text-blue-700" },
  voicemail: { label: "Go to Voicemail", icon: Voicemail, color: "bg-purple-100 text-purple-700" },
  submenu: { label: "Go to Submenu", icon: ArrowRight, color: "bg-emerald-100 text-emerald-700" },
  hangup: { label: "End Call", icon: Power, color: "bg-red-100 text-red-700" },
  callback: { label: "Request Callback", icon: Phone, color: "bg-amber-100 text-amber-700" },
};

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "#"];

export default function IVRBuilder({ agentId, ivrMenu, agents = [], onUpdate }) {
  const [menu, setMenu] = useState(ivrMenu || {
    name: "Main Menu",
    is_root: true,
    greeting_text: "Welcome! Please listen to the following options.",
    options: [],
    timeout_seconds: 10,
    max_retries: 3,
    invalid_input_message: "Sorry, that's not a valid option. Please try again.",
    timeout_message: "We didn't receive any input.",
    status: "draft"
  });

  const [editingOption, setEditingOption] = useState(null);
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOption, setNewOption] = useState({
    digit: "",
    label: "",
    action: "agent",
    target_id: "",
    transfer_number: ""
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (ivrMenu?.id) {
        return base44.entities.IVRMenu.update(ivrMenu.id, data);
      } else {
        return base44.entities.IVRMenu.create({ agent_id: agentId, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ivrMenu'] });
      onUpdate?.();
    },
  });

  const addOption = () => {
    if (newOption.digit && newOption.label) {
      setMenu({
        ...menu,
        options: [...menu.options, { ...newOption }]
      });
      setNewOption({ digit: "", label: "", action: "agent", target_id: "", transfer_number: "" });
      setShowAddOption(false);
    }
  };

  const removeOption = (digit) => {
    setMenu({
      ...menu,
      options: menu.options.filter(o => o.digit !== digit)
    });
  };

  const updateOption = (digit, updates) => {
    setMenu({
      ...menu,
      options: menu.options.map(o => o.digit === digit ? { ...o, ...updates } : o)
    });
  };

  const usedDigits = menu.options.map(o => o.digit);
  const availableDigits = digits.filter(d => !usedDigits.includes(d));

  const handleSave = () => {
    saveMutation.mutate(menu);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-600" />
            IVR Menu Builder
          </h3>
          <p className="text-sm text-slate-500">
            Create interactive voice response menus for callers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Play className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-1" />
            {saveMutation.isPending ? "Saving..." : "Save Menu"}
          </Button>
        </div>
      </div>

      {/* Menu Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Menu Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Menu Name</Label>
              <Input
                value={menu.name}
                onChange={(e) => setMenu({ ...menu, name: e.target.value })}
                placeholder="Main Menu"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select 
                value={menu.status} 
                onValueChange={(v) => setMenu({ ...menu, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              Greeting Message
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    This message plays when callers enter this menu
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Textarea
              value={menu.greeting_text}
              onChange={(e) => setMenu({ ...menu, greeting_text: e.target.value })}
              placeholder="Welcome! Please listen to the following options..."
              rows={3}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                value={menu.timeout_seconds}
                onChange={(e) => setMenu({ ...menu, timeout_seconds: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Retries</Label>
              <Input
                type="number"
                value={menu.max_retries}
                onChange={(e) => setMenu({ ...menu, max_retries: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Options */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Menu Options</CardTitle>
              <CardDescription>Define what happens when caller presses each digit</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAddOption(true)}
              disabled={availableDigits.length === 0}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Option
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {menu.options.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Phone className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No menu options yet</p>
              <p className="text-sm">Add options to create your IVR flow</p>
            </div>
          ) : (
            <div className="space-y-3">
              {menu.options.map((option) => {
                const action = actionConfig[option.action] || actionConfig.agent;
                const ActionIcon = action.icon;
                
                return (
                  <div 
                    key={option.digit}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl group"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white text-xl font-bold">
                      {option.digit}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{option.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn(action.color, "text-xs gap-1")}>
                          <ActionIcon className="w-3 h-3" />
                          {action.label}
                        </Badge>
                        {option.transfer_number && (
                          <Badge variant="outline" className="text-xs">
                            {option.transfer_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditingOption(option)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeOption(option.digit)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Flow Preview */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Call Flow Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            {/* Greeting */}
            <div className="w-full max-w-md p-4 bg-white rounded-xl border-2 border-indigo-200 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Greeting:</p>
              <p className="text-slate-700">{menu.greeting_text || "No greeting set"}</p>
            </div>
            
            <div className="h-8 w-0.5 bg-slate-300" />
            
            {/* Options */}
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              {menu.options.map((option) => {
                const action = actionConfig[option.action];
                const ActionIcon = action?.icon || Phone;
                return (
                  <div 
                    key={option.digit}
                    className="flex flex-col items-center p-3 bg-white rounded-lg border shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mb-2">
                      {option.digit}
                    </div>
                    <ActionIcon className="w-4 h-4 text-slate-400 mb-1" />
                    <p className="text-xs text-center text-slate-600">{option.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Option Dialog */}
      <Dialog open={showAddOption} onOpenChange={setShowAddOption}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Menu Option</DialogTitle>
            <DialogDescription>
              Configure what happens when the caller presses this digit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Digit</Label>
              <Select 
                value={newOption.digit} 
                onValueChange={(v) => setNewOption({ ...newOption, digit: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select digit" />
                </SelectTrigger>
                <SelectContent>
                  {availableDigits.map((d) => (
                    <SelectItem key={d} value={d}>
                      Press {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Label</Label>
              <Input
                value={newOption.label}
                onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                placeholder="e.g., Sales, Support, Appointments"
              />
            </div>

            <div className="grid gap-2">
              <Label>Action</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(actionConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setNewOption({ ...newOption, action: key })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all",
                        newOption.action === key
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {newOption.action === 'transfer' && (
              <div className="grid gap-2">
                <Label>Transfer Number</Label>
                <Input
                  value={newOption.transfer_number}
                  onChange={(e) => setNewOption({ ...newOption, transfer_number: e.target.value })}
                  placeholder="+1 555 123 4567"
                />
              </div>
            )}

            {newOption.action === 'agent' && agents.length > 0 && (
              <div className="grid gap-2">
                <Label>Select Agent</Label>
                <Select 
                  value={newOption.target_id} 
                  onValueChange={(v) => setNewOption({ ...newOption, target_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOption(false)}>
              Cancel
            </Button>
            <Button onClick={addOption} disabled={!newOption.digit || !newOption.label}>
              Add Option
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}