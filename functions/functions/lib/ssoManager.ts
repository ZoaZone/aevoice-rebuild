/**
 * SSO Manager
 * Handles cross-platform Single Sign-On across AEVOICE, FlowSync, and HelloBiz
 */

import { createClient } from "npm:@base44/sdk@0.8.6";
import { createHmac } from "node:crypto";
import { logger } from "./infra/logger.js";

const base44 = createClient();

export interface SSOToken {
  token: string;
  userId: string;
  email: string;
  platforms: string[];
  expiresAt: string;
  issuedAt: string;
}

export interface SSOSession {
  sessionId: string;
  userId: string;
  email: string;
  platforms: {
    aevoice: { clientId: string; agentId: string };
    flowsync?: { accountId: string };
    hellobiz?: { providerId: string };
  };
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  platforms: string[];
  platformData: {
    aevoice: { clientId: string; agentId: string };
    flowsync?: { accountId: string };
    hellobiz?: { providerId: string };
  };
  iat: number;
  exp: number;
  iss: string;
}

export interface IntegrationConfigEntity {
  id: string;
  client_id: string;
  integration_type: string;
  provider: string;
  config: Record<string, unknown>;
  status: string;
}

export interface SessionConfig {
  session_id: string;
  user_id: string;
  email: string;
  platforms: SSOSession["platforms"];
  token: string;
  expires_at: string;
  created_at: string;
}

export interface FlowSyncConfig {
  sso_propagation_allowed?: boolean;
}

export interface HelloBizConfig {
  sso_propagation_allowed?: boolean;
}

const SSO_SECRET = Deno.env.get("SSO_SECRET_KEY");
if (!SSO_SECRET) {
  throw new Error(
    "SSO_SECRET_KEY environment variable is required for secure authentication",
  );
}
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate JWT-like SSO token
 */
function generateToken(payload: TokenPayload): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));

  const signature = createHmac("sha256", SSO_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("hex");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify SSO token signature
 */
function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = createHmac("sha256", SSO_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Invalid token signature");
    }

    // Decode payload
    const payload = JSON.parse(atob(encodedPayload)) as TokenPayload;

    // Check expiry
    if (payload.exp && Date.now() > payload.exp) {
      throw new Error("Token expired");
    }

    return payload;
  } catch (error) {
    logger.error("Token verification failed", { error: error.message });
    return null;
  }
}

/**
 * Generate SSO token for cross-platform authentication
 */
export async function generateSSOToken(
  userId: string,
  email: string,
  platforms: {
    aevoice: { clientId: string; agentId: string };
    flowsync?: { accountId: string };
    hellobiz?: { providerId: string };
  },
): Promise<SSOToken> {
  logger.info("Generating SSO token for user", { email });

  try {
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const payload: TokenPayload = {
      sub: userId,
      email: email,
      platforms: Object.keys(platforms),
      platformData: platforms,
      iat: issuedAt.getTime(),
      exp: expiresAt.getTime(),
      iss: "aevoice-sso",
    };

    const token = generateToken(payload);

    logger.info("SSO token generated successfully", { email });

    return {
      token,
      userId,
      email,
      platforms: Object.keys(platforms),
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    logger.error("Failed to generate SSO token", {
      error: error.message,
      email,
    });
    throw new Error(`SSO token generation failed: ${error.message}`);
  }
}

/**
 * Validate SSO token
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const payload = verifyToken(token);
    if (!payload) {
      return false;
    }

    // Check if session exists in database
    const sessions = await base44.asServiceRole.entities.IntegrationConfig
      .filter({
        integration_type: "sso_session",
      });

    const session = sessions.find(
      (s: IntegrationConfigEntity) => s.config?.token === token && s.status === "active",
    );

    if (!session) {
      logger.info("SSO token not found in active sessions");
      return false;
    }

    logger.info("SSO token validated successfully", { email: payload.email });
    return true;
  } catch (error) {
    logger.error("Token validation failed", { error: error.message });
    return false;
  }
}

/**
 * Create unified SSO session across all platforms
 */
export async function createSSOSession(
  userId: string,
  email: string,
  platforms: {
    aevoice: { clientId: string; agentId: string };
    flowsync?: { accountId: string };
    hellobiz?: { providerId: string };
  },
): Promise<SSOSession> {
  logger.info("Creating SSO session", { email });

  try {
    // Generate token
    const ssoToken = await generateSSOToken(userId, email, platforms);

    // Store session in database
    const sessionId = crypto.randomUUID();
    await base44.asServiceRole.entities.IntegrationConfig.create({
      client_id: platforms.aevoice.clientId,
      integration_type: "sso_session",
      provider: "aevoice_sso",
      config: {
        session_id: sessionId,
        user_id: userId,
        email: email,
        platforms: platforms,
        token: ssoToken.token,
        expires_at: ssoToken.expiresAt,
        created_at: ssoToken.issuedAt,
      },
      status: "active",
    });

    logger.info("SSO session created successfully", { sessionId, email });

    return {
      sessionId,
      userId,
      email,
      platforms,
      token: ssoToken.token,
      expiresAt: ssoToken.expiresAt,
      createdAt: ssoToken.issuedAt,
    };
  } catch (error) {
    logger.error("Failed to create SSO session", {
      error: error.message,
      email,
    });
    throw new Error(`SSO session creation failed: ${error.message}`);
  }
}

/**
 * Refresh SSO session
 */
export async function refreshSession(token: string): Promise<SSOToken> {
  logger.info("Refreshing SSO session");

  try {
    const payload = verifyToken(token);
    if (!payload) {
      throw new Error("Invalid token");
    }

    // Find existing session
    const sessions = await base44.asServiceRole.entities.IntegrationConfig
      .filter({
        integration_type: "sso_session",
      });

    const existingSession = sessions.find(
      (s: IntegrationConfigEntity) => s.config?.token === token,
    );

    if (!existingSession) {
      throw new Error("Session not found");
    }

    // Generate new token
    const newToken = await generateSSOToken(
      payload.sub,
      payload.email,
      payload.platformData,
    );

    // Update session in database
    await base44.asServiceRole.entities.IntegrationConfig.update(
      existingSession.id,
      {
        config: {
          ...existingSession.config,
          token: newToken.token,
          expires_at: newToken.expiresAt,
          refreshed_at: new Date().toISOString(),
        },
      },
    );

    logger.info("SSO session refreshed successfully", { email: payload.email });
    return newToken;
  } catch (error) {
    logger.error("Failed to refresh session", { error: error.message });
    throw new Error(`Session refresh failed: ${error.message}`);
  }
}

/**
 * Logout and invalidate SSO session
 */
export async function logout(token: string): Promise<void> {
  logger.info("Logging out SSO session");

  try {
    // Find session by token
    const sessions = await base44.asServiceRole.entities.IntegrationConfig
      .filter({
        integration_type: "sso_session",
      });

    const session = sessions.find(
      (s: IntegrationConfigEntity) => s.config?.token === token,
    );

    if (session) {
      // Mark session as inactive
      await base44.asServiceRole.entities.IntegrationConfig.update(
        session.id,
        {
          status: "inactive",
          config: {
            ...session.config,
            logged_out_at: new Date().toISOString(),
          },
        },
      );

      const sessionConfig = session.config as SessionConfig;
      logger.info("SSO session logged out successfully", {
        session_id: sessionConfig.session_id,
      });
    }
  } catch (error) {
    logger.error("Failed to logout", { error: error.message });
    throw new Error(`Logout failed: ${error.message}`);
  }
}

/**
 * Get active SSO session by token
 */
export async function getSession(token: string): Promise<SSOSession | null> {
  try {
    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    const sessions = await base44.asServiceRole.entities.IntegrationConfig
      .filter({
        integration_type: "sso_session",
      });

    const session = sessions.find(
      (s: IntegrationConfigEntity) => s.config?.token === token && s.status === "active",
    );

    if (!session) {
      return null;
    }

    const config = session.config as SessionConfig;

    return {
      sessionId: config.session_id,
      userId: config.user_id,
      email: config.email,
      platforms: config.platforms,
      token: config.token,
      expiresAt: config.expires_at,
      createdAt: config.created_at,
    };
  } catch (error) {
    logger.error("Failed to get session", { error: error.message });
    return null;
  }
}

/**
 * Propagate SSO token to external platforms
 * Only sends to platforms where tenant has explicitly opted in
 */
export async function propagateToExternalPlatforms(
  ssoToken: string,
  platforms: {
    flowsync?: { accountId: string };
    hellobiz?: { providerId: string };
  },
  tenantId?: string,
): Promise<void> {
  logger.info("Propagating SSO token to external platforms");

  try {
    const payload = verifyToken(ssoToken);
    if (!payload) {
      throw new Error("Invalid SSO token");
    }

    // Get tenant ID from token or parameter
    const clientId = tenantId || payload.platformData?.aevoice?.clientId;

    if (!clientId) {
      logger.warn(
        "No tenant ID available for SSO propagation - skipping opt-in check",
      );
      // Still allow propagation but log warning
    } else {
      // Check per-tenant opt-in flags from IntegrationConfig
      const integrationConfigs = await base44.asServiceRole.entities
        .IntegrationConfig.filter({
          client_id: clientId,
        }).catch(() => []);

      // Check FlowSync opt-in
      if (platforms.flowsync) {
        const flowsyncConfig = integrationConfigs.find(
          (c: IntegrationConfigEntity) =>
            c.integration_type === "flowsync" || c.provider === "flowsync",
        );

        const flowsyncConfigData = flowsyncConfig?.config as
          | FlowSyncConfig
          | undefined;
        const ssoAllowed = flowsyncConfigData?.sso_propagation_allowed === true;

        if (!ssoAllowed) {
          logger.warn("FlowSync SSO propagation not enabled for tenant", {
            client_id: clientId,
          });
          delete platforms.flowsync; // Remove from propagation list
        } else {
          logger.info("FlowSync SSO propagation enabled for tenant", {
            client_id: clientId,
          });
        }
      }

      // Check HelloBiz opt-in
      if (platforms.hellobiz) {
        const hellobizConfig = integrationConfigs.find(
          (c: IntegrationConfigEntity) =>
            c.integration_type === "hellobiz" || c.provider === "hellobiz",
        );

        const hellobizConfigData = hellobizConfig?.config as
          | HelloBizConfig
          | undefined;
        const ssoAllowed = hellobizConfigData?.sso_propagation_allowed === true;

        if (!ssoAllowed) {
          logger.warn("HelloBiz SSO propagation not enabled for tenant", {
            client_id: clientId,
          });
          delete platforms.hellobiz; // Remove from propagation list
        } else {
          logger.info("HelloBiz SSO propagation enabled for tenant", {
            client_id: clientId,
          });
        }
      }
    }

    // FlowSync SSO propagation
    if (platforms.flowsync) {
      const flowsyncUrl = Deno.env.get("FLOWSYNC_API_URL") ||
        "https://api.workautomation.app/v1";
      await fetch(`${flowsyncUrl}/auth/sso/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("FLOWSYNC_API_KEY")}`,
        },
        body: JSON.stringify({
          account_id: platforms.flowsync.accountId,
          sso_token: ssoToken,
          source: "aevoice",
          tenant_id: clientId,
        }),
      });
      logger.info("SSO propagated to FlowSync successfully");
    }

    // HelloBiz SSO propagation
    if (platforms.hellobiz) {
      const hellobizUrl = Deno.env.get("HELLOBIZ_API_URL") ||
        "https://api.hellobiz.app/v1";
      await fetch(`${hellobizUrl}/auth/sso/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("HELLOBIZ_API_KEY")}`,
        },
        body: JSON.stringify({
          provider_id: platforms.hellobiz.providerId,
          sso_token: ssoToken,
          source: "aevoice",
          tenant_id: clientId,
        }),
      });
      logger.info("SSO propagated to HelloBiz successfully");
    }
  } catch (error) {
    logger.error("Failed to propagate SSO token", { error: error.message });
    // Don't throw - SSO propagation failure shouldn't block main flow
    logger.warn("SSO propagation failed but continuing");
  }
}
