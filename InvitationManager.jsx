import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Mail,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";

const ACCOUNT_TYPES = [
  { value: "business", label: "Business" },
  { value: "agency", label: "Agency" },
  { value: "partner", label: "Partner" },
  { value: "free_partner", label: "Free Partner" }, // normalized
  { value: "affiliate", label: "Affiliate" }
];

export default function InvitationManager() {
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [newInvitation, setNewInvitation] = useState({
    email: "",
    accountType: "business"
  });

  const queryClient = useQueryClient();

  // -----------------------------
  // FETCH INVITATIONS
  // -----------------------------
  const { data: invitationsData, isLoading, error } = useQuery({
    queryKey: ["invitations", selectedStatus],
    queryFn: async () => {
      const response = await base44.functions.invoke("getInvitations", { status: selectedStatus });
      return response.data;
    }
  });

  const invitations = invitationsData?.invitations ?? [];

  // -----------------------------
  // CREATE INVITATION
  // -----------------------------
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("createInvitation", {
        email: data.email,
        account_type: data.accountType
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setNewInvitation({ email: "", accountType: "business" });
      toast.success("Invitation created and sent successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to create invitation");
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const email = (newInvitation.email || "").trim();
    if (!email) {
      toast.error("Please enter a valid email address");
      return;
    }
    createMutation.mutate({ ...newInvitation, email });
  };

  // -----------------------------
  // RESEND INVITATION
  // -----------------------------
  const resendMutation = useMutation({
    mutationFn: async (invitationId) => {
      const response = await base44.functions.invoke("resendInvitation", { invitation_id: invitationId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation resent successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to resend invitation");
    }
  });

  // -----------------------------
  // UPDATE INVITATION STATUS
  // -----------------------------
  const updateMutation = useMutation({
    mutationFn: async ({ invitationId, status }) => {
      const response = await base44.functions.invoke("updateInvitation", {
        invitation_id: invitationId,
        updates: { status }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation updated successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to update invitation");
    }
  });

  // -----------------------------
  // STATUS ICONS
  // -----------------------------
  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "expired":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* CREATE INVITATION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Create New Invitation
          </CardTitle>
          <CardDescription>
            Send invitations to new users to join your platform
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newInvitation.email}
                  onChange={(e) =>
                    setNewInvitation({
                      ...newInvitation,
                      email: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <select
                  id="accountType"
                  value={newInvitation.accountType}
                  onChange={(e) =>
                    setNewInvitation({
                      ...newInvitation,
                      accountType: e.target.value
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Creating..." : "Create Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* MANAGE INVITATIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Invitations</CardTitle>
          <CardDescription>
            View and manage all sent invitations
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              {["pending", "accepted", "expired", "cancelled"].map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading invitations...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                Failed to load invitations. Please try again.
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {selectedStatus} invitations found
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">
                          {invitation.email}
                        </TableCell>

                        <TableCell>
                          {
                            ACCOUNT_TYPES.find(
                              (t) => t.value === invitation.account_type
                            )?.label || invitation.account_type
                          }
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invitation.status)}
                            <span className="capitalize">
                              {invitation.status}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {invitation.created_date
                            ? format(
                                new Date(invitation.created_date),
                                "MMM d, yyyy"
                              )
                            : "-"}
                        </TableCell>

                        <TableCell>
                          {invitation.expires_at
                            ? format(
                                new Date(invitation.expires_at),
                                "MMM d, yyyy"
                              )
                            : "-"}
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            {invitation.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    resendMutation.mutate(invitation.id)
                                  }
                                  disabled={resendMutation.isPending}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateMutation.mutate({
                                      invitationId: invitation.id,
                                      status: "cancelled"
                                    })
                                  }
                                  disabled={updateMutation.isPending}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}