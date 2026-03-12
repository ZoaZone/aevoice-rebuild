import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  Users,
  Building2,
  Phone,
  Bot,
  DollarSign,
  TrendingUp,
  Settings,
  ShieldCheck,
  Youtube,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  Bell,
  FileText,
  Activity,
  Clock,
  Gift,
  CreditCard,
  Search,
  UserPlus,
  Copy,
  Zap,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [showAddLink, setShowAddLink] = useState(false);
  const [showCreditAllocation, setShowCreditAllocation] = useState(false);
  const [showFreeTrial, setShowFreeTrial] = useState(false);
  const [showCreateFreeUser, setShowCreateFreeUser] = useState(false);
  const [showCreateFreeAgency, setShowCreateFreeAgency] = useState(false);
  const [creatingPartnerAgent, setCreatingPartnerAgent] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [freeTrialCredits, setFreeTrialCredits] = useState(5);
  const [freeUserData, setFreeUserData] = useState({
    email: "",
    full_name: "",
    account_type: "user"
  });
  const [freeAgencyData, setFreeAgencyData] = useState({
    agency_name: "",
    primary_email: "",
    slug: ""
  });
  const [linkData, setLinkData] = useState({
    title: "",
    url: "",
    category: "tutorial",
    description: ""
  });

  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => base44.entities.Agency.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ['phoneNumbers'],
    queryFn: () => base44.entities.PhoneNumber.list(),
  });

  const { data: helpArticles = [] } = useQuery({
    queryKey: ['helpArticles'],
    queryFn: () => base44.entities.HelpArticle.list(),
  });

  const { data: affiliates = [] } = useQuery({
    queryKey: ['affiliates'],
    queryFn: () => base44.entities.Affiliate.list(),
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && user.role === 'admin',
  });

  const createArticleMutation = useMutation({
    mutationFn: (data) => base44.entities.HelpArticle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpArticles'] });
      setShowAddLink(false);
      setLinkData({ title: "", url: "", category: "tutorial", description: "" });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id) => base44.entities.HelpArticle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpArticles'] });
    },
  });

  const updateWalletMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Wallet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setShowCreditAllocation(false);
      setShowFreeTrial(false);
      setSelectedUser(null);
    },
  });

  const createWalletMutation = useMutation({
    mutationFn: (data) => base44.entities.Wallet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setShowCreditAllocation(false);
      setShowFreeTrial(false);
      setSelectedUser(null);
    },
  });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success("Agency updated successfully");
    },
  });

  const updateAffiliateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Affiliate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      toast.success("Affiliate updated successfully");
    },
  });

  const createFreeUserMutation = useMutation({
    mutationFn: async (data) => {
      // Create client and wallet with 5 free test credits
      const client = await base44.asServiceRole.entities.Client.create({
        agency_id: "platform",
        name: data.full_name || "Free User",
        slug: `free-user-${Date.now()}`,
        industry: "other",
        contact_email: data.email,
        status: "active"
      });

      await base44.asServiceRole.entities.Wallet.create({
        owner_type: "client",
        owner_id: client.id,
        credits_balance: 5,
        currency: "USD"
      });

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setShowCreateFreeUser(false);
      setFreeUserData({ email: "", full_name: "", account_type: "user" });
      toast.success("Free user created with 5 test credits");
    },
  });

  const createFreeAgencyMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.functions.invoke('createFreeAgency', data);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      setShowCreateFreeAgency(false);
      setFreeAgencyData({ agency_name: "", primary_email: "", slug: "" });
      toast.success(`Free agency created: ${data.agency.name}`);
    },
  });

  const handleAddLink = () => {
    createArticleMutation.mutate({
      title: linkData.title,
      slug: linkData.title.toLowerCase().replace(/\s+/g, '-'),
      category: linkData.category === "tutorial" ? "getting_started" : "troubleshooting",
      content: linkData.description,
      summary: linkData.description,
      video_url: linkData.url,
      is_featured: true
    });
  };

  const handleAllocateCredits = async () => {
    if (!selectedUser) return;
    
    // Find existing wallet for this user's client
    const userClient = clients.find(c => c.contact_email === selectedUser.email);
    const existingWallet = wallets.find(w => w.owner_id === userClient?.id);
    
    if (existingWallet) {
      await updateWalletMutation.mutateAsync({
        id: existingWallet.id,
        data: { credits_balance: (existingWallet.credits_balance || 0) + creditAmount }
      });
    } else if (userClient) {
      await createWalletMutation.mutateAsync({
        owner_type: "client",
        owner_id: userClient.id,
        credits_balance: creditAmount,
        currency: "USD"
      });
    }
  };

  const handleGrantFreeTrial = async () => {
    if (!selectedUser) return;
    
    // Find or create client for user
    let userClient = clients.find(c => c.contact_email === selectedUser.email);
    
    if (!userClient) {
      userClient = await base44.asServiceRole.entities.Client.create({
        agency_id: "default",
        name: selectedUser.full_name || "Trial User",
        slug: `trial-${Date.now()}`,
        industry: "other",
        contact_email: selectedUser.email,
        status: "active"
      });
    }
    
    const existingWallet = wallets.find(w => w.owner_id === userClient.id);
    
    if (existingWallet) {
      await updateWalletMutation.mutateAsync({
        id: existingWallet.id,
        data: { credits_balance: (existingWallet.credits_balance || 0) + freeTrialCredits }
      });
    } else {
      await createWalletMutation.mutateAsync({
        owner_type: "client",
        owner_id: userClient.id,
        credits_balance: freeTrialCredits,
        currency: "USD"
      });
    }
    toast.success(`Granted ${freeTrialCredits} test credits to ${selectedUser.full_name}`);
  };

  const handleCreateFreeUser = async () => {
    if (!freeUserData.email) {
      toast.error("Email is required");
      return;
    }
    await createFreeUserMutation.mutateAsync(freeUserData);
  };

  const handleApproveAgency = async (agency) => {
    await updateAgencyMutation.mutateAsync({
      id: agency.id,
      data: { status: "active" }
    });
  };

  const handleApproveAffiliate = async (affiliate) => {
    await updateAffiliateMutation.mutateAsync({
      id: affiliate.id,
      data: { status: "active" }
    });
  };

  const filteredUsers = allUsers.filter(u => 
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchUser.toLowerCase())
  );

  // Stats
  const stats = [
    { label: "Total Agencies", value: agencies.length, icon: Building2, color: "text-blue-600 bg-blue-100" },
    { label: "Total Clients", value: clients.length, icon: Users, color: "text-purple-600 bg-purple-100" },
    { label: "Active Agents", value: agents.filter(a => a.status === 'active').length, icon: Bot, color: "text-emerald-600 bg-emerald-100" },
    { label: "Phone Numbers", value: phoneNumbers.length, icon: Phone, color: "text-amber-600 bg-amber-100" },
    { label: "Affiliates", value: affiliates.length, icon: TrendingUp, color: "text-pink-600 bg-pink-100" },
  ];

  // Filter YouTube/tutorial links
  const tutorialLinks = helpArticles.filter(a => a.video_url);

  // Loading state
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Access Required</h2>
            <p className="text-slate-500">You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Platform overview and management</p>
        </div>
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl", stat.color)}>
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

      {/* Promotional Links (Admin Only) */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            Promotional Signup Links
          </CardTitle>
          <CardDescription>
            Zero subscription plans for members & partners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">HelloBiz.app Members</span>
              <Badge className="bg-emerald-100 text-emerald-700">FREE Lifetime</Badge>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}${createPageUrl('PromoSignup')}?type=hellobiz`}
                className="text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${createPageUrl('PromoSignup')}?type=hellobiz`);
                  toast.success("Link copied!");
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Promotional Partners</span>
              <Badge className="bg-purple-100 text-purple-700">Selected Only</Badge>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}${createPageUrl('PromoSignup')}?type=promotional`}
                className="text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${createPageUrl('PromoSignup')}?type=promotional`);
                  toast.success("Link copied!");
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            These links provide instant approval with $0 subscription (users only pay for credits)
          </p>
        </CardContent>
      </Card>

      {/* Admin Action Cards */}
      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <h3 className="font-bold text-base mb-2 flex items-center gap-2">
              <Gift className="w-5 h-5" />
              FREE Partner Agents
            </h3>
            <p className="text-purple-100 text-xs mb-3">No payment required</p>
            <div className="space-y-1.5">
              {[
                { id: 'workautomation', name: 'WorkAutomation' },
                { id: 'vetnpet', name: 'VetNPet' },
                { id: 'animalwelfare', name: 'Animal Welfare' }
              ].map((partner) => (
                <Button
                  key={partner.id}
                  onClick={async () => {
                    setCreatingPartnerAgent(true);
                    try {
                      const result = await base44.functions.invoke('createFreePartnerAgent', { partner_id: partner.id });
                      toast.success(result.data.message);
                    } catch (error) {
                      toast.error('Error: ' + error.message);
                    } finally {
                      setCreatingPartnerAgent(false);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={creatingPartnerAgent}
                  className="w-full text-xs bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  {creatingPartnerAgent ? <Loader2 className="w-3 h-3 animate-spin" /> : partner.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Allocate Credits</h3>
                <p className="text-emerald-100 text-sm">
                  Add credits to user accounts
                </p>
              </div>
              <Button 
                onClick={() => setShowCreditAllocation(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Allocate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Free Trial Access</h3>
                <p className="text-purple-100 text-sm">
                  Grant test credits (5 min default)
                </p>
              </div>
              <Button 
                onClick={() => setShowFreeTrial(true)}
                className="bg-white text-purple-700 hover:bg-purple-50"
              >
                <Gift className="w-4 h-4 mr-2" />
                Grant Trial
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Limited Free User</h3>
                <p className="text-blue-100 text-sm">
                  New user with 5 test credits
                </p>
              </div>
              <Button 
                onClick={() => setShowCreateFreeUser(true)}
                className="bg-white text-blue-700 hover:bg-blue-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Unlimited User
                </h3>
                <p className="text-emerald-100 text-sm">
                  Full access, no limits
                </p>
              </div>
              <Button 
                onClick={async () => {
                  const email = prompt("Enter user email:");
                  const name = prompt("Enter user name:");
                  if (email && name) {
                    try {
                      const result = await base44.functions.invoke('createUnlimitedUser', { email, full_name: name });
                      if (result.data.success) {
                        toast.success("Unlimited user created!");
                        queryClient.invalidateQueries({ queryKey: ['clients'] });
                      } else {
                        toast.error(result.data.error || "Failed");
                      }
                    } catch (error) {
                      toast.error("Error: " + error.message);
                    }
                  }
                }}
                className="bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <Zap className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Free Agency (HelloBiz)
                </h3>
                <p className="text-cyan-100 text-sm">
                  Lifetime white-label access
                </p>
              </div>
              <Button 
                onClick={() => setShowCreateFreeAgency(true)}
                className="bg-white text-cyan-700 hover:bg-cyan-50"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="agencies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tutorials">
            <Youtube className="w-4 h-4 mr-2" />
            Tutorials & Links
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users & Credits
          </TabsTrigger>
          <TabsTrigger value="agencies">
            <Building2 className="w-4 h-4 mr-2" />
            Agencies
          </TabsTrigger>
          <TabsTrigger value="affiliates">
            <TrendingUp className="w-4 h-4 mr-2" />
            Affiliates
          </TabsTrigger>
          <TabsTrigger value="notices">
            <Bell className="w-4 h-4 mr-2" />
            Notices
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

        {/* Tutorials Tab */}
        <TabsContent value="tutorials">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>YouTube Tutorials & Useful Links</CardTitle>
                  <CardDescription>
                    Manage tutorial videos and helpful resources for users
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddLink(true)} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {tutorialLinks.length > 0 ? (
                <div className="space-y-3">
                  {tutorialLinks.map((link) => (
                    <div 
                      key={link.id}
                      className="flex items-center justify-between p-4 border rounded-xl hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                          <Youtube className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{link.title}</h3>
                          <p className="text-sm text-slate-500">{link.summary || link.content}</p>
                          <a 
                            href={link.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            {link.video_url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {link.category?.replace('_', ' ')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteArticleMutation.mutate(link.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Youtube className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No tutorials yet</h3>
                  <p className="text-slate-500 mb-4">Add YouTube links and helpful resources for users</p>
                  <Button onClick={() => setShowAddLink(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>User Credit Management</CardTitle>
              <CardDescription>
                View and manage user credits and subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allUsers.slice(0, 10).map((u) => {
                  const userClient = clients.find(c => c.contact_email === u.email);
                  const userWallet = wallets.find(w => w.owner_id === userClient?.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-4 border rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{u.full_name || "No Name"}</p>
                        <p className="text-sm text-slate-500">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">
                            {userWallet?.credits_balance?.toFixed(0) || 0}
                          </p>
                          <p className="text-xs text-slate-500">credits</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(u);
                            setShowCreditAllocation(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {allUsers.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agencies Tab */}
        <TabsContent value="agencies">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>White-Label Agencies</CardTitle>
                  <CardDescription>
                    Manage agency registrations and access
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <a href={createPageUrl("AgencyPortal")} target="_blank">
                    <Button variant="outline" className="border-purple-600 text-purple-700 hover:bg-purple-50">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Portal
                    </Button>
                  </a>
                  <a href={createPageUrl("AgencySignup")} target="_blank">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Building2 className="w-4 h-4 mr-2" />
                      Agency Signup Link
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agencies.map((agency) => (
                  <div key={agency.id} className="flex items-center justify-between p-4 border rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{agency.name}</p>
                      <p className="text-sm text-slate-500">{agency.primary_email}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Created: {format(new Date(agency.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={agency.status === 'active' ? 'default' : 'secondary'}>
                        {agency.status}
                      </Badge>
                      {agency.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveAgency(agency)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={updateAgencyMutation.isPending}
                        >
                          Approve
                        </Button>
                      )}
                      <a href={createPageUrl("AgencyPortal") + "?agency=" + agency.slug} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Portal
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
                {agencies.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No agencies registered yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Affiliate Partners</CardTitle>
                  <CardDescription>
                    Manage affiliate applications and access
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <a href={createPageUrl("AffiliatePortal")} target="_blank">
                    <Button variant="outline" className="border-pink-600 text-pink-700 hover:bg-pink-50">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Portal
                    </Button>
                  </a>
                  <a href={createPageUrl("AffiliatePortal")} target="_blank">
                    <Button className="bg-pink-600 hover:bg-pink-700">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Affiliate Signup Link
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {affiliates.map((affiliate) => (
                  <div key={affiliate.id} className="flex items-center justify-between p-4 border rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{affiliate.full_name}</p>
                      <p className="text-sm text-slate-500">{affiliate.user_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {affiliate.referral_code}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {affiliate.total_referrals || 0} referrals • ${(affiliate.total_earnings || 0).toFixed(2)} earned
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        affiliate.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                        affiliate.status === 'pending' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {affiliate.status}
                      </Badge>
                      {affiliate.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveAffiliate(affiliate)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={updateAffiliateMutation.isPending}
                        >
                          Approve
                        </Button>
                      )}
                      <a href={createPageUrl("AffiliatePortal")} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Portal
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
                {affiliates.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No affiliates registered yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notices Tab */}
        <TabsContent value="notices">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Platform Notices</CardTitle>
              <CardDescription>
                Manage announcements and notifications for users
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <p className="text-slate-500">Notice management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI Agents Management</CardTitle>
                  <Badge className="bg-blue-100 text-blue-700">{agents.length} Total</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {agents.slice(0, 10).map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-indigo-300 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{agent.name}</p>
                        <p className="text-sm text-slate-500 capitalize">{agent.agent_type || 'general'} • {agent.language || 'en-US'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                        <a href={createPageUrl("AgentBuilder") + "?edit=" + agent.id} target="_blank">
                          <Button size="sm" variant="outline">
                            <Settings className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 && (
                    <p className="text-center text-slate-500 py-8">No agents created yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Recent Affiliates</CardTitle>
              </CardHeader>
              <CardContent>
                {affiliates.slice(0, 5).map((affiliate) => (
                  <div key={affiliate.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-slate-900">{affiliate.full_name}</p>
                      <p className="text-sm text-slate-500">Code: {affiliate.referral_code}</p>
                    </div>
                    <Badge className={cn(
                      affiliate.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {affiliate.status}
                    </Badge>
                  </div>
                ))}
                {affiliates.length === 0 && (
                  <p className="text-center text-slate-500 py-4">No affiliates yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Credit Allocation Dialog */}
      <Dialog open={showCreditAllocation} onOpenChange={setShowCreditAllocation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Allocate Credits
            </DialogTitle>
            <DialogDescription>
              Add credits to a user account without payment (for internal use)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedUser ? (
              <>
                <div className="space-y-2">
                  <Label>Search User</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by email or name..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredUsers.slice(0, 5).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="w-full p-3 text-left border rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                    >
                      <p className="font-medium">{u.full_name || "No Name"}</p>
                      <p className="text-sm text-slate-500">{u.email}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Credits to Add</Label>
                  <Input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    min={1}
                  />
                  <p className="text-xs text-slate-500">1 credit = 1 minute of voice calls</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreditAllocation(false); setSelectedUser(null); }}>
              Cancel
            </Button>
            {selectedUser && (
              <Button 
                onClick={handleAllocateCredits}
                disabled={updateWalletMutation.isPending || createWalletMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {updateWalletMutation.isPending || createWalletMutation.isPending ? "Adding..." : `Add ${creditAmount} Credits`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Free Trial Dialog */}
      <Dialog open={showFreeTrial} onOpenChange={setShowFreeTrial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Grant Free Trial
            </DialogTitle>
            <DialogDescription>
              Give selected users free credits to test the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedUser ? (
              <>
                <div className="space-y-2">
                  <Label>Search User</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by email or name..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredUsers.slice(0, 5).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="w-full p-3 text-left border rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                    >
                      <p className="font-medium">{u.full_name || "No Name"}</p>
                      <p className="text-sm text-slate-500">{u.email}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Free Trial Credits</Label>
                  <Input
                    type="number"
                    value={freeTrialCredits}
                    onChange={(e) => setFreeTrialCredits(Number(e.target.value))}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-slate-500">Default: 5 credits (5 minutes). Max: 100 credits.</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFreeTrial(false); setSelectedUser(null); }}>
              Cancel
            </Button>
            {selectedUser && (
              <Button 
                onClick={handleGrantFreeTrial}
                disabled={updateWalletMutation.isPending || createWalletMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {updateWalletMutation.isPending || createWalletMutation.isPending ? "Granting..." : `Grant ${freeTrialCredits} Free Credits`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Free User Dialog */}
      <Dialog open={showCreateFreeUser} onOpenChange={setShowCreateFreeUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Create Free User Account
            </DialogTitle>
            <DialogDescription>
              Create a new user with 5 free test credits automatically
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                User will receive 5 test credits (5 minutes) automatically
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={freeUserData.email}
                onChange={(e) => setFreeUserData({ ...freeUserData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={freeUserData.full_name}
                onChange={(e) => setFreeUserData({ ...freeUserData, full_name: e.target.value })}
              />
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">
                The user will be created with a client account and 5 test credits. 
                They can login using the email address provided.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFreeUser(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFreeUser}
              disabled={!freeUserData.email || createFreeUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createFreeUserMutation.isPending ? "Creating..." : "Create Free User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Free Agency Dialog */}
      <Dialog open={showCreateFreeAgency} onOpenChange={setShowCreateFreeAgency}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-600" />
              Create Free Agency (HelloBiz)
            </DialogTitle>
            <DialogDescription>
              Create a lifetime free white-label agency for testing and HelloBiz integration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
              <p className="text-sm text-cyan-700 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                This agency will have full white-label access with no Stripe connection required
              </p>
            </div>
            <div className="space-y-2">
              <Label>Agency Name *</Label>
              <Input
                placeholder="e.g., HelloBiz Voice Services"
                value={freeAgencyData.agency_name}
                onChange={(e) => setFreeAgencyData({ ...freeAgencyData, agency_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Email *</Label>
              <Input
                type="email"
                placeholder="admin@hellobiz.app"
                value={freeAgencyData.primary_email}
                onChange={(e) => setFreeAgencyData({ ...freeAgencyData, primary_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Agency Slug (URL-friendly)</Label>
              <Input
                placeholder="hellobiz-voice"
                value={freeAgencyData.slug}
                onChange={(e) => setFreeAgencyData({ ...freeAgencyData, slug: e.target.value })}
              />
              <p className="text-xs text-slate-500">Will be auto-generated from name if left empty</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">
                This agency can manage unlimited clients and will never require Stripe connection. 
                Perfect for testing white-label features and HelloBiz integration.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFreeAgency(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createFreeAgencyMutation.mutate(freeAgencyData)}
              disabled={!freeAgencyData.agency_name || !freeAgencyData.primary_email || createFreeAgencyMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {createFreeAgencyMutation.isPending ? "Creating..." : "Create Free Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={showAddLink} onOpenChange={setShowAddLink}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-600" />
              Add Tutorial / Link
            </DialogTitle>
            <DialogDescription>
              Add a YouTube video or useful resource link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., How to Create Your First Agent"
                value={linkData.title}
                onChange={(e) => setLinkData({ ...linkData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={linkData.url}
                onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={linkData.category} 
                onValueChange={(v) => setLinkData({ ...linkData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="resource">Resource</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the content..."
                value={linkData.description}
                onChange={(e) => setLinkData({ ...linkData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLink(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddLink}
              disabled={!linkData.title || !linkData.url || createArticleMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {createArticleMutation.isPending ? "Adding..." : "Add Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}