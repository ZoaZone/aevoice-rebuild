// lib/infra/rateLimit.js

import { logger } from "./logger.js";

// In-memory rate limit store (for single-instance deployments)
// In production, use Redis or Deno KV
const rateLimitStore = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.windowEnd) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Rate limiting configuration by plan type
 */
const RATE_LIMITS = {
  free: {
    requests: 60,
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxConcurrent: 3,
  },
  starter: {
    requests: 200,
    windowMs: 5 * 60 * 1000,
    maxConcurrent: 5,
  },
  professional: {
    requests: 600,
    windowMs: 5 * 60 * 1000,
    maxConcurrent: 10,
  },
  enterprise: {
    requests: 2000,
    windowMs: 5 * 60 * 1000,
    maxConcurrent: 25,
  },
  default: {
    requests: 100,
    windowMs: 5 * 60 * 1000,
    maxConcurrent: 5,
  },
};

/**
 * Check rate limit for a given key
 * @param {string} key - Unique identifier (e.g., client_id, IP, user_id)
 * @param {string} plan - Plan type for limit lookup
 * @returns {{ allowed: boolean, remaining: number, resetAt: number, retryAfter?: number }}
 */
export function checkRateLimit(key, plan = "default") {
  const now = Date.now();
  const limits = RATE_LIMITS[plan] || RATE_LIMITS.default;

  let data = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!data || now > data.windowEnd) {
    data = {
      count: 0,
      windowStart: now,
      windowEnd: now + limits.windowMs,
    };
  }

  // Increment count
  data.count++;
  rateLimitStore.set(key, data);

  const remaining = Math.max(0, limits.requests - data.count);
  const allowed = data.count <= limits.requests;

  if (!allowed) {
    const retryAfter = Math.ceil((data.windowEnd - now) / 1000);

    logger.warn("Rate limit exceeded", {
      key,
      plan,
      count: data.count,
      limit: limits.requests,
      retryAfter,
    });

    return {
      allowed: false,
      remaining: 0,
      resetAt: data.windowEnd,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt: data.windowEnd,
  };
}

/**
 * Middleware-style rate limiter for backend functions
 */
export function rateLimitMiddleware(req, key, plan = "default") {
  const result = checkRateLimit(key, plan);

  if (!result.allowed) {
    return {
      limited: true,
      response: new Response(
        JSON.stringify({
          success: false,
          error_code: "RATE_LIMITED",
          error: "Too many requests. Please try again later.",
          retry_after: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.retryAfter),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
            "Access-Control-Allow-Origin": "*",
          },
        },
      ),
    };
  }

  return {
    limited: false,
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(remaining, resetAt) {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetAt),
  };
}

export { RATE_LIMITS };
