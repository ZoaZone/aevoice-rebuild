import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Unlimited limits for admin / free_partner roles — no gates, no upgrade prompts
const UNLIMITED_LIMITS = {
  maxAgents: 999,
  maxPhoneNumbers: 999,
  maxKnowledgeBases: 999,
  includedMinutes: 999999,
  hasVoice: true,
  hasApiAccess: true,
  hasAdvancedAnalytics: true,
  hasCallRecording: true,
  hasCrmIntegration: true,
  hasWhiteLabel: true,
};

const PRIVILEGED_ROLES = new Set(["admin", "free_partner", "agency_owner", "agency_manager"]);

/**
 * Resolves the current user's subscription + plan.
 * Admin / free_partner users get UNLIMITED_LIMITS with no upgrade prompts.
 * Returns: { plan, subscription, isLoading, isPremium, limits, isPrivileged }
 */
export default function useClientPlan(clientId) {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });

  const isPrivileged = PRIVILEGED_ROLES.has(user?.role) || !!user?.isAgencyApproved;

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["clientSubscription", clientId],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({
        client_id: clientId,
        status: "active",
      });
      return subs[0] || null;
    },
    enabled: !!clientId && !isPrivileged,
    staleTime: 300_000,
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["clientPlan", subscription?.plan_id],
    queryFn: async () => {
      const plans = await base44.entities.Plan.filter({ id: subscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!subscription?.plan_id && !isPrivileged,
    staleTime: 300_000,
  });

  // Privileged users skip the whole plan resolution — unlimited everything
  if (isPrivileged) {
    return {
      plan: null,
      subscription: null,
      isLoading: false,
      isPremium: true,
      isPrivileged: true,
      limits: UNLIMITED_LIMITS,
    };
  }

  const isLoading = subLoading || planLoading;

  const limits = {
    maxAgents: plan?.max_agents ?? 1,
    maxPhoneNumbers: plan?.max_phone_numbers ?? 1,
    maxKnowledgeBases: plan?.max_knowledge_bases ?? 1,
    includedMinutes: plan?.included_minutes ?? 0,
    hasVoice: !!plan?.features?.custom_voices || false,
    hasApiAccess: !!plan?.features?.api_access || false,
    hasAdvancedAnalytics: !!plan?.features?.analytics_advanced || false,
    hasCallRecording: !!plan?.features?.call_recording || false,
    hasCrmIntegration: !!plan?.features?.crm_integration || false,
    hasWhiteLabel: !!plan?.features?.white_label || false,
  };

  const isPremium = !!subscription && !!plan && (plan.tier === "professional" || plan.tier === "enterprise");

  return { plan, subscription, isLoading, isPremium, isPrivileged: false, limits };
}