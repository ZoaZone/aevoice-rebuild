import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building2,
  Phone,
  Mail,
  Clock,
  UserPlus,
  ExternalLink,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const stageColors = {
  lead: "bg-blue-100 text-blue-700",
  qualified: "bg-amber-100 text-amber-700",
  customer: "bg-emerald-100 text-emerald-700",
  churned: "bg-slate-100 text-slate-700",
};

export default function CRMContactCard({ contact, phoneNumber, clientId, onContactCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: phoneNumber || "",
    company: "",
    funnel_stage: "lead",
    source: "ai_call",
    notes: "",
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["crmCustomers"] });
      setShowCreate(false);
      toast.success("Contact created!");
      onContactCreated?.(newContact);
    },
    onError: (err) => {
      toast.error("Failed to create contact: " + (err?.message || "Unknown error"));
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.full_name?.trim()) {
      toast.error("Name is required");
      return;
    }
    createMutation.mutate({
      ...form,
      client_id: clientId,
    });
  };

  // If we have a matched contact, show CRM summary
  if (contact) {
    return (
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  {contact.full_name || "Unnamed"}
                </p>
                {contact.company && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {contact.company}
                  </p>
                )}
              </div>
            </div>
            <Badge className={cn("text-xs", stageColors[contact.funnel_stage] || stageColors.lead)}>
              {contact.funnel_stage || "lead"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {contact.phone && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="font-mono">{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Mail className="w-3 h-3 text-slate-400" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.last_contacted_at && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Last: {format(new Date(contact.last_contacted_at), "MMM d")}</span>
              </div>
            )}
            {contact.appointment_count > 0 && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{contact.appointment_count} appointments</span>
              </div>
            )}
          </div>

          {contact.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {contact.notes && (
            <p className="text-xs text-slate-500 bg-white/60 p-2 rounded border border-slate-200 line-clamp-2">
              {contact.notes}
            </p>
          )}

          {contact.lifetime_value > 0 && (
            <div className="text-xs text-slate-600">
              Lifetime Value: <span className="font-semibold text-emerald-700">${contact.lifetime_value.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // No matched contact — show "unknown caller" with create button
  return (
    <>
      <Card className="border-2 border-dashed border-amber-300 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                <User className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Unknown Caller</p>
                <p className="text-xs text-slate-500 font-mono">{phoneNumber || "No number"}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setForm((f) => ({ ...f, phone: phoneNumber || "" }));
                setShowCreate(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Contact
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Contact Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create CRM Contact</DialogTitle>
            <DialogDescription>
              Save this caller as a new contact in your CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-3 py-3">
              <div className="grid gap-1.5">
                <Label>Full Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+1234567890"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Company</Label>
                  <Input
                    placeholder="Acme Corp"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Stage</Label>
                  <Select value={form.funnel_stage} onValueChange={(v) => setForm({ ...form, funnel_stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <Input
                  placeholder="Optional notes about this contact..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {createMutation.isPending ? "Creating..." : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}