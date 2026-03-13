import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Phone, Mail, Building2, Edit, Save, Clock,
  MessageSquare, PhoneIncoming, PhoneOutgoing, Globe, Smartphone, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const stageColors = {
  lead: "bg-blue-100 text-blue-700",
  qualified: "bg-amber-100 text-amber-700",
  customer: "bg-green-100 text-green-700",
  churned: "bg-red-100 text-red-700",
};

const channelIcons = {
  voice: Phone,
  sms: Smartphone,
  web_chat: Globe,
  whatsapp: MessageSquare,
  email: Mail,
};

const sentimentColors = {
  positive: "bg-green-100 text-green-700",
  neutral: "bg-slate-100 text-slate-700",
  negative: "bg-red-100 text-red-700",
};

export default function CustomerProfile({ customerId, onBack }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const results = await base44.entities.Customer.filter({ id: customerId });
      return results?.[0] || null;
    },
    enabled: !!customerId,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["customerInteractions", customerId, customer?.phone],
    queryFn: async () => {
      if (!customer) return [];
      const results = [];
      const seenIds = new Set();

      // By customer_id link
      if (customerId) {
        const byId = await base44.entities.CallSession.filter({ customer_id: customerId });
        byId.forEach((r) => { if (!seenIds.has(r.id)) { seenIds.add(r.id); results.push(r); } });
      }

      // By phone number match
      if (customer.phone) {
        const byFrom = await base44.entities.CallSession.filter({ from_number: customer.phone });
        byFrom.forEach((r) => { if (!seenIds.has(r.id)) { seenIds.add(r.id); results.push(r); } });
        const byTo = await base44.entities.CallSession.filter({ to_number: customer.phone });
        byTo.forEach((r) => { if (!seenIds.has(r.id)) { seenIds.add(r.id); results.push(r); } });
      }

      return results.sort((a, b) => new Date(b.started_at || b.created_date) - new Date(a.started_at || a.created_date));
    },
    enabled: !!customer,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agentsForCRM"],
    queryFn: () => base44.entities.Agent.list(),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditing(false);
      toast.success("Customer updated");
    },
  });

  const startEditing = () => {
    setEditData({
      full_name: customer?.full_name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      secondary_phone: customer?.secondary_phone || "",
      company: customer?.company || "",
      address: customer?.address || "",
      funnel_stage: customer?.funnel_stage || "lead",
      notes: customer?.notes || "",
      preferred_language: customer?.preferred_language || "",
      assigned_agent_id: customer?.assigned_agent_id || "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const getAgentName = (id) => agents.find((a) => a.id === id)?.name || "Unknown Agent";

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Loading customer profile...</div>;
  }

  if (!customer) {
    return <div className="text-center py-12 text-slate-500">Customer not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">
            {customer.full_name || customer.email || customer.phone || "Unknown Contact"}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            {customer.company && (
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {customer.company}</span>
            )}
            <Badge className={stageColors[customer.funnel_stage]}>{customer.funnel_stage}</Badge>
            {customer.source && (
              <Badge variant="outline" className="text-xs capitalize">{customer.source}</Badge>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={startEditing} className="gap-2">
          <Edit className="w-4 h-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${customer.email}`} className="text-indigo-600 hover:underline">{customer.email}</a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.secondary_phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  <span>{customer.secondary_phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{customer.address}</span>
                </div>
              )}
              {!customer.email && !customer.phone && (
                <p className="text-sm text-slate-400">No contact info available</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{interactions.length}</p>
                  <p className="text-xs text-slate-500">Interactions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{customer.appointment_count || 0}</p>
                  <p className="text-xs text-slate-500">Appointments</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    ${(customer.lifetime_value || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Lifetime Value</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {customer.last_contacted_at ? moment(customer.last_contacted_at).fromNow() : "Never"}
                  </p>
                  <p className="text-xs text-slate-500">Last Contact</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {customer.tags?.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {customer.notes && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Interaction Timeline */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Interaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interactions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No interactions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {interactions.map((item) => {
                    const ChannelIcon = channelIcons[item.channel] || Phone;
                    const isInbound = item.direction === "inbound";
                    return (
                      <div key={item.id} className="flex gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className={cn(
                          "p-2 rounded-lg h-fit",
                          isInbound ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {isInbound ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-slate-900 capitalize">
                              {item.direction} {item.channel || "voice"}
                            </span>
                            <Badge variant="secondary" className="text-xs gap-1">
                              <ChannelIcon className="w-3 h-3" /> {item.channel || "voice"}
                            </Badge>
                            {item.status && (
                              <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                            )}
                            {item.sentiment && (
                              <Badge className={cn("text-xs", sentimentColors[item.sentiment])}>
                                {item.sentiment}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {item.started_at ? moment(item.started_at).format("MMM D, YYYY h:mm A") : moment(item.created_date).format("MMM D, YYYY h:mm A")}
                            {item.duration_seconds ? ` · ${Math.round(item.duration_seconds / 60)}m ${item.duration_seconds % 60}s` : ""}
                            {item.agent_id && ` · ${getAgentName(item.agent_id)}`}
                          </div>
                          {item.summary && (
                            <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded p-2">{item.summary}</p>
                          )}
                          {item.outcome && (
                            <Badge variant="secondary" className="text-xs mt-1 capitalize">{item.outcome.replace(/_/g, " ")}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={editData.company} onChange={(e) => setEditData({ ...editData, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Secondary Phone</Label>
                <Input value={editData.secondary_phone} onChange={(e) => setEditData({ ...editData, secondary_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Funnel Stage</Label>
                <Select value={editData.funnel_stage} onValueChange={(v) => setEditData({ ...editData, funnel_stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
            </div>
            {agents.length > 0 && (
              <div className="space-y-2">
                <Label>Assigned Agent</Label>
                <Select value={editData.assigned_agent_id || "none"} onValueChange={(v) => setEditData({ ...editData, assigned_agent_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}