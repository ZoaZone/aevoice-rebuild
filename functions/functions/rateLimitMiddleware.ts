import { createClient } from "npm:@base44/sdk@0.8.6";

const base44 = createClient();

// Rate limit configuration
const RATE_LIMITS = {
  public_api: { maxRequests: 100, windowMinutes: 15 },
  agent_creation: { maxRequests: 10, windowMinutes: 60 },
  knowledge_upload: { maxRequests: 50, windowMinutes: 60 },
  webhook: { maxRequests: 1000, windowMinutes: 5 },
};

// Bot detection patterns
const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /scrape/i,
  /curl/i,
  /wget/i,
  /python/i,
  /postman/i,
  /insomnia/i,
  /scan/i,
  /probe/i,
];

async function checkRateLimit(ipAddress, endpoint, userAgent) {
  const now = new Date();
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.public_api;
  const windowStart = new Date(
    now.getTime() - config.windowMinutes * 60 * 1000,
  );

  try {
    // Check if IP is blocked
    const blocked = await base44.asServiceRole.entities.RateLimitLog.filter({
      ip_address: ipAddress,
      blocked: true,
    });

    if (blocked.length > 0) {
      const block = blocked[0];
      if (new Date(block.blocked_until) > now) {
        return {
          allowed: false,
          reason: block.block_reason,
          retryAfter: Math.ceil((new Date(block.blocked_until) - now) / 1000),
        };
      } else {
        // Unblock expired blocks
        await base44.asServiceRole.entities.RateLimitLog.update(block.id, {
          blocked: false,
          blocked_until: null,
        });
      }
    }

    // Check for bot patterns
    const isBot = BOT_PATTERNS.some((pattern) => pattern.test(userAgent || ""));
    if (isBot) {
      await base44.asServiceRole.entities.RateLimitLog.create({
        ip_address: ipAddress,
        endpoint,
        user_agent: userAgent,
        blocked: true,
        blocked_until: new Date(now.getTime() + 24 * 60 * 60 * 1000)
          .toISOString(),
        block_reason: "bot_detected",
      });

      return {
        allowed: false,
        reason: "bot_detected",
        retryAfter: 86400,
      };
    }

    // Get recent requests from this IP
    const recentLogs = await base44.asServiceRole.entities.RateLimitLog.filter({
      ip_address: ipAddress,
      endpoint,
    });

    const recentCount = recentLogs.filter((log) => new Date(log.created_date) > windowStart).length;

    if (recentCount >= config.maxRequests) {
      // Block the IP
      await base44.asServiceRole.entities.RateLimitLog.create({
        ip_address: ipAddress,
        endpoint,
        user_agent: userAgent,
        blocked: true,
        blocked_until: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        block_reason: "rate_limit_exceeded",
      });

      return {
        allowed: false,
        reason: "rate_limit_exceeded",
        retryAfter: 3600,
      };
    }

    // Log this request
    await base44.asServiceRole.entities.RateLimitLog.create({
      ip_address: ipAddress,
      endpoint,
      user_agent: userAgent,
      request_count: 1,
      window_start: windowStart.toISOString(),
    });

    return {
      allowed: true,
      remaining: config.maxRequests - recentCount - 1,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open on errors
    return { allowed: true, remaining: 100 };
  }
}

Deno.serve(async (req) => {
  try {
    const { ip_address, endpoint, user_agent } = await req.json();

    const result = await checkRateLimit(ip_address, endpoint, user_agent);

    return Response.json(result);
  } catch (error) {
    console.error("Rate limit middleware error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
