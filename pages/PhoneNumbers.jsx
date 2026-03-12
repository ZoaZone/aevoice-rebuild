import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TwilioNumberSelector from "@/components/telephony/TwilioNumberSelector";
import {
  Plus,
  Search,
  Phone,
  MoreHorizontal,
  Bot,
  Settings2,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Globe,
  Link2,
  Copy,
  ExternalLink,
  Key,
  Shield,
  Eye,
  EyeOff,
  Webhook,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PhoneNumbers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    number_e164: "",
    label: "",
    agent_id: "",
    telephony_account_id: "",
    provider: "twilio",
    account_sid: "",
    auth_token: ""
  });
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [editingNumber, setEditingNumber] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [selectedNumberForWebhook, setSelectedNumberForWebhook] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Client.filter({ contact_email: user.email });
    },
    enabled: !!user?.email,
  });

  const currentClient = clients[0];

  const { data: phoneNumbers = [], isLoading } = useQuery({
    queryKey: ['phoneNumbers', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.PhoneNumber.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      return await base44.entities.Agent.filter({ client_id: currentClient.id });
    },
    enabled: !!currentClient?.id,
  });

  const { data: telephonyAccounts = [] } = useQuery({
    queryKey: ['telephonyAccounts'],
    queryFn: () => base44.entities.TelephonyAccount.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PhoneNumber.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
      setIsAddOpen(false);
      setFormData({ number_e164: "", label: "", agent_id: "", telephony_account_id: "", provider: "twilio", account_sid: "", auth_token: "" });
      setShowAuthToken(false);
      toast.success("Phone number added successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PhoneNumber.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PhoneNumber.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
    },
  });

  const getAgentById = (id) => agents.find(a => a.id === id);
  const getClientById = (id) => clients.find(c => c.id === id);
  const getTelephonyAccountById = (id) => telephonyAccounts.find(t => t.id === id);

  const filteredNumbers = phoneNumbers.filter(num => 
    num.number_e164?.includes(searchQuery) || 
    num.label?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentClient?.id) {
      toast.error("Please complete account setup first");
      return;
    }
    const telephonyAccount = telephonyAccounts[0] || { id: 'default' };
    
    createMutation.mutate({
      ...formData,
      client_id: currentClient.id,
      telephony_account_id: formData.telephony_account_id || telephonyAccount.id,
      status: "active",
      webhook_token: Math.random().toString(36).substring(7),
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Phone Numbers</h1>
          <p className="text-slate-500 mt-1">Manage phone numbers and assign them to agents</p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Number
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search phone numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100">
                <Phone className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{phoneNumbers.length}</p>
                <p className="text-xs text-slate-500">Total Numbers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {phoneNumbers.filter(p => p.status === 'active').length}
                </p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {phoneNumbers.filter(p => p.agent_id).length}
                </p>
                <p className="text-xs text-slate-500">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <Globe className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(phoneNumbers.map(p => p.number_e164?.slice(0, 3))).size}
                </p>
                <p className="text-xs text-slate-500">Countries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phone Numbers List */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-lg">All Phone Numbers</CardTitle>
        </CardHeader>
        <div className="divide-y divide-slate-100">
          {filteredNumbers.map((number) => {
            const agent = getAgentById(number.agent_id);
            const client = getClientById(number.client_id);
            const telephony = getTelephonyAccountById(number.telephony_account_id);

            return (
              <div 
                key={number.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className={`p-3 rounded-xl ${
                  number.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  <Phone className={`w-5 h-5 ${
                    number.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-slate-900">
                      {number.number_e164 || number.sip_address}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(number.number_e164 || number.sip_address)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {number.label && (
                      <span className="text-sm text-slate-500">{number.label}</span>
                    )}
                    {client && (
                      <Badge variant="outline" className="text-xs">
                        {client.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-3">
                  {agent ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-700">{agent.name}</span>
                    </div>
                  ) : (
                    <Select
                      value={number.agent_id || "unassigned"}
                      onValueChange={(value) => {
                        updateMutation.mutate({
                          id: number.id,
                          data: { agent_id: value === "unassigned" ? null : value }
                        });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assign agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Badge 
                  variant="secondary"
                  className={`${
                    number.status === 'active' 
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  } border`}
                >
                  {number.status || 'active'}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingNumber(number);
                      setFormData({
                        number_e164: number.number_e164 || "",
                        label: number.label || "",
                        agent_id: number.agent_id || "",
                        telephony_account_id: number.telephony_account_id || "",
                        provider: "twilio",
                        account_sid: "",
                        auth_token: "",
                      });
                      setIsEditOpen(true);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedNumberForWebhook(number);
                      setWebhookDialogOpen(true);
                    }}>
                      <Webhook className="w-4 h-4 mr-2" />
                      View Webhook URL
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => deleteMutation.mutate(number.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
        
        {filteredNumbers.length === 0 && !isLoading && (
          <div className="py-12 px-6">
            <div className="text-center mb-8">
              <Phone className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No phone numbers yet</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Get a phone number from a telephony provider like Twilio, then add it here to connect with your AI agents.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 text-center">Get a Phone Number from These Providers:</h4>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <a 
                  href="https://www.twilio.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 font-bold text-lg">T</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Twilio</p>
                    <p className="text-sm text-slate-500">Most popular choice</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                </a>

                <a 
                  href="https://www.vonage.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-lg">V</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Vonage (Nexmo)</p>
                    <p className="text-sm text-slate-500">Enterprise grade</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-500" />
                </a>

                <a 
                  href="https://www.plivo.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">P</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Plivo</p>
                    <p className="text-sm text-slate-500">Cost effective</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                </a>

                <a 
                  href="https://www.sinch.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-green-300 hover:bg-green-50/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold text-lg">S</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Sinch</p>
                    <p className="text-sm text-slate-500">Global coverage</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-green-500" />
                </a>
              </div>

              {/* India Providers */}
              <h4 className="text-sm font-semibold text-slate-700 mb-4 mt-6 text-center">India-Based Providers:</h4>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <a href="https://www.airtel.in/business/airtel-iq" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 font-bold">A</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Airtel IQ</p>
                    <p className="text-xs text-slate-500">Enterprise cloud</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                </a>

                <a href="https://www.tatatelebusiness.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-bold">T</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Tata Tele</p>
                    <p className="text-xs text-slate-500">Business solutions</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </a>
              </div>
              
              <p className="text-xs text-slate-500 text-center mb-4">
                Any voice API number from these or other providers can be added to AEVOICE.
              </p>

              <div className="space-y-6">
                <TwilioNumberSelector 
                  clientId={currentClient?.id} 
                  onNumberSelected={() => {
                    queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
                    toast.success("Number purchased and configured!");
                  }}
                />

                <div className="text-center">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs text-slate-400">OR</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Already have a number from your provider?</p>
                  <Button onClick={() => setIsAddOpen(true)} className="bg-[#0e4166] hover:bg-[#0a2540]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Existing Number
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Number Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
            <DialogDescription>
              Update the phone number settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Phone Number</Label>
              <Input
                value={formData.number_e164}
                onChange={(e) => setFormData({ ...formData, number_e164: e.target.value })}
                placeholder="+15551234567"
              />
            </div>
            <div className="grid gap-2">
              <Label>Label</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Main Line, Support, etc."
              />
            </div>
            <div className="grid gap-2">
              <Label>Assign to Agent</Label>
              <Select 
                value={formData.agent_id || "none"} 
                onValueChange={(v) => setFormData({ ...formData, agent_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No agent</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                updateMutation.mutate({
                  id: editingNumber.id,
                  data: {
                    number_e164: formData.number_e164,
                    label: formData.label,
                    agent_id: formData.agent_id || null
                  }
                });
                setIsEditOpen(false);
                setEditingNumber(null);
              }}
              disabled={updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook URL Dialog */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-indigo-600" />
              Webhook URL for Twilio
            </DialogTitle>
            <DialogDescription>
              Copy this URL and paste it in your Twilio Console under Phone Number → Voice Configuration → "A call comes in"
            </DialogDescription>
          </DialogHeader>
          {selectedNumberForWebhook && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border">
                <Label className="text-xs text-slate-500 mb-2 block">Phone Number</Label>
                <p className="font-mono font-medium text-slate-900">{selectedNumberForWebhook.number_e164}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Webhook URL (Copy this)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`https://aevoice.base44.app/api/apps/692b24a5bac54e3067972063/functions/twilioWebhook?token=${selectedNumberForWebhook.webhook_token || selectedNumberForWebhook.id}`}
                    className="font-mono text-sm bg-emerald-50 border-emerald-200"
                  />
                  <Button
                    onClick={() => {
                      const webhookUrl = `https://aevoice.base44.app/api/apps/692b24a5bac54e3067972063/functions/twilioWebhook?token=${selectedNumberForWebhook.webhook_token || selectedNumberForWebhook.id}`;
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success("Webhook URL copied!");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">Important: Configure in Your Telephony Provider</p>

                    <div className="mt-3 space-y-3">
                      <details className="group">
                        <summary className="font-medium text-amber-800 cursor-pointer hover:text-amber-900">Twilio Setup</summary>
                        <ol className="text-amber-700 space-y-1 list-decimal list-inside mt-2 ml-2">
                          <li>Go to <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" target="_blank" rel="noopener noreferrer" className="underline font-medium">Twilio Console → Phone Numbers</a></li>
                          <li>Click on your phone number</li>
                          <li>Under "Voice Configuration" → "A call comes in"</li>
                          <li>Select "Webhook" and paste the URL above</li>
                          <li>Set HTTP method to "HTTP POST"</li>
                          <li>Click "Save configuration"</li>
                        </ol>
                      </details>

                      <details className="group">
                        <summary className="font-medium text-amber-800 cursor-pointer hover:text-amber-900">Vonage (Nexmo) Setup</summary>
                        <ol className="text-amber-700 space-y-1 list-decimal list-inside mt-2 ml-2">
                          <li>Go to <a href="https://dashboard.nexmo.com/applications" target="_blank" rel="noopener noreferrer" className="underline font-medium">Vonage Dashboard → Applications</a></li>
                          <li>Create or edit your Voice application</li>
                          <li>Set "Answer URL" to the webhook URL above</li>
                          <li>Set HTTP method to "POST"</li>
                          <li>Link your phone number to this application</li>
                        </ol>
                      </details>

                      <details className="group">
                        <summary className="font-medium text-amber-800 cursor-pointer hover:text-amber-900">Plivo Setup</summary>
                        <ol className="text-amber-700 space-y-1 list-decimal list-inside mt-2 ml-2">
                          <li>Go to <a href="https://console.plivo.com/phone-numbers/active-numbers/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Plivo Console → Phone Numbers</a></li>
                          <li>Click on your phone number</li>
                          <li>Under "Voice" section, set "Answer URL"</li>
                          <li>Paste the webhook URL above</li>
                          <li>Set method to "POST" and save</li>
                        </ol>
                      </details>

                      <details className="group">
                        <summary className="font-medium text-amber-800 cursor-pointer hover:text-amber-900">Sinch Setup</summary>
                        <ol className="text-amber-700 space-y-1 list-decimal list-inside mt-2 ml-2">
                          <li>Go to <a href="https://dashboard.sinch.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Sinch Dashboard</a></li>
                          <li>Navigate to Voice → Apps</li>
                          <li>Create or edit your Voice app</li>
                          <li>Set the Callback URL to the webhook URL above</li>
                          <li>Assign your phone number to this app</li>
                        </ol>
                      </details>

                      <details className="group">
                        <summary className="font-medium text-amber-800 cursor-pointer hover:text-amber-900">Other Providers</summary>
                        <p className="text-amber-700 mt-2 ml-2">
                          For other providers (BSNL Wings, Tata Tele, Airtel IQ, etc.), look for "Voice Webhook", "Answer URL", or "Incoming Call URL" settings in your provider's dashboard and paste the webhook URL above.
                        </p>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookDialogOpen(false)}>
              Close
            </Button>
            <a 
              href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="bg-[#0e4166] hover:bg-[#0a2540]">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Twilio Console
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Number Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Phone Number</DialogTitle>
            <DialogDescription>
              Connect a phone number from your telephony provider to an AI agent
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Telephony Provider */}
              <div className="grid gap-2">
                <Label>Telephony Provider *</Label>
                <Select 
                  value={formData.provider} 
                  onValueChange={(v) => setFormData({ ...formData, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
                    <SelectItem value="plivo">Plivo</SelectItem>
                    <SelectItem value="sinch">Sinch</SelectItem>
                    <SelectItem value="tata_tele">Tata Tele (India)</SelectItem>
                    <SelectItem value="airtel_iq">Airtel IQ (India)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* API Credentials Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Key className="w-4 h-4 text-slate-500" />
                  API Credentials
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="account_sid">
                    {formData.provider === 'twilio' ? 'Account SID' : 
                     formData.provider === 'vonage' ? 'API Key' : 
                     formData.provider === 'plivo' ? 'Auth ID' : 
                     formData.provider === 'tata_tele' ? 'Account ID' :
                     formData.provider === 'airtel_iq' ? 'App ID' :
                     'API Key / Account ID'} *
                  </Label>
                  <Input
                    id="account_sid"
                    placeholder={
                      formData.provider === 'twilio' ? 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 
                      'Enter your API key / Account ID'
                    }
                    value={formData.account_sid}
                    onChange={(e) => setFormData({ ...formData, account_sid: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="auth_token">
                    {formData.provider === 'twilio' ? 'Auth Token' : 
                     formData.provider === 'vonage' ? 'API Secret' : 
                     formData.provider === 'plivo' ? 'Auth Token' : 
                     formData.provider === 'tata_tele' ? 'Auth Token' :
                     formData.provider === 'airtel_iq' ? 'App Secret' :
                     'API Secret / Auth Token'} *
                  </Label>
                  <div className="relative">
                    <Input
                      id="auth_token"
                      type={showAuthToken ? "text" : "password"}
                      placeholder="Enter your secret token"
                      value={formData.auth_token}
                      onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Credentials are encrypted and stored securely. We only use them to connect calls to your AI agent.</span>
                </div>
              </div>

              {/* Phone Number */}
              <div className="grid gap-2">
                <Label htmlFor="number">Phone Number (E.164 format) *</Label>
                <Input
                  id="number"
                  placeholder="+15551234567"
                  value={formData.number_e164}
                  onChange={(e) => setFormData({ ...formData, number_e164: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500">
                  Include country code, e.g., +1 for US
                </p>
              </div>

              {/* Label */}
              <div className="grid gap-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="Main Line, Support, etc."
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>

              {/* Assign Agent */}
              <div className="grid gap-2">
                <Label>Assign to Agent</Label>
                <Select 
                  value={formData.agent_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, agent_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No agent (configure later)</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !formData.account_sid || !formData.auth_token}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createMutation.isPending ? "Adding..." : "Add Number"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}