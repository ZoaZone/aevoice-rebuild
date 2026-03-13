import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function normalizeE164(input) {
  if (!input) return "";
  const digits = input.replace(/\s|-/g, "");
  if (/^\+?[1-9]\d{7,14}$/.test(digits)) {
    return digits.startsWith("+") ? digits : `+${digits}`;
  }
  return "";
}

function buildSipUri({ sip_address, sip_username, sip_host, sip_port }) {
  if (sip_address) {
    return sip_address.startsWith("sip:") ? sip_address : `sip:${sip_address}`;
  }
  if (sip_username && sip_host) {
    return `sip:${sip_username}@${sip_host}:${sip_port || "80"}`;
  }
  return "";
}

Deno.serve(async (req) => {
  console.log("[createPhoneNumber] fix applied");
  let client_id = undefined,
    telephony_account_id = undefined,
    agent_id = undefined,
    provider = undefined,
    isSip = undefined;

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      label,
      provider_hint, // e.g. 'twilio','bsnl_wings','custom_sip','vonage','plivo','pstn'
      number_e164,
      sip_address,
      sip_username,
      sip_host,
      sip_port,
    } = body || {};

    // Assign values to outer scope variables for error logging in catch block
    client_id = body?.client_id;
    telephony_account_id = body?.telephony_account_id;
    agent_id = body?.agent_id;

    if (!client_id || !telephony_account_id || !agent_id) {
      return Response.json({ error: "Missing required fields" }, {
        status: 400,
      });
    }

    // SECURITY: Validate tenant ownership
    const client = await base44.asServiceRole.entities.Client.get(client_id);
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    const userEmail = user.email.toLowerCase();
    const isOwner = (client.contact_email || "").toLowerCase() === userEmail ||
                    (client.created_by || "").toLowerCase() === userEmail;
    const isLinkedClient = user.data?.client_id === client_id;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isLinkedClient && !isAdmin) {
      console.error("[SECURITY][createPhoneNumber] Unauthorized", { client_id, user_email: userEmail });
      return Response.json({ error: "Unauthorized: You do not own this client account" }, { status: 403 });
    }

    // SECURITY: Validate agent exists and belongs to one of the user's clients
    // The agent might belong to a different client record that also belongs to this user
    const agentRows = await base44.asServiceRole.entities.Agent.filter({ id: agent_id });
    const agent = agentRows?.[0];

    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if agent's client_id matches OR if the agent's client also belongs to this user
    let agentOwnershipValid = false;
    if (agent.client_id === client_id) {
      agentOwnershipValid = true;
    } else {
      // Agent belongs to a different client — check if that client also belongs to this user
      const agentClient = await base44.asServiceRole.entities.Client.get(agent.client_id);
      if (agentClient) {
        const agentClientOwner = (agentClient.contact_email || "").toLowerCase() === userEmail ||
                                  (agentClient.created_by || "").toLowerCase() === userEmail;
        if (agentClientOwner || isAdmin) {
          agentOwnershipValid = true;
          // Use the agent's actual client_id for consistency
          client_id = agent.client_id;
          console.log("[createPhoneNumber] Switched client_id to agent's client:", client_id);
        }
      }
    }

    if (!agentOwnershipValid && !isAdmin) {
      console.error("[SECURITY][createPhoneNumber] Agent-client mismatch", { agent_id, agent_client: agent.client_id, client_id });
      return Response.json({ error: "Agent not found or doesn't belong to this client" }, { status: 404 });
    }

    console.log("[createPhoneNumber] Ownership validated", { client_id, agent_id, user: userEmail });

    // Extra validation & clear error messages for SIP
    if (["bsnl_wings", "custom_sip", "sip"].includes(provider_hint)) {
      if (!sip_username || !sip_host) {
        return Response.json({ error: "SIP username and host are required" }, {
          status: 400,
        });
      }
    }

    isSip = ["bsnl_wings", "custom_sip", "sip"].includes(provider_hint);

    provider = "pstn";
    if (provider_hint === "bsnl_wings") provider = "bsnl_wings";
    else if (["custom_sip", "sip"].includes(provider_hint)) {
      provider = "custom_sip";
    }

    let createPayload = {
      client_id,
      telephony_account_id,
      agent_id,
      label: label || undefined,
      provider,
      status: "active",
      webhook_token: Math.random().toString(36).slice(2, 10),
    };

    if (isSip) {
      const uri = buildSipUri({
        sip_address,
        sip_username,
        sip_host,
        sip_port,
      });
      if (!uri) {
        return Response.json({ error: "Invalid SIP details" }, { status: 400 });
      }
      createPayload.sip_address = uri;
      createPayload.number_e164 = null;
    } else {
      const e164 = normalizeE164(number_e164);
      if (!e164) {
        return Response.json({ error: "Invalid E.164 number" }, {
          status: 400,
        });
      }
      createPayload.number_e164 = e164;
      createPayload.sip_address = null;
    }

    // DUPLICATE CHECK: Prevent duplicate phone numbers
    if (createPayload.number_e164) {
      const existing = await base44.asServiceRole.entities.PhoneNumber.filter({ number_e164: createPayload.number_e164 });
      if (existing?.length > 0) {
        return Response.json({ error: `Phone number ${createPayload.number_e164} is already registered` }, { status: 409 });
      }
    }
    if (createPayload.sip_address) {
      const existing = await base44.asServiceRole.entities.PhoneNumber.filter({ sip_address: createPayload.sip_address });
      if (existing?.length > 0) {
        return Response.json({ error: `SIP address ${createPayload.sip_address} is already registered` }, { status: 409 });
      }
    }

    // Use service role to bypass RLS — we've already validated ownership above
    const created = await base44.asServiceRole.entities.PhoneNumber.create(createPayload);

    // Ensure TelephonyAccount has the same client_id and deduplicate
    if (createPayload.telephony_account_id && createPayload.client_id) {
      try {
        const ta = await base44.asServiceRole.entities.TelephonyAccount.filter({ id: createPayload.telephony_account_id });
        if (ta?.length && ta[0].client_id !== createPayload.client_id) {
          await base44.asServiceRole.entities.TelephonyAccount.update(ta[0].id, { client_id: createPayload.client_id });
          console.log(`[CreatePhoneNumber] Synced TelephonyAccount ${ta[0].id} client_id to ${createPayload.client_id}`);
        }
      } catch (e) {
        console.warn("[CreatePhoneNumber] TelephonyAccount sync failed:", e.message);
      }
    }

    // Cleanup: Remove duplicate TelephonyAccounts for this client (keep the one we just used)
    try {
      const allTAs = await base44.asServiceRole.entities.TelephonyAccount.filter({ client_id: client_id });
      if (allTAs.length > 1) {
        const keep = createPayload.telephony_account_id;
        for (const ta of allTAs) {
          if (ta.id !== keep) {
            // Only delete if no other phone numbers reference it
            const referencingNumbers = await base44.asServiceRole.entities.PhoneNumber.filter({ telephony_account_id: ta.id });
            if (!referencingNumbers?.length) {
              await base44.asServiceRole.entities.TelephonyAccount.delete(ta.id);
              console.log(`[CreatePhoneNumber] Deleted duplicate TelephonyAccount ${ta.id}`);
            }
          }
        }
      }
    } catch (e) {
      console.warn("[CreatePhoneNumber] Duplicate TA cleanup failed:", e.message);
    }

    return Response.json({ success: true, phoneNumber: created });
  } catch (err) {
    console.error("[createPhoneNumber] Error creating phone number:", err);
    console.error("[createPhoneNumber] Request details:", {
      client_id,
      telephony_account_id,
      agent_id,
      provider,
      isSip,
    });
    if (err.stack) console.error("[createPhoneNumber] Stack trace:", err.stack);
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
    });
  }
});