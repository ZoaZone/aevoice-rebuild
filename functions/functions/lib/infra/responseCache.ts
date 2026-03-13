// lib/infra/responseCache.ts
// Response caching for common queries to reduce latency
// Caches AI responses based on normalized user input

import { logger } from "./logger.ts";
import type { Metadata } from "../types/index.ts";

interface CacheEntry {
  response: string;
  timestamp: number;
  hitCount: number;
  agentId: string;
  metadata?: Metadata;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private maxEntries: number;
  private ttlMs: number;
  private stats: { hits: number; misses: number };

  constructor(maxEntries = 1000, ttlMs = 3600000) { // Default: 1000 entries, 1 hour TTL
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.stats = { hits: 0, misses: 0 };
  }

  // Normalize query for consistent cache keys
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " "); // Normalize whitespace
  }

  // Generate cache key from agent ID and normalized query
  private getCacheKey(agentId: string, query: string): string {
    const normalized = this.normalizeQuery(query);
    return `${agentId}:${normalized}`;
  }

  // Check if entry is still valid
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.ttlMs;
  }

  // Get cached response
  get(agentId: string, query: string): string | null {
    const key = this.getCacheKey(agentId, query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hitCount++;
    entry.timestamp = Date.now(); // Refresh TTL on hit (LRU-like behavior)
    this.stats.hits++;

    logger.debug("Response cache hit", {
      agent_id: agentId,
      query_preview: query.substring(0, 50),
      hit_count: entry.hitCount,
    });

    return entry.response;
  }

  // Set cached response
  set(
    agentId: string,
    query: string,
    response: string,
    metadata?: Metadata,
  ): void {
    const key = this.getCacheKey(agentId, query);

    // Check cache size and evict oldest entries if needed
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hitCount: 0,
      agentId,
      metadata,
    });

    logger.debug("Response cached", {
      agent_id: agentId,
      query_preview: query.substring(0, 50),
      response_length: response.length,
    });
  }

  // Evict oldest entries (LRU-like)
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug("Cache entry evicted", { key: oldestKey });
    }
  }

  // Clear cache for specific agent
  clearAgent(agentId: string): void {
    let cleared = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.agentId === agentId) {
        this.cache.delete(key);
        cleared++;
      }
    }
    logger.info("Agent cache cleared", { agent_id: agentId, cleared });
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    logger.info("Response cache cleared");
  }

  // Get cache statistics
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  // Clean up expired entries
  cleanup(): void {
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.info("Cache cleanup completed", { cleaned });
    }
  }
}

// Global cache instance
const globalCache = new ResponseCache(1000, 3600000); // 1000 entries, 1 hour TTL

// Cleanup function for graceful shutdown (Deno-specific)
let cleanupInterval: number | null = null;

// Start cleanup interval only if not already running
if (cleanupInterval === null) {
  cleanupInterval = setInterval(() => {
    globalCache.cleanup();
  }, 5 * 60 * 1000);

  // In Deno, cleanup on unload
  if (typeof Deno !== "undefined") {
    addEventListener("unload", () => {
      if (cleanupInterval !== null) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    });
  }
}

export { globalCache };

// Common greetings and responses for pre-warming cache
export const COMMON_QUERIES = {
  greetings: [
    "hello",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
  ],
  help: [
    "help",
    "what can you do",
    "how can you help",
    "what do you offer",
    "tell me about your services",
  ],
  hours: [
    "what are your hours",
    "when are you open",
    "business hours",
    "opening hours",
  ],
  location: [
    "where are you located",
    "what is your address",
    "location",
    "find you",
  ],
  contact: [
    "how can i contact you",
    "phone number",
    "email",
    "contact information",
  ],
  pricing: [
    "how much does it cost",
    "pricing",
    "price",
    "what does it cost",
    "fees",
  ],
};

// Pre-warm cache with common responses for an agent
export async function prewarmCache(
  agentId: string,
  commonResponses: Record<string, string>,
): Promise<void> {
  for (const [query, response] of Object.entries(commonResponses)) {
    globalCache.set(agentId, query, response, { prewarmed: true });
  }
  logger.info("Cache prewarmed", {
    agent_id: agentId,
    entries: Object.keys(commonResponses).length,
  });
}
