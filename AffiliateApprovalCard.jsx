import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Mail, Gift, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AffiliateApprovalCard({ affiliate, onApproved, onRejected }) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Affiliate.update(affiliate.id, {
        status: 'active'
      });

      await base44.functions.invoke('sendApprovalEmail', {
        email: affiliate.user_email,
        affiliate_name: affiliate.full_name,
        type: 'affiliate_approved',
        referral_code: affiliate.referral_code
      });

      await base44.functions.invoke('markNotificationActioned', {
        reference_id: affiliate.id,
        reference_type: 'affiliate'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      toast.success(`${affiliate.full_name} approved as affiliate!`);
      if (onApproved) onApproved();
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Affiliate.update(affiliate.id, {
        status: 'suspended'
      });

      await base44.functions.invoke('sendApprovalEmail', {
        email: affiliate.user_email,
        affiliate_name: affiliate.full_name,
        type: 'affiliate_rejected'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      toast.success('Affiliate application rejected');
      if (onRejected) onRejected();
    }
  });

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Gift className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">{affiliate.full_name}</h3>
                <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                  Pending Review
                </Badge>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{affiliate.user_email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Gift className="w-4 h-4 text-slate-400" />
                <span className="font-mono font-bold text-purple-600">{affiliate.referral_code}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{format(new Date(affiliate.created_date), 'MMM d, yyyy')}</span>
              </div>
            </div>

            {affiliate.company_name && (
              <p className="text-sm text-slate-600">
                <strong>Company:</strong> {affiliate.company_name}
              </p>
            )}
            {affiliate.notes && (
              <p className="text-sm text-slate-600">
                <strong>Promotion plan:</strong> {affiliate.notes}
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
              Approve
            </Button>
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}