// lib/infra/debugStore.js
// Store debug info for test mode requests

import { logger } from "./logger.js";

/**
 * Store debug info for a request (used in test mode)
 */
export async function storeDebugInfo(
  base44,
  { requestId, clientId, agentId, payload },
) {
  try {
    await base44.asServiceRole.entities.DebugLog.create({
      request_id: requestId,
      client_id: clientId,
      agent_id: agentId || null,
      payload,
      created_at: new Date().toISOString(),
    });

    logger.debug("Debug info stored", { request_id: requestId });
  } catch (err) {
    // Best-effort storage, don't fail the request
    logger.warn("Failed to store debug info", {
      request_id: requestId,
      error: err.message,
    });
  }
}

/**
 * Retrieve debug info by request ID
 */
export async function getDebugInfo(base44, requestId, clientId) {
  const logs = await base44.asServiceRole.entities.DebugLog.filter({
    request_id: requestId,
    client_id: clientId,
  });

  return logs.length > 0 ? logs[logs.length - 1] : null;
}
