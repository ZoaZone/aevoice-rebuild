/**
 * flowSyncSecrets.ts
 *
 * Secure management of API keys and credentials for FlowSync workflows.
 * Stores sensitive credentials like:
 * - SendGrid API keys
 * - WhatsApp Business API credentials
 * - BSNL SIP credentials
 * - Partner-specific API keys
 *
 * All credentials are encrypted using AES-GCM via secretStoreHelper.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.ts";
import { getSecretForOwner, storeSecret } from "./secretStoreHelper.ts";

interface FlowSyncSecretConfig {
  entity_id: string;
  entity_type: "agency" | "client" | "partner";
  secret_type: "sendgrid" | "whatsapp" | "bsnl_sip" | "custom";
  secret_name: string;
  secret_value: string;
  description?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    logger.info("FlowSyncSecrets request", {
      request_id: requestId,
      method: req.method,
    });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can manage FlowSync secrets
    if (user.role !== "admin") {
      logger.warn("Non-admin attempted to access FlowSync secrets", {
        request_id: requestId,
        user_id: user.id,
      });
      return Response.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { action } = body;

    // ===========================================
    // STORE SECRET
    // ===========================================
    if (action === "store") {
      const {
        entity_id,
        entity_type,
        secret_type,
        secret_name,
        secret_value,
        description,
        metadata,
      } = body as FlowSyncSecretConfig & { action: string };

      if (
        !entity_id || !entity_type || !secret_type || !secret_name ||
        !secret_value
      ) {
        return Response.json(
          {
            error:
              "Missing required fields: entity_id, entity_type, secret_type, secret_name, secret_value",
          },
          { status: 400 },
        );
      }

      logger.info("Storing FlowSync secret", {
        request_id: requestId,
        entity_id,
        entity_type,
        secret_type,
        secret_name,
      });

      // Store encrypted secret using secretStoreHelper
      const secretId = await storeSecret(
        base44,
        entity_type,
        entity_id,
        `flowsync_${secret_type}_${secret_name}`,
        secret_value,
      );

      // Store metadata in FlowSyncSecret entity
      const flowSyncSecret = await base44.asServiceRole.entities.FlowSyncSecret
        .create({
          entity_id,
          entity_type,
          secret_type,
          secret_name,
          encrypted_secret_id: secretId,
          description: description ||
            `${secret_type} credential: ${secret_name}`,
          metadata: metadata || {},
          created_by: user.id,
          created_at: new Date().toISOString(),
          last_used_at: null,
          usage_count: 0,
        });

      logger.info("FlowSync secret stored", {
        request_id: requestId,
        flowsync_secret_id: flowSyncSecret.id,
        encrypted_secret_id: secretId,
      });

      return Response.json({
        success: true,
        secret_id: flowSyncSecret.id,
        entity_id,
        secret_type,
        secret_name,
        message: "Secret stored successfully and encrypted",
      });
    }

    // ===========================================
    // GET SECRET VALUE
    // ===========================================
    if (action === "get") {
      const { entity_id, secret_type, secret_name } = body;

      if (!entity_id || !secret_type || !secret_name) {
        return Response.json(
          {
            error: "Missing required fields: entity_id, secret_type, secret_name",
          },
          { status: 400 },
        );
      }

      logger.info("Retrieving FlowSync secret", {
        request_id: requestId,
        entity_id,
        secret_type,
        secret_name,
      });

      // Find secret metadata
      const secrets = await base44.asServiceRole.entities.FlowSyncSecret
        .filter({
          entity_id,
          secret_type,
          secret_name,
        });

      if (secrets.length === 0) {
        return Response.json(
          { error: "Secret not found" },
          { status: 404 },
        );
      }

      const secret = secrets[0];

      // Retrieve and decrypt the actual secret value
      const secretValue = await getSecretForOwner(
        base44,
        secret.entity_type,
        entity_id,
        `flowsync_${secret_type}_${secret_name}`,
      );

      if (!secretValue) {
        return Response.json(
          { error: "Secret value not found in encrypted store" },
          { status: 404 },
        );
      }

      // Update usage tracking
      await base44.asServiceRole.entities.FlowSyncSecret.update(secret.id, {
        last_used_at: new Date().toISOString(),
        usage_count: (secret.usage_count || 0) + 1,
      });

      logger.info("FlowSync secret retrieved", {
        request_id: requestId,
        secret_id: secret.id,
        usage_count: (secret.usage_count || 0) + 1,
      });

      return Response.json({
        success: true,
        secret_id: secret.id,
        secret_value: secretValue,
        secret_type,
        secret_name,
        description: secret.description,
        metadata: secret.metadata,
      });
    }

    // ===========================================
    // LIST SECRETS (metadata only, no values)
    // ===========================================
    if (action === "list") {
      const { entity_id, secret_type } = body;

      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (secret_type) filter.secret_type = secret_type;

      logger.info("Listing FlowSync secrets", {
        request_id: requestId,
        filter,
      });

      const secrets = await base44.asServiceRole.entities.FlowSyncSecret
        .filter(filter);

      return Response.json({
        success: true,
        count: secrets.length,
        secrets: secrets.map((s) => ({
          secret_id: s.id,
          entity_id: s.entity_id,
          entity_type: s.entity_type,
          secret_type: s.secret_type,
          secret_name: s.secret_name,
          description: s.description,
          metadata: s.metadata,
          created_at: s.created_at,
          last_used_at: s.last_used_at,
          usage_count: s.usage_count,
        })),
      });
    }

    // ===========================================
    // DELETE SECRET
    // ===========================================
    if (action === "delete") {
      const { secret_id } = body;

      if (!secret_id) {
        return Response.json(
          { error: "Missing secret_id" },
          { status: 400 },
        );
      }

      logger.info("Deleting FlowSync secret", {
        request_id: requestId,
        secret_id,
      });

      const secrets = await base44.asServiceRole.entities.FlowSyncSecret
        .filter({ id: secret_id });

      if (secrets.length === 0) {
        return Response.json(
          { error: "Secret not found" },
          { status: 404 },
        );
      }

      await base44.asServiceRole.entities.FlowSyncSecret.delete(secret_id);

      // Note: encrypted_secrets remain in DB for audit trail
      // They cannot be decrypted without the FlowSyncSecret metadata

      logger.info("FlowSync secret deleted", {
        request_id: requestId,
        secret_id,
      });

      return Response.json({
        success: true,
        message: "Secret deleted successfully",
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("FlowSyncSecrets error", {
      request_id: requestId,
      error: err.message,
      stack: err.stack,
    });

    return Response.json(
      { error: err.message, request_id: requestId },
      { status: 500 },
    );
  }
});
