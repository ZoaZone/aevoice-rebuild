import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 1) Delete Agents with status === 'inactive'
    const agents = await base44.asServiceRole.entities.Agent.filter({});
    const inactiveAgents = (agents || []).filter((a) => a?.status === "inactive");
    for (const a of inactiveAgents) {
      await base44.asServiceRole.entities.Agent.delete(a.id);
    }

    // 2) Determine active agents and the KBs they reference
    const activeAgents = (agents || []).filter((a) => a?.status === "active");
    const linkedKbIds = new Set(
      activeAgents.flatMap((a) => Array.isArray(a?.knowledge_base_ids) ? a.knowledge_base_ids : []),
    );

    // 3) Delete KnowledgeBases that are inactive OR not linked to any active agent
    const kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({});
    const toDeleteKb = (kbs || []).filter((kb) =>
      kb?.status === "inactive" || !linkedKbIds.has(kb.id)
    );
    for (const kb of toDeleteKb) {
      await base44.asServiceRole.entities.KnowledgeBase.delete(kb.id);
    }

    return Response.json({
      success: true,
      deleted: {
        agents: inactiveAgents.map((a) => a.id),
        knowledge_bases: toDeleteKb.map((kb) => kb.id),
      },
      kept_kb_ids: Array.from(linkedKbIds),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, {
      status: 500,
    });
  }
});
