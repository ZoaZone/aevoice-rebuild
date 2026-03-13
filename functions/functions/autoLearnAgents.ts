import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Auto-learn agents request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);

    // Get all agents with learning enabled
    const agents = await base44.asServiceRole.entities.Agent.filter({
      learning_enabled: true,
    });

    const results = [];

    for (const agent of agents) {
      const result = {
        agent_id: agent.id,
        agent_name: agent.name,
        actions: [],
      };

      // 1. Auto-update from website
      if (agent.auto_update_website && agent.website_url) {
        const shouldUpdate = (() => {
          if (agent.update_frequency === "daily") return true;
          if (agent.update_frequency === "weekly") {
            const lastUpdate = agent.last_learning_update
              ? new Date(agent.last_learning_update)
              : new Date(0);
            const daysSince = (Date.now() - lastUpdate.getTime()) /
              (1000 * 60 * 60 * 24);
            return daysSince >= 7;
          }
          return false;
        })();

        if (shouldUpdate) {
          try {
            const scrapeResult = await base44.asServiceRole.functions.invoke(
              "scrapeWebsiteKnowledge",
              {
                url: agent.website_url,
                client_id: agent.client_id,
                agent_id: agent.id,
              },
            );

            result.actions.push({
              type: "website_update",
              success: scrapeResult.data?.success || false,
              chunks_created: scrapeResult.data?.chunks_created || 0,
            });
          } catch (error) {
            result.actions.push({
              type: "website_update",
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // 2. Learn from recent conversations
      if (agent.conversation_learning) {
        try {
          const learnResult = await base44.asServiceRole.functions.invoke(
            "learnFromConversations",
            {
              agent_id: agent.id,
            },
          );

          result.actions.push({
            type: "conversation_learning",
            success: learnResult.data?.success || false,
            gaps_found: learnResult.data?.knowledge_gaps_found || 0,
          });
        } catch (error) {
          result.actions.push({
            type: "conversation_learning",
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 3. Send summary email if gaps found
      const gaps = await base44.asServiceRole.entities.KnowledgeGap.filter({
        agent_id: agent.id,
        status: "pending",
      });

      if (gaps.length >= 5) {
        // Get client to find owner email
        const client = await base44.asServiceRole.entities.Client.filter({
          id: agent.client_id,
        });
        if (client[0]?.contact_email) {
          await base44.integrations.Core.SendEmail({
            to: client[0].contact_email,
            subject: `🔔 ${agent.name} found ${gaps.length} knowledge gaps`,
            body: `
              <h2>Your AI Agent Needs Training</h2>
              <p>Hello! Your agent "${agent.name}" has identified ${gaps.length} common questions it can't answer confidently.</p>
              
              <h3>Top Unanswered Questions:</h3>
              <ul>
                ${
              gaps.slice(0, 5).map((g) =>
                `<li><strong>${g.question}</strong> (asked ${g.frequency} times)</li>`
              ).join("")
            }
              </ul>
              
              <p>
                <a href="https://app.aevoice.ai/AgentTrainingDashboard" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                  Review & Add Answers
                </a>
              </p>
            `,
          });

          result.actions.push({
            type: "email_alert",
            success: true,
            gaps_count: gaps.length,
          });
        }
      }

      results.push(result);
    }

    return Response.json({
      success: true,
      agents_processed: agents.length,
      results,
    });
  } catch (error) {
    logger.error("Auto-learn agents failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
