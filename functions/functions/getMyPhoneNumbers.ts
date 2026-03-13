import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.email.toLowerCase();

    // Gather all client IDs belonging to this user
    const clientIds = new Set();
    if (user.data?.client_id) clientIds.add(user.data.client_id);

    const byContact = await base44.asServiceRole.entities.Client.filter({ contact_email: userEmail });
    const byCreator = await base44.asServiceRole.entities.Client.filter({ created_by: userEmail });
    byContact.forEach(c => clientIds.add(c.id));
    byCreator.forEach(c => clientIds.add(c.id));

    if (clientIds.size === 0) {
      return Response.json({ phoneNumbers: [] });
    }

    // Fetch phone numbers from all client IDs
    const allNumbers = [];
    const seen = new Set();
    for (const cid of clientIds) {
      const nums = await base44.asServiceRole.entities.PhoneNumber.filter({ client_id: cid });
      for (const n of nums) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          allNumbers.push(n);
        }
      }
    }

    console.log(`[getMyPhoneNumbers] user=${userEmail} clients=[${[...clientIds]}] numbers=${allNumbers.length}`);
    return Response.json({ phoneNumbers: allNumbers });
  } catch (err) {
    console.error("[getMyPhoneNumbers] Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});