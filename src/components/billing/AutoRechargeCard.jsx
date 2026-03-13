import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Zap,
  CreditCard,
  AlertTriangle,
  Check,
  Edit2,
  HelpCircle,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function AutoRechargeCard({ 
  autoRechargeSettings, 
  wallet, 
  paymentMethod,
  onUpdate 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState({
    enabled: autoRechargeSettings?.enabled || false,
    threshold_credits: autoRechargeSettings?.threshold_credits || 50,
    recharge_amount: autoRechargeSettings?.recharge_amount || 100,
    max_recharges_per_month: autoRechargeSettings?.max_recharges_per_month || 5
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutoRechargeSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoRechargeSettings'] });
      setIsEditing(false);
      onUpdate?.();
    },
  });

  const handleSave = () => {
    if (autoRechargeSettings?.id) {
      updateMutation.mutate({ id: autoRechargeSettings.id, data: settings });
    }
  };

  const thresholdOptions = [
    { value: 25, label: "$25", minutes: 25 },
    { value: 50, label: "$50", minutes: 50 },
    { value: 100, label: "$100", minutes: 100 },
    { value: 200, label: "$200", minutes: 200 },
  ];

  const amountOptions = [
    { value: 50, label: "$50", minutes: 50 },
    { value: 100, label: "$100", minutes: 100 },
    { value: 200, label: "$200", minutes: 200 },
    { value: 500, label: "$500", minutes: 500 },
  ];

  const isLowBalance = wallet && wallet.credits_balance < settings.threshold_credits;

  return (
    <>
      <Card className={cn(
        "border-2 transition-all",
        settings.enabled 
          ? "border-emerald-200 bg-emerald-50/30" 
          : "border-slate-200"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                settings.enabled ? "bg-emerald-100" : "bg-slate-100"
              )}>
                <Zap className={cn(
                  "w-5 h-5",
                  settings.enabled ? "text-emerald-600" : "text-slate-500"
                )} />
              </div>
              Auto-Recharge
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Auto-recharge automatically adds credits to your account when your balance falls below the threshold, ensuring uninterrupted service.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant={settings.enabled ? "default" : "secondary"} className={
                settings.enabled 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                  : ""
              }>
                {settings.enabled ? "Active" : "Inactive"}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.enabled ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-slate-500 mb-1">Trigger When Below</p>
                  <p className="text-xl font-bold text-slate-900">${settings.threshold_credits}</p>
                  <p className="text-xs text-slate-400">{settings.threshold_credits} minutes</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-slate-500 mb-1">Recharge Amount</p>
                  <p className="text-xl font-bold text-slate-900">${settings.recharge_amount}</p>
                  <p className="text-xs text-slate-400">{settings.recharge_amount} minutes</p>
                </div>
              </div>

              {paymentMethod ? (
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {paymentMethod.card_brand} •••• {paymentMethod.card_last_four}
                    </p>
                    <p className="text-xs text-slate-500">
                      Expires {paymentMethod.card_exp_month}/{paymentMethod.card_exp_year}
                    </p>
                  </div>
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
              ) : (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    No payment method on file. Please add a card to enable auto-recharge.
                  </AlertDescription>
                </Alert>
              )}

              {isLowBalance && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Your balance (${wallet?.credits_balance}) is below the threshold. 
                    Auto-recharge will trigger soon.
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-slate-500">
                Safety limit: {settings.max_recharges_per_month} recharges per month • 
                Used this month: {autoRechargeSettings?.recharges_this_month || 0}
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 mb-3">
                Enable auto-recharge to ensure your AI agents never go offline
              </p>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Configure Auto-Recharge
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              Configure Auto-Recharge
            </DialogTitle>
            <DialogDescription>
              Set up automatic credit top-ups when your balance runs low
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-base">Enable Auto-Recharge</Label>
                <p className="text-sm text-slate-500">Automatically add credits when balance is low</p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>

            {settings.enabled && (
              <>
                {/* Threshold */}
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Trigger when balance falls below
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          We'll automatically recharge when your credit balance drops below this amount
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {thresholdOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSettings({ ...settings, threshold_credits: opt.value })}
                        className={cn(
                          "p-3 rounded-lg border-2 text-center transition-all",
                          settings.threshold_credits === opt.value
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.minutes} min</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Amount to add each time
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          This amount will be charged to your payment method
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {amountOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSettings({ ...settings, recharge_amount: opt.value })}
                        className={cn(
                          "p-3 rounded-lg border-2 text-center transition-all",
                          settings.recharge_amount === opt.value
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.minutes} min</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Safety Limit */}
                <div className="grid gap-2">
                  <Label>Maximum recharges per month (safety limit)</Label>
                  <Select 
                    value={String(settings.max_recharges_per_month)}
                    onValueChange={(v) => setSettings({ ...settings, max_recharges_per_month: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 times/month</SelectItem>
                      <SelectItem value="5">5 times/month</SelectItem>
                      <SelectItem value="10">10 times/month</SelectItem>
                      <SelectItem value="20">20 times/month</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Maximum charge: ${settings.recharge_amount * settings.max_recharges_per_month}/month
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}