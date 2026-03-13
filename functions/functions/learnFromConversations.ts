import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Learn from conversations request started", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agent_id, call_session_ids } = await req.json();

    if (!agent_id) {
      return Response.json({ error: "agent_id required" }, { status: 400 });
    }

    // Fetch call sessions
    const calls = call_session_ids
      ? await Promise.all(
        call_session_ids.map((id) => base44.asServiceRole.entities.CallSession.filter({ id })),
      )
      : await base44.asServiceRole.entities.CallSession.filter(
        { agent_id },
        "-started_at",
        50,
      );

    const callsList = calls.flat();
    const knowledgeGaps = [];

    // Analyze each call transcript
    for (const call of callsList) {
      if (!call.transcript) continue;

      // Use LLM to analyze transcript for knowledge gaps
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt:
          `Analyze this call transcript and identify questions the AI couldn't answer confidently:

Transcript:
${call.transcript}

Return JSON with:
- unanswered_questions: array of questions asked but not answered well
- confidence_issues: array of answers given with low confidence
- successful_exchanges: array of Q&A pairs that worked well

Focus on customer questions where the AI seemed uncertain, repeated itself, or couldn't provide a clear answer.`,
        response_json_schema: {
          type: "object",
          properties: {
            unanswered_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  context: { type: "string" },
                },
              },
            },
            confidence_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  weak_answer: { type: "string" },
                },
              },
            },
            successful_exchanges: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                },
              },
            },
          },
        },
      });

      // Create knowledge gaps
      for (const unanswered of analysis.unanswered_questions || []) {
        // Check if gap already exists
        const existingGaps = await base44.asServiceRole.entities.KnowledgeGap
          .filter({
            agent_id,
            question: unanswered.question,
          });

        if (existingGaps.length > 0) {
          // Increment frequency
          const gap = existingGaps[0];
          await base44.asServiceRole.entities.KnowledgeGap.update(gap.id, {
            frequency: (gap.frequency || 1) + 1,
            call_session_ids: [...(gap.call_session_ids || []), call.id],
          });
        } else {
          // Generate suggested answer
          const suggestion = await base44.integrations.Core.InvokeLLM({
            prompt:
              `Based on this unanswered question from a customer call, generate a professional, helpful answer:

Question: ${unanswered.question}
Context: ${unanswered.context}

Provide a clear, concise answer as if you were the business owner.`,
            add_context_from_internet: false,
          });

          // Create new gap
          await base44.asServiceRole.entities.KnowledgeGap.create({
            agent_id,
            question: unanswered.question,
            frequency: 1,
            call_session_ids: [call.id],
            status: "pending",
            suggested_answer: suggestion,
            confidence_scores: [0.3],
            caller_feedback: call.sentiment === "negative" ? "unsatisfied" : "unknown",
          });

          knowledgeGaps.push(unanswered.question);
        }
      }
    }

    // Update agent's knowledge coverage score
    const totalGaps = await base44.asServiceRole.entities.KnowledgeGap.filter({
      agent_id,
    });
    const resolvedGaps = totalGaps.filter((g) => g.status === "resolved");
    const coverageScore = totalGaps.length > 0
      ? Math.round((resolvedGaps.length / totalGaps.length) * 100)
      : 100;

    await base44.asServiceRole.entities.Agent.update(agent_id, {
      knowledge_coverage_score: coverageScore,
      last_learning_update: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      calls_analyzed: callsList.length,
      knowledge_gaps_found: knowledgeGaps.length,
      coverage_score: coverageScore,
    });
  } catch (error) {
    logger.error("Learn from conversations failed", {
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
