import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

async function ensureClient(base44, { name, slug, contact_email }) {
  const rows = await base44.asServiceRole.entities.Client.filter({ slug });
  if (rows?.length) return rows[0];
  const byName = await base44.asServiceRole.entities.Client.filter({ name });
  if (byName?.length) return byName[0];
  return await base44.asServiceRole.entities.Client.create({
    name,
    slug,
    contact_email,
    status: "active",
  });
}

async function ensureAgent(
  base44,
  {
    client_id,
    name,
    description,
    agent_type = "receptionist",
    system_prompt,
    greeting_message,
    language = "en-US",
    metadata,
  },
) {
  const existing = await base44.asServiceRole.entities.Agent.filter({
    client_id,
    name,
  });
  if (existing?.length) return existing[0];
  return await base44.asServiceRole.entities.Agent.create({
    client_id,
    name,
    description,
    agent_type,
    system_prompt,
    greeting_message,
    language,
    status: "active",
    metadata: metadata || undefined,
  });
}

async function ensureDeployment(
  base44,
  { agent_id, client_id, domain, site_name, embed_code },
) {
  const existing = await base44.asServiceRole.entities.AgentDeployment.filter({
    agent_id,
    domain,
  });
  if (existing?.length) return existing[0];
  return await base44.asServiceRole.entities.AgentDeployment.create({
    agent_id,
    client_id,
    domain,
    site_name,
    status: "active",
    embed_code: embed_code || "",
  });
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("seedPriorityAgents function started", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      logger.error("Unauthorized access attempt", {
        request_id: requestId,
        user_id: user?.id,
      });
      return Response.json({ error: "Forbidden: Admin access required" }, {
        status: 403,
      });
    }

    const origin = new URL(req.url).origin;
    const appId = Deno.env.get("BASE44_APP_ID");
    const widgetSrc = `${origin}/api/apps/${appId}/functions/widgetLoader`;

    logger.info("Creating priority agents", { request_id: requestId });

    // 1) Animal Welfare Society client
    const awsClient = await ensureClient(base44, {
      name: "Animal Welfare Society",
      slug: "animalwelfaresociety",
      contact_email: "awshyd@gmail.com",
    });

    // 1a) Sree agent for AWS
    const sreePrompt =
      `You are Sree, the AI Receptionist for Animal Welfare Society (animalwelfaresociety.in).\nPrimary duties:\n- Handle pet adoption inquiries with empathy and provide next steps.\n- Triage and assist with pet rescue calls; capture location, type of animal, and urgency.\n- Provide 24/7 support with clear, concise answers.\nGuidelines: Be warm, compassionate, and efficient. If emergency, prioritize safety and provide instructions to contact local animal rescue resources.`;

    const sree = await ensureAgent(base44, {
      client_id: awsClient.id,
      name: "Sree",
      description: "AI Receptionist for animalwelfaresociety.in",
      agent_type: "receptionist",
      system_prompt: sreePrompt,
      greeting_message: "Hello! I'm Sree with Animal Welfare Society. How can I help you today?",
      language: "en-IN",
      metadata: { owner_email: "awshyd@gmail.com", partner: "Sree AWS" },
    });

    // 2) AEVOICE client for Aeva
    const aevoiceClient = await ensureClient(base44, {
      name: "AEVOICE",
      slug: "aevoice",
      contact_email: "care@aevoice.ai",
    });

    const aevaPrompt =
      `You are Aeva, the universal AEVOICE assistant.\nYou can assist visitors across AEVOICE properties (aevoice.ai, hellobiz.app, workautomation.app, pay.hellobiz.app).\nExplain plans, features, and help route users to the right product or action. Be concise, friendly, and proactive.`;

    const aeva = await ensureAgent(base44, {
      client_id: aevoiceClient.id,
      name: "Aeva",
      description: "Universal AI Voice Assistant for AEVOICE properties",
      agent_type: "receptionist",
      system_prompt: aevaPrompt,
      greeting_message: "Hi! I'm Aeva from AEVOICE. What can I help you with?",
      language: "en-US",
    });

    // 3) Seed deployments (embed snippets returned via deployAgent or generated here)
    const sreeEmbed =
      `<script async src="${widgetSrc}" data-agent-id="${sree.id}" data-client-id="${sree.client_id}"></script>`;
    await ensureDeployment(base44, {
      agent_id: sree.id,
      client_id: sree.client_id,
      domain: "animalwelfaresociety.in",
      site_name: "Animal Welfare Society",
      embed_code: sreeEmbed,
    });

    // Vet N Pet Hospital deployment if agent exists
    const vnpClients = await base44.asServiceRole.entities.Client.filter({
      name: "Vet N Pet Hospital",
    });
    if (vnpClients?.length) {
      const vnpClient = vnpClients[0];
      const vnpAgents = await base44.asServiceRole.entities.Agent.filter({
        client_id: vnpClient.id,
        status: "active",
      });
      const vnpAgent = vnpAgents?.[0];
      if (vnpAgent) {
        const vnpEmbed =
          `<script async src="${widgetSrc}" data-agent-id="${vnpAgent.id}" data-client-id="${vnpAgent.client_id}"></script>`;
        await ensureDeployment(base44, {
          agent_id: vnpAgent.id,
          client_id: vnpAgent.client_id,
          domain: "vetnpethospital.com",
          site_name: "Vet N Pet Hospital",
          embed_code: vnpEmbed,
        });
      }
    }

    // Aeva across AEVOICE ecosystem
    const aevaEmbed =
      `<script async src="${widgetSrc}" data-agent-id="${aeva.id}" data-client-id="${aeva.client_id}"></script>`;
    const aevoiceDomains = [
      "aevoice.ai",
      "hellobiz.app",
      "workautomation.app",
      "pay.hellobiz.app",
    ];
    for (const d of aevoiceDomains) {
      await ensureDeployment(base44, {
        agent_id: aeva.id,
        client_id: aeva.client_id,
        domain: d,
        site_name: d,
        embed_code: aevaEmbed,
      });
    }

    logger.info("Priority agents seeded successfully", {
      request_id: requestId,
      sree_agent_id: sree.id,
      aeva_agent_id: aeva.id,
    });

    return Response.json({
      success: true,
      sree_agent: sree,
      aeva_agent: aeva,
      embed_examples: {
        sree: sreeEmbed,
        aeva: aevaEmbed,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error instanceof Error ? error.message : String(error)
      : String(error);
    const errorStack = error instanceof Error
      ? error instanceof Error ? error.stack : ""
      : undefined;

    logger.error("seedPriorityAgents function failed", {
      request_id: requestId,
      error: errorMessage,
      stack: errorStack,
    });
    return Response.json({ error: errorMessage }, { status: 500 });
  }
});
