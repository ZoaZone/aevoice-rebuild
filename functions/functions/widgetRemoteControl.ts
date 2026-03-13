import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

type Action = "open" | "close" | "toggle" | "mode";

interface AgentEntity {
  id: string;
  status?: string;
  name?: string;
  greeting_message?: string;
  voice_id?: string;
  language?: string;
}

interface ClientEntity {
  id: string;
  name?: string;
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const base44 = createClientFromRequest(req);
    const userRes = await base44.auth.me();
    const user = userRes.data as { id: string; role: string; email?: string } | null;

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      agent_id?: string;
      client_id?: string;
      action?: Action;
      mode?: string;
    };

    const { agent_id, action, mode } = body;

    let agentData: AgentEntity | null = null;

    if (agent_id) {
      const agents = (await base44.asServiceRole.entities.Agent.filter({ id: agent_id })) as AgentEntity[];
      if (!agents || agents.length === 0) {
        return Response.json(
          {
            active: false,
            reason: "Agent not found or deleted",
            disabled_at: new Date().toISOString(),
          },
          {
            status: 404,
            headers: corsHeaders(),
          },
        );
      }

      agentData = agents[0];
      if (agentData?.status !== "active") {
        return Response.json(
          {
            active: false,
            reason: `Agent is ${agentData?.status}`,
            disabled_at: new Date().toISOString(),
          },
          {
            status: 200,
            headers: corsHeaders(),
          },
        );
      }
    }

    try {
      await base44.asServiceRole.entities.DebugLog?.create?.({
        category: "sree_widget_remote",
        message: `Widget remote control: ${action ?? "unknown"}${mode ? ` -> ${mode}` : ""}`,
        metadata: { action, mode, user_id: user.id },
      });
    } catch (_err: unknown) {
      // ignore optional logging failures
    }

    return Response.json(
      {
        ok: true,
        action: action ?? null,
        mode: mode ?? null,
        agent: agentData
          ? {
            id: agentData.id,
            name: agentData.name,
            greeting_message: agentData.greeting_message,
            voice_id: agentData.voice_id,
            language: agentData.language,
          }
          : null,
      },
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (err: unknown) {
    console.error("[widgetRemoteControl] Error:", err);
    return Response.json(
      { error: "remote_control_failed" },
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
});