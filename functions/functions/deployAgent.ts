import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("deployAgent function started", { request_id: requestId });

    if (req.method !== "POST") {
      logger.warn("Invalid request method", {
        request_id: requestId,
        method: req.method,
      });
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }
    const base44 = createClientFromRequest(req);
    // Allow both user-scoped and service role invocations (for automations like FlowSync)
    // If there's no end-user, continue with service role context.
    try {
      await base44.auth.me();
    } catch (_) {}

    const body = await req.json();
    const agentId = String(body.agent_id || "").trim();
    const domain = String(body.domain || "").trim().replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    const siteName = body.site_name?.toString().trim() || domain;
    const widgetConfig = (body.widget_config && typeof body.widget_config === "object")
      ? body.widget_config
      : {};

    if (!agentId || !domain) {
      logger.error("Missing required parameters", {
        request_id: requestId,
        agent_id: agentId,
        domain,
      });
      return Response.json({ error: "agent_id and domain are required" }, {
        status: 400,
      });
    }

    const agents = await base44.entities.Agent.filter({ id: agentId });
    const agent = agents?.[0];
    if (!agent) {
      logger.error("Agent not found", {
        request_id: requestId,
        agent_id: agentId,
      });
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    logger.info("Agent found, creating deployment", {
      request_id: requestId,
      agent_id: agentId,
      domain,
    });

    // Build embed script
    const appId = Deno.env.get("BASE44_APP_ID");
    const origin = new URL(req.url).origin;
    const src = `${origin}/api/apps/${appId}/functions/widgetLoader`;

    const embed_code =
      `<script async src="${src}" data-agent-id="${agentId}" data-client-id="${agent.client_id}"></script>`;

    // Upsert AgentDeployment
    const existing = await base44.entities.AgentDeployment.filter({
      agent_id: agentId,
      domain,
    });
    let deployment;
    if (existing && existing.length > 0) {
      deployment = await base44.entities.AgentDeployment.update(
        existing[0].id,
        {
          site_name: siteName,
          embed_code,
          widget_config: widgetConfig,
          status: "active",
          last_verified_at: new Date().toISOString(),
        },
      );
      logger.info("Agent deployment updated", {
        request_id: requestId,
        agent_id: agentId,
        domain,
      });
    } else {
      deployment = await base44.entities.AgentDeployment.create({
        agent_id: agentId,
        client_id: agent.client_id,
        domain,
        site_name: siteName,
        status: "active",
        embed_code,
        widget_config: widgetConfig,
        installed_at: new Date().toISOString(),
      });
      logger.info("Agent deployment created", {
        request_id: requestId,
        agent_id: agentId,
        domain,
      });
    }

    return Response.json({ success: true, embed_code, deployment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error instanceof Error ? error.message : String(error)
      : String(error);
    const errorStack = error instanceof Error
      ? error instanceof Error ? error.stack : ""
      : undefined;

    logger.error("deployAgent function failed", {
      request_id: requestId,
      error: errorMessage,
      stack: errorStack,
    });
    return Response.json({ error: errorMessage }, { status: 500 });
  }
});
