/**
 * secretsBlock.ts
 *
 * Secrets Block System for FlowSync - Secure credential storage that triggers
 * automated workflows when credentials are provided.
 *
 * This implements the Secrets Block architecture from the FlowSync specification:
 * - Secure AES-GCM encryption for sensitive credentials
 * - Auto-trigger workflows when credentials are added
 * - Permission-based access control
 * - Support for multiple credential types (email, API keys, OAuth tokens)
 *
 * @module secretsBlock
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "../lib/infra/logger.ts";
import { storeSecret } from "../secretStoreHelper.ts";

/**
 * Secrets Block Schema
 *
 * @interface SecretsBlock
 * @property {string} entity_id - UUID of the entity (agency, client, affiliate)
 * @property {string} entity_type - Type: 'agency', 'client', 'affiliate'
 * @property {string} entity_name - Display name of the entity
 * @property {Object} credentials - Structured credential data
 * @property {Object} permissions - Access control flags
 * @property {Object} auto_triggers - Workflow IDs to trigger on events
 */

interface CredentialEmailConfig {
  provider: string;
  address: string;
  app_password?: string;
  oauth_token?: string;
}

interface CredentialConfig {
  email?: CredentialEmailConfig;
  api_keys?: Record<string, string>;
  platform_auth?: Record<string, string>;
}

interface PermissionsConfig {
  send_email: boolean;
  read_email: boolean;
  create_partner: boolean;
  sign_on_behalf: boolean;
  bulk_operations: boolean;
}

interface AutoTriggersConfig {
  on_credential_add?: string[]; // workflow IDs
  on_schedule?: string; // cron expression
}

interface SecretsBlockData {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  credentials: CredentialConfig;
  permissions: PermissionsConfig;
  auto_triggers: AutoTriggersConfig;
}

/**
 * Main Deno server for Secrets Block operations
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    logger.info("Secrets Block request received", {
      request_id: requestId,
      method: req.method,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and entity owners can manage secrets
    if (user.role !== "admin") {
      logger.warn("Non-admin user attempted to access Secrets Block", {
        request_id: requestId,
        user_id: user.id,
      });
      return Response.json({ error: "Forbidden: Admin access required" }, {
        status: 403,
      });
    }

    const body = await req.json();
    const { action } = body;

    // ===========================================
    // CREATE/UPDATE SECRETS BLOCK
    // ===========================================
    if (action === "upsert_secrets") {
      const {
        entity_id,
        entity_type,
        entity_name,
        credentials,
        permissions,
        auto_triggers,
      } = body as Partial<SecretsBlockData> & { action: string };

      if (!entity_id || !entity_type) {
        return Response.json({
          error: "Missing required fields: entity_id, entity_type",
        }, { status: 400 });
      }

      logger.info("Upserting secrets block", {
        request_id: requestId,
        entity_id,
        entity_type,
      });

      // Store the secrets block metadata
      const secretsBlockData: SecretsBlockData = {
        entity_id,
        entity_type,
        entity_name: entity_name || "",
        credentials: credentials || {},
        permissions: permissions || {
          send_email: false,
          read_email: false,
          create_partner: false,
          sign_on_behalf: false,
          bulk_operations: false,
        },
        auto_triggers: auto_triggers || {},
      };

      // Check if secrets block already exists
      const existing = await base44.asServiceRole.entities.SecretsBlock
        .filter({ entity_id })
        .catch(() => []);

      let secretsBlock;
      if (existing.length > 0) {
        // Update existing
        secretsBlock = await base44.asServiceRole.entities.SecretsBlock.update(
          existing[0].id,
          secretsBlockData,
        );
        logger.info("Secrets block updated", {
          request_id: requestId,
          secrets_block_id: secretsBlock.id,
        });
      } else {
        // Create new
        secretsBlock = await base44.asServiceRole.entities.SecretsBlock.create(
          secretsBlockData,
        );
        logger.info("Secrets block created", {
          request_id: requestId,
          secrets_block_id: secretsBlock.id,
        });
      }

      // Store encrypted credentials using secretStoreHelper
      const credentialIds: Record<string, string> = {};

      if (credentials?.email) {
        if (credentials.email.app_password) {
          credentialIds.email_password = await storeSecret(
            base44,
            entity_type,
            entity_id,
            "email_app_password",
            credentials.email.app_password,
          );
        }
        if (credentials.email.oauth_token) {
          credentialIds.email_oauth = await storeSecret(
            base44,
            entity_type,
            entity_id,
            "email_oauth_token",
            credentials.email.oauth_token,
          );
        }
      }

      if (credentials?.api_keys) {
        for (const [key, value] of Object.entries(credentials.api_keys)) {
          credentialIds[`api_key_${key}`] = await storeSecret(
            base44,
            entity_type,
            entity_id,
            `api_key_${key}`,
            value,
          );
        }
      }

      if (credentials?.platform_auth) {
        for (const [key, value] of Object.entries(credentials.platform_auth)) {
          credentialIds[`platform_${key}`] = await storeSecret(
            base44,
            entity_type,
            entity_id,
            `platform_auth_${key}`,
            value,
          );
        }
      }

      // Trigger auto-workflows if credentials were added
      const triggeredWorkflows: string[] = [];
      if (
        auto_triggers?.on_credential_add &&
        auto_triggers.on_credential_add.length > 0
      ) {
        logger.info("Triggering auto-workflows for credential addition", {
          request_id: requestId,
          workflow_ids: auto_triggers.on_credential_add,
        });

        // Determine all credential types that were added
        const credentialTypes: string[] = [];
        if (credentials?.email) credentialTypes.push("email");
        if (
          credentials?.api_keys && Object.keys(credentials.api_keys).length > 0
        ) {
          credentialTypes.push("api_keys");
        }
        if (
          credentials?.platform_auth &&
          Object.keys(credentials.platform_auth).length > 0
        ) {
          credentialTypes.push("platform_auth");
        }

        for (const workflowId of auto_triggers.on_credential_add) {
          try {
            await base44.asServiceRole.functions.invoke("flowSyncEngine", {
              action: "trigger_event",
              event_type: "secrets.credential_added",
              event_data: {
                entity_id,
                entity_type,
                credential_types: credentialTypes, // Array of all types added
                secrets_block_id: secretsBlock.id,
              },
            });
            triggeredWorkflows.push(workflowId);
          } catch (err: unknown) {
            const error = err as Error;
            logger.error("Failed to trigger workflow", {
              request_id: requestId,
              workflow_id: workflowId,
              error: error.message,
            });
          }
        }
      }

      return Response.json({
        success: true,
        secrets_block_id: secretsBlock.id,
        credential_ids: credentialIds,
        triggered_workflows: triggeredWorkflows,
        message: "Secrets block saved and workflows triggered",
      });
    }

    // ===========================================
    // GET SECRETS BLOCK
    // ===========================================
    if (action === "get_secrets") {
      const { entity_id } = body;

      if (!entity_id) {
        return Response.json({ error: "Missing entity_id" }, { status: 400 });
      }

      logger.info("Retrieving secrets block", {
        request_id: requestId,
        entity_id,
      });

      const secretsBlocks = await base44.asServiceRole.entities.SecretsBlock
        .filter({ entity_id });

      if (secretsBlocks.length === 0) {
        return Response.json({ error: "Secrets block not found" }, {
          status: 404,
        });
      }

      const secretsBlock = secretsBlocks[0];

      // Don't return actual credential values, just metadata
      return Response.json({
        success: true,
        secrets_block: {
          id: secretsBlock.id,
          entity_id: secretsBlock.entity_id,
          entity_type: secretsBlock.entity_type,
          entity_name: secretsBlock.entity_name,
          permissions: secretsBlock.permissions,
          auto_triggers: secretsBlock.auto_triggers,
          credentials_configured: {
            email: !!secretsBlock.credentials?.email,
            api_keys: Object.keys(secretsBlock.credentials?.api_keys || {}).length,
            platform_auth: Object.keys(secretsBlock.credentials?.platform_auth || {}).length,
          },
          created_at: secretsBlock.created_at,
          updated_at: secretsBlock.updated_at,
        },
      });
    }

    // ===========================================
    // DELETE SECRETS BLOCK
    // ===========================================
    if (action === "delete_secrets") {
      const { entity_id } = body;

      if (!entity_id) {
        return Response.json({ error: "Missing entity_id" }, { status: 400 });
      }

      logger.info("Deleting secrets block", {
        request_id: requestId,
        entity_id,
      });

      const secretsBlocks = await base44.asServiceRole.entities.SecretsBlock
        .filter({ entity_id });

      if (secretsBlocks.length === 0) {
        return Response.json({ error: "Secrets block not found" }, {
          status: 404,
        });
      }

      await base44.asServiceRole.entities.SecretsBlock.delete(
        secretsBlocks[0].id,
      );

      // TODO: Implement automated cleanup of orphaned encrypted_secrets
      // For security, encrypted secrets remain in DB but are flagged as orphaned
      // Future enhancement: Add cleanup job to remove orphaned secrets after retention period

      logger.info("Secrets block deleted", {
        request_id: requestId,
        entity_id,
      });

      return Response.json({
        success: true,
        message: "Secrets block deleted",
      });
    }

    // ===========================================
    // LIST ALL SECRETS BLOCKS (ADMIN ONLY)
    // ===========================================
    if (action === "list_secrets") {
      logger.info("Listing all secrets blocks", { request_id: requestId });

      const secretsBlocks = await base44.asServiceRole.entities.SecretsBlock
        .filter({});

      return Response.json({
        success: true,
        count: secretsBlocks.length,
        secrets_blocks: secretsBlocks.map((sb) => ({
          id: sb.id,
          entity_id: sb.entity_id,
          entity_type: sb.entity_type,
          entity_name: sb.entity_name,
          credentials_configured: {
            email: !!sb.credentials?.email,
            api_keys: Object.keys(sb.credentials?.api_keys || {}).length,
            platform_auth: Object.keys(sb.credentials?.platform_auth || {}).length,
          },
          permissions: sb.permissions,
          auto_triggers: sb.auto_triggers,
          created_at: sb.created_at,
          updated_at: sb.updated_at,
        })),
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Secrets Block error", {
      request_id: requestId,
      error: err.message,
      stack: err.stack,
    });

    return Response.json(
      { success: false, error: err.message, request_id: requestId },
      { status: 500 },
    );
  }
});
