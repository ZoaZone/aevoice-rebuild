import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  UserPlus,
  Building2,
  Bot,
  Phone,
  Loader2,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function QuickUserSetup({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const [formData, setFormData] = useState({
    // Basic Info
    email: "",
    full_name: "",
    business_name: "",
    account_type: "business",
    category: "General",
    credits: 50,
    
    // Agent Config
    create_agent: true,
    agent_name: "",
    agent_type: "receptionist",
    system_prompt: "",
    greeting_message: "",
    
    // Phone Config
    phone_number: "",
    sip_config: {
      provider: "bsnl_wings",
      sip_host: "",
      sip_port: 5060,
      sip_username: "",
      sip_password: "",
      sip_transport: "udp",
      sip_outbound_proxy: "",
      display_name: "",
      label: "Main Line"
    }
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.business_name) {
      toast.error("Email and business name are required");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        email: formData.email,
        full_name: formData.full_name,
        business_name: formData.business_name,
        account_type: formData.account_type,
        category: formData.category,
        credits: formData.credits,
        create_agent: formData.create_agent,
        agent_name: formData.agent_name || `${formData.business_name} Assistant`,
        agent_type: formData.agent_type,
        system_prompt: formData.system_prompt,
        greeting_message: formData.greeting_message
      };

      // Add SIP config if phone number provided
      if (formData.phone_number && formData.sip_config.sip_host) {
        payload.phone_number = formData.phone_number;
        payload.sip_config = formData.sip_config;
      }

      const res = await base44.functions.invoke("adminCreateUser", payload);

      if (res.data?.success) {
        setResult(res.data);
        toast.success("User account created successfully!");
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
      } else {
        toast.error(res.data?.error || "Failed to create user");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred");
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      full_name: "",
      business_name: "",
      account_type: "business",
      category: "General",
      credits: 50,
      create_agent: true,
      agent_name: "",
      agent_type: "receptionist",
      system_prompt: "",
      greeting_message: "",
      phone_number: "",
      sip_config: {
        provider: "bsnl_wings",
        sip_host: "",
        sip_port: 5060,
        sip_username: "",
        sip_password: "",
        sip_transport: "udp",
        sip_outbound_proxy: "",
        display_name: "",
        label: "Main Line"
      }
    });
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Quick User Setup
          </DialogTitle>
          <DialogDescription>
            Create a fully configured user account with agent, phone number, and credits in one step
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Account Created Successfully!</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Client ID</p>
                  <p className="font-mono text-xs">{result.data?.client_id}</p>
                </div>
                <div>
                  <p className="text-slate-500">Agent ID</p>
                  <p className="font-mono text-xs">{result.data?.agent_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Credits</p>
                  <p className="font-semibold">{result.data?.credits_allocated} minutes</p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-mono text-xs">{result.data?.phone_number_id || "Not configured"}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 whitespace-pre-line">{result.instructions}</p>
            </div>

            <Button 
              onClick={() => { resetForm(); }}
              className="w-full"
            >
              Create Another User
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="basic">
                <Building2 className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="agent">
                <Bot className="w-4 h-4 mr-2" />
                AI Agent
              </TabsTrigger>
              <TabsTrigger value="phone">
                <Phone className="w-4 h-4 mr-2" />
                Phone/SIP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input
                  placeholder="Acme Corporation"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select 
                    value={formData.account_type} 
                    onValueChange={(v) => setFormData({ ...formData, account_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_partner">Free Partner</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="paid_subscription">Paid Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    placeholder="Healthcare"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credits (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agent" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">Create AI Agent</p>
                  <p className="text-sm text-slate-500">Automatically create a voice agent</p>
                </div>
                <Switch
                  checked={formData.create_agent}
                  onCheckedChange={(v) => setFormData({ ...formData, create_agent: v })}
                />
              </div>

              {formData.create_agent && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Agent Name</Label>
                      <Input
                        placeholder="Auto-generated from business name"
                        value={formData.agent_name}
                        onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agent Type</Label>
                      <Select 
                        value={formData.agent_type} 
                        onValueChange={(v) => setFormData({ ...formData, agent_type: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receptionist">Receptionist</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="appointment">Appointment</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Custom System Prompt (Optional)</Label>
                    <Textarea
                      placeholder="Leave empty for auto-generated prompt based on business name"
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Greeting (Optional)</Label>
                    <Input
                      placeholder="Leave empty for auto-generated greeting"
                      value={formData.greeting_message}
                      onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="phone" className="space-y-4 mt-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Optional:</strong> Configure SIP/phone details to enable voice calls. 
                  You can also add this later from Phone Numbers page.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Phone Number (E.164 format)</Label>
                <Input
                  placeholder=""
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
              </div>

              {formData.phone_number && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SIP Provider</Label>
                      <Select 
                        value={formData.sip_config.provider} 
                        onValueChange={(v) => setFormData({ 
                          ...formData, 
                          sip_config: { ...formData.sip_config, provider: v }
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bsnl_wings">BSNL Wings</SelectItem>
                          <SelectItem value="twilio">Twilio</SelectItem>
                          <SelectItem value="asterisk">Asterisk</SelectItem>
                          <SelectItem value="custom">Custom SIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        placeholder="Main Office"
                        value={formData.sip_config.display_name}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          sip_config: { ...formData.sip_config, display_name: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SIP Host *</Label>
                      <Input
                        placeholder=""
                        value={formData.sip_config.sip_host}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          sip_config: { ...formData.sip_config, sip_host: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SIP Port</Label>
                      <Input
                        type="number"
                        placeholder=""
                        value={formData.sip_config.sip_port}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          sip_config: { ...formData.sip_config, sip_port: parseInt(e.target.value) || 5060 }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SIP Username *</Label>
                      <Input
                        placeholder=""
                        value={formData.sip_config.sip_username}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          sip_config: { ...formData.sip_config, sip_username: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SIP Password</Label>
                      <Input
                        type="password"
                        placeholder="Enter SIP password"
                        value={formData.sip_config.sip_password}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          sip_config: { ...formData.sip_config, sip_password: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Outbound Proxy (Optional)</Label>
                    <Input
                      placeholder=""
                      value={formData.sip_config.sip_outbound_proxy}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        sip_config: { ...formData.sip_config, sip_outbound_proxy: e.target.value }
                      })}
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!result && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !formData.email || !formData.business_name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User Account
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}