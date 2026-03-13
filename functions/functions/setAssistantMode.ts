import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * Set Assistant Mode
 *
 * @route POST /functions/setAssistantMode
 * @auth Required - User must be authenticated
 * @body { mode: string } - Assistant mode (Sri, Sree, Text Chat, Voice Chat, Agentic Sree)
 * @returns { success: true }
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { mode } = body;

    // Validate mode
    const validModes = [
      "Sri",
      "Sree",
      "Text Chat",
      "Voice Chat",
      "Agentic Sree",
    ];
    if (!mode || !validModes.includes(mode)) {
      return Response.json(
        { error: "Invalid mode. Must be one of: " + validModes.join(", ") },
        { status: 400 },
      );
    }

    // Get tenant ID from user's client
    const clientRes = await base44.functions.invoke("getMyClient", {});
    const tenantId = clientRes?.data?.client?.id;

    if (!tenantId) {
      return Response.json(
        { error: "No client found for user" },
        { status: 400 },
      );
    }

    // Upsert SreeSettings with assistant mode
    const existing = await base44.asServiceRole.entities.SreeSettings.filter({
      tenantId,
    });

    if (existing && existing[0]) {
      await base44.asServiceRole.entities.SreeSettings.update(existing[0].id, {
        assistantMode: mode,
      });
    } else {
      await base44.asServiceRole.entities.SreeSettings.create({
        tenantId,
        assistantMode: mode,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[setAssistantMode] Error:", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
