import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Send, Gift, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FreePartnerInvite() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("hellobiz");
  const [sending, setSending] = useState(false);
  const [sentInvites, setSentInvites] = useState([]);

  const handleSendInvite = async () => {
    if (!email) { toast.error("Email is required"); return; }
    setSending(true);
    try {
      // 1. Send invitation via the createInvitation function
      const res = await base44.functions.invoke("createInvitation", {
        email,
        account_type: "free_partner",
        category,
      });

      if (res.data?.success) {
        // 2. Also invite the user to the app
        try {
          await base44.users.inviteUser(email, "user");
        } catch (e) {
          // Might already exist, that's fine
          console.log("User invite note:", e.message);
        }

        toast.success(`Free partner invitation sent to ${email}`);
        setSentInvites(prev => [...prev, { email, name, category, date: new Date().toISOString(), code: res.data.invitation?.code }]);
        setEmail("");
        setName("");
      } else {
        toast.error(res.data?.error || "Failed to send invitation");
      }
    } catch (err) {
      toast.error("Error: " + (err.message || "Unknown error"));
    }
    setSending(false);
  };

  return (
    <Card className="border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-cyan-600" />
          Invite Free Partner
        </CardTitle>
        <CardDescription>
          Send free partner invitations — recipients get full platform access with $0 subscription.
          They only pay for credits (voice minutes) as they use them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Partner Email *</Label>
            <Input
              type="email"
              placeholder="partner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Partner Name</Label>
            <Input
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Partner Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hellobiz">HelloBiz Member</SelectItem>
              <SelectItem value="promotional">Promotional Partner</SelectItem>
              <SelectItem value="beta_tester">Beta Tester</SelectItem>
              <SelectItem value="strategic">Strategic Partner</SelectItem>
              <SelectItem value="investor">Investor / Advisor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSendInvite}
            disabled={!email || sending}
            className="bg-cyan-600 hover:bg-cyan-700 gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send Free Partner Invite"}
          </Button>
          <p className="text-xs text-slate-500">
            Invitation email will be sent with a signup link
          </p>
        </div>

        {/* Recent invites */}
        {sentInvites.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-700">Recently Sent</h4>
            {sentInvites.map((inv, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">{inv.email}</span>
                <Badge variant="outline" className="text-xs capitalize">{inv.category}</Badge>
                {inv.code && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Code: {inv.code}</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}