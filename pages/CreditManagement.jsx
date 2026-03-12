import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package,
  Info,
  Check,
  ArrowRight,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export default function CreditManagement() {
  const [resellPrice, setResellPrice] = useState(0.20);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Agency.filter({ primary_email: user.email });
    },
    enabled: !!user?.email,
  });

  const currentAgency = agencies[0];

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      return await base44.entities.Wallet.filter({ owner_id: currentAgency.id });
    },
    enabled: !!currentAgency?.id,
  });

  const agencyWallet = wallets[0];

  const { data: clients = [] } = useQuery({
    queryKey: ['agencyClients', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      return await base44.entities.Client.filter({ agency_id: currentAgency.id });
    },
    enabled: !!currentAgency?.id,
  });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    },
  });

  const costPerMinute = 0.09; // Platform cost
  const markupPercentage = ((resellPrice - costPerMinute) / costPerMinute * 100).toFixed(1);
  const profitPerMinute = (resellPrice - costPerMinute).toFixed(3);

  const creditPackages = [
    {
      id: 'package-1k',
      minutes: 1000,
      cost: 90,
      popular: false,
      savings: 0,
    },
    {
      id: 'package-5k',
      minutes: 5000,
      cost: 400,
      popular: true,
      savings: 50,
    },
    {
      id: 'package-10k',
      minutes: 10000,
      cost: 750,
      popular: false,
      savings: 150,
    },
    {
      id: 'package-15k',
      minutes: 15000,
      cost: 1000,
      popular: false,
      savings: 350,
    },
  ];

  const handleSaveResellPrice = () => {
    if (!currentAgency?.id) return;
    
    updateAgencyMutation.mutate({
      id: currentAgency.id,
      data: {
        ...currentAgency,
        settings: {
          ...currentAgency.settings,
          resell_price_per_minute: resellPrice,
        }
      }
    });
  };

  const handlePurchasePackage = (pkg) => {
    setSelectedPackage(pkg);
    setShowPurchaseDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Credit Management</h1>
        <p className="text-slate-600">
          Purchase credits and set your resell pricing for client billing
        </p>
      </div>

      {/* Agency Check */}
      {!currentAgency && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <p className="text-amber-900">
              ⚠️ You need to be registered as an agency to access credit management.
            </p>
          </CardContent>
        </Card>
      )}

      {currentAgency && (
        <>
          {/* Current Balance */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm mb-1">Agency Credit Balance</p>
                  <p className="text-4xl font-bold">{(agencyWallet?.credits_balance || 0).toFixed(0)} min</p>
                  <p className="text-cyan-100 text-sm mt-2">
                    ${((agencyWallet?.credits_balance || 0) * costPerMinute).toFixed(2)} at cost
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-cyan-100 text-sm mb-1">Potential Revenue</p>
                  <p className="text-2xl font-bold">
                    ${((agencyWallet?.credits_balance || 0) * resellPrice).toFixed(2)}
                  </p>
                  <p className="text-cyan-100 text-sm mt-1">
                    Profit: ${((agencyWallet?.credits_balance || 0) * profitPerMinute).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Strategy */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Resell Pricing Strategy
                </CardTitle>
                <CardDescription>Set your price per minute for client billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Platform Cost</span>
                    <span className="font-semibold">${costPerMinute}/min</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Your Resell Price</span>
                    <span className="font-semibold text-cyan-600">${resellPrice}/min</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Your Profit</span>
                      <span className="font-bold text-emerald-600">${profitPerMinute}/min</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">Markup</span>
                      <span className="text-xs font-medium text-emerald-600">{markupPercentage}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Resell Price per Minute ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.10"
                    max="1.00"
                    value={resellPrice}
                    onChange={(e) => setResellPrice(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">
                    Recommended: $0.15 - $0.25 per minute for competitive pricing
                  </p>
                </div>

                <Button 
                  onClick={handleSaveResellPrice}
                  disabled={updateAgencyMutation.isPending}
                  className="w-full"
                >
                  {updateAgencyMutation.isPending ? "Saving..." : "Save Resell Price"}
                </Button>

                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Pricing Examples
                  </h4>
                  <div className="space-y-1 text-sm text-emerald-800">
                    <p>• 1,000 min call → Client pays: ${(1000 * resellPrice).toFixed(2)}</p>
                    <p>• Your cost: ${(1000 * costPerMinute).toFixed(2)}</p>
                    <p>• <strong>Your profit: ${(1000 * profitPerMinute).toFixed(2)}</strong></p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Client Overview
                </CardTitle>
                <CardDescription>Your agency clients and their usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Total Clients</span>
                    <span className="font-semibold text-slate-900">{clients.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Active Clients</span>
                    <span className="font-semibold text-slate-900">
                      {clients.filter(c => c.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Revenue Model</span>
                    <Badge className="bg-emerald-600">Per-Minute</Badge>
                  </div>
                </div>

                {clients.length === 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      💡 Add clients to start reselling AEVOICE services at your markup!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Credit Packages */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Purchase Credit Packages</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {creditPackages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={pkg.popular ? "border-2 border-cyan-500 shadow-lg" : ""}
                >
                  {pkg.popular && (
                    <div className="bg-cyan-500 text-white text-center py-1 text-xs font-semibold">
                      MOST POPULAR
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                        <Package className="w-8 h-8 text-cyan-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">
                        {pkg.minutes.toLocaleString()}
                      </h3>
                      <p className="text-sm text-slate-500">voice minutes</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-3xl font-bold text-slate-900 text-center mb-2">
                        ${pkg.cost}
                      </p>
                      {pkg.savings > 0 && (
                        <Badge className="w-full justify-center bg-emerald-100 text-emerald-700">
                          Save ${pkg.savings}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Cost per min</span>
                        <span className="font-medium">${(pkg.cost / pkg.minutes).toFixed(3)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Your revenue</span>
                        <span className="font-medium text-emerald-600">
                          ${(pkg.minutes * resellPrice).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Potential profit</span>
                        <span className="font-bold text-emerald-600">
                          ${(pkg.minutes * profitPerMinute).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handlePurchasePackage(pkg)}
                      className={pkg.popular ? "w-full bg-cyan-600 hover:bg-cyan-700" : "w-full"}
                    >
                      Purchase
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Profit Calculator */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-2">💰 Monthly Profit Calculator</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Based on your current resell price of <strong>${resellPrice}/min</strong>:
                  </p>
                  <div className="grid md:grid-cols-4 gap-4">
                    {[5000, 10000, 20000, 50000].map((usage) => (
                      <div key={usage} className="p-4 bg-white rounded-lg border border-purple-200">
                        <p className="text-xs text-slate-500 mb-1">{usage.toLocaleString()} min/mo</p>
                        <p className="text-lg font-bold text-slate-900">
                          ${(usage * profitPerMinute).toFixed(0)}
                        </p>
                        <p className="text-xs text-slate-500">profit/month</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Credit Package</DialogTitle>
            <DialogDescription>
              You're about to purchase {selectedPackage?.minutes.toLocaleString()} voice minutes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Package</span>
                <span className="font-semibold">{selectedPackage?.minutes.toLocaleString()} minutes</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Total Cost</span>
                <span className="font-semibold">${selectedPackage?.cost}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Potential Revenue</span>
                <span className="font-bold text-emerald-600">
                  ${(selectedPackage?.minutes * resellPrice || 0).toFixed(0)}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Credits will be added to your agency wallet immediately after payment.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <DollarSign className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}