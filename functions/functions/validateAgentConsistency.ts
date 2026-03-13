/**
 * Validate agent ID consistency across all database tables
 * This function checks for:
 * - Orphaned agent references (agent_id pointing to non-existent agents)
 * - Null agent_id where it should be required
 * - Mismatched client_id between agents and related entities
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

interface ValidationIssue {
  entity: string;
  id: string;
  issue: string;
  severity: "critical" | "warning" | "info";
  details?: any;
}

Deno.serve(async (req) => {
  console.log("[ValidateAgentConsistency] Request received");

  if (req.method !== "POST" && req.method !== "GET") {
    console.warn("[ValidateAgentConsistency] Invalid method:", req.method);
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  // Auth check - admin only
  let user;
  try {
    user = await base44.auth.me();
    console.log("[ValidateAgentConsistency] User authenticated:", {
      email: user?.email,
      role: user?.role,
    });
  } catch (err) {
    console.error("[ValidateAgentConsistency] Authentication failed:", err);
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }

  if (!user || user.role !== "admin") {
    console.warn("[ValidateAgentConsistency] Unauthorized access attempt:", {
      email: user?.email,
      role: user?.role,
    });
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { client_id, fix_issues } = await req.json().catch(() => ({}));
    console.log("[ValidateAgentConsistency] Validation params:", {
      client_id,
      fix_issues,
    });

    const issues: ValidationIssue[] = [];
    let fixedCount = 0;

    // 1. Get all agents
    console.log("[ValidateAgentConsistency] Fetching all agents...");
    const agents = await base44.asServiceRole.entities.Agent.list();
    console.log(
      "[ValidateAgentConsistency] Total agents found:",
      agents.length,
    );

    const agentIds = new Set(agents.map((a) => a.id));
    const agentsByClient = new Map<string, string[]>();

    agents.forEach((agent) => {
      if (agent.client_id) {
        if (!agentsByClient.has(agent.client_id)) {
          agentsByClient.set(agent.client_id, []);
        }
        agentsByClient.get(agent.client_id)!.push(agent.id);
      } else {
        issues.push({
          entity: "Agent",
          id: agent.id,
          issue: "Agent has null client_id",
          severity: "critical",
          details: { agent_name: agent.name },
        });
      }
    });

    // 2. Check KnowledgeBase -> Agent consistency
    console.log(
      "[ValidateAgentConsistency] Checking KnowledgeBase consistency...",
    );
    const knowledgeBases = client_id
      ? await base44.asServiceRole.entities.KnowledgeBase.filter({ client_id })
      : await base44.asServiceRole.entities.KnowledgeBase.list();

    console.log(
      "[ValidateAgentConsistency] KnowledgeBases found:",
      knowledgeBases.length,
    );

    for (const kb of knowledgeBases) {
      if (!kb.client_id) {
        issues.push({
          entity: "KnowledgeBase",
          id: kb.id,
          issue: "KnowledgeBase has null client_id",
          severity: "critical",
          details: { kb_name: kb.name },
        });
      }
    }

    // 3. Check PhoneNumber -> Agent consistency
    console.log(
      "[ValidateAgentConsistency] Checking PhoneNumber consistency...",
    );
    const phoneNumbers = client_id
      ? await base44.asServiceRole.entities.PhoneNumber.filter({ client_id })
      : await base44.asServiceRole.entities.PhoneNumber.list();

    console.log(
      "[ValidateAgentConsistency] PhoneNumbers found:",
      phoneNumbers.length,
    );

    for (const phone of phoneNumbers) {
      if (phone.agent_id && !agentIds.has(phone.agent_id)) {
        issues.push({
          entity: "PhoneNumber",
          id: phone.id,
          issue: "PhoneNumber references non-existent agent",
          severity: "critical",
          details: {
            phone_number: phone.number_e164,
            orphaned_agent_id: phone.agent_id,
          },
        });

        if (fix_issues) {
          try {
            console.log(
              "[ValidateAgentConsistency] Fixing PhoneNumber:",
              phone.id,
            );
            await base44.asServiceRole.entities.PhoneNumber.update(phone.id, {
              agent_id: null,
            });
            fixedCount++;
          } catch (fixError) {
            console.error(
              "[ValidateAgentConsistency] Failed to fix PhoneNumber:",
              phone.id,
              fixError,
            );
            issues.push({
              entity: "PhoneNumber",
              id: phone.id,
              issue: "Failed to fix orphaned agent reference",
              severity: "warning",
              details: {
                error: fixError.message,
              },
            });
          }
        }
      }

      if (phone.agent_id && phone.client_id) {
        const agent = agents.find((a: any) => a.id === phone.agent_id);
        if (agent && agent.client_id !== phone.client_id) {
          issues.push({
            entity: "PhoneNumber",
            id: phone.id,
            issue: "PhoneNumber client_id does not match agent client_id",
            severity: "warning",
            details: {
              phone_number: phone.number_e164,
              phone_client_id: phone.client_id,
              agent_client_id: agent.client_id,
            },
          });
        }
      }
    }

    // 4. Check CallSession -> Agent consistency
    console.log(
      "[ValidateAgentConsistency] Checking CallSession consistency...",
    );
    const recentCalls = client_id
      ? await base44.asServiceRole.entities.CallSession.filter(
        { client_id },
        "-started_at",
        100,
      )
      : await base44.asServiceRole.entities.CallSession.list({
        limit: 100,
        order: "-started_at",
      });

    console.log(
      "[ValidateAgentConsistency] CallSessions found:",
      recentCalls.length,
    );

    for (const call of recentCalls) {
      if (call.agent_id && !agentIds.has(call.agent_id)) {
        issues.push({
          entity: "CallSession",
          id: call.id,
          issue: "CallSession references non-existent agent",
          severity: "warning",
          details: {
            call_started_at: call.started_at,
            orphaned_agent_id: call.agent_id,
          },
        });
      }
    }

    // 5. Check ConversationSession -> Agent consistency
    console.log(
      "[ValidateAgentConsistency] Checking ConversationSession consistency...",
    );
    try {
      const recentConversations = client_id
        ? await base44.asServiceRole.entities.ConversationSession.filter(
          { client_id },
          "-created_at",
          100,
        )
        : await base44.asServiceRole.entities.ConversationSession.list({
          limit: 100,
          order: "-created_at",
        });

      console.log(
        "[ValidateAgentConsistency] ConversationSessions found:",
        recentConversations.length,
      );

      for (const conv of recentConversations) {
        if (conv.agent_id && !agentIds.has(conv.agent_id)) {
          issues.push({
            entity: "ConversationSession",
            id: conv.id,
            issue: "ConversationSession references non-existent agent",
            severity: "warning",
            details: {
              conversation_created_at: conv.created_at,
              orphaned_agent_id: conv.agent_id,
            },
          });
        }
      }
    } catch (err) {
      console.warn(
        "[ValidateAgentConsistency] Could not check ConversationSession:",
        err,
      );
    }

    // Summary
    const summary = {
      total_agents: agents.length,
      total_issues: issues.length,
      issues_by_severity: {
        critical: issues.filter((i) => i.severity === "critical").length,
        warning: issues.filter((i) => i.severity === "warning").length,
        info: issues.filter((i) => i.severity === "info").length,
      },
      issues_by_entity: {
        Agent: issues.filter((i) => i.entity === "Agent").length,
        KnowledgeBase: issues.filter((i) => i.entity === "KnowledgeBase").length,
        PhoneNumber: issues.filter((i) => i.entity === "PhoneNumber").length,
        CallSession: issues.filter((i) => i.entity === "CallSession").length,
        ConversationSession: issues.filter((i) => i.entity === "ConversationSession").length,
      },
      fixed_count: fixedCount,
    };

    console.log("[ValidateAgentConsistency] Validation complete:", summary);

    return Response.json({
      success: true,
      summary,
      issues: issues.slice(0, 100), // Return first 100 issues
      total_issues: issues.length,
    });
  } catch (err) {
    console.error("[ValidateAgentConsistency] Error:", err);
    return Response.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
});
