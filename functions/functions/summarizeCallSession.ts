import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_session_id } = await req.json();
    if (!call_session_id) {
      return Response.json({ error: 'call_session_id is required' }, { status: 400 });
    }

    const sessions = await base44.entities.CallSession.filter({ id: call_session_id });
    const session = sessions[0];
    if (!session) {
      return Response.json({ error: 'Call session not found' }, { status: 404 });
    }

    const transcript = session.transcript;
    if (!transcript || transcript.trim().length < 10) {
      return Response.json({ success: false, error: 'No transcript available for this call session' });
    }

    const channelLabel = session.channel || 'voice';
    const directionLabel = session.direction || 'unknown';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional call analysis AI for a business telephony platform. Analyze this ${channelLabel} ${directionLabel} conversation transcript thoroughly.

Transcript:
${transcript.slice(0, 12000)}

Caller: ${session.caller_name || session.from_number || 'Unknown'}
Channel: ${channelLabel}
Direction: ${directionLabel}

Provide a COMPLETE structured analysis:

1. **Summary**: Concise 2-3 sentence summary of the interaction
2. **Sentiment**: "positive", "neutral", or "negative"
3. **Sentiment Score**: -1.0 (very negative) to 1.0 (very positive)
4. **Sentiment Details**: Brief 1-sentence explanation
5. **Category**: Classify as one of: "sales_inquiry", "support_request", "appointment", "billing", "complaint", "general_inquiry", "follow_up", "urgent", "spam"
6. **Priority**: "critical" (immediate action needed), "high" (same day), "medium" (this week), "low" (no rush)
7. **Key Topics**: Main topics discussed (max 5)
8. **Action Items**: Specific follow-up tasks identified (max 5)
9. **Suggested Follow-ups**: Recommended next steps with type (email/sms/call/task), urgency (immediate/today/this_week/optional), and a short title (5-8 words)
10. **Draft Response**: Write a professional follow-up ${channelLabel === 'sms' ? 'SMS (keep under 160 chars)' : 'email'} based on the conversation. Include a subject line for emails.
11. **Outcome**: One of "appointment_booked", "information_provided", "transferred", "callback_requested", "issue_resolved", "no_outcome"`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          sentiment_score: { type: "number" },
          sentiment_details: { type: "string" },
          category: { type: "string" },
          priority: { type: "string" },
          key_topics: { type: "array", items: { type: "string" } },
          action_items: { type: "array", items: { type: "string" } },
          suggested_followups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                urgency: { type: "string" },
                title: { type: "string" }
              }
            }
          },
          draft_response: { type: "string" },
          outcome: { type: "string" }
        }
      }
    });

    const validOutcomes = ["appointment_booked", "information_provided", "transferred", "callback_requested", "issue_resolved", "no_outcome"];
    const validCategories = ["sales_inquiry", "support_request", "appointment", "billing", "complaint", "general_inquiry", "follow_up", "urgent", "spam"];
    const validPriorities = ["critical", "high", "medium", "low"];
    const validTypes = ["email", "sms", "call", "task"];
    const validUrgencies = ["immediate", "today", "this_week", "optional"];

    const updateData = {
      summary: result.summary,
      sentiment: result.sentiment,
      sentiment_score: result.sentiment_score,
      sentiment_details: result.sentiment_details,
      category: validCategories.includes(result.category) ? result.category : "general_inquiry",
      priority: validPriorities.includes(result.priority) ? result.priority : "medium",
      key_topics: result.key_topics || [],
      action_items: result.action_items || [],
      suggested_followups: result.suggested_followups || [],
      draft_response: result.draft_response || "",
      draft_response_type: (channelLabel === "sms" || channelLabel === "whatsapp") ? "sms" : "email",
      outcome: validOutcomes.includes(result.outcome) ? result.outcome : "no_outcome",
      summary_generated_at: new Date().toISOString()
    };

    await base44.entities.CallSession.update(call_session_id, updateData);

    // Auto-create FollowUp records from suggestions
    const followups = result.suggested_followups || [];
    let followupsCreated = 0;
    for (const f of followups) {
      const fType = validTypes.includes(f.type) ? f.type : "task";
      const fUrgency = validUrgencies.includes(f.urgency) ? f.urgency : "today";

      // Generate draft content for email/sms follow-ups
      let draftContent = "";
      if (fType === "email" || fType === "sms") {
        draftContent = result.draft_response || "";
      }

      await base44.entities.FollowUp.create({
        client_id: session.client_id,
        call_session_id: call_session_id,
        customer_id: session.customer_id || "",
        type: fType,
        urgency: fUrgency,
        status: "pending",
        title: f.title || f.description?.slice(0, 60) || "Follow-up",
        description: f.description || "",
        draft_content: draftContent,
        caller_name: session.caller_name || session.from_number || "Unknown",
        caller_contact: session.from_number || "",
        agent_id: session.agent_id || "",
        call_summary: result.summary || "",
        call_sentiment: result.sentiment || "neutral",
        call_category: updateData.category
      });
      followupsCreated++;
    }

    return Response.json({ success: true, followups_created: followupsCreated, ...updateData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});