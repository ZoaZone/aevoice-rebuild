import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function slugify(input) {
  return (input || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function buildSipUri(username, host, port) {
  const p = String(port || "5060");
  return `sip:${username}@${host}:${p}`;
}

Deno.serve(async (req) => {
  const started = Date.now();
  const requestId = crypto.randomUUID();
  const log = (level, msg, extra = {}) => {
    const rec = {
      request_id: requestId,
      t: new Date().toISOString(),
      ms: Date.now() - started,
      level,
      msg,
      ...extra,
    };
    (level === "error" ? console.error : console.log)(JSON.stringify(rec));
  };

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      username,
      password,
      host,
      port = 5060,
      label = "Custom SIP Line",
      agentName = "Vet Bot",
      clientName = "Vet N Pet Hospital",
    } = body || {};

    if (!username || !password || !host) {
      return Response.json({
        error: "Missing required fields: username, password, host",
      }, { status: 400 });
    }

    const sipUri = buildSipUri(username, host, port);

    // 1) Resolve Client
    let client = null;
    try {
      const exact = await base44.asServiceRole.entities.Client.filter({
        name: clientName,
      });
      client = exact?.[0] || null;
    } catch (_) {}

    if (!client) {
      // Fallback: any client owned by this user
      const byContact = await base44.entities.Client.filter({
        contact_email: user.email,
      }).catch(() => []);
      client = byContact?.[0] || null;
    }

    if (!client) {
      // Create a client with requested name
      const slug = slugify(clientName || (user.full_name || user.email || "client")) +
        "-" + Date.now().toString().slice(-6);
      client = await base44.entities.Client.create({
        name: clientName || (user.full_name || "Client"),
        slug,
        contact_email: user.email || "",
        status: "active",
        onboarding_status: "completed",
      });
      log("info", "Created client", { client_id: client.id });
    }

    // Ownership guard: allow admin or owner
    const isOwner = client.contact_email === user.email;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      return Response.json({ error: "Forbidden: You do not own this client" }, {
        status: 403,
      });
    }

    // 2) Resolve or create TelephonyAccount (custom_sip)
    let telephonyAccount = null;
    try {
      const accs = await base44.asServiceRole.entities.TelephonyAccount.filter({
        client_id: client.id,
      });
      telephonyAccount = (accs || []).find((a: any) =>
        a?.mode === "custom_sip" &&
        a?.config?.sip_host === host &&
        String(a?.config?.sip_port || "") === String(port) &&
        a?.config?.sip_username === username
      ) || null;
    } catch (_) {}

    if (!telephonyAccount) {
      telephonyAccount = await base44.entities.TelephonyAccount.create({
        client_id: client.id,
        mode: "custom_sip",
        provider: "sip",
        display_name: `${client.name} SIP ${username}`,
        config: {
          sip_host: host,
          sip_port: Number(port) || 5060,
          sip_username: username,
          sip_password: password,
          sip_auth_user: username,
          sip_domain: `${host}:${port}`,
        },
        status: "pending_verification",
      });
      log("info", "Created TelephonyAccount", {
        telephony_account_id: telephonyAccount.id,
      });
    }

    // 3) Resolve or create Agent by name
    let agent = null;
    try {
      const agents = await base44.asServiceRole.entities.Agent.filter({
        client_id: client.id,
      });
      agent = (agents || []).find((a: any) =>
        (a?.name || "").toLowerCase() === String(agentName).toLowerCase()
      ) || null;
    } catch (_) {}

    if (!agent) {
      agent = await base44.entities.Agent.create({
        client_id: client.id,
        name: agentName,
        description: `${agentName} assistant for ${client.name}`,
        agent_type: "receptionist",
        system_prompt:
          `You are ${agentName} for ${client.name}. Answer calls professionally, gather caller details, and assist.`,
        status: "active",
        language: "en-US",
      });
      log("info", "Created Agent", { agent_id: agent.id });
    }

    // 4) Avoid duplicate PhoneNumber by sip_address
    const existing = await base44.asServiceRole.entities.PhoneNumber.filter({
      sip_address: sipUri,
    }).catch(() => []);
    if (existing?.length) {
      return Response.json({
        success: true,
        message: "SIP number already exists",
        phone_number: existing[0],
        cli_details: {
          none: "04024001355",
          prefix11: "04024001350",
          prefix22: "04024001351",
          prefix33: "04024001352",
        },
      });
    }

    // 5) Create PhoneNumber (custom_sip)
    const phone = await base44.entities.PhoneNumber.create({
      client_id: client.id,
      telephony_account_id: telephonyAccount.id,
      agent_id: agent.id,
      sip_address: sipUri,
      provider: "custom_sip",
      label,
      capabilities: ["voice"],
      status: "active",
      webhook_token: Math.random().toString(36).slice(2, 10),
    });

    log("info", "Created PhoneNumber", { phone_number_id: phone.id });

    // Return with requested CLI details
    return Response.json({
      success: true,
      phone_number: phone,
      client,
      agent,
      telephony_account: telephonyAccount,
      cli_details: {
        none: "04024001355",
        prefix11: "04024001350",
        prefix22: "04024001351",
        prefix33: "04024001352",
      },
    });
  } catch (error) {
    log("error", "addCustomSipNumber failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error) || "Internal error",
    }, { status: 500 });
  }
});
