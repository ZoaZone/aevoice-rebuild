import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Add Vet N Pet phone number request received", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const body = await req.json().catch(() => ({}));

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-only operation since it uses service role access and updates core data
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, {
        status: 403,
      });
    }

    const TARGET_CLIENT_NAME = (body?.client_name || body?.clientName) ??
      "Vet N Pet Hospital";
    const TARGET_LABEL = "AEVOICE Main Line";

    // 1) Avoid duplicates
    const existing = await base44.asServiceRole.entities.PhoneNumber.filter({
      number_e164: "+914023186215",
    });
    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({
        success: true,
        message: "PhoneNumber already exists (by number_e164)",
        phone_number: existing[0],
      });
    }

    const existingBySip = await base44.asServiceRole.entities.PhoneNumber
      .filter({
        sip_address: "sip:914023186215@ap.siptrunk.ims.bsnl.in:5060",
      });
    if (Array.isArray(existingBySip) && existingBySip.length > 0) {
      return Response.json({
        success: true,
        message: "PhoneNumber already exists (by sip_address)",
        phone_number: existingBySip[0],
      });
    }

    // 2) Determine telephony_account_id (allow override via payload)
    let telephonyAccountId = body?.telephony_account_id ||
      body?.telephonyAccountId;
    if (!telephonyAccountId) {
      let mainLine = await base44.asServiceRole.entities.PhoneNumber.filter({
        label: TARGET_LABEL,
      });
      if (!Array.isArray(mainLine) || mainLine.length === 0) {
        // Fallback: list and fuzzy match label
        const allPhones = await base44.asServiceRole.entities.PhoneNumber
          .list();
        mainLine = (allPhones || []).filter((p) =>
          typeof p?.label === "string" &&
          p.label.toLowerCase().includes("aevoice") &&
          p.label.toLowerCase().includes("main")
        );
      }
      if (Array.isArray(mainLine) && mainLine.length > 0) {
        telephonyAccountId = mainLine[0]?.telephony_account_id;
      }
    }

    if (!telephonyAccountId) {
      return Response.json({
        error: "telephony_account_id not provided and AEVOICE Main Line not found",
      }, { status: 404 });
    }

    // 3) Find the Client for Vet N Pet Hospital
    let clients = await base44.asServiceRole.entities.Client.filter({
      name: TARGET_CLIENT_NAME,
    });
    if (!Array.isArray(clients) || clients.length === 0) {
      // Fallback: list and fuzzy match by name
      const allClients = await base44.asServiceRole.entities.Client.list();
      clients = (allClients || []).filter((c) =>
        typeof c?.name === "string" &&
        c.name.toLowerCase().includes("vet n pet")
      );
    }

    if (!Array.isArray(clients) || clients.length === 0) {
      return Response.json(
        { error: `Client not found: ${TARGET_CLIENT_NAME}` },
        { status: 404 },
      );
    }
    const client = clients[0];

    // 4) Select an appropriate Agent for that client (prefer active)
    let agents = await base44.asServiceRole.entities.Agent.filter({
      client_id: client.id,
      status: "active",
    });
    if (!Array.isArray(agents) || agents.length === 0) {
      agents = await base44.asServiceRole.entities.Agent.filter({
        client_id: client.id,
      });
    }

    if (!Array.isArray(agents) || agents.length === 0) {
      // Create a default receptionist agent for this client
      const agentPayload = {
        client_id: client.id,
        name: "Vet N Pet Receptionist",
        description: "Receptionist agent for Vet N Pet Hospital",
        agent_type: "receptionist",
        system_prompt:
          "You are the friendly receptionist for Vet N Pet Hospital. Answer calls, gather caller info, and assist with appointments. Keep it concise and helpful.",
        status: "active",
        language: "en-US",
      };
      const createdAgent = await base44.asServiceRole.entities.Agent.create(
        agentPayload,
      );
      agents = [createdAgent];
    }

    // Prefer receptionist-type or names containing vet/pet/reception if possible
    let chosenAgent = agents.find((a: any) => a?.agent_type === "receptionist");
    if (!chosenAgent) {
      chosenAgent = agents.find((a: any) =>
        typeof a?.name === "string" && /(vet|pet|reception)/i.test(a.name)
      );
    }
    if (!chosenAgent) {
      chosenAgent = agents[0];
    }

    // 5) Create the PhoneNumber
    const payload = {
      client_id: client.id,
      telephony_account_id: telephonyAccountId,
      agent_id: chosenAgent.id,
      number_e164: "+914023186215",
      sip_address: "sip:914023186215@ap.siptrunk.ims.bsnl.in:5060",
      provider: "bsnl_wings",
      label: "Vet N Pet BSNL Line",
      capabilities: ["voice"],
      status: "active",
    };

    const created = await base44.asServiceRole.entities.PhoneNumber.create(
      payload,
    );

    return Response.json({
      success: true,
      phone_number: created,
      used_agent: chosenAgent,
      client,
    });
  } catch (error) {
    logger.error("Failed to add Vet N Pet phone number", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error) || String(error),
    }, { status: 500 });
  }
});
