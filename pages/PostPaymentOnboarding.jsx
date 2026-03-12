import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, Building2, Globe, Phone, Briefcase, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PostPaymentOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const installationId = urlParams.get('installation_id');

  const [formData, setFormData] = useState({
    business_name: "",
    website: "",
    phone: "",
    industry: "",
    web_developer_credentials: "",
    allow_auto_deployment: false,
  });

  const { data: installation, isLoading: isInstallationLoading, isError: isInstallationError } = useQuery({
    queryKey: ['installation', installationId],
    queryFn: async () => {
      if (!installationId) throw new Error("Installation ID is missing.");
      const response = await base44.entities.InstallationService.filter({ id: installationId });
      if (!response || response.length === 0) throw new Error("Installation not found.");
      return response[0];
    },
    enabled: !!installationId,
  });

  useEffect(() => {
    if (installation) {
      setFormData(prev => ({
        ...prev,
        business_name: installation.business_name || "",
        website: installation.website || "",
        phone: installation.phone || "",
        industry: installation.industry || "",
      }));
    }
  }, [installation]);

  const updateInstallationMutation = useMutation({
    mutationFn: (data) => base44.entities.InstallationService.update(installationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation', installationId] });
      // Trigger the processAutomation after updating
      triggerAutomationMutation.mutate();
    },
    onError: (error) => {
      toast.error("Failed to save onboarding data: " + error.message);
    }
  });

  const triggerAutomationMutation = useMutation({
    mutationFn: () => base44.functions.invoke('processInstallationAutomation', { installation_id: installationId }),
    onSuccess: () => {
      toast.success("Installation setup complete! Redirecting to status page.");
      navigate(createPageUrl("InstallationStatus") + `?installation_id=${installationId}`);
    },
    onError: (error) => {
      toast.error("Failed to start agent creation: " + error.message);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!installationId) {
      toast.error("Missing installation ID.");
      return;
    }
    updateInstallationMutation.mutate(formData);
  };

  if (isInstallationLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="ml-3 text-lg text-slate-700">Loading installation details...</p>
      </div>
    );
  }

  if (isInstallationError || !installation) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Could not load installation details. Please try again later or contact support.</p>
            <Button onClick={() => navigate(createPageUrl("Home"))} className="mt-4">Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl border-0">
        <CardHeader className="text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl p-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold mb-2">
            Payment Successful! 🎉
          </CardTitle>
          <CardDescription className="text-indigo-100 text-lg">
            Your AI agent setup is almost complete. Please provide a few more details.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="business_name" className="flex items-center gap-2 text-slate-700 font-medium">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Business Name *
                </Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Your Business Name"
                  className="border-slate-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2 text-slate-700 font-medium">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Website URL *
                </Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  type="url"
                  placeholder="https://yourbusiness.com"
                  className="border-slate-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-slate-700 font-medium">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  Business Phone *
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="border-slate-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry" className="flex items-center gap-2 text-slate-700 font-medium">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Industry
                </Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., Real Estate, Healthcare"
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="web_developer_credentials" className="flex items-center gap-2 text-slate-700 font-medium">
                <Lock className="w-4 h-4 text-indigo-600" />
                Web Developer Credentials (Optional - For Auto-Deployment)
              </Label>
              <Textarea
                id="web_developer_credentials"
                value={formData.web_developer_credentials}
                onChange={(e) => setFormData({ ...formData, web_developer_credentials: e.target.value })}
                rows={4}
                placeholder="FTP credentials, CMS login, or other access details for widget deployment. We recommend using temporary credentials for security."
                className="border-slate-300 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                This information is encrypted and only used if auto-deployment is enabled below.
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="auto_deployment"
                  checked={formData.allow_auto_deployment}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_auto_deployment: checked })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="auto_deployment"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Allow auto-deployment of the AI widget to my website
                  </Label>
                  <p className="text-xs text-slate-600 mt-1">
                    If enabled, we'll automatically deploy the widget code to your website using the credentials provided above.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-6 text-lg font-semibold shadow-lg"
              disabled={updateInstallationMutation.isPending || triggerAutomationMutation.isPending}
            >
              {(updateInstallationMutation.isPending || triggerAutomationMutation.isPending) ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {triggerAutomationMutation.isPending ? "Creating Your AI Agent..." : "Saving..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Complete Setup & Create My Agent
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}