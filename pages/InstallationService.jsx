import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  Globe,
  BookOpen,
  Phone,
  Code,
  Activity,
  ArrowRight,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function InstallationService() {
  const [customerEmail, setCustomerEmail] = useState('');

  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const installationId = urlParams.get('installation_id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (user?.email) {
      setCustomerEmail(user.email);
    }
    
    // Handle redirect after payment
    if (success === 'true' && installationId) {
      window.location.href = createPageUrl("PostPaymentOnboarding") + `?installation_id=${installationId}`;
    }
  }, [user, success, installationId]);

  const { data: installations = [], refetch } = useQuery({
    queryKey: ['installations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.InstallationService.filter({ customer_email: user.email }, '-created_date');
    },
    enabled: !!user?.email,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  const createInstallationMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.InstallationService.create(data);
    },
    onSuccess: (installation) => {
      // Now create checkout with installation_id
      createCheckoutMutation.mutate({
        installation_id: installation.id,
        customer_email: customerEmail,
      });
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createInstallationCheckout', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerEmail) {
      alert('Please enter your email address');
      return;
    }
    
    // Create minimal InstallationService record
    createInstallationMutation.mutate({
      customer_email: customerEmail,
      business_name: 'Pending Setup',
      website: 'https://pending.com',
      status: 'pending_payment',
      user_id: user?.id,
    });
  };

  const activeInstallation = installations.find(i => i.status !== 'completed' && i.status !== 'failed');
  const completedInstallations = installations.filter(i => i.status === 'completed');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'in_progress': return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed': return <div className="w-5 h-5 text-red-500">❌</div>;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getProgressPercent = (installation) => {
    if (!installation.progress_updates || installation.progress_updates.length === 0) return 0;
    const latest = installation.progress_updates[installation.progress_updates.length - 1];
    return latest.progress_percent || 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Installation Service</h1>
        <p className="text-slate-600">
          Let FlowSync automation handle your complete AI agent setup - $50 one-time fee
        </p>
      </div>

      {success && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="font-bold text-emerald-900">Payment Successful!</h3>
                <p className="text-sm text-emerald-700">
                  Your installation request has been sent to FlowSync. Automation is starting...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Installation Progress */}
      {activeInstallation && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
              Installation In Progress
            </CardTitle>
            <CardDescription>
              FlowSync is setting up your AI agent: {activeInstallation.business_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                <span className="text-sm text-slate-500">{getProgressPercent(activeInstallation)}%</span>
              </div>
              <Progress value={getProgressPercent(activeInstallation)} className="h-2" />
            </div>

            {activeInstallation.progress_updates && activeInstallation.progress_updates.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900">Recent Updates:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeInstallation.progress_updates.slice().reverse().map((update, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      {getStatusIcon(update.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{update.step}</p>
                        <p className="text-xs text-slate-500">{update.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(update.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-500" />
              Get Started with Aeva Mini
            </CardTitle>
            <CardDescription>
              $100/month - 300 voice minutes included
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Your Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-slate-500">
                  We'll send your setup instructions and agent details to this email
                </p>
              </div>

              <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-indigo-900">Aeva Mini Plan</p>
                      <p className="text-sm text-indigo-700">Perfect for small businesses</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-indigo-800">$100</p>
                      <p className="text-xs text-indigo-600">per month</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                      <CheckCircle2 className="w-4 h-4" />
                      300 voice minutes included
                    </div>
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                      <CheckCircle2 className="w-4 h-4" />
                      1 AI Agent
                    </div>
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                      <CheckCircle2 className="w-4 h-4" />
                      1 Phone Number (via third-party)
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-900">
                  <strong>📝 Note:</strong> After payment, you'll be asked to provide your business details 
                  to complete the AI agent setup.
                </p>
              </div>

              <Button
                type="submit"
                disabled={createInstallationMutation.isPending || createCheckoutMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {(createInstallationMutation.isPending || createCheckoutMutation.isPending) ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* What's Included */}
        <div className="space-y-6">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                What's Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: Globe, text: 'Automatic website scraping & data collection' },
                  { icon: Bot, text: 'AI agent creation with optimal settings' },
                  { icon: BookOpen, text: 'Knowledge base setup from your content' },
                  { icon: Phone, text: 'Voice & greeting configuration' },
                  { icon: Code, text: 'Website widget generation & embed code' },
                  { icon: Activity, text: 'Testing & quality assurance' },
                  { icon: CheckCircle2, text: 'Email delivery with setup details' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <item.icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Zap className="w-8 h-8 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Powered by FlowSync</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    FlowSync automation (WorkAutomation.app) handles the entire setup process
                    through a 12-step workflow - from website analysis to agent deployment.
                  </p>
                  <Badge className="bg-purple-100 text-purple-700">
                    Typically completes in 10-15 minutes
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Completed Installations */}
      {completedInstallations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Installations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {completedInstallations.map((inst) => (
                <div key={inst.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{inst.business_name}</h3>
                    <Badge className="bg-emerald-500 text-white">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{inst.website}</p>
                  {inst.completed_agent_id && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Bot className="w-3 h-3" />
                      Agent ID: {inst.completed_agent_id}
                    </div>
                  )}
                  {inst.completion_date && (
                    <p className="text-xs text-slate-400 mt-2">
                      Completed: {new Date(inst.completion_date).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}