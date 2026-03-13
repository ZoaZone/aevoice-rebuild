import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Mail, ArrowRight } from "lucide-react";

export default function InvitationGate({ access, userEmail }) {
  if (!access) return null;

  const { has_valid_invitation, invitation_status, can_access_dashboard } = access;

  if (can_access_dashboard) return null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full border-2 border-amber-200 shadow-xl">
        <CardContent className="py-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-amber-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Invitation Required</h2>
            <p className="text-slate-600 max-w-md mx-auto">
              AEVOICE is an invitation-only platform. You need a valid invitation to access the dashboard, create agents, and use telephony features.
            </p>
          </div>

          {invitation_status === "no_invitation" && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-3 justify-center mb-2">
                <Mail className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-800">No Invitation Found</span>
              </div>
              <p className="text-sm text-amber-700">
                Your email <strong>{userEmail}</strong> does not have an active invitation. 
                Please contact an administrator or request an invitation.
              </p>
            </div>
          )}

          {invitation_status === "expired" && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-700">
                Your invitation has expired. Please contact support for a new invitation.
              </p>
            </div>
          )}

          {invitation_status === "pending_activation" && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-700">
                You have a pending invitation. Please complete the onboarding process to activate your account.
              </p>
              <Link to={createPageUrl("Onboarding")} className="mt-3 inline-block">
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  Complete Onboarding <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Need access? Contact your administrator at{" "}
              <a href="mailto:care@aevoice.ai" className="text-indigo-600 hover:underline font-medium">
                care@aevoice.ai
              </a>
            </p>
            <Link to={createPageUrl("Pricing")}>
              <Button variant="outline" className="gap-2 mt-2">
                View Plans & Subscribe <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}