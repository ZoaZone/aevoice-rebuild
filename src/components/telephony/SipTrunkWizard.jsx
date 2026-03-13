import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MobileSelect from "@/components/ui/MobileSelect";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, ChevronLeft, ChevronRight, Shield } from "lucide-react";

function cliPreview(username) {
  const u = String(username || "").replace(/\D/g, "");
  if (!u) return { none: "", p11: "", p22: "", p33: "" };
  return {
    none: `040${u}5`,
    p11: `040${u}0`,
    p22: `040${u}1`,
    p33: `040${u}2`,
  };
}

export default function SipTrunkWizard({ open, onOpenChange, currentClient, agents = [], user, onCreated }) {
  const [step, setStep] = React.useState(1);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [host, setHost] = React.useState("");
  const [port, setPort] = React.useState("5060");
  const [label, setLabel] = React.useState("");
  const [agentId, setAgentId] = React.useState(agents[0]?.id || "");

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (agents.length && !agentId) setAgentId(agents[0].id);
  }, [agents]);

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setUsername(""); setPassword(""); setHost(""); setPort("5060"); setLabel(""); setAgentId(agents[0]?.id || "");
    }
  }, [open]);

  const sipAddress = React.useMemo(() => {
    const p = port || "5060";
    if (!username || !host) return "";
    return `sip:${username}@${host}:${p}`;
  }, [username, host, port]);

  const pwdHasSpecials = React.useMemo(() => /[^A-Za-z0-9!@#._\-]/.test(password || "") || /\s/.test(password || ""), [password]);
  const hostValid = React.useMemo(() => /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(host), [host]);

  const canNextFrom1 = username && password && host && port && hostValid;
  const canNextFrom3 = label && agentId;

  const addMutation = useMutation({
    mutationFn: async () => {
      const agentName = agents.find(a => a.id === agentId)?.name || "Vet Bot";
      const payload = {
        username, password,
        host, port: parseInt(port, 10) || 5060,
        label: label || `${currentClient?.name || "SIP"} Trunk`,
        agentName,
        clientName: currentClient?.name || (user?.full_name || "Client"),
      };
      const res = await base44.functions.invoke('addCustomSipNumber', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("SIP trunk added! Test calls now.");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers', currentClient?.id] });
      queryClient.invalidateQueries({ queryKey: ['telephonyAccounts', currentClient?.id] });
      onCreated && onCreated();
    },
    onError: () => {
      toast.error("Check credentials or contact support.");
    }
  });

  const next = () => {
    if (step === 1 && !canNextFrom1) return;
    if (step === 3 && !canNextFrom3) return;
    setStep((s) => Math.min(5, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add SIP Trunk</DialogTitle>
          <DialogDescription>Connect your SIP provider in a few simple steps.</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          {[1,2,3,4,5].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded ${n <= step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          ))}
        </div>

        <TooltipProvider>
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label>SIP Username</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-400" /></TooltipTrigger>
                    <TooltipContent>Provided by your SIP carrier. Often a number.</TooltipContent>
                  </Tooltip>
                </div>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., 2400135" />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label>Password</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-400" /></TooltipTrigger>
                    <TooltipContent>Your SIP account password from provider.</TooltipContent>
                  </Tooltip>
                </div>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                {pwdHasSpecials && (
                  <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    <Shield className="w-3.5 h-3.5" /> Avoid spaces or unusual symbols in the password to reduce errors.
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label>Host (IP or domain)</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-400" /></TooltipTrigger>
                    <TooltipContent>Example: 117.232.141.165 or sip.provider.com</TooltipContent>
                  </Tooltip>
                </div>
                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="117.232.141.165" />
                {!hostValid && host && (
                  <p className="text-xs text-red-600">Enter a valid IP address or domain.</p>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label>Port</Label>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-400" /></TooltipTrigger>
                    <TooltipContent>Default is 5060 unless your provider specifies otherwise.</TooltipContent>
                  </Tooltip>
                </div>
                <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="5060" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label>Auto-generated SIP Address</Label>
              <Input readOnly value={sipAddress || ""} className="bg-slate-50" />
              <p className="text-xs text-slate-500">We build this from your username, host and port.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Friendly Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Vet N Pet Hospital BSNL" />
              </div>
              <div className="grid gap-2">
                <Label>Assign to Agent</Label>
                <MobileSelect
                  value={agentId}
                  placeholder="Select an agent"
                  options={agents.map((a) => ({ value: a.id, label: a.name }))}
                  onValueChange={setAgentId}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Label>CLI Preview</Label>
              {(() => {
                const c = cliPreview(username);
                return (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                    <p>No prefix → <span className="font-mono">{c.none}</span></p>
                    <p>11 → <span className="font-mono">{c.p11}</span></p>
                    <p>22 → <span className="font-mono">{c.p22}</span></p>
                    <p>33 → <span className="font-mono">{c.p33}</span></p>
                  </div>
                );
              })()}
              <p className="text-xs text-slate-500">Based on your username, we generate expected CLI formats for testing.</p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-emerald-50 p-3 text-sm">
                <p className="mb-1"><strong>Ready to add:</strong></p>
                <p>SIP: <span className="font-mono">{sipAddress}</span></p>
                <p>Label: <span className="font-mono">{label || '-'} </span></p>
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={addMutation.isPending || !sipAddress || !label || !agentId}
                onClick={() => addMutation.mutate()}
              >
                {addMutation.isPending ? 'Adding…' : 'Add Trunk'}
              </Button>
            </div>
          )}
        </TooltipProvider>

        <DialogFooter className="flex justify-between !mt-6">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
          <div className="flex gap-2">
            {step > 1 && <Button variant="outline" onClick={back}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>}
            {step < 5 && <Button onClick={next} disabled={(step===1 && !canNextFrom1) || (step===3 && !canNextFrom3)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}