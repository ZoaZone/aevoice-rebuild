import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  Gift,
  Zap,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function PromoSignup() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: ""
  });
  const [promoType, setPromoType] = useState(""); // hellobiz or promotional

  useEffect(() => {
    // Get promo type from URL
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type === 'hellobiz' || type === 'promotional') {
      setPromoType(type);
    } else {
      window.location.href = createPageUrl("Home");
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const signupMutation = useMutation({
    mutationFn: async (data) => {
      // Check if user already exists
      const existingUsers = await base44.entities.User.filter({ email: data.email });
      
      if (existingUsers.length > 0) {
        throw new Error("User already exists with this email");
      }

      // Create user account (this will send an invitation email)
      const userResponse = await base44.functions.invoke('createPromoUser', {
        email: data.email,
        full_name: data.full_name,
        promo_type: promoType,
        metadata: {
          phone: data.phone,
          company: data.company
        }
      });

      return userResponse.data;
    },
    onSuccess: () => {
      toast.success("Account created! Check your email for login credentials.");
      setTimeout(() => {
        window.location.href = createPageUrl("Home");
      }, 3000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create account");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    signupMutation.mutate(formData);
  };

  if (!promoType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-pulse">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 text-base">
            <Sparkles className="w-4 h-4 mr-2" />
            {promoType === 'hellobiz' ? 'HelloBiz Member Offer' : 'Exclusive Promotional Plan'}
          </Badge>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome to AEVOICE
          </h1>
          <p className="text-lg text-slate-600">
            {promoType === 'hellobiz' 
              ? 'Lifetime FREE subscription for HelloBiz members'
              : 'Special promotional access - Zero subscription fees'}
          </p>
        </div>

        <Card className="border-2 border-purple-200 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              Your Exclusive Benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Benefits */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
              <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                What's Included:
              </h3>
              <ul className="space-y-2 text-emerald-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>$0 Monthly Subscription</strong> - Completely FREE platform access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>3 AI Voice Agents</strong> - Create multiple intelligent agents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>2 Phone Numbers</strong> - Connect your own numbers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Pay-as-you-go Credits</strong> - Only pay $0.15/minute for actual usage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Full Feature Access</strong> - All Aeva Micro plan features included</span>
                </li>
              </ul>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Company/Business Name</Label>
                <Input
                  placeholder="Your Company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                />
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <Zap className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  <strong>Note:</strong> You'll receive login credentials via email. The subscription is FREE for life, 
                  you only pay for voice credits ($0.15/min) and your telephony provider's charges.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-semibold"
              >
                {signupMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Activate My Free Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          This offer is exclusive to {promoType === 'hellobiz' ? 'HelloBiz.app members' : 'selected promotional partners'}
        </p>
      </div>
    </div>
  );
}