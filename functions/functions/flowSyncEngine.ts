// functions/flowSyncEngine.js
// Enhanced FlowSync Automation Engine with full trigger/action support
//
// AUTO-TRIGGER CAPABILITY:
// This engine supports automatic workflow execution when credentials are added
// to the Secrets Block system. When secrets.credential_added event is triggered,
// all workflows configured with trigger_type="secrets.credential_added" will execute.
//
// Example usage:
// await base44.functions.invoke("flowSyncEngine", {
//   action: "trigger_event",
//   event_type: "secrets.credential_added",
//   event_data: { entity_id, credential_type, secrets_block_id }
// });

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { isUrlAllowedForTenant } from "./utils/urlAllowlist.ts";

// ===========================================
// STEP EXECUTORS
// ===========================================

async function executeScrapeStep(base44, step, context) {
  const { url } = step.config;
  if (!url) throw new Error("URL required for scraping");

  // Validate client_id exists in context
  if (!context.client_id) {
    logger.error("executeScrapeStep: missing client_id in context", {
      context,
    });
    throw new Error("Client context required for scraping");
  }

  // Validate URL against tenant's allowed domains
  const tenant = await base44.asServiceRole.entities.Client.findById(
    context.client_id,
  );
  if (!tenant) {
    throw new Error("Client not found");
  }

  if (!isUrlAllowedForTenant(url, tenant)) {
    logger.error("executeScrapeStep: URL not allowed for tenant", {
      client_id: context.client_id,
      url,
    });
    throw new Error(
      "URL not allowed for this tenant. Please add the domain to your client settings.",
    );
  }

  let kbId = context.kb_id;

  if (!kbId) {
    const kb = await base44.asServiceRole.entities.KnowledgeBase.create({
      client_id: context.client_id,
      name: `FlowSync Scrape - ${new Date().toISOString().slice(0, 10)}`,
      type: "website",
      status: "active",
      metadata: { created_via: "flowsync" },
    });
    kbId = kb.id;
    context.kb_id = kb.id;
  }

  await base44.asServiceRole.functions.invoke("scrapeWebsiteKnowledge", {
    url,
    knowledge_base_id: kbId,
  });

  return { success: true, kb_id: kbId };
}

async function executeCreateAgentStep(base44, step, context) {
  const { name, system_prompt, voice_id } = step.config;

  if (!context.client_id) {
    logger.error("executeCreateAgentStep: missing client_id in context", {
      context,
    });
    throw new Error("Client context required for agent creation");
  }

  // Double-check client exists
  const tenant = await base44.asServiceRole.entities.Client.findById(
    context.client_id,
  ).catch(() => null);
  if (!tenant) {
    logger.error("executeCreateAgentStep: client_id not found in database", {
      client_id: context.client_id,
    });
    throw new Error("Client not found - cannot create agent");
  }

  const agent = await base44.asServiceRole.entities.Agent.create({
    client_id: context.client_id,
    name: name || "FlowSync Agent",
    system_prompt: system_prompt || "You are a helpful assistant.",
    voice_id: voice_id || "nova",
    status: "active",
    knowledge_base_ids: context.kb_id ? [context.kb_id] : [],
    metadata: { created_via: "flowsync" },
  });

  context.agent_id = agent.id;
  return { success: true, agent_id: agent.id };
}

async function executeSendEmailStep(base44, step, context) {
  const { to, subject, body, from_name } = step.config;

  const recipient = to || context.customer_email || context.email;
  if (!recipient) throw new Error("Email recipient required");

  await base44.integrations.Core.SendEmail({
    to: recipient,
    subject: subject || "Notification from AEVOICE",
    body: body || "You have a new notification.",
    from_name: from_name || "AEVOICE",
  });

  // Track usage
  await base44.asServiceRole.entities.CommunicationUsage.create({
    client_id: context.client_id,
    type: "email",
    direction: "outbound",
    recipient,
    sent_at: new Date().toISOString(),
    status: "sent",
    unit_cost: 0.001,
    total_cost: 0.001,
  });

  return { success: true, sent_to: recipient };
}

async function executeSendSmsStep(base44, step, context) {
  const { to, message, phone_number_id } = step.config;

  const recipient = to || context.customer_phone || context.phone;
  if (!recipient) throw new Error("SMS recipient required");

  // Call Twilio via backend function or direct API
  // Simplified - assumes existing SMS function
  await base44.functions.invoke("sendSMS", {
    to: recipient,
    message: message || "Notification from AEVOICE",
    phone_number_id,
  });

  await base44.asServiceRole.entities.CommunicationUsage.create({
    client_id: context.client_id,
    type: "sms",
    direction: "outbound",
    recipient,
    sent_at: new Date().toISOString(),
    status: "sent",
    segment_count: Math.ceil((message?.length || 160) / 160),
    unit_cost: 0.0075,
    total_cost: 0.0075 * Math.ceil((message?.length || 160) / 160),
  });

  return { success: true, sent_to: recipient };
}

async function executeAiVoiceCallStep(base44, step, context) {
  const { to, agent_id, phone_number_id, script } = step.config;

  const recipient = to || context.customer_phone || context.phone;
  if (!recipient) throw new Error("Call recipient required");

  const agentToUse = agent_id || context.agent_id;
  if (!agentToUse) throw new Error("Agent ID required for voice call");

  // Trigger outbound call via Twilio
  // This would call the twilioWebhook or a dedicated outbound call function
  const result = await base44.functions.invoke("initiateOutboundCall", {
    to: recipient,
    agent_id: agentToUse,
    phone_number_id,
    script,
  });

  return { success: true, call_sid: result.data?.call_sid };
}

async function executeUpdateCustomerStep(base44, step, context) {
  const { customer_id, updates } = step.config;

  const targetId = customer_id || context.customer_id;
  if (!targetId) throw new Error("Customer ID required");

  await base44.asServiceRole.entities.Customer.update(targetId, {
    ...updates,
    last_contacted_at: new Date().toISOString(),
  });

  return { success: true, customer_id: targetId };
}

async function executeBookAppointmentStep(base44, step, context) {
  const {
    appointment_date,
    duration_minutes,
    service_type,
    customer_name,
    customer_email,
    customer_phone,
  } = step.config;

  const appointment = await base44.asServiceRole.entities.Appointment.create({
    client_id: context.client_id,
    customer_id: context.customer_id,
    customer_name: customer_name || context.customer_name,
    customer_email: customer_email || context.customer_email,
    customer_phone: customer_phone || context.customer_phone,
    appointment_date: appointment_date ||
      new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: duration_minutes || 30,
    service_type: service_type || "Consultation",
    status: "scheduled",
    source: "flowsync",
  });

  context.appointment_id = appointment.id;
  return { success: true, appointment_id: appointment.id };
}

async function executeTriggerWebhookStep(_base44, step, context) {
  const { url, method, headers, payload } = step.config;

  if (!url) throw new Error("Webhook URL required");

  const response = await fetch(url, {
    method: method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: JSON.stringify(payload || context),
  });

  return {
    success: response.ok,
    status_code: response.status,
    response: await response.text().catch(() => ""),
  };
}

async function executeDelayStep(step) {
  const { seconds, minutes, hours } = step.config;

  const delayMs = (seconds || 0) * 1000 + (minutes || 0) * 60000 +
    (hours || 0) * 3600000;

  if (delayMs > 0 && delayMs <= 30000) {
    // Only allow short delays in sync execution
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { success: true, delayed_ms: delayMs };
}

async function executeAiSummaryStep(base44, step, context) {
  const { prompt, data_source } = step.config;

  const dataToSummarize = data_source
    ? context[data_source]
    : JSON.stringify(context).slice(0, 4000);

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `${prompt || "Summarize the following data:"}\n\n${dataToSummarize}`,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        key_points: { type: "array", items: { type: "string" } },
        recommended_action: { type: "string" },
      },
    },
  });

  context.ai_summary = result;
  return { success: true, summary: result };
}

// ===========================================
// MAIN ENGINE
// ===========================================

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS
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

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, workflow_id, trigger_type, payload } = body;

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ===========================================
    // RUN WORKFLOW
    // ===========================================
    if (action === "run_workflow") {
      const workflows = await base44.asServiceRole.entities.FlowSyncWorkflow
        .filter({
          id: workflow_id,
        });
      const workflow = workflows[0];

      if (!workflow) {
        return Response.json({ error: "Workflow not found" }, { status: 404 });
      }

      if (workflow.status !== "active" && workflow.status !== "draft") {
        return Response.json({ error: "Workflow is inactive" }, {
          status: 400,
        });
      }

      logger.info("FlowSync workflow started", {
        request_id: requestId,
        workflow_id,
        trigger: trigger_type || "manual",
      });

      // Build context from payload + user data
      const context = {
        user_id: user.id,
        user_email: user.email,
        request_id: requestId,
        ...(payload || {}),
      };

      // Get client if not provided
      if (!context.client_id) {
        const clients = await base44.entities.Client.filter({
          contact_email: user.email,
        });
        if (clients.length > 0) {
          context.client_id = clients[0].id;
        }
      }

      const logs = [];
      let hasError = false;

      // Execute steps sequentially
      for (const step of workflow.steps || []) {
        const stepStart = Date.now();
        let result = {};

        try {
          // Check condition if present
          if (step.condition) {
            const conditionMet = evaluateCondition(step.condition, context);
            if (!conditionMet) {
              logs.push({
                step_id: step.id,
                type: step.type,
                status: "skipped",
                reason: "Condition not met",
              });
              continue;
            }
          }

          // Execute step based on type
          switch (step.type) {
            case "scrape_website":
              result = await executeScrapeStep(base44, step, context);
              break;
            case "create_agent":
              result = await executeCreateAgentStep(base44, step, context);
              break;
            case "send_email":
              result = await executeSendEmailStep(base44, step, context);
              break;
            case "send_sms":
              result = await executeSendSmsStep(base44, step, context);
              break;
            case "ai_voice_call":
              result = await executeAiVoiceCallStep(base44, step, context);
              break;
            case "update_customer":
              result = await executeUpdateCustomerStep(base44, step, context);
              break;
            case "book_appointment":
              result = await executeBookAppointmentStep(base44, step, context);
              break;
            case "trigger_webhook":
              result = await executeTriggerWebhookStep(base44, step, context);
              break;
            case "delay":
              result = await executeDelayStep(step);
              break;
            case "ai_summary":
              result = await executeAiSummaryStep(base44, step, context);
              break;
            default:
              result = {
                skipped: true,
                reason: `Unknown step type: ${step.type}`,
              };
          }

          logs.push({
            step_id: step.id,
            type: step.type,
            status: "success",
            duration_ms: Date.now() - stepStart,
            result,
          });
        } catch (err) {
          logger.error("FlowSync step failed", {
            request_id: requestId,
            step_id: step.id,
            step_type: step.type,
            error: err.message,
          });

          logs.push({
            step_id: step.id,
            type: step.type,
            status: "failed",
            duration_ms: Date.now() - stepStart,
            error: err.message,
          });

          hasError = true;
          // Continue to next step or break based on config
          if (step.config?.stop_on_error !== false) {
            break;
          }
        }
      }

      // Update workflow stats
      await base44.asServiceRole.entities.FlowSyncWorkflow.update(workflow_id, {
        last_run_at: new Date().toISOString(),
        total_runs: (workflow.total_runs || 0) + 1,
        success_count: hasError ? workflow.success_count || 0 : (workflow.success_count || 0) + 1,
        failure_count: hasError ? (workflow.failure_count || 0) + 1 : workflow.failure_count || 0,
        execution_history: [
          ...(workflow.execution_history || []).slice(-49),
          {
            run_id: requestId,
            date: new Date().toISOString(),
            trigger: trigger_type || "manual",
            status: hasError ? "failed" : "success",
            logs,
          },
        ],
      });

      logger.info("FlowSync workflow completed", {
        request_id: requestId,
        workflow_id,
        status: hasError ? "failed" : "success",
        steps_executed: logs.length,
      });

      return Response.json({
        success: !hasError,
        request_id: requestId,
        logs,
      });
    }

    // ===========================================
    // TRIGGER BY EVENT
    // ===========================================
    if (action === "trigger_event") {
      const { event_type, event_data } = body;

      if (!event_type) {
        return Response.json({ error: "event_type required" }, { status: 400 });
      }

      // Find workflows listening for this event
      const workflows = await base44.asServiceRole.entities.FlowSyncWorkflow
        .filter({
          trigger_type: event_type,
          status: "active",
        });

      const results = [];

      for (const workflow of workflows) {
        try {
          // Recursively call run_workflow
          const res = await base44.functions.invoke("flowSyncEngine", {
            action: "run_workflow",
            workflow_id: workflow.id,
            trigger_type: event_type,
            payload: event_data,
          });
          results.push({
            workflow_id: workflow.id,
            status: res.data?.success ? "success" : "failed",
          });
        } catch (err) {
          results.push({
            workflow_id: workflow.id,
            status: "error",
            error: err.message,
          });
        }
      }

      return Response.json({
        success: true,
        event_type,
        workflows_triggered: results.length,
        results,
      });
    }

    // ===========================================
    // LIST AVAILABLE TRIGGERS & ACTIONS
    // ===========================================
    if (action === "get_schema") {
      return Response.json({
        success: true,
        triggers: [
          {
            type: "manual",
            label: "Manual Trigger",
            description: "Run workflow manually",
          },
          {
            type: "webhook",
            label: "Webhook",
            description: "Trigger via HTTP webhook",
          },
          {
            type: "schedule",
            label: "Schedule",
            description: "Run on a schedule (cron)",
          },
          {
            type: "secrets.credential_added",
            label: "Credential Added",
            description: "When credentials are added to Secrets Block",
          },
          {
            type: "lead_created",
            label: "Lead Created",
            description: "When a new lead is captured",
          },
          {
            type: "ai_call_completed",
            label: "AI Call Completed",
            description: "After an AI call ends",
          },
          {
            type: "appointment_booked",
            label: "Appointment Booked",
            description: "When appointment is scheduled",
          },
          {
            type: "appointment_rescheduled",
            label: "Appointment Rescheduled",
            description: "When appointment is moved",
          },
          {
            type: "payment_received",
            label: "Payment Received",
            description: "After successful payment",
          },
          {
            type: "form_submitted",
            label: "Form Submitted",
            description: "When a form is submitted",
          },
          {
            type: "customer_updated",
            label: "Customer Updated",
            description: "When customer data changes",
          },
        ],
        actions: [
          {
            type: "send_email",
            label: "Send Email",
            description: "Send an email via SendGrid",
          },
          {
            type: "send_sms",
            label: "Send SMS",
            description: "Send SMS via Twilio",
          },
          {
            type: "ai_voice_call",
            label: "AI Voice Call",
            description: "Initiate outbound AI call",
          },
          {
            type: "update_customer",
            label: "Update Customer",
            description: "Update CRM customer record",
          },
          {
            type: "book_appointment",
            label: "Book Appointment",
            description: "Create a new appointment",
          },
          {
            type: "trigger_webhook",
            label: "Trigger Webhook",
            description: "Send data to external URL",
          },
          {
            type: "delay",
            label: "Delay/Wait",
            description: "Wait before next step",
          },
          {
            type: "ai_summary",
            label: "AI Summary",
            description: "Generate AI summary/analysis",
          },
          {
            type: "scrape_website",
            label: "Scrape Website",
            description: "Extract knowledge from URL",
          },
          {
            type: "create_agent",
            label: "Create Agent",
            description: "Create a new AI agent",
          },
        ],
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logger.error("FlowSync engine error", {
      request_id: requestId,
      error: err.message,
    });

    return Response.json(
      { success: false, error: err.message, request_id: requestId },
      { status: 500 },
    );
  }
});

// ===========================================
// HELPERS
// ===========================================

function evaluateCondition(condition, context) {
  if (!condition) return true;

  const { field, operator, value } = condition;
  const fieldValue = context[field];

  switch (operator) {
    case "equals":
      return fieldValue === value;
    case "not_equals":
      return fieldValue !== value;
    case "contains":
      return String(fieldValue).includes(value);
    case "exists":
      return fieldValue !== undefined && fieldValue !== null;
    case "not_exists":
      return fieldValue === undefined || fieldValue === null;
    case "greater_than":
      return Number(fieldValue) > Number(value);
    case "less_than":
      return Number(fieldValue) < Number(value);
    default:
      return true;
  }
}
