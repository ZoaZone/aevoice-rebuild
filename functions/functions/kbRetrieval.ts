import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const { knowledge_base_id, query, limit, tenantId: tenantIdParam, kbId: kbParam } = await req
      .json();

    // Validate knowledge base ownership
    let kb = null;
    try {
      kb = await base44.entities.KnowledgeBase.findById(knowledge_base_id);
      if (!kb) {
        console.error(
          "[KBRetrieval] Knowledge base not found:",
          knowledge_base_id,
        );
        return Response.json({ error: "Knowledge base not found" }, {
          status: 404,
        });
      }

      // Get current user to validate ownership
      const user = await base44.auth.me();
      if (!user) {
        console.error("[KBRetrieval] User authentication required");
        return Response.json({ error: "Authentication required" }, {
          status: 401,
        });
      }

      // Admin users can access any KB
      if (user.role !== "admin") {
        // Regular users must own the client that owns the KB
        const client = await base44.entities.Client.findById(kb.client_id);
        if (!client) {
          console.error("[KBRetrieval] Client not found for KB:", kb.client_id);
          return Response.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if user owns this client (match user_id or email)
        if (client.user_id !== user.id && client.contact_email !== user.email) {
          console.error("[KBRetrieval] User does not own KB:", {
            user_id: user.id,
            client_id: client.id,
            kb_id: knowledge_base_id,
          });
          return Response.json(
            { error: "Unauthorized access to knowledge base" },
            { status: 403 },
          );
        }
      }

      console.log("[KBRetrieval] Tenant validation passed:", {
        user_id: user.id,
        kb_id: knowledge_base_id,
      });
    } catch (err) {
      console.error("[KBRetrieval] Tenant validation failed:", err);
      return Response.json({ error: "Access validation failed" }, {
        status: 500,
      });
    }

    // Resolve knowledge base id
    let kbId = kbParam;
    let tenantId = tenantIdParam;

    if (!tenantId) {
      try {
        const res = await base44.functions.invoke("getMyClient", {});
        tenantId = res?.data?.client?.id || null;
      } catch {}
    }

    if (!kbId && tenantId) {
      try {
        const kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({
          client_id: tenantId,
        });
        kbId = kbs?.[0]?.id || null;
      } catch {}
    }

    if (!kbId) return Response.json({ chunks: [] });

    // Fetch chunks
    const chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
      knowledge_base_id: kbId,
    });
    if (!chunks || chunks.length === 0) return Response.json({ chunks: [] });

    // Simple keyword scoring fallback (robust and fast)
    const q = String(query).toLowerCase();
    const qWords = q.split(/\s+/).filter((w) => w.length > 2);

    const scored = chunks.map((c) => {
      const text = (c.content || "").toLowerCase();
      let score = 0;
      for (const w of qWords) if (text.includes(w)) score += 0.2;
      if (q && text.includes(q)) score += 0.3;
      return { content: c.content || "", score: Math.min(1, score) };
    }).sort((a, b) => b.score - a.score);

    return Response.json({ chunks: scored.slice(0, Math.max(1, Number(limit) || 5)) });
  } catch (error) {
    return Response.json({ chunks: [] });
  }
});
