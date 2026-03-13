import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Mail, User, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AgencyApprovalCard({ agency, onApproved, onRejected }) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Update agency status
      await base44.entities.Agency.update(agency.id, {
        status: 'active',
        settings: {
          ...agency.settings,
          approved_at: new Date().toISOString()
        }
      });

      // Send approval email
      await base44.functions.invoke('sendApprovalEmail', {
        email: agency.primary_email,
        agency_name: agency.name,
        type: 'agency_approved'
      });

      // Mark notification as actioned
      await base44.functions.invoke('markNotificationActioned', {
        reference_id: agency.id,
        reference_type: 'agency'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      toast.success(`${agency.name} has been approved!`);
      if (onApproved) onApproved();
    },
    onError: (error) => {
      toast.error('Approval failed: ' + error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      // Update agency status
      await base44.entities.Agency.update(agency.id, {
        status: 'suspended'
      });

      // Send rejection email
      await base44.functions.invoke('sendApprovalEmail', {
        email: agency.primary_email,
        agency_name: agency.name,
        type: 'agency_rejected'
      });

      // Mark notification as actioned
      await base44.functions.invoke('markNotificationActioned', {
        reference_id: agency.id,
        reference_type: 'agency'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      toast.success('Agency application rejected');
      if (onRejected) onRejected();
    }
  });

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Building2 className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">{agency.name}</h3>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  Pending Approval
                </Badge>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{agency.primary_email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span>{agency.settings?.contact_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{format(new Date(agency.created_date), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>

            {agency.settings?.business_address && (
              <p className="text-sm text-slate-600">
                <strong>Address:</strong> {agency.settings.business_address}
              </p>
            )}
            {agency.settings?.tax_id && (
              <p className="text-sm text-slate-600">
                <strong>Tax ID:</strong> {agency.settings.tax_id}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}