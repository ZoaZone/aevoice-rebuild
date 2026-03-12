import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  CheckCircle2,
  Clock,
  Award,
  ExternalLink,
  Settings,
  BarChart3,
  Wallet,
  Gift,
  Share2,
  Shield,
  Sparkles,
  ChevronRight,
  CreditCard,
  Building,
  Globe,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  ArrowUpRight,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

const COMMISSION_TIERS = {
  bronze: { rate: 5, minRevenue: 0, color: "from-amber-600 to-amber-700", label: "Bronze" },
  silver: { rate: 7, minRevenue: 1000, color: "from-slate-400 to-slate-500", label: "Silver" },
  gold: { rate: 8, minRevenue: 5000, color: "from-yellow-500 to-amber-500", label: "Gold" },
  platinum: { rate: 10, minRevenue: 15000, color: "from-cyan-400 to-blue-500", label: "Platinum" }
};

// Commission is limited to 12 cycles (12 months) per referred client
const MAX_COMMISSION_CYCLES = 12;

export default function AffiliatePortal() {
  const [copied, setCopied] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showPayoutSettings, setShowPayoutSettings] = useState(false);
  const [signupData, setSignupData] = useState({
    full_name: "",
    affiliate_email: "",
    contact_phone: "",
    company_name: "",
    website_url: "",
    social_links: {},
    notes: ""
  });
  const [paymentData, setPaymentData] = useState({
    payment_method: "paypal",
    payment_details: {}
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: affiliates = [] } = useQuery({
    queryKey: ['affiliates'],
    queryFn: () => base44.entities.Affiliate.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.filter({ affiliate_id: affiliate?.id }),
    enabled: !!affiliates?.[0]?.id,
  });

  const affiliate = affiliates?.[0];

  const createAffiliateMutation = useMutation({
    mutationFn: (data) => base44.entities.Affiliate.create(data),
    onSuccess: async () => {
      // Invalidate and wait for refetch
      await queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      
      // Force refetch
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['affiliates'] });
      }, 500);
      
      setShowSignup(false);
      
      // Success notification
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in';
      successMsg.innerHTML = '✅ <strong>Affiliate account created!</strong> Refreshing...';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 4000);
    },
    onError: (error) => {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMsg.textContent = `❌ Error: ${error.message}`;
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 4000);
    },
  });

  const updateAffiliateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Affiliate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      setShowPayoutSettings(false);
    },
  });

  const generateReferralCode = () => {
    const prefix = signupData.company_name || signupData.full_name || "AEV";
    const code = prefix.replace(/\s+/g, '').toUpperCase().slice(0, 6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${code}${random}`;
  };

  const handleSignup = async () => {
    // Validation
    if (!signupData.full_name) {
      toast.error('Full name is required');
      return;
    }

    const affiliateEmail = signupData.affiliate_email || user?.email;
    if (!affiliateEmail || !affiliateEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Valid email address is required');
      return;
    }

    // Validate URLs if provided
    if (signupData.website_url && !signupData.website_url.match(/^https?:\/\/.+/i)) {
      toast.error('Website URL must start with http:// or https://');
      return;
    }

    const referralCode = generateReferralCode();
    
    try {
      const affiliateEmail = signupData.affiliate_email || user?.email;
      
      await createAffiliateMutation.mutateAsync({
        ...signupData,
        user_email: affiliateEmail,
        referral_code: referralCode,
        commission_tier: "bronze",
        commission_rate: 5,
        status: "pending",
        payment_method: "paypal",
        payment_details: {},
        total_referrals: 0,
        total_revenue_generated: 0,
        total_earnings: 0,
        pending_payout: 0,
        total_paid_out: 0
      });

      // Create admin notification
      await base44.asServiceRole.entities.AdminNotification.create({
        type: 'affiliate_signup',
        title: 'New Affiliate Application',
        message: `${signupData.full_name} (${affiliateEmail}) has applied to join the affiliate program.`,
        reference_type: 'affiliate',
        reference_id: affiliate?.id || 'pending',
        reference_email: affiliateEmail,
        priority: 'medium',
        status: 'unread'
      });

      // Prompt to set up payout after successful creation
      setTimeout(() => {
        setPaymentData({
          payment_method: "paypal",
          payment_details: {}
        });
        setShowPayoutSettings(true);
      }, 2000);
      } catch (error) {
      console.error('Affiliate creation error:', error);
      }
      };

  const handleSavePayment = () => {
    updateAffiliateMutation.mutate({
      id: affiliate.id,
      data: paymentData
    });
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/Home?ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tier = COMMISSION_TIERS[affiliate?.commission_tier || "bronze"];
  const nextTier = affiliate?.commission_tier === "bronze" ? "silver" : 
                   affiliate?.commission_tier === "silver" ? "gold" :
                   affiliate?.commission_tier === "gold" ? "platinum" : null;
  const nextTierData = nextTier ? COMMISSION_TIERS[nextTier] : null;
  const progressToNext = nextTierData ? 
    Math.min(100, ((affiliate?.total_revenue_generated || 0) / nextTierData.minRevenue) * 100) : 100;

  // If not an affiliate yet, show signup
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white p-6">
        <style>{`
          .grid-pattern {
            background-image: 
              linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
          }
        `}</style>
        <div className="absolute inset-0 grid-pattern" />
        
        <div className="relative z-10 max-w-4xl mx-auto py-12">
          <div className="text-center mb-12">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
                alt="AEVOICE" 
                className="w-20 h-20 rounded-2xl object-cover shadow-lg shadow-cyan-500/20"
              />
            </div>
            <Badge className="mb-4 bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
              <Gift className="w-3 h-3 mr-2" />
              Partner Program
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Earn Up to <span className="text-cyan-400">10% Commission</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Join the AEVOICE Affiliate Program and earn recurring commissions 
              for every customer you refer.
            </p>
          </div>

          {/* Commission Tiers */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {Object.entries(COMMISSION_TIERS).map(([key, tier]) => (
              <Card key={key} className="bg-slate-800/50 border-slate-700 overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${tier.color}`} />
                <CardContent className="p-4 text-center">
                  <Award className={cn("w-8 h-8 mx-auto mb-2", 
                    key === "bronze" && "text-amber-600",
                    key === "silver" && "text-slate-400",
                    key === "gold" && "text-yellow-500",
                    key === "platinum" && "text-cyan-400"
                  )} />
                  <h3 className="font-bold text-white">{tier.label}</h3>
                  <p className="text-2xl font-bold text-cyan-400">{tier.rate}%</p>
                  <p className="text-xs text-slate-500">
                    {tier.minRevenue > 0 ? `$${tier.minRevenue.toLocaleString()}+ revenue` : "Starting tier"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benefits */}
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Why Partner With Us?</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: DollarSign, title: "Recurring Revenue", desc: "Earn on every monthly payment" },
                  { icon: TrendingUp, title: "Tier Upgrades", desc: "Increase rates as you grow" },
                  { icon: Clock, title: "30-Day Cookie", desc: "Extended attribution window" },
                  { icon: Wallet, title: "Monthly Payouts", desc: "Automatic payments" },
                  { icon: BarChart3, title: "Real-Time Dashboard", desc: "Track everything live" },
                  { icon: Shield, title: "Dedicated Support", desc: "Priority partner support" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <item.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button 
              size="lg"
              onClick={() => setShowSignup(true)}
              className="h-14 px-8 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Become an Affiliate
            </Button>
          </div>
        </div>

        {/* Signup Dialog */}
        <Dialog open={showSignup} onOpenChange={setShowSignup}>
          <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Join Affiliate Program</DialogTitle>
              <DialogDescription className="text-slate-400">
                Fill in your details to get started. Your referral code will be generated automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={signupData.full_name}
                  onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Affiliate Email *</Label>
                <Input
                  type="email"
                  value={signupData.affiliate_email || user?.email || ""}
                  onChange={(e) => setSignupData({ ...signupData, affiliate_email: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-slate-500">Enter the email for your affiliate account (can be different from your login email)</p>
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  value={signupData.contact_phone || ""}
                  onChange={(e) => setSignupData({ ...signupData, contact_phone: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-2">
                <Label>Company / Brand Name</Label>
                <Input
                  value={signupData.company_name}
                  onChange={(e) => setSignupData({ ...signupData, company_name: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Acme Inc"
                />
              </div>
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={signupData.website_url}
                  onChange={(e) => setSignupData({ ...signupData, website_url: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="https://yoursite.com"
                />
                {signupData.website_url && !signupData.website_url.match(/^https?:\/\/.+/i) && (
                  <p className="text-xs text-amber-400">⚠️ URL should start with http:// or https://</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Social Media Links (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="https://youtube.com/@channel"
                    value={signupData.social_links?.youtube || ""}
                    onChange={(e) => setSignupData({ 
                      ...signupData, 
                      social_links: { ...signupData.social_links, youtube: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700 text-sm"
                  />
                  <Input
                    placeholder="https://instagram.com/username"
                    value={signupData.social_links?.instagram || ""}
                    onChange={(e) => setSignupData({ 
                      ...signupData, 
                      social_links: { ...signupData.social_links, instagram: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>How will you promote AEVOICE?</Label>
                <Textarea
                  value={signupData.notes}
                  onChange={(e) => setSignupData({ ...signupData, notes: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Blog posts, YouTube videos, social media, etc."
                  rows={3}
                />
              </div>

              {/* Terms */}
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Commission Terms
                </h4>
                <ul className="text-xs text-slate-400 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    Commission is calculated on <span className="text-white">monthly recurring revenue</span> generated by your referrals.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="text-amber-300">Commission is limited to <strong>12 cycles (12 months)</strong> per referred client.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    Your tier and rate are based on <span className="text-white">that month's total revenue</span>, not lifetime.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    Payouts processed monthly. Minimum payout: $50.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    30-day cookie attribution window.
                  </li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSignup(false)} className="border-slate-700">
                Cancel
              </Button>
              <Button 
                onClick={handleSignup}
                disabled={!signupData.full_name || createAffiliateMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {createAffiliateMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Affiliate Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Logo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
              alt="AEVOICE" 
              className="w-14 h-14 rounded-xl object-cover shadow-lg shadow-cyan-500/20"
            />
            <div>
              <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
              <p className="text-slate-400">Welcome back, {affiliate.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn("bg-gradient-to-r text-white border-0", tier.color)}>
              <Award className="w-3 h-3 mr-1" />
              {tier.label} Partner
            </Badge>
            <div className="flex items-center gap-3">
              {(!affiliate.payment_details?.paypal_email && !affiliate.payment_details?.account_number) && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Payment Setup Required
                </Badge>
              )}
              <Button 
                variant="outline" 
                onClick={() => {
                  setPaymentData({
                    payment_method: affiliate.payment_method || "paypal",
                    payment_details: affiliate.payment_details || {}
                  });
                  setShowPayoutSettings(true);
                }}
                className={cn(
                  "border-slate-700 text-slate-300 hover:bg-slate-800",
                  (!affiliate.payment_details?.paypal_email && !affiliate.payment_details?.account_number) && 
                  "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                )}
              >
                <Settings className="w-4 h-4 mr-2" />
                {(!affiliate.payment_details?.paypal_email && !affiliate.payment_details?.account_number) ? 
                  'Setup Payment' : 'Payout Settings'}
              </Button>
            </div>
          </div>
        </div>

        {/* Referral Link Card */}
        <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-cyan-400 font-medium mb-1">Your Referral Link</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm sm:text-lg font-mono text-white bg-slate-800/50 px-3 py-1.5 rounded-lg break-all">
                    {`${window.location.origin}/Home?ref=${affiliate.referral_code}`}
                  </code>
                  <Button 
                    size="sm" 
                    onClick={copyReferralLink}
                    className={cn(
                      "transition-all",
                      copied ? "bg-emerald-600" : "bg-cyan-600 hover:bg-cyan-700"
                    )}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Code:</span>
                  <Badge className="bg-slate-800 text-cyan-400 font-mono text-lg px-3 py-1">
                    {affiliate.referral_code}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Share Buttons */}
            <div className="mt-4 pt-4 border-t border-cyan-500/20">
              <p className="text-xs text-slate-400 mb-3">Share your link:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=Check out AEVOICE - AI Voice Assistants for your business!&url=${encodeURIComponent(window.location.origin + '/Home?ref=' + affiliate.referral_code)}`, '_blank')}
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + '/Home?ref=' + affiliate.referral_code)}`, '_blank')}
                >
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Check out AEVOICE - AI Voice Assistants for your business! ' + window.location.origin + '/Home?ref=' + affiliate.referral_code)}`, '_blank')}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => window.open(`mailto:?subject=Check out AEVOICE&body=${encodeURIComponent('I recommend AEVOICE for AI Voice Assistants: ' + window.location.origin + '/Home?ref=' + affiliate.referral_code)}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Referrals", 
              value: affiliate.total_referrals || 0, 
              icon: Users, 
              color: "from-blue-500 to-cyan-500" 
            },
            { 
              label: "Revenue Generated", 
              value: `$${(affiliate.total_revenue_generated || 0).toLocaleString()}`, 
              icon: TrendingUp, 
              color: "from-emerald-500 to-teal-500" 
            },
            { 
              label: "Total Earnings", 
              value: `$${(affiliate.total_earnings || 0).toLocaleString()}`, 
              icon: DollarSign, 
              color: "from-amber-500 to-orange-500" 
            },
            { 
              label: "Pending Payout", 
              value: `$${(affiliate.pending_payout || 0).toLocaleString()}`, 
              icon: Wallet, 
              color: "from-purple-500 to-pink-500" 
            },
          ].map((stat, i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{stat.label}</span>
                  <div className={cn("p-2 rounded-lg bg-gradient-to-br", stat.color)}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Commission Tier Progress */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">Commission Tier</h3>
                <p className="text-sm text-slate-400">
                  Current rate: <span className="text-cyan-400 font-bold">{affiliate.commission_rate || tier.rate}%</span>
                </p>
              </div>
              {nextTierData && (
                <div className="text-right">
                  <p className="text-sm text-slate-400">Next tier: {COMMISSION_TIERS[nextTier].label}</p>
                  <p className="text-xs text-slate-500">
                    ${(nextTierData.minRevenue - (affiliate.total_revenue_generated || 0)).toLocaleString()} more to unlock
                  </p>
                </div>
              )}
            </div>
            <Progress value={progressToNext} className="h-2 bg-slate-700" />
            <div className="flex justify-between mt-2">
              {Object.entries(COMMISSION_TIERS).map(([key, t]) => (
                <div key={key} className={cn(
                  "text-xs",
                  affiliate.commission_tier === key ? "text-cyan-400" : "text-slate-500"
                )}>
                  {t.label} ({t.rate}%)
                </div>
              ))}
            </div>
            
            {/* Commission Limit Note */}
            <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> Commission is limited to <strong>12 billing cycles (12 months)</strong> per referred client. 
                  Your tier is based on <strong>this month's revenue</strong>, not cumulative.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="referrals" className="data-[state=active]:bg-cyan-600">
              Recent Referrals
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-cyan-600">
              Payout History
            </TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-cyan-600">
              Marketing Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referrals">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-0">
                {referrals.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400">No referrals yet</p>
                    <p className="text-sm text-slate-500">Share your referral link to start earning!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {referrals.map((ref) => (
                      <div key={ref.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{ref.referred_user_name || ref.referred_user_email}</p>
                          <p className="text-sm text-slate-400">{ref.plan_purchased} • {format(new Date(ref.created_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">+${ref.commission_earned?.toFixed(2)}</p>
                          <Badge variant="secondary" className={cn(
                            "text-xs",
                            ref.status === "confirmed" && "bg-emerald-500/20 text-emerald-400",
                            ref.status === "pending" && "bg-amber-500/20 text-amber-400",
                            ref.status === "paid" && "bg-blue-500/20 text-blue-400"
                          )}>
                            {ref.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 text-center">
                <Wallet className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">Payouts are processed monthly</p>
                <p className="text-sm text-slate-500">Minimum payout: $50</p>
                <p className="text-lg font-bold text-white mt-4">
                  Total Paid Out: ${(affiliate.total_paid_out || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-white mb-4">Marketing Materials</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: "Logo Pack", desc: "AEVOICE logos in various formats", icon: Gift },
                    { title: "Banner Ads", desc: "Web banners in multiple sizes", icon: ExternalLink },
                    { title: "Product Screenshots", desc: "High-res platform images", icon: BarChart3 },
                    { title: "Copy Templates", desc: "Pre-written marketing copy", icon: Share2 },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-slate-700/50 rounded-lg flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-cyan-500/10">
                        <item.icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-sm text-slate-400">{item.desc}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-cyan-400">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payout Settings Dialog */}
        <Dialog open={showPayoutSettings} onOpenChange={setShowPayoutSettings}>
          <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payout Settings</DialogTitle>
              <DialogDescription className="text-slate-400">
                Configure how you want to receive your commission payments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select 
                  value={paymentData.payment_method} 
                  onValueChange={(v) => setPaymentData({ ...paymentData, payment_method: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentData.payment_method === "paypal" && (
                <div className="space-y-2">
                  <Label>PayPal Email</Label>
                  <Input
                    type="email"
                    value={paymentData.payment_details?.paypal_email || ""}
                    onChange={(e) => setPaymentData({
                      ...paymentData,
                      payment_details: { ...paymentData.payment_details, paypal_email: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700"
                    placeholder="your@paypal.com"
                  />
                </div>
              )}

              {paymentData.payment_method === "bank_transfer" && (
                <>
                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input
                      value={paymentData.payment_details?.account_holder_name || ""}
                      onChange={(e) => setPaymentData({
                        ...paymentData,
                        payment_details: { ...paymentData.payment_details, account_holder_name: e.target.value }
                      })}
                      className="bg-slate-800 border-slate-700"
                      placeholder="Full name on bank account"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={paymentData.payment_details?.bank_name || ""}
                      onChange={(e) => setPaymentData({
                        ...paymentData,
                        payment_details: { ...paymentData.payment_details, bank_name: e.target.value }
                      })}
                      className="bg-slate-800 border-slate-700"
                      placeholder="e.g., Chase Bank, Bank of America"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={paymentData.payment_details?.account_number || ""}
                        onChange={(e) => setPaymentData({
                          ...paymentData,
                          payment_details: { ...paymentData.payment_details, account_number: e.target.value }
                        })}
                        className="bg-slate-800 border-slate-700"
                        placeholder="Account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Routing Number (ACH)</Label>
                      <Input
                        value={paymentData.payment_details?.routing_number || ""}
                        onChange={(e) => setPaymentData({
                          ...paymentData,
                          payment_details: { ...paymentData.payment_details, routing_number: e.target.value }
                        })}
                        className="bg-slate-800 border-slate-700"
                        placeholder="9-digit routing number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>SWIFT/BIC Code (International)</Label>
                    <Input
                      value={paymentData.payment_details?.swift_code || ""}
                      onChange={(e) => setPaymentData({
                        ...paymentData,
                        payment_details: { ...paymentData.payment_details, swift_code: e.target.value }
                      })}
                      className="bg-slate-800 border-slate-700"
                      placeholder="For international transfers (optional)"
                    />
                  </div>
                </>
              )}

              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                  <p className="text-sm text-amber-200">
                    Payouts are processed on the 1st of each month for the previous month's confirmed commissions. Minimum payout is $50.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayoutSettings(false)} className="border-slate-700">
                Cancel
              </Button>
              <Button 
                onClick={handleSavePayment}
                disabled={updateAffiliateMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {updateAffiliateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}