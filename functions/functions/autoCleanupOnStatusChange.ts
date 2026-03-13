import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// This function is intended to be triggered by an entity automation on updates to Agent and KnowledgeBase
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // No end-user auth for automations; allow service role after basic payload validation
    const payload = await req.json();
    const event = payload?.event;
    const data = payload?.data;

    if (!event || !event.entity_name || !event.type) {
      return Response.json({ error: "Invalid automation payload" }, { status: 400 });
    }

    // If an agent just became inactive -> delete it and cleanup orphan KBs
    if (event.entity_name === "Agent" && event.type === "update") {
      const newStatus = data?.status;
      if (newStatus === "inactive") {
        await base44.asServiceRole.entities.Agent.delete(event.entity_id);

        // Cleanup KBs not linked to any remaining active agent
        const agents = await base44.asServiceRole.entities.Agent.filter({ status: "active" });
        const linkedKbIds = new Set(
          (agents || []).flatMap((a) =>
            Array.isArray(a?.knowledge_base_ids) ? a.knowledge_base_ids : []
          ),
        );
        const kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({});
        for (const kb of kbs || []) {
          if (kb?.status === "inactive" || !linkedKbIds.has(kb.id)) {
            await base44.asServiceRole.entities.KnowledgeBase.delete(kb.id);
          }
        }
      }
    }

    // If a KnowledgeBase becomes inactive -> delete it (and optionally check agents still valid)
    if (event.entity_name === "KnowledgeBase" && event.type === "update") {
      const newStatus = data?.status;
      if (newStatus === "inactive") {
        await base44.asServiceRole.entities.KnowledgeBase.delete(event.entity_id);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, {
      status: 500,
    });
  }
});
