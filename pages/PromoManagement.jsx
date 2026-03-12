import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Gift,
  Upload,
  UserPlus,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PromoManagement() {
  const [showSinglePromo, setShowSinglePromo] = useState(false);
  const [showBulkPromo, setShowBulkPromo] = useState(false);
  const [singleEmail, setSingleEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [promoConfig, setPromoConfig] = useState({
    promo_type: 'free_trial',
    duration_days: 30,
    credits_amount: 5,
    campaign_name: '',
    auto_activate: true
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.FreeUserPromotion.list('-created_date'),
  });

  const createSinglePromoMutation = useMutation({
    mutationFn: async (email) => {
      const result = await base44.functions.invoke('bulkCreatePromotions', {
        emails: [email],
        ...promoConfig
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setShowSinglePromo(false);
      setSingleEmail('');
      toast.success('Promotion created and user invited!');
    },
  });

  const createBulkPromoMutation = useMutation({
    mutationFn: async (emailsText) => {
      const emails = emailsText.split('\n').map(e => e.trim()).filter(e => e);
      const result = await base44.functions.invoke('bulkCreatePromotions', {
        emails,
        ...promoConfig
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setShowBulkPromo(false);
      setBulkEmails('');
      toast.success(`Created ${data.count} promotions!`);
    },
  });

  const activatePromoMutation = useMutation({
    mutationFn: async ({ promoId, email }) => {
      const result = await base44.functions.invoke('activateFreePromotion', {
        promotion_id: promoId,
        user_email: email
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promotion activated!');
    },
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { 
      label: "Total Promotions", 
      value: promotions.length, 
      icon: Gift, 
      color: "from-purple-500 to-pink-600" 
    },
    { 
      label: "Active", 
      value: promotions.filter(p => p.status === 'active').length, 
      icon: CheckCircle2, 
      color: "from-emerald-500 to-teal-600" 
    },
    { 
      label: "Pending", 
      value: promotions.filter(p => p.status === 'pending').length, 
      icon: Clock, 
      color: "from-amber-500 to-orange-600" 
    },
    { 
      label: "Expired", 
      value: promotions.filter(p => p.status === 'expired').length, 
      icon: XCircle, 
      color: "from-slate-500 to-slate-600" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Free Promotion Management</h1>
          <p className="text-slate-500 mt-1">Create and manage promotional campaigns</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700">
          Admin Panel
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-purple-500">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Single User Promotion</h3>
                <p className="text-sm text-slate-600">Add one user to promotion</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowSinglePromo(true)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Gift className="w-4 h-4 mr-2" />
              Create Single Promo
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-500">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Bulk Promotion Campaign</h3>
                <p className="text-sm text-slate-600">Upload multiple users</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowBulkPromo(true)}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Promotions</CardTitle>
          <CardDescription>All promotional campaigns and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-purple-300 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900">{promo.user_email}</p>
                    <Badge variant="outline" className="font-mono text-xs">
                      {promo.promo_code}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="capitalize">{promo.promo_type?.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{promo.credits_amount} credits</span>
                    <span>•</span>
                    <span>{promo.duration_days} days</span>
                  </div>
                  {promo.campaign_name && (
                    <p className="text-xs text-slate-400 mt-1">Campaign: {promo.campaign_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    promo.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    promo.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    promo.status === 'expired' ? 'bg-slate-100 text-slate-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {promo.status}
                  </Badge>
                  {promo.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => activatePromoMutation.mutate({ promoId: promo.id, email: promo.user_email })}
                      disabled={activatePromoMutation.isPending}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {promotions.length === 0 && (
              <div className="text-center py-12">
                <Gift className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-500">No promotions created yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Single Promotion Dialog */}
      <Dialog open={showSinglePromo} onOpenChange={setShowSinglePromo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              Create Single Promotion
            </DialogTitle>
            <DialogDescription>
              Add one user to a promotional campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User Email *</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Promo Type</Label>
                <Select 
                  value={promoConfig.promo_type} 
                  onValueChange={(v) => setPromoConfig({...promoConfig, promo_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_trial">Free Trial</SelectItem>
                    <SelectItem value="free_agent">Free Agent</SelectItem>
                    <SelectItem value="free_credits">Free Credits</SelectItem>
                    <SelectItem value="free_lifetime">FREE Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (Days)</Label>
                <Input
                  type="number"
                  value={promoConfig.duration_days}
                  onChange={(e) => setPromoConfig({...promoConfig, duration_days: Number(e.target.value)})}
                  min={1}
                  max={365}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Credits Amount</Label>
              <Input
                type="number"
                value={promoConfig.credits_amount}
                onChange={(e) => setPromoConfig({...promoConfig, credits_amount: Number(e.target.value)})}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Campaign Name (Optional)</Label>
              <Input
                placeholder="e.g., January 2025 Promo"
                value={promoConfig.campaign_name}
                onChange={(e) => setPromoConfig({...promoConfig, campaign_name: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label className="text-sm">Auto-activate immediately</Label>
              <input
                type="checkbox"
                checked={promoConfig.auto_activate}
                onChange={(e) => setPromoConfig({...promoConfig, auto_activate: e.target.checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSinglePromo(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createSinglePromoMutation.mutate(singleEmail)}
              disabled={!singleEmail || createSinglePromoMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createSinglePromoMutation.isPending ? "Creating..." : "Create Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Promotion Dialog */}
      <Dialog open={showBulkPromo} onOpenChange={setShowBulkPromo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />
              Bulk Promotion Campaign
            </DialogTitle>
            <DialogDescription>
              Upload multiple users at once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Addresses (one per line)</Label>
              <Textarea
                placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-slate-500">
                {bulkEmails.split('\n').filter(e => e.trim()).length} emails
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Promo Type</Label>
                <Select 
                  value={promoConfig.promo_type} 
                  onValueChange={(v) => setPromoConfig({...promoConfig, promo_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_trial">Free Trial</SelectItem>
                    <SelectItem value="free_agent">Free Agent</SelectItem>
                    <SelectItem value="free_credits">Free Credits</SelectItem>
                    <SelectItem value="free_lifetime">FREE Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Credits Amount</Label>
                <Input
                  type="number"
                  value={promoConfig.credits_amount}
                  onChange={(e) => setPromoConfig({...promoConfig, credits_amount: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g., Spring 2025 Campaign"
                value={promoConfig.campaign_name}
                onChange={(e) => setPromoConfig({...promoConfig, campaign_name: e.target.value})}
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-900">
                <strong>Auto-activate:</strong> Users will receive setup automatically. 
                Otherwise, they'll get invitation emails with promo codes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPromo(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createBulkPromoMutation.mutate(bulkEmails)}
              disabled={!bulkEmails.trim() || createBulkPromoMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {createBulkPromoMutation.isPending ? "Creating..." : "Create Bulk Promotions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}