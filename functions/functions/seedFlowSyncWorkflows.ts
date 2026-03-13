/**
 * seedFlowSyncWorkflows.ts
 *
 * Initialize default FlowSync workflows for auto-trigger events:
 * - onPartnerCreated: Triggered when a new free partner is added
 * - onPartnerActivated: Triggered when partner invitation is accepted
 * - onAgentDeployed: Triggered when an agent is deployed
 *
 * This function sets up the foundational automation workflows
 * that integrate with the Secrets Block system.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.ts";

interface WorkflowTemplate {
  name: string;
  trigger_type: string;
  description: string;
  steps: Array<{
    id: string;
    type: string;
    name: string;
    config: Record<string, any>;
    order: number;
  }>;
}

const DEFAULT_WORKFLOWS: WorkflowTemplate[] = [
  {
    name: "Partner Created - Welcome Sequence",
    trigger_type: "onPartnerCreated",
    description:
      "Sends welcome email and sets up initial configuration when a new free partner is created",
    steps: [
      {
        id: "step_1",
        type: "send_email",
        name: "Send Welcome Email",
        config: {
          subject: "Welcome to AEVOICE Free Partner Program!",
          template: "partner_welcome",
          from_name: "AEVOICE Team",
        },
        order: 1,
      },
      {
        id: "step_2",
        type: "create_agent",
        name: "Create Initial AI Agent",
        config: {
          name: "{{business_name}} AI Assistant",
          system_prompt: "You are a professional AI assistant for {{business_name}}.",
          voice_id: "nova",
        },
        order: 2,
      },
      {
        id: "step_3",
        type: "trigger_webhook",
        name: "Notify Admin Dashboard",
        config: {
          url: "https://aevoice.base44.app/api/webhooks/partner-created",
          method: "POST",
        },
        order: 3,
      },
    ],
  },
  {
    name: "Partner Activated - Setup Complete",
    trigger_type: "onPartnerActivated",
    description: "Completes partner setup when invitation is accepted and account is activated",
    steps: [
      {
        id: "step_1",
        type: "send_email",
        name: "Send Activation Confirmation",
        config: {
          subject: "Your AEVOICE Account is Activated!",
          template: "partner_activation",
          from_name: "AEVOICE Team",
        },
        order: 1,
      },
      {
        id: "step_2",
        type: "update_customer",
        name: "Update Partner Status",
        config: {
          status: "active",
          activation_date: "{{timestamp}}",
        },
        order: 2,
      },
      {
        id: "step_3",
        type: "send_sms",
        name: "Send SMS Notification",
        config: {
          message: "Welcome to AEVOICE! Your account is now active. Login at https://aevoice.ai",
        },
        order: 3,
      },
    ],
  },
  {
    name: "Agent Deployed - Notify & Track",
    trigger_type: "onAgentDeployed",
    description: "Tracks agent deployment and sends confirmation when agent goes live",
    steps: [
      {
        id: "step_1",
        type: "send_email",
        name: "Send Deployment Confirmation",
        config: {
          subject: "Your AI Agent is Live!",
          template: "agent_deployed",
          from_name: "AEVOICE Team",
        },
        order: 1,
      },
      {
        id: "step_2",
        type: "ai_summary",
        name: "Log Deployment Event",
        config: {
          prompt: "Log agent deployment for analytics",
          data_source: "agent_config",
        },
        order: 2,
      },
      {
        id: "step_3",
        type: "trigger_webhook",
        name: "Update Analytics Dashboard",
        config: {
          url: "https://aevoice.base44.app/api/analytics/agent-deployed",
          method: "POST",
        },
        order: 3,
      },
    ],
  },
];

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Seeding FlowSync workflows", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { force = false } = body;

    const createdWorkflows = [];
    const skippedWorkflows = [];

    for (const template of DEFAULT_WORKFLOWS) {
      try {
        // Check if workflow already exists
        const existing = await base44.asServiceRole.entities.FlowSyncWorkflow
          .filter({
            trigger_type: template.trigger_type,
            name: template.name,
          });

        if (existing.length > 0 && !force) {
          skippedWorkflows.push({
            name: template.name,
            trigger_type: template.trigger_type,
            reason: "Already exists",
            workflow_id: existing[0].id,
          });
          continue;
        }

        // Create workflow
        const workflow = await base44.asServiceRole.entities.FlowSyncWorkflow
          .create({
            name: template.name,
            description: template.description,
            trigger_type: template.trigger_type,
            status: "active",
            steps: template.steps,
            version: 1,
            created_by: user.id,
            total_runs: 0,
            success_count: 0,
            failure_count: 0,
            execution_history: [],
            metadata: {
              seeded: true,
              template: true,
              created_via: "seedFlowSyncWorkflows",
            },
          });

        createdWorkflows.push({
          workflow_id: workflow.id,
          name: workflow.name,
          trigger_type: workflow.trigger_type,
          steps_count: workflow.steps.length,
        });

        logger.info("Workflow created", {
          request_id: requestId,
          workflow_id: workflow.id,
          trigger_type: workflow.trigger_type,
        });
      } catch (error) {
        logger.error("Failed to create workflow", {
          request_id: requestId,
          workflow_name: template.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json({
      success: true,
      created: createdWorkflows,
      skipped: skippedWorkflows,
      total_templates: DEFAULT_WORKFLOWS.length,
      message: `Seeded ${createdWorkflows.length} workflows, skipped ${skippedWorkflows.length}`,
    });
  } catch (error) {
    logger.error("Seed workflows error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        request_id: requestId,
      },
      { status: 500 },
    );
  }
});
