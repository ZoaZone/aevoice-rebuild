import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Settings,
  CreditCard,
  FileText,
  BarChart3,
  Globe,
  Palette,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Trash2,
  Paintbrush
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

function AgencyBrandingForm({ agency, onUpdate }) {
  const [formData, setFormData] = useState({
    name: agency.name || "",
    custom_domain: agency.custom_domain || "",
    logo_url: agency.logo_url || "",
    primary_color: agency.theme_config?.primary_color || "#6366f1",
    secondary_color: agency.theme_config?.secondary_color || "#8b5cf6",
    accent_color: agency.theme_config?.accent_color || "#06b6d4"
  });
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onUpdate({
      id: agency.id,
      data: {
        name: formData.name,
        custom_domain: formData.custom_domain,
        logo_url: formData.logo_url,
        theme_config: {
          ...agency.theme_config,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color
        }
      }
    });
    setIsDirty(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>White-Label Branding</CardTitle>
        <CardDescription>Customize with your brand identity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Agency Name</Label>
          <Input 
            value={formData.name} 
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Custom Domain</Label>
          <Input 
            placeholder="voice.youragency.com"
            value={formData.custom_domain}
            onChange={(e) => handleChange('custom_domain', e.target.value)}
          />
          <p className="text-xs text-slate-500">Configure CNAME after entering domain</p>
        </div>
        <div className="space-y-2">
          <Label>Agency Logo URL</Label>
          <Input 
            placeholder="https://youragency.com/logo.png"
            value={formData.logo_url}
            onChange={(e) => handleChange('logo_url', e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input 
                type="color"
                className="w-12 p-1 h-10"
                value={formData.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
              />
              <Input 
                value={formData.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <Input 
                type="color"
                className="w-12 p-1 h-10"
                value={formData.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
              />
              <Input 
                value={formData.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-2">
              <Input 
                type="color"
                className="w-12 p-1 h-10"
                value={formData.accent_color}
                onChange={(e) => handleChange('accent_color', e.target.value)}
              />
              <Input 
                value={formData.accent_color}
                onChange={(e) => handleChange('accent_color', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="pt-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgencyPortal() {
  const [showAddClient, setShowAddClient] = useState(false);
  const [showStripeConnect, setShowStripeConnect] = useState(false);
  const [showDeleteAgency, setShowDeleteAgency] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    slug: "",
    contact_email: "",
    contact_phone: "",
    industry: "other"
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agencies = [], isLoading: agenciesLoading, refetch: refetchAgencies } = useQuery({
    queryKey: ['myAgencies'],
    queryFn: async () => {
      const allAgencies = await base44.entities.Agency.list();
      const userAgencies = allAgencies.filter(a => 
        a.primary_email === user?.email || 
        a.created_by === user?.email ||
        a.primary_email?.toLowerCase() === user?.email?.toLowerCase()
      );
      return userAgencies || [];
    },
    enabled: !!user?.email,
    retry: 2,
  });

  const myAgency = agencies[0];

  const { data: clients = [] } = useQuery({
    queryKey: ['agencyClients', myAgency?.id],
    queryFn: () => base44.entities.Client.filter({ agency_id: myAgency?.id }),
    enabled: !!myAgency,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agencyAgents'],
    queryFn: () => base44.entities.Agent.list(),
    enabled: !!myAgency,
  });

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ['agencyPhoneNumbers'],
    queryFn: () => base44.entities.PhoneNumber.list(),
    enabled: !!myAgency,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      const client = await base44.entities.Client.create(data);
      await base44.entities.Wallet.create({
        owner_type: "client",
        owner_id: client.id,
        credits_balance: 0,
        currency: "USD"
      });
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencyClients'] });
      setShowAddClient(false);
      setNewClient({ name: "", slug: "", contact_email: "", contact_phone: "", industry: "other" });
      toast.success("Client added successfully");
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencyClients'] });
      toast.success("Client deleted");
    },
  });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAgencies'] });
      toast.success("Agency updated");
    },
  });

  const deleteAgencyMutation = useMutation({
    mutationFn: (id) => base44.entities.Agency.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAgencies'] });
      toast.success("Agency deleted. Redirecting...");
      setTimeout(() => {
        window.location.href = createPageUrl("Home");
      }, 1500);
    },
  });

  const handleStripeConnect = async () => {
    setConnectingStripe(true);
    try {
      const response = await base44.functions.invoke('stripeConnect', {
        action: 'create_account',
        email: user.email,
        business_name: myAgency?.name || user.full_name
      });
      
      if (response.data?.account_link) {
        window.location.href = response.data.account_link;
      } else {
        toast.error("Failed to create Stripe account");
      }
    } catch (error) {
      toast.error("Error connecting Stripe");
    } finally {
      setConnectingStripe(false);
    }
  };

  const stats = {
    totalClients: clients.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    phoneNumbers: phoneNumbers.length,
    monthlyRevenue: clients.reduce((sum, c) => sum + 100, 0)
  };

  const stripeConnected = myAgency?.settings?.stripe_account_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Agency Portal</h1>
              <p className="text-slate-500 mt-1">
                {myAgency ? `${myAgency.name} Dashboard` : 'Manage your white-label platform'}
              </p>
            </div>
          </div>
          {myAgency && (
            <Button onClick={() => setShowAddClient(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          )}
        </div>

      {myAgency && !stripeConnected && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Connect Stripe to Receive Payments</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Connect your Stripe account to receive 75% of client payments automatically.
                </p>
                <Button onClick={() => setShowStripeConnect(true)} className="bg-purple-600">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect Stripe
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {myAgency && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalClients}</p>
                    <p className="text-xs text-slate-500">Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{stats.activeAgents}</p>
                    <p className="text-xs text-slate-500">Active Agents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{stats.phoneNumbers}</p>
                    <p className="text-xs text-slate-500">Phone Numbers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">${stats.monthlyRevenue}</p>
                    <p className="text-xs text-slate-500">Monthly Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {agenciesLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Loading Agency Portal...</h2>
            </div>
          </div>
        ) : !myAgency ? (
          <Card className="border-0 shadow-2xl">
            <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome to Agency Portal</h2>
              <p className="text-lg text-slate-600 mb-8">
                Start your white-label AI voice platform with 75% revenue share
              </p>
              <Link to={createPageUrl("AgencySignup")}>
                <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
                  <Building2 className="w-5 h-5 mr-2" />
                  Register as Agency
                </Button>
              </Link>
            </CardContent>
          </Card>
          ) : (
          <Tabs defaultValue="clients" className="space-y-6">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="clients">
                <Users className="w-4 h-4 mr-2" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="branding">
                <Palette className="w-4 h-4 mr-2" />
                White-Label
              </TabsTrigger>
              <TabsTrigger value="revenue">
                <BarChart3 className="w-4 h-4 mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clients" className="space-y-4">
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle>Your Clients</CardTitle>
                  <CardDescription>Manage all client accounts</CardDescription>
                </CardHeader>
              <CardContent className="p-6">
                {clients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No clients yet</h3>
                    <p className="text-slate-500 mb-4">Add your first client to get started</p>
                    <Button onClick={() => setShowAddClient(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Client
                    </Button>
                  </div>
                  ) : (
                    <div className="space-y-3">
                      {clients.map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-5 bg-white border rounded-xl hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{client.name}</p>
                              <p className="text-sm text-slate-500">{client.contact_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={client.status === 'active' ? 'bg-emerald-500' : ''}>
                              {client.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Delete client "${client.name}"? This cannot be undone.`)) {
                                  deleteClientMutation.mutate(client.id);
                                }
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <AgencyBrandingForm agency={myAgency} onUpdate={updateAgencyMutation.mutate} />
          </TabsContent>

          <TabsContent value="revenue">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Revenue Dashboard</CardTitle>
                <CardDescription>Track your earnings (75% of client payments)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <p className="text-sm text-slate-600 mb-1">Total Revenue (This Month)</p>
                  <p className="text-4xl font-bold text-slate-900">${stats.monthlyRevenue}</p>
                  <p className="text-sm text-emerald-600 mt-2">
                    Your share: ${(stats.monthlyRevenue * 0.75).toFixed(2)} (75%)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Agency Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Agency Slug</Label>
                  <Input value={myAgency.slug} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Primary Email</Label>
                  <Input value={myAgency.primary_email} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Badge>{myAgency.status}</Badge>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="font-semibold text-slate-900 mb-4 text-red-600">Danger Zone</h3>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteAgency(true)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Agency Permanently
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">This will delete your agency and all associated data. This cannot be undone.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        )}

        <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                placeholder="Acme Corp"
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email *</Label>
              <Input
                type="email"
                placeholder="contact@acme.com"
                value={newClient.contact_email}
                onChange={(e) => setNewClient({...newClient, contact_email: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClient(false)}>Cancel</Button>
            <Button 
              onClick={() => createClientMutation.mutate({
                ...newClient,
                agency_id: myAgency.id,
                status: 'active'
              })}
              disabled={!newClient.name || !newClient.contact_email}
            >
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStripeConnect} onOpenChange={setShowStripeConnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Stripe Account</DialogTitle>
            <DialogDescription>Receive 75% of client payments automatically</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                  <span>75% revenue share paid instantly</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                  <span>25% platform fee deducted automatically</span>
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStripeConnect(false)}>Cancel</Button>
            <Button onClick={handleStripeConnect} disabled={connectingStripe} className="bg-purple-600">
              {connectingStripe ? "Connecting..." : "Connect with Stripe"}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteAgency} onOpenChange={setShowDeleteAgency}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Agency Permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your agency "{myAgency?.name}" and all associated clients, agents, and data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAgencyMutation.mutate(myAgency.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default AgencyPortal;