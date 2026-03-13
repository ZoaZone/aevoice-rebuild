import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getAgentKnowledgeChunks } from "./lib/knowledgeSharing.ts";
import { logger } from "./lib/infra/logger.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  console.log("[KnowledgeUnified] Request received");

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.warn("[KnowledgeUnified] Unauthorized access attempt");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[KnowledgeUnified] User authenticated:", {
      email: user.email,
    });

    const {
      client_id,
      agent_id,
      include_hellobiz,
      include_flowsync,
      sync_action,
    } = await req.json();
    console.log("[KnowledgeUnified] Request params:", {
      client_id,
      agent_id,
      include_hellobiz,
      include_flowsync,
      sync_action,
    });

    // Get AEVOICE knowledge bases
    const targetClientId = client_id || user.client_id;
    console.log(
      "[KnowledgeUnified] Fetching knowledge bases for client:",
      targetClientId,
    );

    const knowledgeBases = await base44.entities.KnowledgeBase.filter({
      client_id: targetClientId,
    });

    console.log(
      "[KnowledgeUnified] Knowledge bases found:",
      knowledgeBases.length,
    );

    const knowledgeChunks = [];
    for (const kb of knowledgeBases) {
      console.log("[KnowledgeUnified] Fetching chunks for KB:", {
        id: kb.id,
        name: kb.name,
      });
      try {
        let chunks;

        // If agent_id is provided, use agent-specific filtering
        if (agent_id) {
          console.log(
            "[KnowledgeUnified] Using agent-specific filtering:",
            agent_id,
          );
          chunks = await getAgentKnowledgeChunks(
            base44,
            agent_id,
            [kb.id],
            true, // include global
          );
        } else {
          // Legacy: get all chunks
          chunks = await base44.entities.KnowledgeChunk.filter({
            knowledge_base_id: kb.id,
          });
        }

        console.log("[KnowledgeUnified] Chunks fetched for KB:", {
          kb_id: kb.id,
          count: chunks.length,
          agent_filtered: !!agent_id,
        });
        knowledgeChunks.push(...chunks.map((chunk) => ({
          ...chunk,
          source_platform: "aevoice",
          knowledge_base_name: kb.name,
        })));
      } catch (chunkError) {
        console.error("[KnowledgeUnified] Error fetching chunks for KB:", {
          kb_id: kb.id,
          error: chunkError,
        });
      }
    }

    console.log(
      "[KnowledgeUnified] Total chunks collected:",
      knowledgeChunks.length,
    );

    // Fetch HelloBiz knowledge if requested
    const hellobizKnowledge = [];
    if (include_hellobiz) {
      console.log("[KnowledgeUnified] Fetching HelloBiz knowledge");

      try {
        const helloBizProfiles = await base44.asServiceRole.entities
          .HelloBizProfile
          .filter({
            client_id: targetClientId,
            status: "active",
          });

        for (const profile of helloBizProfiles) {
          const knowledgeResult = await base44.functions.invoke(
            "helloBizIntegration",
            {
              action: "get_knowledge",
              profile_id: profile.id,
            },
          );

          if (knowledgeResult.data) {
            const { services, faqs, business_info } = knowledgeResult.data;

            // Convert services to knowledge chunks
            for (const service of services || []) {
              hellobizKnowledge.push({
                content:
                  `Service: ${service.name}\nDescription: ${service.description}\nCategory: ${service.category}\nPrice: $${service.price}`,
                source_platform: "hellobiz",
                source_type: "service",
                source_id: service.id,
                metadata: {
                  service_name: service.name,
                  category: service.category,
                },
              });
            }

            // Convert FAQs to knowledge chunks
            for (const faq of faqs || []) {
              hellobizKnowledge.push({
                content: `Q: ${faq.question}\nA: ${faq.answer}`,
                source_platform: "hellobiz",
                source_type: "faq",
                source_id: faq.id,
                metadata: {
                  question: faq.question,
                },
              });
            }

            // Business info as knowledge
            if (business_info) {
              hellobizKnowledge.push({
                content: JSON.stringify(business_info, null, 2),
                source_platform: "hellobiz",
                source_type: "business_info",
                metadata: {
                  business_name: business_info.business_name,
                },
              });
            }
          }
        }

        console.log(
          "[KnowledgeUnified] HelloBiz knowledge fetched:",
          hellobizKnowledge.length,
        );
      } catch (error) {
        console.error(
          "[KnowledgeUnified] Error fetching HelloBiz knowledge:",
          error,
        );
        // Continue with partial data
      }
    }

    // Fetch FlowSync knowledge if requested
    const flowsyncKnowledge = [];
    if (include_flowsync) {
      console.log("[KnowledgeUnified] Fetching FlowSync knowledge");

      try {
        const workflows = await base44.asServiceRole.entities.FlowSyncWorkflow
          .filter({
            client_id: targetClientId,
          });

        for (const workflow of workflows) {
          flowsyncKnowledge.push({
            content:
              `Workflow: ${workflow.name}\nDescription: ${workflow.description}\nTrigger: ${workflow.trigger_type}\nSteps: ${
                workflow.steps?.length || 0
              }`,
            source_platform: "flowsync",
            source_type: "workflow",
            source_id: workflow.id,
            metadata: {
              workflow_name: workflow.name,
              trigger_type: workflow.trigger_type,
              status: workflow.status,
            },
          });
        }

        console.log(
          "[KnowledgeUnified] FlowSync knowledge fetched:",
          flowsyncKnowledge.length,
        );
      } catch (error) {
        console.error(
          "[KnowledgeUnified] Error fetching FlowSync knowledge:",
          error,
        );
        // Continue with partial data
      }
    }

    // Create sync log
    await base44.asServiceRole.entities.KnowledgeSyncLog.create({
      client_id: targetClientId,
      sync_type: "unified_fetch",
      sources: [
        "aevoice",
        ...(include_hellobiz ? ["hellobiz"] : []),
        ...(include_flowsync ? ["flowsync"] : []),
      ],
      total_items: knowledgeChunks.length + hellobizKnowledge.length +
        flowsyncKnowledge.length,
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      metadata: {
        request_id: requestId,
        aevoice_count: knowledgeChunks.length,
        hellobiz_count: hellobizKnowledge.length,
        flowsync_count: flowsyncKnowledge.length,
      },
    });

    console.log("[KnowledgeUnified] Returning unified knowledge:", {
      aevoice_count: knowledgeChunks.length,
      hellobiz_count: hellobizKnowledge.length,
      flowsync_count: flowsyncKnowledge.length,
      total: knowledgeChunks.length + hellobizKnowledge.length +
        flowsyncKnowledge.length,
    });

    return Response.json({
      success: true,
      total_chunks: knowledgeChunks.length + hellobizKnowledge.length +
        flowsyncKnowledge.length,
      knowledge: {
        aevoice: knowledgeChunks,
        hellobiz: hellobizKnowledge,
        flowsync: flowsyncKnowledge,
      },
      sync_log_id: requestId,
    });
  } catch (error) {
    console.error("[KnowledgeUnified] Error:", error);
    logger.error("Knowledge unified sync error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      details: "Failed to fetch unified knowledge",
    }, { status: 500 });
  }
});
