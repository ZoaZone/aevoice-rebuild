// functions/exportUserData.ts
// GDPR right to data portability - export all user data
// Exports user's personal data in JSON/CSV format

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { format = "json", user_id } = await req.json();

    // Allow users to export their own data, or admins to export any user
    const targetUserId = user_id || user.id;
    if (targetUserId !== user.id && user.role !== "admin") {
      return Response.json(
        { error: "Cannot export data for other users" },
        { status: 403 },
      );
    }

    logger.info("User data export started", {
      request_id: requestId,
      target_user_id: targetUserId,
      requested_by: user.email,
      format,
    });

    const userData: Record<string, any> = {
      metadata: {
        export_date: new Date().toISOString(),
        user_id: targetUserId,
        request_id: requestId,
        format,
      },
      user_profile: {},
      clients: [],
      agencies: [],
      agents: [],
      knowledge_bases: [],
      conversations: [],
      call_sessions: [],
      analytics: [],
      affiliates: [],
      commission_events: [],
    };

    // 1. Export user profile
    try {
      const userRecord = await base44.asServiceRole.entities.User.findById(
        targetUserId,
      );
      if (userRecord) {
        userData.user_profile = {
          id: userRecord.id,
          email: userRecord.email,
          full_name: userRecord.full_name,
          role: userRecord.role,
          created_at: userRecord.created_at,
          metadata: userRecord.metadata || {},
        };
      }
    } catch (err) {
      logger.warn("User profile not found", {
        request_id: requestId,
        user_id: targetUserId,
      });
    }

    // 2. Export clients owned by user
    try {
      const clients = await base44.asServiceRole.entities.Client.filter({
        contact_email: user.email,
      });
      userData.clients = clients.map((c) => ({
        id: c.id,
        name: c.name,
        website: c.website,
        contact_email: c.contact_email,
        phone: c.phone,
        created_at: c.created_at,
        metadata: c.metadata || {},
      }));
    } catch (err) {
      logger.warn("Error exporting clients", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 3. Export agencies
    try {
      const agencies = await base44.asServiceRole.entities.Agency.filter({
        primary_email: user.email,
      });
      userData.agencies = agencies.map((a) => ({
        id: a.id,
        name: a.name,
        primary_email: a.primary_email,
        tier: a.tier,
        mrr: a.mrr,
        created_at: a.created_at,
        metadata: a.metadata || {},
      }));
    } catch (err) {
      logger.warn("Error exporting agencies", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 4. Export agents created by user's clients
    try {
      const clientIds = userData.clients.map((c) => c.id);
      if (clientIds.length > 0) {
        const agents = await base44.asServiceRole.entities.Agent.filter({
          client_id: { in: clientIds },
        });
        userData.agents = agents.map((a) => ({
          id: a.id,
          name: a.name,
          client_id: a.client_id,
          system_prompt: a.system_prompt,
          voice_id: a.voice_id,
          language: a.language,
          status: a.status,
          created_at: a.created_at,
          metadata: a.metadata || {},
        }));
      }
    } catch (err) {
      logger.warn("Error exporting agents", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 5. Export knowledge bases
    try {
      const clientIds = userData.clients.map((c) => c.id);
      if (clientIds.length > 0) {
        const kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({
          client_id: { in: clientIds },
        });
        userData.knowledge_bases = kbs.map((kb) => ({
          id: kb.id,
          name: kb.name,
          client_id: kb.client_id,
          source_url: kb.source_url,
          total_chunks: kb.total_chunks,
          status: kb.status,
          created_at: kb.created_at,
        }));
      }
    } catch (err) {
      logger.warn("Error exporting knowledge bases", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 6. Export conversations (limited to last 1000)
    try {
      const agentIds = userData.agents.map((a) => a.id);
      if (agentIds.length > 0) {
        const conversations = await base44.asServiceRole.entities.Conversation
          .filter({
            agent_id: { in: agentIds },
          }).limit(1000);
        userData.conversations = conversations.map((conv) => ({
          id: conv.id,
          agent_id: conv.agent_id,
          session_id: conv.session_id,
          user_message: conv.user_message,
          ai_response: conv.ai_response,
          sentiment: conv.sentiment,
          created_at: conv.created_at,
        }));
      }
    } catch (err) {
      logger.warn("Error exporting conversations", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 7. Export call sessions (limited to last 500)
    try {
      const agentIds = userData.agents.map((a) => a.id);
      if (agentIds.length > 0) {
        const sessions = await base44.asServiceRole.entities.CallSession.filter(
          {
            agent_id: { in: agentIds },
          },
        ).limit(500);
        userData.call_sessions = sessions.map((s) => ({
          id: s.id,
          agent_id: s.agent_id,
          phone_number: s.phone_number,
          duration_seconds: s.duration_seconds,
          status: s.status,
          sentiment: s.sentiment,
          created_at: s.created_at,
        }));
      }
    } catch (err) {
      logger.warn("Error exporting call sessions", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 8. Export analytics
    try {
      const clientIds = userData.clients.map((c) => c.id);
      if (clientIds.length > 0) {
        const analytics = await base44.asServiceRole.entities.WidgetAnalytics
          .filter({
            client_id: { in: clientIds },
          }).limit(365); // Last year
        userData.analytics = analytics.map((a) => ({
          id: a.id,
          client_id: a.client_id,
          date: a.date,
          total_conversations: a.total_conversations,
          leads_captured: a.leads_captured,
          average_response_time_ms: a.average_response_time_ms,
        }));
      }
    } catch (err) {
      logger.warn("Error exporting analytics", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 9. Export affiliate data
    try {
      const affiliates = await base44.asServiceRole.entities.Affiliate.filter({
        email: user.email,
      });
      userData.affiliates = affiliates.map((a) => ({
        id: a.id,
        email: a.email,
        referral_code: a.referral_code,
        commission_rate: a.commission_rate,
        total_earned: a.total_earned,
        tier: a.tier,
        created_at: a.created_at,
      }));
    } catch (err) {
      logger.warn("Error exporting affiliates", {
        request_id: requestId,
        error: err.message,
      });
    }

    // 10. Export commission events
    try {
      const affiliateIds = userData.affiliates.map((a) => a.id);
      if (affiliateIds.length > 0) {
        const events = await base44.asServiceRole.entities.CommissionEvent
          .filter({
            owner_id: { in: affiliateIds },
          }).limit(500);
        userData.commission_events = events.map((e) => ({
          id: e.id,
          event_type: e.event_type,
          owner_type: e.owner_type,
          gross_amount_usd: e.gross_amount_usd,
          commission_amount_usd: e.commission_amount_usd,
          status: e.status,
          created_at: e.created_at,
        }));
      }
    } catch (err) {
      logger.warn("Error exporting commission events", {
        request_id: requestId,
        error: err.message,
      });
    }

    // Log export request
    logger.info("User data export completed", {
      request_id: requestId,
      target_user_id: targetUserId,
      requested_by: user.email,
      total_records: Object.values(userData).reduce(
        (sum, val) => sum + (Array.isArray(val) ? val.length : 0),
        0,
      ),
    });

    // Format response
    if (format === "csv") {
      // TODO: Convert to CSV format (complex, would need separate function)
      return Response.json({
        error: "CSV export not yet implemented. Use format=json",
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      data: userData,
      request_id: requestId,
    });
  } catch (error) {
    logger.error("User data export failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error) || "Internal server error",
      },
      { status: 500 },
    );
  }
});
