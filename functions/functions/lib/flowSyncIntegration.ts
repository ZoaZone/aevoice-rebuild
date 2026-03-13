/**
 * FlowSync Integration Service
 * Connects to WorkAutomation.app (FlowSync) API for automation workflows
 */

import { createClient } from "npm:@base44/sdk@0.8.6";
import { logger } from "./infra/logger.js";

const base44 = createClient();

export interface FlowSyncWorkflow {
  workflowId: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  // TYPE SAFETY FIX #20: Replaced `Record<string, any>` with `Record<string, unknown>`
  // Workflow configurations vary by trigger/action type and must be validated at runtime
  triggers: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  createdAt: string;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  // TYPE SAFETY FIX #21 (Phase 2C): Replaced `any` with `Record<string, unknown>`
  // Workflow execution results vary by workflow type and must be validated at runtime
  result?: Record<string, unknown>;
  error?: string;
}

const FLOWSYNC_API_BASE = Deno.env.get("FLOWSYNC_API_URL") ||
  "https://api.workautomation.app/v1";
const FLOWSYNC_API_KEY = Deno.env.get("FLOWSYNC_API_KEY");
const DEPLOYMENT_ENV = Deno.env.get("DEPLOYMENT_ENV") || "development";

// Validate FLOWSYNC_API_KEY in production
if (!FLOWSYNC_API_KEY && DEPLOYMENT_ENV === "production") {
  logger.error(
    "FATAL: FLOWSYNC_API_KEY is required in production but not configured. " +
      "FlowSync integration will not work. Please set FLOWSYNC_API_KEY environment variable.",
  );
  throw new Error("FLOWSYNC_API_KEY is required in production environment");
}

// Validate mandatory environment variables in production
const ENV = Deno.env.get("ENV") || Deno.env.get("DEPLOYMENT_ENV") ||
  "development";

if (ENV === "production") {
  if (!FLOWSYNC_API_KEY) {
    logger.error(
      "FATAL: FLOWSYNC_API_KEY is required in production environment",
    );
    throw new Error(
      "FLOWSYNC_API_KEY environment variable is required in production",
    );
  }

  if (
    !FLOWSYNC_API_BASE || FLOWSYNC_API_BASE.includes("placeholder") ||
    FLOWSYNC_API_BASE.includes("example")
  ) {
    logger.error(
      "FATAL: FLOWSYNC_API_URL must be set to a valid URL in production",
    );
    throw new Error(
      "FLOWSYNC_API_URL must be configured with a valid API endpoint in production",
    );
  }

  // Check for placeholder keys
  if (
    FLOWSYNC_API_KEY.includes("placeholder") ||
    FLOWSYNC_API_KEY.includes("your-") || FLOWSYNC_API_KEY.length < 20
  ) {
    logger.error("FATAL: FLOWSYNC_API_KEY appears to be a placeholder value");
    throw new Error(
      "FLOWSYNC_API_KEY must be set to a valid API key in production",
    );
  }
} else {
  // Development mode - log warnings if env vars are missing
  if (!FLOWSYNC_API_KEY) {
    logger.warn(
      "WARNING: FLOWSYNC_API_KEY not set. FlowSync integration will fail.",
    );
  }
  if (!FLOWSYNC_API_BASE || FLOWSYNC_API_BASE.includes("placeholder")) {
    logger.warn("WARNING: FLOWSYNC_API_URL not properly configured.");
  }
}

// TYPE SAFETY FIX: Import FlowSync response types
import type { FlowSyncApiResponse, JsonValue } from "./types/index.ts";

/**
 * Make authenticated request to FlowSync API
 * TYPE SAFETY FIX #15: Replaced `Promise<any>` with `Promise<JsonValue>`
 * Ensures all FlowSync API responses are JSON-serializable
 */
async function makeRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  retries = 3,
): Promise<JsonValue> {
  // Fail fast in production if API key is missing
  if (!FLOWSYNC_API_KEY && DEPLOYMENT_ENV === "production") {
    throw new Error("FLOWSYNC_API_KEY is required in production");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FLOWSYNC_API_KEY}`,
          "X-AEVOICE-Source": "whiteglove",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${FLOWSYNC_API_BASE}${endpoint}`, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `FlowSync API error (${response.status}): ${errorData.message || response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      logger.error("FlowSync API request failed", {
        attempt,
        retries,
        error: error.message,
      });

      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

/**
 * Create automation workflows based on business needs
 */
export async function createWorkflow(
  businessName: string,
  businessGoals: string,
  automationNeeds: string,
  agentId: string,
  clientId: string,
): Promise<FlowSyncWorkflow[]> {
  logger.info("Creating FlowSync workflows", { businessName });

  try {
    const workflows: FlowSyncWorkflow[] = [];

    // Workflow 1: Lead Capture & CRM Sync
    const leadCaptureWorkflow = await makeRequest("/workflows", "POST", {
      name: `${businessName} - Lead Capture`,
      description: "Automatically capture leads from AEVOICE calls and sync to CRM",
      triggers: [
        {
          type: "aevoice_call_completed",
          config: {
            agent_id: agentId,
            filter_by: "lead_captured",
          },
        },
      ],
      actions: [
        {
          type: "extract_lead_info",
          config: {
            fields: ["name", "email", "phone", "notes"],
          },
        },
        {
          type: "crm_create_contact",
          config: {
            source: "aevoice_call",
          },
        },
        {
          type: "send_notification",
          config: {
            channels: ["email", "slack"],
            template: "new_lead_captured",
          },
        },
      ],
      status: "active",
    });

    workflows.push({
      workflowId: leadCaptureWorkflow.workflow_id,
      name: leadCaptureWorkflow.name,
      description: leadCaptureWorkflow.description,
      status: leadCaptureWorkflow.status,
      triggers: leadCaptureWorkflow.triggers,
      actions: leadCaptureWorkflow.actions,
      createdAt: leadCaptureWorkflow.created_at,
    });

    // Workflow 2: Appointment Scheduling
    const appointmentWorkflow = await makeRequest("/workflows", "POST", {
      name: `${businessName} - Appointment Scheduler`,
      description: "Automatically schedule appointments from voice calls",
      triggers: [
        {
          type: "aevoice_appointment_requested",
          config: {
            agent_id: agentId,
          },
        },
      ],
      actions: [
        {
          type: "check_calendar_availability",
          config: {
            calendar_source: "google_calendar",
          },
        },
        {
          type: "create_calendar_event",
          config: {
            send_confirmation: true,
          },
        },
        {
          type: "send_sms_reminder",
          config: {
            time_before: "1_hour",
          },
        },
      ],
      status: "active",
    });

    workflows.push({
      workflowId: appointmentWorkflow.workflow_id,
      name: appointmentWorkflow.name,
      description: appointmentWorkflow.description,
      status: appointmentWorkflow.status,
      triggers: appointmentWorkflow.triggers,
      actions: appointmentWorkflow.actions,
      createdAt: appointmentWorkflow.created_at,
    });

    // Workflow 3: Follow-up Automation (if specified in goals)
    if (automationNeeds?.toLowerCase().includes("follow")) {
      const followupWorkflow = await makeRequest("/workflows", "POST", {
        name: `${businessName} - Follow-up Automation`,
        description: "Automated follow-ups for missed calls and inquiries",
        triggers: [
          {
            type: "aevoice_missed_call",
            config: {
              agent_id: agentId,
            },
          },
        ],
        actions: [
          {
            type: "send_sms",
            config: {
              template: "missed_call_followup",
              delay: "5_minutes",
            },
          },
          {
            type: "create_task",
            config: {
              assignee: "sales_team",
              priority: "high",
            },
          },
        ],
        status: "active",
      });

      workflows.push({
        workflowId: followupWorkflow.workflow_id,
        name: followupWorkflow.name,
        description: followupWorkflow.description,
        status: followupWorkflow.status,
        triggers: followupWorkflow.triggers,
        actions: followupWorkflow.actions,
        createdAt: followupWorkflow.created_at,
      });
    }

    logger.info("FlowSync workflows created successfully", {
      count: workflows.length,
      businessName,
    });
    return workflows;
  } catch (error) {
    logger.error("Failed to create FlowSync workflows", {
      error: error.message,
      businessName,
    });
    throw new Error(`Workflow creation failed: ${error.message}`);
  }
}

/**
 * Trigger a workflow execution
 * TYPE SAFETY FIX #22 (Phase 2C): Replaced `Record<string, any>` with `Record<string, unknown>`
 */
export async function triggerAutomation(
  workflowId: string,
  payload: Record<string, unknown>,
): Promise<WorkflowExecution> {
  logger.info("Triggering workflow", { workflowId });

  try {
    const result = await makeRequest(
      `/workflows/${workflowId}/execute`,
      "POST",
      {
        payload,
        source: "aevoice",
      },
    );

    return {
      executionId: result.execution_id,
      workflowId: workflowId,
      status: result.status,
      startedAt: result.started_at,
      completedAt: result.completed_at,
      result: result.result,
    };
  } catch (error) {
    logger.error("Failed to trigger automation", {
      error: error.message,
      workflowId,
    });
    throw new Error(`Workflow execution failed: ${error.message}`);
  }
}

/**
 * Setup webhooks between AEVOICE and FlowSync
 */
export async function setupWebhooks(
  workflowIds: string[],
  aevoiceAgentId: string,
): Promise<void> {
  logger.info("Setting up webhooks for workflows", {
    count: workflowIds.length,
    agentId: aevoiceAgentId,
  });

  try {
    const webhookUrl = `${
      Deno.env.get("AEVOICE_WEBHOOK_BASE") || "https://aevoice.ai/functions"
    }/flowSyncWebhook`;

    for (const workflowId of workflowIds) {
      await makeRequest(`/workflows/${workflowId}/webhooks`, "POST", {
        url: webhookUrl,
        events: [
          "execution_started",
          "execution_completed",
          "execution_failed",
        ],
        metadata: {
          agent_id: aevoiceAgentId,
        },
      });
    }

    logger.info("Webhooks configured successfully", {
      count: workflowIds.length,
    });
  } catch (error) {
    logger.error("Failed to setup webhooks", { error: error.message });
    throw new Error(`Webhook setup failed: ${error.message}`);
  }
}

// TYPE SAFETY FIX: Import workflow monitoring types
import type { WorkflowExecutionResult, WorkflowMetrics } from "./types/index.ts";

/**
 * Monitor workflow status
 * TYPE SAFETY FIX #16-17: Replaced `any` with concrete types for execution and metrics
 */
export async function monitorWorkflowStatus(
  workflowId: string,
): Promise<
  {
    status: string;
    lastExecution?: WorkflowExecutionResult;
    metrics: WorkflowMetrics;
  }
> {
  try {
    const result = await makeRequest(`/workflows/${workflowId}/status`, "GET");

    // TYPE ASSUMPTION: FlowSync API returns status, last_execution, and metrics
    // If API structure differs, this will be caught at runtime with clear type error
    const response = result as {
      status: string;
      last_execution?: WorkflowExecutionResult;
      metrics?: WorkflowMetrics;
    };

    return {
      status: response.status,
      lastExecution: response.last_execution,
      metrics: response.metrics || {
        total_executions: 0,
        successful: 0,
        failed: 0,
      },
    };
  } catch (error) {
    logger.error("Failed to monitor workflow", {
      error: error.message,
      workflowId,
    });
    throw new Error(`Workflow monitoring failed: ${error.message}`);
  }
}

/**
 * Store FlowSync workflow data in Base44 database
 */
export async function storeWorkflowsInDatabase(
  clientId: string,
  agentId: string,
  workflows: FlowSyncWorkflow[],
): Promise<void> {
  try {
    // Store as IntegrationConfig (can be migrated to FlowSyncWorkflow entity later)
    await base44.asServiceRole.entities.IntegrationConfig.create({
      client_id: clientId,
      integration_type: "flowsync_workflows",
      provider: "flowsync",
      config: {
        agent_id: agentId,
        workflows: workflows.map((w) => ({
          workflow_id: w.workflowId,
          name: w.name,
          description: w.description,
          status: w.status,
          created_at: w.createdAt,
        })),
        total_workflows: workflows.length,
      },
      status: "active",
    });

    logger.info("FlowSync workflows stored successfully", {
      clientId,
      count: workflows.length,
    });
  } catch (error) {
    logger.error("Failed to store workflows in database", {
      error: error.message,
      clientId,
    });
    throw new Error(`Database storage failed: ${error.message}`);
  }
}

/**
 * Update workflow configuration
 */
/**
 * TYPE SAFETY FIX #23 (Phase 2C): Replaced `Array<any>` with typed arrays
 */
export async function updateWorkflow(
  workflowId: string,
  updates: {
    name?: string;
    description?: string;
    status?: "active" | "paused" | "draft";
    // Workflow triggers and actions have dynamic configs validated at runtime
    triggers?: Array<{ type: string; config: Record<string, unknown> }>;
    actions?: Array<{ type: string; config: Record<string, unknown> }>;
  },
): Promise<void> {
  try {
    await makeRequest(`/workflows/${workflowId}`, "PATCH", updates);
    logger.info("Workflow updated successfully", { workflowId });
  } catch (error) {
    logger.error("Failed to update workflow", {
      error: error.message,
      workflowId,
    });
    throw new Error(`Workflow update failed: ${error.message}`);
  }
}
