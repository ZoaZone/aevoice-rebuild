import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS headers for widget embedding
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const base44 = createClientFromRequest(req);

    const { session_id, name, email, phone, agent_id, client_id } = await req
      .json();

    if (!session_id || !email) {
      logger.error("Missing required fields", {
        request_id: requestId,
        session_id,
        email,
      });
      return Response.json({ error: "Session ID and email are required" }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get session and validate it exists and matches agent/client
    const sessions = await base44.asServiceRole.entities.WidgetConversation
      .filter({
        session_id,
      });

    if (sessions.length === 0) {
      logger.error("Session not found", { request_id: requestId, session_id });
      return Response.json({ error: "Session not found" }, {
        status: 404,
        headers: corsHeaders,
      });
    }

    const session = sessions[0];

    // Validate session belongs to the claimed agent/client (if provided)
    if (agent_id && session.agent_id !== agent_id) {
      logger.error("Agent ID mismatch", {
        request_id: requestId,
        session_agent: session.agent_id,
        claimed_agent: agent_id,
      });
      return Response.json({ error: "Invalid session" }, {
        status: 403,
        headers: corsHeaders,
      });
    }

    if (client_id && session.client_id !== client_id) {
      logger.error("Client ID mismatch", {
        request_id: requestId,
        session_client: session.client_id,
        claimed_client: client_id,
      });
      return Response.json({ error: "Invalid session" }, {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Check if lead already captured (prevent duplicates)
    if (session.lead_captured) {
      logger.info("Lead already captured", {
        request_id: requestId,
        session_id,
      });
      return Response.json({
        success: true,
        message: "Lead already captured",
      }, { headers: corsHeaders });
    }

    // Update session with lead info
    await base44.asServiceRole.entities.WidgetConversation.update(session.id, {
      lead_captured: true,
      lead_name: name,
      lead_email: email,
      lead_phone: phone,
      lead_captured_at: new Date().toISOString(),
    });

    logger.info("Lead captured", {
      request_id: requestId,
      session_id,
      email,
      agent_id: session.agent_id,
      client_id: session.client_id,
    });

    // Update analytics
    const today = new Date().toISOString().split("T")[0];
    const analytics = await base44.asServiceRole.entities.WidgetAnalytics
      .filter({ date: today, agent_id: session.agent_id });

    if (analytics.length > 0) {
      const current = analytics[0];
      await base44.asServiceRole.entities.WidgetAnalytics.update(current.id, {
        leads_captured: (current.leads_captured || 0) + 1,
      });
    } else {
      await base44.asServiceRole.entities.WidgetAnalytics.create({
        date: today,
        agent_id: session.agent_id,
        client_id: session.client_id,
        leads_captured: 1,
      });
    }

    // Send email notification to admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: "care@aevoice.ai",
        subject: "🎯 New Lead Captured via Widget",
        body: `
New lead captured from website widget!

Name: ${name || "Not provided"}
Email: ${email}
Phone: ${phone || "Not provided"}
Website: ${session.website_url || "N/A"}
Conversation: ${session.message_count || 0} messages
Agent ID: ${session.agent_id}
Client ID: ${session.client_id}

View full conversation: https://aevoice.ai/AdminDashboard
        `,
      });
    } catch (emailError) {
      logger.error("Failed to send email notification", {
        request_id: requestId,
        error: emailError.message,
      });
    }

    return Response.json({
      success: true,
      message: "Lead captured successfully",
    }, { headers: corsHeaders });
  } catch (error) {
    logger.error("Lead capture error", {
      request_id: requestId,
      error: error.message,
    });
    return Response.json({ error: error.message }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
