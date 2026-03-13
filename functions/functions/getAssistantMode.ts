import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * Get Assistant Mode
 *
 * @route GET /functions/getAssistantMode
 * @auth Required - User must be authenticated
 * @returns { mode: string } - Current assistant mode (Sri, Sree, Text Chat, Voice Chat, Agentic Sree)
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant ID from user's client
    const clientRes = await base44.functions.invoke("getMyClient", {});
    const tenantId = clientRes?.data?.client?.id;

    if (!tenantId) {
      // Default to Sri if no tenant
      return Response.json({ success: true, mode: "Sri" });
    }

    // Fetch SreeSettings for this tenant
    const settings = await base44.asServiceRole.entities.SreeSettings.filter({
      tenantId,
    });
    const row = settings?.[0];

    if (!row || !row.assistantMode) {
      return Response.json({ success: true, mode: "Sri" });
    }

    const allowed = ["Sri", "Voice Chat", "Sree", "Agentic Sree", "Text Chat"];
    const mode = allowed.includes(row.assistantMode) ? row.assistantMode : "Sri";
    return Response.json({ success: true, mode });
  } catch (error) {
    console.error("[getAssistantMode] Error:", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
