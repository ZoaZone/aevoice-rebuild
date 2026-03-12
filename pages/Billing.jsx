import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import {
  CreditCard,
  Plus,
  Clock,
  TrendingUp,
  AlertTriangle,
  Check,
  Zap,
  ArrowRight,
  Download,
  Receipt,
  Wallet,
  RefreshCw,
  Star,
  HelpCircle,
  FileText,
  Globe
} from "lucide-react";
import AutoRechargeCard from "@/components/billing/AutoRechargeCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "aeva-mini",
    name: "Aeva Mini",
    price: 100,
    minutes: 300,
    agents: 1,
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/c0440c7bb_IMG_5882.PNG",
    features: ["1 AI Agent", "300 minutes included", "Attach up to 1 Phone Number", "Website widget", "Basic analytics", "Email support"]
  },
  {
    id: "aeva-micro",
    name: "Aeva Micro",
    price: 35,
    minutes: 0,
    agents: 3,
    popular: true,
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/fc03c9ad7_IMG_5883.PNG",
    features: ["3 AI Agents", "Pay-as-you-go ($0.15/min)", "Attach up to 2 Phone Numbers", "Website widget", "Advanced analytics", "Priority support"]
  },
  {
    id: "aeva-medium",
    name: "Aeva Medium",
    price: 250,
    minutes: 1666,
    agents: "Unlimited",
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/0b561957e_IMG_5884.PNG",
    features: ["Unlimited AI Agents", "1,666 minutes included", "Attach Unlimited Phone Numbers", "Website widget", "Sri Assistant INCLUDED", "API access", "Dedicated support"]
  },
  {
    id: "aeva-mega",
    name: "Aeva Mega",
    price: 1000,
    minutes: 7000,
    agents: "Unlimited",
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/4ed2a541f_IMG_5885.PNG",
    features: ["Unlimited AI Agents", "7,000+ minutes ($0.1425/min)", "Attach Unlimited Phone Numbers", "Sri Assistant INCLUDED", "Voice cloning access", "Priority processing", "Dedicated account manager"]
  },
];

export default function Billing() {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(100);

  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const paymentSuccess = urlParams.get('success');

  // Fetch Stripe subscription
  const { data: stripeSubscription } = useQuery({
    queryKey: ['stripeSubscription'],
    queryFn: async () => {
      const response = await base44.functions.invoke('stripeCheckout', {
        action: 'getSubscription'
      });
      return response.data.subscription;
    },
  });

  // Open customer portal
  const openPortal = async () => {
    const response = await base44.functions.invoke('stripeCheckout', {
      action: 'createPortalSession'
    });
    if (response.data.url) {
      window.location.href = response.data.url;
    }
  };

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 20),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list(),
  });

  const { data: autoRechargeSettings = [] } = useQuery({
    queryKey: ['autoRechargeSettings'],
    queryFn: () => base44.entities.AutoRechargeSettings.list(),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => base44.entities.PaymentMethod.list(),
  });

  const createWalletMutation = useMutation({
    mutationFn: (data) => base44.entities.Wallet.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets'] }),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setIsTopUpOpen(false);
    },
  });

  const wallet = wallets[0];
  const currentSubscription = subscriptions[0];
  
  // Get real usage data from usageCounters if available
  const { data: usageCounters = [] } = useQuery({
    queryKey: ['usageCounters'],
    queryFn: () => base44.entities.UsageCounter.list(),
  });
  
  const usageCounter = usageCounters[0];
  const usedMinutes = usageCounter?.minutes_used || 0;
  const totalMinutes = usageCounter?.total_minutes_allocated || 0;
  const usagePercent = totalMinutes > 0 ? (usedMinutes / totalMinutes) * 100 : 0;

  const handleTopUp = async () => {
    if (!wallet) {
      await createWalletMutation.mutateAsync({
        owner_type: "agency",
        owner_id: "default",
        credits_balance: topUpAmount,
        currency: "USD",
      });
    } else {
      await createTransactionMutation.mutateAsync({
        wallet_id: wallet.id,
        type: "topup",
        amount: topUpAmount,
        description: `Added ${topUpAmount} credits`,
      });
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'topup': return { icon: Plus, color: 'text-emerald-500 bg-emerald-100' };
      case 'usage': return { icon: Clock, color: 'text-blue-500 bg-blue-100' };
      case 'subscription': return { icon: CreditCard, color: 'text-purple-500 bg-purple-100' };
      default: return { icon: RefreshCw, color: 'text-slate-500 bg-slate-100' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing</h1>
          <p className="text-slate-500 mt-1">Manage your subscription and usage</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download Invoices
          </Button>
          <Button 
            onClick={() => setIsTopUpOpen(true)}
            className="bg-gradient-to-r from-[#0e4166] to-cyan-600 hover:from-[#0a2540] hover:to-cyan-700 shadow-lg shadow-cyan-500/25 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Credits
          </Button>
          </div>
          </div>

          {/* Payment Success Message */}
          {paymentSuccess && (
          <Card className="border-2 border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Check className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800">Payment Successful!</p>
              <p className="text-sm text-emerald-600">Your subscription is now active.</p>
            </div>
          </CardContent>
          </Card>
          )}

          {/* Stripe Subscription Status */}
          {stripeSubscription && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-emerald-100 text-emerald-700 mb-2">Active Subscription</Badge>
                <p className="text-slate-600 text-sm">
                  Next billing: {new Date(stripeSubscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" onClick={openPortal}>
                Manage Subscription
              </Button>
            </div>
          </CardContent>
          </Card>
          )}

      {/* Auto-Recharge Card */}
      <AutoRechargeCard 
        autoRechargeSettings={autoRechargeSettings[0]}
        wallet={wallet}
        paymentMethod={paymentMethods.find(p => p.is_default)}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['autoRechargeSettings'] })}
      />

      {/* Usage & Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm text-slate-500">Current Plan</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  {stripeSubscription ? "Active Subscription" : "No Active Plan"}
                </h2>
                <p className="text-slate-500 mt-1">
                  {stripeSubscription 
                    ? `Renews on ${new Date(stripeSubscription.current_period_end).toLocaleDateString()}`
                    : "Subscribe to a plan to get started"}
                </p>
              </div>
              <Badge className={stripeSubscription ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}>
                {stripeSubscription ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Minutes Used</span>
                  <span className="text-sm text-slate-500">{usedMinutes} / {totalMinutes}</span>
                </div>
                <Progress value={usagePercent} className="h-3" />
                <p className="text-xs text-slate-500 mt-2">
                  {totalMinutes - usedMinutes} minutes remaining this billing cycle
                </p>
              </div>

              {usagePercent > 80 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Usage Warning</p>
                    <p className="text-xs text-amber-600">You've used {Math.round(usagePercent)}% of your monthly minutes</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                    Upgrade
                  </Button>
                </div>
              )}
            </div>

            {/* Usage stats will show actual data when available */}
          </CardContent>
        </Card>

        {/* Wallet Balance */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-[#0e4166] to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-cyan-200 text-sm">Credit Balance</p>
                <p className="text-3xl font-bold">{wallet?.credits_balance?.toFixed(0) || 0}</p>
              </div>
            </div>
            <p className="text-cyan-200 text-sm mb-4">
              Used for Voice AI calls ($0.15/min) & Voice Chatbot ($0.12/min)
            </p>
            <Button 
              onClick={() => setIsTopUpOpen(true)}
              className="w-full bg-white text-[#0e4166] hover:bg-cyan-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Credits
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                "relative border-2 transition-all",
                plan.popular 
                  ? "border-[#0e4166] shadow-lg shadow-[#0e4166]/10" 
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#0e4166] text-white gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardContent className="p-6">
                {plan.logo && (
                  <div className="w-12 h-12 mb-3">
                    <img src={plan.logo} alt={plan.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-3 mb-6">
                  <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to={createPageUrl("Pricing")} className="w-full">
                  <Button 
                    className={cn(
                      "w-full",
                      plan.popular 
                        ? "bg-[#0e4166] hover:bg-[#0a2540]" 
                        : "bg-slate-900 hover:bg-slate-800"
                    )}
                  >
                    {stripeSubscription ? "Change Plan" : "Subscribe"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const { icon: Icon, color } = getTransactionIcon(tx.type);
                return (
                  <div 
                    key={tx.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className={`p-2.5 rounded-xl ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{tx.description}</p>
                      <p className="text-sm text-slate-500">
                        {tx.created_date && format(new Date(tx.created_date), 'PPp')}
                      </p>
                    </div>
                    <span className={`font-semibold ${
                      tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount} credits
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>No transactions yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Transfer & Terms Info */}
      <Card className="border border-slate-200">
        <CardContent className="p-5">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Credit Transfer</h4>
                <p className="text-sm text-slate-600">
                  Unused credits can be transferred to another plan or account within AEVOICE.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">SaaS Terms</h4>
                <p className="text-sm text-slate-600">
                  All purchases are final. No refunds. Phone numbers governed by your provider (Twilio).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Up Dialog */}
      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Purchase credits for voice minutes. $1 = ~6.67 minutes at $0.15/min
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[50, 100, 250].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTopUpAmount(amount)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all",
                    topUpAmount === amount
                      ? "border-[#0e4166] bg-cyan-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className="text-xl font-bold text-slate-900">${amount}</p>
                  <p className="text-sm text-slate-500">{Math.round(amount / 0.15)} min</p>
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <Label>Custom Amount</Label>
              <Input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                min={10}
              />
              <p className="text-xs text-slate-500">
                ~{Math.round(topUpAmount / 0.15)} voice AI minutes OR {Math.round(topUpAmount / 0.12)} chatbot minutes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopUpOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTopUp}
              disabled={createTransactionMutation.isPending}
              className="bg-[#0e4166] hover:bg-[#0a2540]"
            >
              {createTransactionMutation.isPending ? "Processing..." : `Pay $${topUpAmount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}