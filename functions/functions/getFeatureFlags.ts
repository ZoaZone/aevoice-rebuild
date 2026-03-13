/**
 * Get Feature Flags - Phase 7 Production Rollout
 *
 * Returns tenant-specific feature flags with fallback to defaults.
 * Supports tenant-level, agency-level, and system-wide overrides.
 *
 * @route POST /functions/getFeatureFlags
 * @auth Optional - Returns default flags if unauthenticated
 * @body { tenantId?: string }
 * @returns { success: true, flags: {...} }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

// Default feature flags (matches frontend defaults)
const DEFAULT_FLAGS = {
  enableSreeWeb: true,
  enableSreeDesktop: true,
  enableHotword: true,
  enableOfflineMode: false,
  enableOverlay: true,
  enableMultiWindow: true,
  enableAutoUpdate: true,
  enableTelemetry: true,
  enableBetaFeatures: false,
  enableDebugMode: false,
  enableVoiceChat: true,
  enableStreamingLLM: true,
  enableCustomVoices: false,
  enableMultiLanguage: true,
  enableScreenContext: true,
  enableKeyboardShortcuts: true,
  enableSystemTray: true,
  enableNotifications: true,
  enableTelephony: false,
  enableCRM: false,
  enableCalendar: false,
  enableWebhooks: true,
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("getFeatureFlags started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Unauthenticated users get default flags
    if (!user) {
      logger.info("Returning default flags for unauthenticated user", {
        request_id: requestId,
      });
      return Response.json({ success: true, flags: DEFAULT_FLAGS });
    }

    const body = await req.json().catch(() => ({}));
    const { tenantId } = body;

    // Get tenant-specific flags
    let targetTenantId = tenantId;

    // If no tenantId provided, use user's client via backend helper
    if (!targetTenantId) {
      try {
        const res = await base44.functions.invoke("getMyClient", {});
        targetTenantId = res?.data?.client?.id || null;
      } catch (error) {
        logger.warn("Failed to get user's client via getMyClient", {
          request_id: requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Merge flags in priority order:
    // 1. Default flags (lowest priority)
    // 2. Agency-level flags (if user belongs to agency)
    // 3. Tenant-level flags (highest priority)

    let flags = { ...DEFAULT_FLAGS };

    // Get agency-level flags (if applicable)
    try {
      if (targetTenantId) {
        const client = await base44.asServiceRole.entities.Client.findById(
          targetTenantId,
        );

        if (client?.agency_id) {
          const agency = await base44.asServiceRole.entities.Agency.findById(
            client.agency_id,
          );

          if (agency?.feature_flags) {
            flags = { ...flags, ...agency.feature_flags };

            logger.info("Applied agency-level flags", {
              request_id: requestId,
              agency_id: agency.id,
              flags: agency.feature_flags,
            });
          }
        }
      }
    } catch (error) {
      logger.warn("Failed to get agency flags", {
        request_id: requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Get tenant-level flags (highest priority)
    try {
      if (targetTenantId) {
        const client = await base44.asServiceRole.entities.Client.findById(
          targetTenantId,
        );

        if (client?.feature_flags) {
          flags = { ...flags, ...client.feature_flags };

          logger.info("Applied tenant-level flags", {
            request_id: requestId,
            tenant_id: targetTenantId,
            flags: client.feature_flags,
          });
        }
      }
    } catch (error) {
      logger.warn("Failed to get tenant flags", {
        request_id: requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // System-wide overrides (for staged rollout)
    // Check if user is in canary group
    try {
      const canaryPercentage = Deno.env.get("CANARY_PERCENTAGE") || "0";
      const percentage = parseInt(canaryPercentage, 10);

      if (percentage > 0) {
        // Simple hash-based canary selection
        const userHash = hashCode(user.id);
        const isInCanary = (userHash % 100) < percentage;

        if (isInCanary) {
          // Enable all Sree features for canary users
          flags.enableSreeWeb = true;
          flags.enableSreeDesktop = true;
          flags.enableHotword = true;
          flags.enableScreenContext = true;
          flags.enableOverlay = true;
          flags.enableMultiWindow = true;

          logger.info("User in canary group - enabled Sree features", {
            request_id: requestId,
            user_id: user.id,
            canary_percentage: percentage,
          });
        }
      }
    } catch (error) {
      logger.warn("Failed to apply canary flags", {
        request_id: requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info("Feature flags returned successfully", {
      request_id: requestId,
      user_id: user.id,
      tenant_id: targetTenantId,
    });

    return Response.json({ success: true, flags });
  } catch (error) {
    logger.error("getFeatureFlags failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    // Return default flags on error
    return Response.json(
      {
        success: true,
        flags: DEFAULT_FLAGS,
        error: "Failed to load custom flags",
      },
      { status: 200 }, // Don't fail the request, just return defaults
    );
  }
});

/**
 * Simple hash function for canary selection
 * @param {string} str - String to hash
 * @returns {number} Hash code
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
