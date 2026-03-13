// One-time admin utility to fix a user's client_id
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  let user;
  try {
    user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
  } catch (e) {
    return Response.json({ error: "Auth failed" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { target_email, target_client_id } = body;

    if (!target_email || !target_client_id) {
      return Response.json({ error: "target_email and target_client_id required" }, { status: 400 });
    }

    // Find the target user
    const users = await base44.asServiceRole.entities.User.filter({ email: target_email });
    if (!users?.length) {
      return Response.json({ error: "User not found: " + target_email }, { status: 404 });
    }
    const targetUser = users[0];

    // Verify client exists
    const clients = await base44.asServiceRole.entities.Client.filter({ id: target_client_id });
    if (!clients?.length) {
      return Response.json({ error: "Client not found: " + target_client_id }, { status: 404 });
    }

    // Update user data
    const newData = { ...(targetUser.data || {}), client_id: target_client_id };
    await base44.asServiceRole.entities.User.update(targetUser.id, { data: newData });

    console.log(`[fixUserClientId] Fixed ${target_email}: client_id ${targetUser.data?.client_id} -> ${target_client_id}`);

    return Response.json({ 
      success: true, 
      old_client_id: targetUser.data?.client_id,
      new_client_id: target_client_id
    });
  } catch (err) {
    console.error("[fixUserClientId] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});