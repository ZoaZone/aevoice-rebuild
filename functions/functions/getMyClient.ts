import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email.toLowerCase();
    let client = null;

    // 1. Find by contact_email
    const clients = await base44.asServiceRole.entities.Client.filter({ contact_email: email });
    if (clients && clients.length > 0) {
      client = clients[0];
    }

    // 2. Fallback: find by stored client_id (handle double-nested data.data.client_id)
    if (!client) {
      const storedId = user.data?.client_id || user.data?.data?.client_id;
      if (storedId) {
        try {
          const byId = await base44.asServiceRole.entities.Client.filter({ id: storedId });
          if (byId && byId.length > 0) client = byId[0];
        } catch (_) {}
      }
    }

    // 3. Auto-create if none found — check invitation for account_type
    if (!client) {
      let accountType = 'business';
      try {
        const invitations = await base44.asServiceRole.entities.Invitation.filter({ email });
        if (invitations && invitations.length > 0) {
          // Use the most recent invitation's account_type
          const inv = invitations[0];
          if (inv.account_type) accountType = inv.account_type;
        }
      } catch (_) {}

      const displayName = user.full_name || email.split('@')[0];
      // Generate human-readable slug: "vetnpet1", "johndoe1", etc.
      const baseSlug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .substring(0, 20);

      // Find next available numeric suffix to avoid duplicates
      let suffix = 1;
      let slug = baseSlug + suffix;
      while (suffix < 100) {
        const check = await base44.asServiceRole.entities.Client.filter({ slug });
        if (!check?.length) break;
        suffix++;
        slug = baseSlug + suffix;
      }
      const displayId = `USER${suffix}${baseSlug.toUpperCase().substring(0, 12)}`;

      client = await base44.asServiceRole.entities.Client.create({
        name: displayName + "'s Business",
        slug: slug,
        display_id: displayId,
        contact_email: email,
        contact_name: user.full_name || '',
        status: 'active',
        account_type: accountType,
        onboarding_status: 'pending'
      });

      console.log(`[getMyClient] Auto-created client ${client.id} for ${email} with account_type=${accountType}`);
    }

    // 4. Backfill display_id if missing or if it's a raw mongo ID
    if (client && (!client.display_id || /^[a-f0-9]{24}$/.test(client.display_id))) {
      const newDisplayId = client.slug || 
        (client.name || 'client')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .substring(0, 30) + '-01';
      try {
        await base44.asServiceRole.entities.Client.update(client.id, { display_id: newDisplayId });
        client.display_id = newDisplayId;
      } catch (_) {}
    }

    // 5. Sync user.data.client_id — FLATTEN to top level, remove nested "data" key
    const currentData = user.data || {};
    const currentClientId = currentData.client_id;
    const hasNestedData = currentData.data && typeof currentData.data === 'object';
    
    if (client && (currentClientId !== client.id || hasNestedData)) {
      try {
        // Build clean flat data object — merge nested data.data keys to top level
        const nestedKeys = hasNestedData ? currentData.data : {};
        const cleanData = {};
        // Copy all top-level keys except "data" (the nested one)
        for (const key of Object.keys(currentData)) {
          if (key !== 'data') cleanData[key] = currentData[key];
        }
        // Merge nested keys (they may have client_id etc)
        for (const key of Object.keys(nestedKeys)) {
          if (!(key in cleanData)) cleanData[key] = nestedKeys[key];
        }
        // Set the correct client_id
        cleanData.client_id = client.id;
        
        await base44.asServiceRole.entities.User.update(user.id, { data: cleanData });
      } catch (_) {}
    }

    return Response.json({ success: true, client: client });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});