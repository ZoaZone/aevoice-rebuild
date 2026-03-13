/**
 * Tenant Ownership Validation Utility
 *
 * Validates that a user or service token has permission to perform
 * operations on behalf of a specific tenant/client.
 *
 * Usage:
 *   await ensureTenantOwnership(base44, user, tenantId, serviceToken);
 *   // Throws error if validation fails
 */

import { logger } from "../lib/infra/logger.js";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  client_id?: string;
}

export interface Base44Client {
  asServiceRole: {
    entities: {
      Client: {
        findById: (id: string) => Promise<ClientEntity>;
      };
    };
  };
  entities: {
    Agency: {
      filter: (params: Record<string, string>) => Promise<AgencyEntity[]>;
    };
    Client: {
      filter: (params: Record<string, string>) => Promise<ClientEntity[]>;
    };
  };
}

export interface ClientEntity {
  id: string;
  contact_email?: string;
  primary_email?: string;
  agency_id?: string;
}

export interface AgencyEntity {
  id: string;
  primary_email?: string;
}

/**
 * Validate that the authenticated user owns or has access to the tenant
 *
 * @param base44 - Base44 client instance
 * @param authUser - Authenticated user object (null for service-to-service)
 * @param tenantId - Tenant/client ID to validate
 * @param serviceToken - Optional service token for server-to-server auth
 * @throws Error if ownership cannot be validated
 */
export async function ensureTenantOwnership(
  base44: Base44Client,
  authUser: AuthUser | null,
  tenantId: string,
  serviceToken?: string,
): Promise<void> {
  try {
    // Check if tenantId is provided
    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

    // Service-to-service authentication with special tokens
    if (serviceToken && !authUser) {
      const allowedTokens = Deno.env.get("FLOWSYNC_SERVICE_TOKENS")?.split(",").map((t) =>
        t.trim()
      ) || [];

      if (!allowedTokens.includes(serviceToken)) {
        logger.error("Invalid service token", {
          tenant_id: tenantId,
          token_prefix: serviceToken.substring(0, 8) + "...",
        });
        throw new Error("Unauthorized service token");
      }

      // Service token is valid, verify tenant exists
      const tenant = await base44.asServiceRole.entities.Client.findById(
        tenantId,
      ).catch(() => null);
      if (!tenant) {
        logger.error("Tenant not found", { tenant_id: tenantId });
        throw new Error("Tenant not found");
      }

      logger.info("Service token validated for tenant", {
        tenant_id: tenantId,
      });
      return;
    }

    // User-based authentication
    if (!authUser) {
      throw new Error("Authentication required");
    }

    // Fetch the tenant/client record
    const tenant = await base44.asServiceRole.entities.Client.findById(tenantId)
      .catch(() => null);

    if (!tenant) {
      logger.error("Tenant not found", {
        tenant_id: tenantId,
        user_id: authUser.id,
      });
      throw new Error("Tenant not found");
    }

    // Admin users have access to all tenants
    if (authUser.role === "admin") {
      logger.info("Admin user granted tenant access", {
        tenant_id: tenantId,
        user_id: authUser.id,
      });
      return;
    }

    // Check if user's client_id matches the tenant
    if (authUser.client_id === tenantId) {
      logger.info("User owns tenant", {
        tenant_id: tenantId,
        user_id: authUser.id,
      });
      return;
    }

    // Check if user's email matches tenant contact email
    if (
      tenant.contact_email === authUser.email ||
      tenant.primary_email === authUser.email
    ) {
      logger.info("User email matches tenant contact", {
        tenant_id: tenantId,
        user_id: authUser.id,
      });
      return;
    }

    // Check if user is associated with an agency that owns this tenant
    const agencies = await base44.entities.Agency.filter({
      primary_email: authUser.email,
    }).catch(() => []);

    for (const agency of agencies) {
      // Check if tenant is a client of this agency
      const clients = await base44.entities.Client.filter({
        agency_id: agency.id,
      }).catch(() => []);

      if (clients.some((c) => c.id === tenantId)) {
        logger.info("User's agency owns tenant", {
          tenant_id: tenantId,
          user_id: authUser.id,
          agency_id: agency.id,
        });
        return;
      }
    }

    // No ownership found
    logger.error("Tenant ownership validation failed", {
      tenant_id: tenantId,
      user_id: authUser.id,
      user_email: authUser.email,
    });
    throw new Error("Unauthorized: You do not have access to this tenant");
  } catch (error) {
    logger.error("Tenant validation error", {
      tenant_id: tenantId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get tenant/client ID from authenticated user
 *
 * @param base44 - Base44 client instance
 * @param authUser - Authenticated user object
 * @returns Client ID if found, null otherwise
 */
export async function getTenantIdFromUser(
  base44: Base44Client,
  authUser: AuthUser,
): Promise<string | null> {
  try {
    // Check if user has client_id directly
    if (authUser.client_id) {
      return authUser.client_id;
    }

    // Look up client by contact email
    const clients = await base44.entities.Client.filter({
      contact_email: authUser.email,
    }).catch(() => []);

    if (clients.length > 0) {
      return clients[0].id;
    }

    // Look up via agency
    const agencies = await base44.entities.Agency.filter({
      primary_email: authUser.email,
    }).catch(() => []);

    if (agencies.length > 0) {
      const agencyClients = await base44.entities.Client.filter({
        agency_id: agencies[0].id,
      }).catch(() => []);

      if (agencyClients.length > 0) {
        return agencyClients[0].id;
      }
    }

    return null;
  } catch (error) {
    logger.error("Error getting tenant ID from user", {
      user_id: authUser.id,
      error: error.message,
    });
    return null;
  }
}
