// Returns agents for the current user's client, bypassing RLS.
// Simplified: uses getMyClient's logic to find the single correct client_id.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const base44 = createClientFromRequest(req);

  let user;
  try {
    user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  } catch (err) {
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }

  try {
    const email = user.email.toLowerCase();

    // Find client by contact_email (same as getMyClient primary lookup)
    let clientId = null;
    const byEmail = await base44.asServiceRole.entities.Client.filter({ contact_email: email });
    if (byEmail && byEmail.length > 0) {
      clientId = byEmail[0].id;
    }

    // Fallback to stored client_id (handle double-nested data.data.client_id)
    if (!clientId) {
      clientId = user.data?.client_id || user.data?.data?.client_id;
    }

    if (!clientId) {
      return Response.json({ success: true, agents: [], client_id: null });
    }

    // Fetch agents for this client
    const agents = await base44.asServiceRole.entities.Agent.filter({ client_id: clientId });

    // Sync user.data.client_id if needed
    const currentClientId = user.data?.client_id;
    if (currentClientId !== clientId) {
      try {
        const currentData = user.data || {};
        const cleanData = {};
        for (const key of Object.keys(currentData)) {
          if (key !== 'data') cleanData[key] = currentData[key];
        }
        if (currentData.data && typeof currentData.data === 'object') {
          for (const key of Object.keys(currentData.data)) {
            if (!(key in cleanData)) cleanData[key] = currentData.data[key];
          }
        }
        cleanData.client_id = clientId;
        await base44.asServiceRole.entities.User.update(user.id, { data: cleanData });
      } catch (_) {}
    }

    return Response.json({ success: true, agents: agents || [], client_id: clientId });
  } catch (err) {
    return Response.json({ success: false, error: err.message, agents: [] }, { status: 500 });
  }
});