import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// Admin-only cleanup: keep SRI + agents created by allowed emails, delete the rest.
// Also de-duplicate by (client_id, name) keeping the most recently updated.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, {
        status: 403,
      });
    }

    const SRI_ID = "694b07ab50d0bc0ffce2007e";
    const allowedCreators = new Set([
      "hellobizapp@gmail.com",
      "awshyd@gmail.com",
    ]);

    // Fetch all agents with service role
    const allAgents = await base44.asServiceRole.entities.Agent.list();

    // Build groups to detect duplicates by (client_id, name)
    const groups = new Map();
    for (const a of allAgents) {
      const key = `${a.client_id || "_"}::${(a.name || "").toLowerCase().trim()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }

    // Decide which to keep
    const keepIds = new Set();

    for (const a of allAgents) {
      const createdBy = (a.created_by || "").toLowerCase();
      const shouldKeepByOwner = allowedCreators.has(createdBy);
      const isSri = a.id === SRI_ID;
      if (isSri || shouldKeepByOwner) {
        keepIds.add(a.id);
      }
    }

    // Within each (client_id, name) group, keep the most recently updated
    for (const [, arr] of groups) {
      if (arr.length <= 1) continue;
      arr.sort((x, y) => new Date(y.updated_date || 0) - new Date(x.updated_date || 0));
      const winner = arr[0];
      keepIds.add(winner.id);
    }

    // Compute deletions
    const toDelete = allAgents.filter((a) => !keepIds.has(a.id));

    // Delete in parallel batches
    const chunks = (list, size) =>
      list.reduce(
        (acc, _, i) => (i % size ? acc : [...acc, list.slice(i, i + size)]),
        [],
      );
    const batches = chunks(toDelete, 25);
    let deleted = 0;

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (a) => {
          try {
            await base44.asServiceRole.entities.Agent.delete(a.id);
            deleted += 1;
          } catch (e) {
            console.error("Failed to delete agent", a.id, e?.message);
          }
        }),
      );
    }

    return Response.json({
      success: true,
      total: allAgents.length,
      kept: keepIds.size,
      deleted,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, {
      status: 500,
    });
  }
});
