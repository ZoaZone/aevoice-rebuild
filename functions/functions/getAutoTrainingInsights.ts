// functions/getAutoTrainingInsights.js
// Get auto-training insights for a client's agent

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get agent_id from query or body
    let agentId;
    if (req.method === "GET") {
      const url = new URL(req.url);
      agentId = url.searchParams.get("agent_id");
    } else {
      const body = await req.json();
      agentId = body.agent_id;
    }

    // Get client using service role to bypass RLS
    let clients = [];
    try {
      clients = await base44.asServiceRole.entities.Client.filter({
        contact_email: user.email,
      });
      if (!clients || clients.length === 0) {
        clients = await base44.asServiceRole.entities.Client.filter({
          created_by: user.email,
        });
      }
    } catch (e) {
      console.error("Client fetch error:", e);
    }
    const client = clients[0];

    if (!client) {
      return Response.json({
        success: true,
        insights: {
          has_training: false,
          message: "No client found. Complete onboarding to create your account.",
        },
      });
    }

    // Get agents using service role to bypass RLS
    let agents;
    try {
      if (agentId) {
        agents = await base44.asServiceRole.entities.Agent.filter({
          id: agentId,
          client_id: client.id,
        });
      } else {
        agents = await base44.asServiceRole.entities.Agent.filter({
          client_id: client.id,
        });
      }
    } catch (e) {
      console.error("Agent fetch error:", e);
      agents = [];
    }

    if (!agents || agents.length === 0) {
      return Response.json({
        success: true,
        insights: {
          has_training: false,
          client_id: client.id,
          message: "No AI agent found. Create your first agent to get started.",
        },
      });
    }

    const agent = agents[0];

    // Get knowledge bases linked to agent
    const kbIds = agent.knowledge_base_ids || [];

    if (kbIds.length === 0) {
      return Response.json({
        success: true,
        insights: {
          has_training: false,
          agent_id: agent.id,
          agent_name: agent.name,
          message: "AI agent created but not yet trained. Add knowledge to train your agent.",
        },
      });
    }

    // Get knowledge bases using service role
    let knowledgeBases = [];
    try {
      knowledgeBases = await base44.asServiceRole.entities.KnowledgeBase.filter(
        { client_id: client.id },
      );
    } catch (e) {
      console.error("KB fetch error:", e);
    }
    const linkedKbs = knowledgeBases.filter((kb) => kbIds.includes(kb.id));

    if (linkedKbs.length === 0) {
      return Response.json({
        success: true,
        insights: {
          has_training: false,
          agent_id: agent.id,
          agent_name: agent.name,
          message: "Knowledge base not found. Add knowledge to train your agent.",
        },
      });
    }

    const primaryKb = linkedKbs[0];

    // Get knowledge chunks using service role
    let chunks = [];
    try {
      chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
        knowledge_base_id: primaryKb.id,
      });
    } catch (e) {
      console.error("Chunk fetch error:", e);
    }

    // Extract structured data from KB
    const extractedInfo = {
      company_name: primaryKb.business_name || client.name || "Your Company",
      description: primaryKb.description || "",
      services: primaryKb.services || [],
      industry: primaryKb.industry || client.industry || "",
      contact_info: {
        email: client.contact_email,
        phone: client.contact_phone,
        ...(primaryKb.location || {}),
      },
      key_facts: [],
      faqs: primaryKb.faqs || [],
      business_hours: primaryKb.business_hours || {},
      target_audience: primaryKb.target_audience || "",
    };

    // Count unique sources (pages)
    const sources = chunks.map((c) => c.source_ref).filter(Boolean);
    const uniqueSources = [...new Set(sources)];

    // Calculate completeness
    const hasCompany = !!extractedInfo.company_name &&
      extractedInfo.company_name !== "Your Company";
    const hasServices = extractedInfo.services.length > 0;
    const hasFaqs = extractedInfo.faqs.length > 0;
    const hasContact = !!extractedInfo.contact_info.email ||
      !!extractedInfo.contact_info.phone;
    const hasChunks = chunks.length > 0;

    const completenessFactors = [
      hasCompany,
      hasServices,
      hasFaqs,
      hasContact,
      hasChunks,
    ];
    const completenessScore = Math.round(
      (completenessFactors.filter(Boolean).length /
        completenessFactors.length) * 100,
    );

    // Determine training status
    const trainingStatus = completenessScore >= 60
      ? "ready"
      : completenessScore >= 30
      ? "partial"
      : "minimal";

    logger.info("Auto-training insights fetched", {
      request_id: requestId,
      agent_id: agent.id,
      completeness_score: completenessScore,
    });

    return Response.json({
      success: true,
      insights: {
        has_training: true,
        training_status: trainingStatus,
        agent_id: agent.id,
        agent_name: agent.name,
        agent_status: agent.status,
        extracted_info: extractedInfo,
        stats: {
          pages_analyzed: uniqueSources.length,
          knowledge_chunks: chunks.length,
          services_found: extractedInfo.services.length,
          faqs_found: extractedInfo.faqs.length,
          completeness_score: completenessScore,
        },
        completeness: {
          has_company_info: hasCompany,
          has_services: hasServices,
          has_faqs: hasFaqs,
          has_contact: hasContact,
          has_knowledge_chunks: hasChunks,
          pages_analyzed: uniqueSources.length,
          total_chunks: chunks.length,
        },
        knowledge_bases: linkedKbs.map((kb) => ({
          id: kb.id,
          name: kb.name,
          type: kb.type,
          chunk_count: kb.chunk_count || 0,
          last_synced: kb.last_synced_at,
        })),
        trained_at: primaryKb.last_synced_at || primaryKb.created_date,
        website_url: agent.website_url ||
          primaryKb.sync_config?.source_urls?.[0] || null,
      },
    });
  } catch (err) {
    logger.error("getAutoTrainingInsights failed", {
      request_id: requestId,
      error: err.message,
    });

    return Response.json({ success: false, error: err.message }, {
      status: 500,
    });
  }
});
