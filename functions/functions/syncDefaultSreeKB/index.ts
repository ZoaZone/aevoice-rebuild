import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get or create master KB for AEVOICE site
    const existingKBs = await base44.asServiceRole.entities.KnowledgeBase.filter({
      name: "AEVOICE Master KB (Auto-Synced)"
    });
    
    let masterKB = existingKBs?.[0];
    if (!masterKB) {
      masterKB = await base44.asServiceRole.entities.KnowledgeBase.create({
        client_id: user.data?.client_id || "default_admin",
        name: "AEVOICE Master KB (Auto-Synced)",
        description: "Master knowledge base synced across all Sree instances with auto-ingested website content",
        type: "mixed",
        shared_with_sree: true,
        status: "active",
        sync_config: {
          enabled: true,
          frequency: "daily",
          source_urls: [
            "https://aevoice.ai",
            "https://aevoice.ai/features",
            "https://aevoice.ai/pricing",
            "https://aevoice.ai/blog"
          ]
        }
      });
      console.log("[SyncDefaultSreeKB] Created master KB:", masterKB.id);
    }

    // Mark all other KBs to sync from master
    const allKBs = await base44.asServiceRole.entities.KnowledgeBase.list();
    const syncPromises = allKBs
      .filter(kb => kb.id !== masterKB.id && kb.shared_with_sree)
      .map(kb => 
        base44.asServiceRole.entities.KnowledgeBase.update(kb.id, {
          shared_with_sree: true,
          synced_from_hellobiz: false,
          metadata: { ...kb.metadata, master_kb_id: masterKB.id }
        })
      );
    
    await Promise.all(syncPromises);

    return Response.json({
      success: true,
      master_kb_id: masterKB.id,
      message: `Master KB synced. ${allKBs.length} total KBs linked for auto-sync.`
    });
  } catch (error) {
    console.error("[SyncDefaultSreeKB] Error:", error.message);
    return Response.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
});