// lib/infra/latencyTracker.ts
// Comprehensive latency tracking for Sri (web) and Aeva (phone) platforms
// Target: P50 < 150ms, P95 < 200ms, P99 < 300ms

import { logger } from "./logger.ts";
import type { Base44Client, Metadata } from "../types/index.ts";

export interface LatencyTimestamps {
  userSpeechEnd: number;
  sttComplete?: number;
  aiProcessingStart?: number;
  aiProcessingComplete?: number;
  ttsStart?: number;
  ttsFirstChunk?: number;
  audioStreamStart?: number;
}

export interface LatencyBreakdown {
  stt?: number;
  aiProcessing?: number;
  tts?: number;
  totalResponseTime: number;
}

export interface LatencyMetrics {
  conversationId: string;
  platform: "sri" | "aeva";
  agentId?: string;
  clientId?: string;
  sessionId?: string;
  timestamps: LatencyTimestamps;
  latencies: LatencyBreakdown;
  metadata?: {
    turn?: number;
    hasKbContext?: boolean;
    model?: string;
    userInput?: string;
    responseLength?: number;
  };
}

export class LatencyTracker {
  private conversationId: string;
  private platform: "sri" | "aeva";
  private timestamps: LatencyTimestamps;
  private metadata: Metadata;
  private startTime: number;

  constructor(conversationId: string, platform: "sri" | "aeva") {
    this.conversationId = conversationId;
    this.platform = platform;
    this.startTime = Date.now();
    this.timestamps = {
      userSpeechEnd: this.startTime,
    };
    this.metadata = {};
  }

  // Mark STT completion
  markSttComplete(): void {
    this.timestamps.sttComplete = Date.now();
    logger.debug("STT completed", {
      conversation_id: this.conversationId,
      stt_latency: this.timestamps.sttComplete - this.timestamps.userSpeechEnd,
    });
  }

  // Mark AI processing start
  markAiProcessingStart(): void {
    this.timestamps.aiProcessingStart = Date.now();
  }

  // Mark AI processing completion
  markAiProcessingComplete(): void {
    this.timestamps.aiProcessingComplete = Date.now();
    if (this.timestamps.aiProcessingStart) {
      logger.debug("AI processing completed", {
        conversation_id: this.conversationId,
        ai_latency: this.timestamps.aiProcessingComplete -
          this.timestamps.aiProcessingStart,
      });
    }
  }

  // Mark TTS start
  markTtsStart(): void {
    this.timestamps.ttsStart = Date.now();
  }

  // Mark TTS first chunk (critical for streaming)
  markTtsFirstChunk(): void {
    this.timestamps.ttsFirstChunk = Date.now();
    if (this.timestamps.ttsStart) {
      logger.debug("TTS first chunk received", {
        conversation_id: this.conversationId,
        tts_first_chunk_latency: this.timestamps.ttsFirstChunk -
          this.timestamps.ttsStart,
      });
    }
  }

  // Mark audio stream start
  markAudioStreamStart(): void {
    this.timestamps.audioStreamStart = Date.now();
  }

  // Set metadata
  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  // Calculate latencies
  private calculateLatencies(): LatencyBreakdown {
    const latencies: LatencyBreakdown = {
      totalResponseTime: Date.now() - this.timestamps.userSpeechEnd,
    };

    if (this.timestamps.sttComplete) {
      latencies.stt = this.timestamps.sttComplete -
        this.timestamps.userSpeechEnd;
    }

    if (
      this.timestamps.aiProcessingStart && this.timestamps.aiProcessingComplete
    ) {
      latencies.aiProcessing = this.timestamps.aiProcessingComplete -
        this.timestamps.aiProcessingStart;
    }

    if (this.timestamps.ttsStart && this.timestamps.ttsFirstChunk) {
      latencies.tts = this.timestamps.ttsFirstChunk - this.timestamps.ttsStart;
    }

    return latencies;
  }

  // Get metrics object
  getMetrics(): LatencyMetrics {
    return {
      conversationId: this.conversationId,
      platform: this.platform,
      agentId: this.metadata.agentId,
      clientId: this.metadata.clientId,
      sessionId: this.metadata.sessionId,
      timestamps: { ...this.timestamps },
      latencies: this.calculateLatencies(),
      metadata: { ...this.metadata },
    };
  }

  // Log summary
  logSummary(): void {
    const latencies = this.calculateLatencies();
    const level = latencies.totalResponseTime > 200 ? "warn" : "info";

    logger[level]("Latency summary", {
      conversation_id: this.conversationId,
      platform: this.platform,
      total_response_time_ms: latencies.totalResponseTime,
      stt_ms: latencies.stt,
      ai_processing_ms: latencies.aiProcessing,
      tts_ms: latencies.tts,
      meets_target: latencies.totalResponseTime < 200,
    });
  }
}

// Alert thresholds
const LATENCY_THRESHOLDS = {
  warning: 200, // 200ms threshold
  critical: 500, // 500ms threshold
};

export interface LatencyAlert {
  severity: "warning" | "critical";
  platform: "sri" | "aeva";
  conversationId: string;
  latency: number;
  breakdown: LatencyBreakdown;
  timestamp: string;
}

// Check if latency exceeds thresholds and generate alerts
export function checkLatencyThresholds(
  metrics: LatencyMetrics,
): LatencyAlert | null {
  const { latencies, conversationId, platform } = metrics;
  const totalLatency = latencies.totalResponseTime;

  if (totalLatency > LATENCY_THRESHOLDS.critical) {
    return {
      severity: "critical",
      platform,
      conversationId,
      latency: totalLatency,
      breakdown: latencies,
      timestamp: new Date().toISOString(),
    };
  }

  if (totalLatency > LATENCY_THRESHOLDS.warning) {
    return {
      severity: "warning",
      platform,
      conversationId,
      latency: totalLatency,
      breakdown: latencies,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

// Save latency metrics to Supabase
export async function saveLatencyMetrics(
  base44: Base44Client,
  metrics: LatencyMetrics,
): Promise<void> {
  try {
    // Try to save to LatencyMetric entity (may not exist yet in schema)
    try {
      await base44.asServiceRole.entities.LatencyMetric.create({
        conversation_id: metrics.conversationId,
        platform: metrics.platform,
        agent_id: metrics.agentId,
        client_id: metrics.clientId,
        session_id: metrics.sessionId,
        timestamps: metrics.timestamps,
        latencies: metrics.latencies,
        metadata: metrics.metadata,
        created_date: new Date().toISOString(),
      });
    } catch (entityErr) {
      // Entity may not exist in schema yet, log but don't fail
      logger.warn("LatencyMetric entity not found in schema", {
        conversation_id: metrics.conversationId,
        error: (entityErr as Error).message,
      });
      return; // Exit early if entity doesn't exist
    }

    // Check for alerts
    const alert = checkLatencyThresholds(metrics);
    if (alert) {
      logger[alert.severity === "critical" ? "error" : "warn"](
        "Latency threshold exceeded",
        {
          severity: alert.severity,
          platform: alert.platform,
          conversation_id: alert.conversationId,
          latency_ms: alert.latency,
          breakdown: alert.breakdown,
        },
      );

      // Try to log alert to database (may not exist yet in schema)
      try {
        await base44.asServiceRole.entities.LatencyAlert.create({
          severity: alert.severity,
          platform: alert.platform,
          conversation_id: alert.conversationId,
          latency_ms: alert.latency,
          breakdown: alert.breakdown,
          created_date: alert.timestamp,
        });
      } catch (alertErr) {
        // Entity may not exist in schema yet, already logged above
        logger.debug("LatencyAlert entity not found in schema", {
          error: (alertErr as Error).message,
        });
      }
    }
  } catch (err) {
    logger.error("Failed to save latency metrics", {
      conversation_id: metrics.conversationId,
      error: (err as Error).message,
    });
  }
}

// Calculate percentiles from an array of latencies
export function calculatePercentiles(
  latencies: number[],
): { p50: number; p95: number; p99: number } {
  if (latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
  };
}
