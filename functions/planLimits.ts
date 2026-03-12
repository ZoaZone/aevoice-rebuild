import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Plan limits request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, clientId, agencyId } = await req.json();

    // Get active subscription and plan for the owner
    async function getActivePlan(ownerId, ownerType) {
      const subscriptions = await base44.entities.Subscription.filter({
        [ownerType === "agency" ? "agency_id" : "client_id"]: ownerId,
        status: "active",
      });

      if (!subscriptions || subscriptions.length === 0) {
        return null;
      }

      const subscription = subscriptions[0];
      const plans = await base44.entities.Plan.filter({
        id: subscription.plan_id,
      });
      return plans?.[0] || null;
    }

    // Check agent limit for a client
    async function checkAgentLimit(cId) {
      // Get client's agency
      const clients = await base44.entities.Client.filter({ id: cId });
      if (!clients || clients.length === 0) {
        throw new Error("Client not found");
      }
      const client = clients[0];

      // Get plan (check client subscription first, then agency)
      let plan = await getActivePlan(cId, "client");
      if (!plan) {
        plan = await getActivePlan(client.agency_id, "agency");
      }

      if (!plan) {
        throw new Error("No active plan found");
      }

      // Count active agents for this client
      const agents = await base44.entities.Agent.filter({
        client_id: cId,
        status: "active",
      });
      const agentCount = agents?.length || 0;

      return {
        allowed: agentCount < (plan.max_agents || 1),
        current: agentCount,
        limit: plan.max_agents || 1,
        plan: plan.name,
      };
    }

    // Check client limit for an agency
    async function checkClientLimit(aId) {
      const plan = await getActivePlan(aId, "agency");

      if (!plan) {
        throw new Error("No active plan found for agency");
      }

      const clients = await base44.entities.Client.filter({
        agency_id: aId,
        status: "active",
      });
      const clientCount = clients?.length || 0;

      return {
        allowed: clientCount < (plan.max_clients || 1),
        current: clientCount,
        limit: plan.max_clients || 1,
        plan: plan.name,
      };
    }

    // Check phone number limit
    async function checkPhoneNumberLimit(cId) {
      const clients = await base44.entities.Client.filter({ id: cId });
      if (!clients || clients.length === 0) {
        throw new Error("Client not found");
      }
      const client = clients[0];

      let plan = await getActivePlan(cId, "client");
      if (!plan) {
        plan = await getActivePlan(client.agency_id, "agency");
      }

      if (!plan) {
        throw new Error("No active plan found");
      }

      const phoneNumbers = await base44.entities.PhoneNumber.filter({
        client_id: cId,
        status: "active",
      });
      const numberCount = phoneNumbers?.length || 0;

      return {
        allowed: numberCount < (plan.max_phone_numbers || 1),
        current: numberCount,
        limit: plan.max_phone_numbers || 1,
        plan: plan.name,
      };
    }

    // Check feature access
    async function checkFeatureAccess(aId, featureKey) {
      const plan = await getActivePlan(aId, "agency");

      if (!plan) {
        return { allowed: false, reason: "No active plan" };
      }

      const features = plan.features || {};
      const hasFeature = features[featureKey] === true;

      return {
        allowed: hasFeature,
        feature: featureKey,
        plan: plan.name,
        tier: plan.tier,
      };
    }

    // Check minutes usage
    async function checkMinutesUsage(cId) {
      const clients = await base44.entities.Client.filter({ id: cId });
      if (!clients || clients.length === 0) {
        throw new Error("Client not found");
      }
      const client = clients[0];

      let plan = await getActivePlan(cId, "client");
      if (!plan) {
        plan = await getActivePlan(client.agency_id, "agency");
      }

      if (!plan) {
        throw new Error("No active plan found");
      }

      // Get current period usage
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const usageCounters = await base44.entities.UsageCounter.filter({
        client_id: cId,
        period_start: periodStart.toISOString().split("T")[0],
      });

      const usage = usageCounters?.[0];
      const usedMinutes = usage?.total_call_minutes || 0;
      const includedMinutes = plan.included_minutes || 0;

      return {
        usedMinutes,
        includedMinutes,
        remainingMinutes: Math.max(0, includedMinutes - usedMinutes),
        overageMinutes: Math.max(0, usedMinutes - includedMinutes),
        overagePrice: plan.overage_price_per_min || 0.10,
        warningThreshold: usedMinutes >= includedMinutes * 0.8,
        limitReached: usedMinutes >= includedMinutes,
        plan: plan.name,
      };
    }

    // Route to appropriate check based on action
    let result;
    switch (action) {
      case "checkAgentLimit":
        result = await checkAgentLimit(clientId);
        break;
      case "checkClientLimit":
        result = await checkClientLimit(agencyId);
        break;
      case "checkPhoneNumberLimit":
        result = await checkPhoneNumberLimit(clientId);
        break;
      case "checkFeatureAccess":
        const { featureKey } = await req.json();
        result = await checkFeatureAccess(agencyId, featureKey);
        break;
      case "checkMinutesUsage":
        result = await checkMinutesUsage(clientId);
        break;
      case "getPlanDetails":
        const plan = agencyId
          ? await getActivePlan(agencyId, "agency")
          : await getActivePlan(clientId, "client");
        result = { plan };
        break;
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    logger.error("Plan limits failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
