import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  Building2,
  CreditCard,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AgencySignup() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    agency_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    business_address: "",
    tax_id: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const queryClient = useQueryClient();

  const createAgencyMutation = useMutation({
    mutationFn: async (data) => {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.primary_email)) {
        throw new Error('Invalid email format');
      }

      const agency = await base44.entities.Agency.create(data);
      
      // Create wallet for agency
      await base44.entities.Wallet.create({
        owner_type: "agency",
        owner_id: agency.id,
        credits_balance: 0,
        currency: "USD"
      });

      // Create admin notification
      await base44.asServiceRole.entities.AdminNotification.create({
        type: 'agency_signup',
        title: 'New Agency Registration',
        message: `${data.name} has registered and is pending approval.`,
        reference_type: 'agency',
        reference_id: agency.id,
        reference_email: data.primary_email,
        priority: 'high',
        status: 'unread',
        action_url: '/AdminDashboard'
      });

      // Send admin notification email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'vetnpet@gmail.com',
        subject: '🚨 New Agency Registration - Action Required',
        body: `
          <h2>New Agency Registration</h2>
          <p><strong>Agency:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.primary_email}</p>
          <p><strong>Contact:</strong> ${data.settings?.contact_name}</p>
          <p><a href="https://aevoice.base44.app/AdminDashboard">Review in Admin Dashboard</a></p>
        `
      });
      
      return agency;
    },
    onSuccess: async (agency) => {
      console.log('Agency created successfully:', agency);
      
      // Show success notification
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in';
      successMsg.innerHTML = '<strong>✅ Agency registered!</strong><br/>Redirecting to portal...';
      document.body.appendChild(successMsg);
      
      // Wait 2 seconds for backend to fully persist
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force full page reload with query param to bypass cache
      const portalUrl = createPageUrl("AgencyPortal");
      window.location.href = `${portalUrl}?registered=true&t=${Date.now()}`;
    },
    onError: (error) => {
      console.error('Agency creation error:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMsg.innerHTML = `<strong>❌ Registration failed</strong><br/>${error.message}`;
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 5000);
    },
  });



  const handleSubmit = () => {
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    createAgencyMutation.mutate({
      name: formData.agency_name,
      slug: formData.agency_name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      primary_email: formData.contact_email,
      status: 'pending',
      settings: {
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        business_address: formData.business_address,
        tax_id: formData.tax_id
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#0e4166] to-cyan-600 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Register as White-Label Agency</h1>
          <p className="text-slate-500">
            Start your own AI voice platform with 75/25 revenue split
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle>Agency Registration</CardTitle>
            <CardDescription>
              Complete the form to get started with AEVOICE white-label platform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Agency Information
              </h3>
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Agency/Company Name *</Label>
                  <Input
                    placeholder="e.g., VoiceTech Solutions"
                    value={formData.agency_name}
                    onChange={(e) => setFormData({...formData, agency_name: e.target.value})}
                  />
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Contact Person Name *</Label>
                    <Input
                      placeholder="Full name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contact Email *</Label>
                    <Input
                      type="email"
                      placeholder="contact@agency.com"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Contact Phone *</Label>
                    <Input
                      placeholder="+1 234 567 8900"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tax ID / EIN (Optional)</Label>
                    <Input
                      placeholder="XX-XXXXXXX"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Business Address *</Label>
                  <Input
                    placeholder="Street, City, State, ZIP"
                    value={formData.business_address}
                    onChange={(e) => setFormData({...formData, business_address: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Payment Setup Info */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">Stripe Connect Setup</h4>
                  <p className="text-sm text-slate-600">
                    After registration, you'll be redirected to Stripe to connect your bank account. 
                    You'll receive 85% of all client payments automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Legal Declaration */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-600" />
                Terms & Legal Declaration
              </h3>
              
              <Alert className="bg-amber-50 border-amber-200">
                <Shield className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-slate-700 text-sm space-y-2">
                  <p className="font-medium text-amber-800">Important Legal Notice:</p>
                  <p>
                    By registering as a white-label agency, you acknowledge and agree to the following:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>You do not claim any ownership rights over the AEVOICE platform or its technology</li>
                    <li>AEVOICE acts solely as a service platform/medium connecting you with AI voice technology</li>
                    <li>You will not hold AEVOICE liable for any damages, losses, or disputes arising from your use of the platform</li>
                    <li>All third-party issues, transactions, and disputes with your subscribers are your sole responsibility</li>
                    <li>You are responsible for compliance with applicable laws and regulations in your jurisdiction</li>
                    <li>Platform retains 15% + applicable taxes from all client payments via Stripe Connect</li>
                    <li>You agree to maintain accurate billing records and handle subscriber payment disputes</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                  I have read and accept the terms and conditions above. I understand that I am solely responsible 
                  for all third-party issues, transactions, and subscriber disputes. I acknowledge that AEVOICE 
                  is a platform provider and bears no liability for my business operations.
                </label>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.agency_name || 
                !formData.contact_name || 
                !formData.contact_email || 
                !formData.contact_phone || 
                !formData.business_address ||
                !acceptedTerms ||
                createAgencyMutation.isPending
              }
              className="w-full h-12 bg-gradient-to-r from-[#0e4166] to-cyan-600 hover:from-[#0a2540] hover:to-cyan-700"
            >
              {createAgencyMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Agency...
                </>
              ) : (
                <>
                  Register Agency
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-700">
                  <p className="font-semibold text-amber-800 mb-1">Approval Required</p>
                  <p>Your agency registration will be reviewed by our admin team. You'll receive an email confirmation once approved (typically within 24-48 hours). After approval, you can access the Agency Portal and connect Stripe for payments.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}